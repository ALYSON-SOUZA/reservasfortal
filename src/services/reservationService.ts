import { supabase, isSupabaseConfigured, toAppReservation, toDbReservation, DbReservation } from '../lib/supabase';
import { Reservation } from '../types';
import { getInitialReservations } from '../utils/mockData';

const LOCAL_STORAGE_KEY = 'reservas_salas_fortaleza_v1';

const LEGACY_ROOM_MAP: Record<string, string> = {
  'Sala 01 - Reunião Diretoria (Aldeota)': 'Sala 215 - Auditório',
  'Sala 02 - Treinamento & Inovação (Meireles)': 'Sala 216 - Executivos',
  'Sala 03 - Videoconferência (Iracema)': 'Sala 212 - Contingencia',
  'Auditório Principal - Dragão do Mar (Fortaleza)': 'Sala 215 - Auditório',
  'Sala 04 - Reunião Ágil (Beira-Mar)': 'Sala 118 - Contingencia',
  'Sala de Brainstorming (Cocó)': 'Sala 116 - Contingencia',
  'Laboratório de Projetos (Papicu)': 'Sala 118 - Contingencia',
  'Sala de Reunião 01': 'Sala 215 - Auditório',
  'Auditório Principal': 'Sala 215 - Auditório',
  'Sala de Treinamento': 'Sala 216 - Executivos',
};

const LEGACY_SETOR_MAP: Record<string, string> = {
  'Tecnologia da Informação (TI)': 'Suporte',
  'Recursos Humanos (RH)': 'Atração de Talentos',
  'Financeiro e Controladoria': 'BV',
  'Operações e Logística': 'Controldesk',
  'Marketing e Comunicação': 'Desenvolvimento Organizacional',
  'Jurídico e Compliance': 'Facilities',
  'Diretoria Executiva': 'Facilities',
  'Atendimento ao Cliente': 'Bv - Bom Pagador',
  'TI / Suporte': 'Suporte',
  'Recursos Humanos': 'Atração de Talentos',
  'Financeiro / Controladoria': 'BV',
};

// Obter dados locais de segurança (localStorage)
export function getLocalReservations(): Reservation[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: Reservation[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let changed = false;
        const normalized = parsed.map((res) => {
          let updatedSala = res.sala;
          let updatedSetor = res.setor;

          if (LEGACY_ROOM_MAP[res.sala]) {
            changed = true;
            updatedSala = LEGACY_ROOM_MAP[res.sala];
          }
          if (LEGACY_SETOR_MAP[res.setor]) {
            changed = true;
            updatedSetor = LEGACY_SETOR_MAP[res.setor];
          }

          return { ...res, sala: updatedSala, setor: updatedSetor };
        });
        if (changed) {
          saveLocalReservations(normalized);
        }
        return normalized;
      }
    }
  } catch (e) {
    console.error('Erro ao ler localStorage:', e);
  }
  return getInitialReservations();
}

// Salvar no localStorage localmente
export function saveLocalReservations(reservations: Reservation[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reservations));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
}

export const reservationService = {
  // 1. Listar todas as reservas
  async getAll(): Promise<{ data: Reservation[]; isSupabase: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { data: getLocalReservations(), isSupabase: false };
    }

    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .order('dia', { ascending: true })
        .order('hora_inicial', { ascending: true });

      if (error) {
        console.warn('Erro ao consultar Supabase, utilizando fallback local:', error.message);
        return { data: getLocalReservations(), isSupabase: false, error: error.message };
      }

      if (data && data.length > 0) {
        const mapped = data.map((row: DbReservation) => toAppReservation(row));
        // Manter o cache local sincronizado
        saveLocalReservations(mapped);
        return { data: mapped, isSupabase: true };
      } else {
        // Se a tabela estiver vazia no Supabase, tenta carregar e sincronizar os dados iniciais
        const local = getLocalReservations();
        return { data: local, isSupabase: true };
      }
    } catch (err: any) {
      console.error('Falha de conexão com o Supabase:', err);
      return { data: getLocalReservations(), isSupabase: false, error: err.message };
    }
  },

  // 2. Criar uma nova reserva
  async create(
    reservationData: Omit<Reservation, 'id' | 'criadoEm'>
  ): Promise<{ data: Reservation; isSupabase: boolean; error?: string }> {
    const localId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `res-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newReservation: Reservation = {
      ...reservationData,
      id: localId,
      criadoEm: new Date().toISOString(),
    };

    if (!isSupabaseConfigured || !supabase) {
      const local = getLocalReservations();
      const updated = [newReservation, ...local];
      saveLocalReservations(updated);
      return { data: newReservation, isSupabase: false };
    }

    try {
      // Cria payload sem enviar ID customizado incompatível para o Supabase
      const basePayload: Record<string, any> = {
        dia: reservationData.dia,
        sala: reservationData.sala,
        hora_inicial: reservationData.horaInicial,
        hora_final: reservationData.horaFinal,
        solicitante: reservationData.solicitante,
        setor: reservationData.setor,
        glpi: (reservationData.glpi || '').replace('#', '').trim(),
        observacoes: reservationData.observacoes || null,
      };

      if (reservationData.criadoPor) basePayload.criado_por = reservationData.criadoPor;
      if (reservationData.modificadoPor) basePayload.modificado_por = reservationData.modificadoPor;

      const { data, error } = await supabase
        .from('reservations')
        .insert([basePayload])
        .select()
        .single();

      if (error) {
        console.warn('Erro com payload completo, tentando payload básico:', error.message);
        // Tenta sem colunas de auditoria caso não existam no schema
        const basicPayload = {
          dia: reservationData.dia,
          sala: reservationData.sala,
          hora_inicial: reservationData.horaInicial,
          hora_final: reservationData.horaFinal,
          solicitante: reservationData.solicitante,
          setor: reservationData.setor,
          glpi: (reservationData.glpi || '').replace('#', '').trim(),
          observacoes: reservationData.observacoes || null,
        };
        const retryResult = await supabase
          .from('reservations')
          .insert([basicPayload])
          .select()
          .single();

        if (retryResult.error) {
          console.warn('Falha persistindo no Supabase, salvando local:', retryResult.error.message);
          const local = getLocalReservations();
          const updated = [newReservation, ...local];
          saveLocalReservations(updated);
          return { data: newReservation, isSupabase: false, error: retryResult.error.message };
        }

        const saved = toAppReservation(retryResult.data as DbReservation);
        return { data: saved, isSupabase: true };
      }

      const savedReservation = toAppReservation(data as DbReservation);
      return { data: savedReservation, isSupabase: true };
    } catch (err: any) {
      console.error('Erro na criação de reserva no Supabase:', err);
      const local = getLocalReservations();
      const updated = [newReservation, ...local];
      saveLocalReservations(updated);
      return { data: newReservation, isSupabase: false, error: err.message };
    }
  },

  // 2.1 Criar múltiplas reservas (Bulk Insert para IA)
  async createMany(
    items: Array<Omit<Reservation, 'id' | 'criadoEm'>>
  ): Promise<{ data: Reservation[]; isSupabase: boolean; error?: string }> {
    if (!items || items.length === 0) return { data: [], isSupabase: false };

    const timestamp = new Date().toISOString();
    const localCreated: Reservation[] = items.map((item) => ({
      ...item,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `res-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      criadoEm: timestamp,
    }));

    if (!isSupabaseConfigured || !supabase) {
      const local = getLocalReservations();
      const updated = [...localCreated, ...local];
      saveLocalReservations(updated);
      return { data: localCreated, isSupabase: false };
    }

    try {
      const payloads = items.map((item) => {
        const p: Record<string, any> = {
          dia: item.dia,
          sala: item.sala,
          hora_inicial: item.horaInicial,
          hora_final: item.horaFinal,
          solicitante: item.solicitante,
          setor: item.setor,
          glpi: (item.glpi || '').replace('#', '').trim(),
          observacoes: item.observacoes || null,
        };
        if (item.criadoPor) p.criado_por = item.criadoPor;
        if (item.modificadoPor) p.modificado_por = item.modificadoPor;
        return p;
      });

      const { data, error } = await supabase
        .from('reservations')
        .insert(payloads)
        .select();

      if (error) {
        console.warn('Erro ao inserir em lote no Supabase com auditoria, tentando básico:', error.message);
        const basicPayloads = items.map((item) => ({
          dia: item.dia,
          sala: item.sala,
          hora_inicial: item.horaInicial,
          hora_final: item.horaFinal,
          solicitante: item.solicitante,
          setor: item.setor,
          glpi: (item.glpi || '').replace('#', '').trim(),
          observacoes: item.observacoes || null,
        }));

        const retryResult = await supabase
          .from('reservations')
          .insert(basicPayloads)
          .select();

        if (retryResult.error) {
          console.warn('Falha persistindo em lote no Supabase:', retryResult.error.message);
          const local = getLocalReservations();
          const updated = [...localCreated, ...local];
          saveLocalReservations(updated);
          return { data: localCreated, isSupabase: false, error: retryResult.error.message };
        }

        const mapped = (retryResult.data as DbReservation[]).map((d) => toAppReservation(d));
        return { data: mapped, isSupabase: true };
      }

      const mapped = (data as DbReservation[]).map((d) => toAppReservation(d));
      return { data: mapped, isSupabase: true };
    } catch (err: any) {
      console.error('Erro no createMany:', err);
      const local = getLocalReservations();
      const updated = [...localCreated, ...local];
      saveLocalReservations(updated);
      return { data: localCreated, isSupabase: false, error: err.message };
    }
  },

  // 3. Atualizar reserva existente
  async update(
    id: string,
    reservationData: Omit<Reservation, 'id' | 'criadoEm'>
  ): Promise<{ success: boolean; isSupabase: boolean; data?: Reservation; error?: string }> {
    const local = getLocalReservations();
    const timestamp = new Date().toISOString();

    const basePayload: Record<string, any> = {
      dia: reservationData.dia,
      sala: reservationData.sala,
      hora_inicial: reservationData.horaInicial,
      hora_final: reservationData.horaFinal,
      solicitante: reservationData.solicitante,
      setor: reservationData.setor,
      glpi: (reservationData.glpi || '').replace('#', '').trim(),
      observacoes: reservationData.observacoes ? reservationData.observacoes.trim() : null,
    };

    const fullPayload: Record<string, any> = { ...basePayload };
    if (reservationData.criadoPor) fullPayload.criado_por = reservationData.criadoPor;
    if (reservationData.modificadoPor) fullPayload.modificado_por = reservationData.modificadoPor;
    if (reservationData.modificadoEm) fullPayload.modificado_em = reservationData.modificadoEm;

    if (!isSupabaseConfigured || !supabase) {
      const updatedItem: Reservation = {
        ...reservationData,
        id,
        criadoEm: (reservationData as any).criadoEm || timestamp,
      };
      const updated = local.map((item) => (item.id === id ? updatedItem : item));
      saveLocalReservations(updated);
      return { success: true, isSupabase: false, data: updatedItem };
    }

    try {
      // 1. Tenta atualizar com colunas completas
      let { data, error } = await supabase
        .from('reservations')
        .update(fullPayload)
        .eq('id', id)
        .select();

      // 2. Se falhar (ex: colunas de auditoria não existem), tenta com payload básico
      if (error) {
        console.warn('Erro ao atualizar no Supabase com auditoria, tentando payload básico:', error.message);
        const retryResult = await supabase
          .from('reservations')
          .update(basePayload)
          .eq('id', id)
          .select();
        data = retryResult.data;
        error = retryResult.error;
      }

      // 3. Se nenhuma linha foi alterada (ex: id local/mock que ainda não existia no Supabase)
      if (!error && (!data || data.length === 0)) {
        console.log('ID não encontrado para update no Supabase, persistindo como novo registro:', id);
        const insertRes = await supabase
          .from('reservations')
          .insert([fullPayload])
          .select()
          .single();

        if (insertRes.error) {
          const basicInsert = await supabase
            .from('reservations')
            .insert([basePayload])
            .select()
            .single();

          if (!basicInsert.error && basicInsert.data) {
            data = [basicInsert.data];
            error = null;
          }
        } else if (insertRes.data) {
          data = [insertRes.data];
          error = null;
        }
      }

      if (error) {
        console.warn('Erro persistindo no Supabase, mantendo no cache local:', error.message);
        const fallbackItem: Reservation = {
          ...reservationData,
          id,
          criadoEm: (reservationData as any).criadoEm || timestamp,
        };
        const updated = local.map((item) => (item.id === id ? fallbackItem : item));
        saveLocalReservations(updated);
        return { success: true, isSupabase: false, data: fallbackItem, error: error.message };
      }

      if (data && data.length > 0) {
        const savedReservation = toAppReservation(data[0] as DbReservation);
        const updatedLocal = local.map((item) => (item.id === id ? savedReservation : item));
        if (!updatedLocal.some((item) => item.id === savedReservation.id)) {
          updatedLocal.unshift(savedReservation);
        }
        saveLocalReservations(updatedLocal);
        return { success: true, isSupabase: true, data: savedReservation };
      }

      const defaultItem: Reservation = {
        ...reservationData,
        id,
        criadoEm: (reservationData as any).criadoEm || timestamp,
      };
      const updated = local.map((item) => (item.id === id ? defaultItem : item));
      saveLocalReservations(updated);
      return { success: true, isSupabase: false, data: defaultItem };
    } catch (err: any) {
      console.error('Erro na atualização no Supabase:', err);
      const fallbackItem: Reservation = {
        ...reservationData,
        id,
        criadoEm: (reservationData as any).criadoEm || timestamp,
      };
      const updated = local.map((item) => (item.id === id ? fallbackItem : item));
      saveLocalReservations(updated);
      return { success: true, isSupabase: false, data: fallbackItem, error: err.message };
    }
  },

  // 4. Excluir reserva
  async delete(id: string): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
    const local = getLocalReservations();
    const updated = local.filter((item) => item.id !== id);
    saveLocalReservations(updated);

    if (!isSupabaseConfigured || !supabase) {
      return { success: true, isSupabase: false };
    }

    try {
      const { error } = await supabase.from('reservations').delete().eq('id', id);

      if (error) {
        console.warn('Erro ao excluir no Supabase, removido localmente:', error.message);
        return { success: true, isSupabase: false, error: error.message };
      }

      return { success: true, isSupabase: true };
    } catch (err: any) {
      console.error('Erro ao excluir no Supabase:', err);
      return { success: true, isSupabase: false, error: err.message };
    }
  },

  // 5. Atualizar observação individual
  async updateObservacao(
    id: string,
    observacao: string,
    modificadoPor?: string
  ): Promise<{ success: boolean; isSupabase: boolean; error?: string }> {
    const timestamp = new Date().toISOString();
    const cleanObservacao = observacao.trim() || null;

    const local = getLocalReservations();
    const updatedLocal = local.map((item) =>
      item.id === id
        ? {
            ...item,
            observacoes: observacao.trim(),
            modificadoPor: modificadoPor || item.modificadoPor,
            modificadoEm: timestamp,
          }
        : item
    );
    saveLocalReservations(updatedLocal);

    if (!isSupabaseConfigured || !supabase) {
      return { success: true, isSupabase: false };
    }

    try {
      const payload: Record<string, any> = {
        observacoes: cleanObservacao,
        modificado_em: timestamp,
      };
      if (modificadoPor) {
        payload.modificado_por = modificadoPor;
      }

      let { error } = await supabase
        .from('reservations')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.warn('Erro com auditoria ao salvar observação no Supabase, tentando apenas campo observacoes:', error.message);
        const retryResult = await supabase
          .from('reservations')
          .update({ observacoes: cleanObservacao })
          .eq('id', id);
        error = retryResult.error;
      }

      if (error) {
        console.warn('Erro ao salvar observação no Supabase, mantido localmente:', error.message);
        return { success: true, isSupabase: false, error: error.message };
      }

      return { success: true, isSupabase: true };
    } catch (err: any) {
      console.error('Erro no updateObservacao:', err);
      return { success: true, isSupabase: false, error: err.message };
    }
  },

  // 6. Atualizar observação em lote (Bulk Update)
  async bulkUpdateObservacoes(
    ids: string[],
    observacao: string,
    modificadoPor?: string
  ): Promise<{ success: boolean; count: number; isSupabase: boolean; error?: string }> {
    if (!ids || ids.length === 0) {
      return { success: true, count: 0, isSupabase: false };
    }

    const timestamp = new Date().toISOString();
    const cleanObservacao = observacao.trim() || '';

    if (!isSupabaseConfigured || !supabase) {
      const local = getLocalReservations();
      const idSet = new Set(ids);
      const updated = local.map((item) =>
        idSet.has(item.id)
          ? {
              ...item,
              observacoes: cleanObservacao,
              modificadoPor: modificadoPor || item.modificadoPor,
              modificadoEm: timestamp,
            }
          : item
      );
      saveLocalReservations(updated);
      return { success: true, count: ids.length, isSupabase: false };
    }

    try {
      const payload: Record<string, any> = {
        observacoes: cleanObservacao || null,
        modificado_em: timestamp,
      };
      if (modificadoPor) {
        payload.modificado_por = modificadoPor;
      }

      const { error } = await supabase
        .from('reservations')
        .update(payload)
        .in('id', ids);

      if (error) {
        console.warn('Erro ao atualizar observações em lote no Supabase, salvando localmente:', error.message);
        const local = getLocalReservations();
        const idSet = new Set(ids);
        const updated = local.map((item) =>
          idSet.has(item.id)
            ? {
                ...item,
                observacoes: cleanObservacao,
                modificadoPor: modificadoPor || item.modificadoPor,
                modificadoEm: timestamp,
              }
            : item
        );
        saveLocalReservations(updated);
        return { success: true, count: ids.length, isSupabase: false, error: error.message };
      }

      return { success: true, count: ids.length, isSupabase: true };
    } catch (err: any) {
      console.error('Erro no bulkUpdateObservacoes:', err);
      const local = getLocalReservations();
      const idSet = new Set(ids);
      const updated = local.map((item) =>
        idSet.has(item.id)
          ? {
              ...item,
              observacoes: cleanObservacao,
              modificadoPor: modificadoPor || item.modificadoPor,
              modificadoEm: timestamp,
            }
          : item
      );
      saveLocalReservations(updated);
      return { success: true, count: ids.length, isSupabase: false, error: err.message };
    }
  },

  // 7. Inscrição em Tempo Real (Realtime Subscription)
  subscribeToChanges(onReload: () => void): () => void {
    if (!isSupabaseConfigured || !supabase) {
      return () => {};
    }

    try {
      const channel = supabase
        .channel('reservations-realtime-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'reservations' },
          (payload) => {
            console.log('⚡ Atualização Realtime Supabase recebida:', payload);
            onReload();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Não foi possível conectar ao canal Realtime do Supabase:', err);
      return () => {};
    }
  },
};
