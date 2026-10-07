import { supabase, isSupabaseConfigured, toAppReservation, toDbReservation, DbReservation } from '../lib/supabase';
import { Reservation } from '../types';
import { getInitialReservations } from '../utils/mockData';

const LOCAL_STORAGE_KEY = 'reservas_salas_fortaleza_v2';

// Purga cache antigo do navegador para garantir sincronismo limpo com a nuvem
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('reservas_salas_fortaleza_v1');
  }
} catch (e) {
  // ignore
}

const LEGACY_ROOM_MAP: Record<string, string> = {
  'Sala 215 - Auditório': 'Auditório 2',
  'Sala 216 - Executivos': 'Executiva 19',
  'Sala 212 - Contingencia': 'Reunião 1',
  'Sala 116 - Contingencia': 'Reunião 4',
  'Sala 118 - Contingencia': 'Reunião 7',
  'Curitiba Park & Business - Sala Executiva': 'Auditório 9',
  'Curitiba Park & Business - Sala Reunião 01': 'Reunião 9',
  'Curitiba/Marechal - Sala Marechal A': 'Reunião 15',
  'Curitiba/Marechal - Sala Marechal B': 'Reunião 16',
  'Curitiba/Toronto - Sala Toronto 01': 'Reunião 14',
  'Curitiba/Toronto - Sala Toronto 02': 'Reunião 13',
  'Maringá - Auditório Matriz': 'Reunião 11',
  'Maringá - Sala Diretoria': 'Reunião 12',
  'Maringá - Sala Inovação & Projetos': 'Reunião 11',
  'Sala 01 - Reunião Diretoria (Aldeota)': 'Auditório 2',
  'Sala 02 - Treinamento & Inovação (Meireles)': 'Executiva 19',
  'Sala 03 - Videoconferência (Iracema)': 'Reunião 1',
  'Auditório Principal - Dragão do Mar (Fortaleza)': 'Auditório 2',
  'Sala 04 - Reunião Ágil (Beira-Mar)': 'Reunião 4',
  'Sala de Brainstorming (Cocó)': 'Reunião 8',
  'Laboratório de Projetos (Papicu)': 'Reunião 10',
  'Sala de Reunião 01': 'Auditório 2',
  'Auditório Principal': 'Auditório 2',
  'Sala de Treinamento': 'Reunião 1',
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
    if (saved !== null) {
      const parsed: Reservation[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
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
  // Sincronizar reservas locais deste computador para a Nuvem Supabase
  async syncLocalToCloud(): Promise<{
    syncedCount: number;
    total: number;
    data: Reservation[];
    error?: string;
  }> {
    const local = getLocalReservations();
    if (!isSupabaseConfigured || !supabase) {
      return {
        syncedCount: 0,
        total: local.length,
        data: local,
        error: 'Supabase não configurado no ambiente.',
      };
    }

    try {
      // 1. Busca todas as reservas existentes no Supabase
      const { data: cloudRows, error: fetchErr } = await supabase
        .from('reservations')
        .select('*');

      if (fetchErr) {
        console.warn('Erro ao consultar Supabase durante sincronização:', fetchErr.message);
        return { syncedCount: 0, total: local.length, data: local, error: fetchErr.message };
      }

      const cloudReservations = (cloudRows || []).map((row: DbReservation) => toAppReservation(row));

      // Função de identificação única da reserva (fingerprint)
      const getFp = (r: { dia: string; sala: string; horaInicial: string; horaFinal: string; glpi: string; solicitante: string }) =>
        `${r.dia?.trim()}|${r.sala?.trim()}|${r.horaInicial?.trim()}|${r.horaFinal?.trim()}|${(r.glpi || '').replace('#', '').trim()}|${(r.solicitante || '').trim().toLowerCase()}`;

      const cloudFpSet = new Set(cloudReservations.map(getFp));

      const todayStr = new Date().toISOString().split('T')[0];
      // Reservas locais que ainda NÃO constam no Supabase (apenas de hoje em diante para não ressuscitar registros antigos limpos)
      const unsyncedLocal = local.filter(
        (localRes) => !cloudFpSet.has(getFp(localRes)) && (localRes.dia || '') >= todayStr
      );

      if (unsyncedLocal.length === 0) {
        // Todas já estão na nuvem: atualiza o cache local
        saveLocalReservations(cloudReservations);
        return { syncedCount: 0, total: cloudReservations.length, data: cloudReservations };
      }

      console.log(`☁️ Sincronizando ${unsyncedLocal.length} reservas locais para o Supabase...`);

      // Prepara os payloads omitindo IDs locais inconsistentes
      const payloads = unsyncedLocal.map((item) => ({
        dia: item.dia,
        sala: item.sala,
        hora_inicial: item.horaInicial,
        hora_final: item.horaFinal,
        solicitante: item.solicitante,
        setor: item.setor,
        glpi: (item.glpi || '').replace('#', '').trim(),
        observacoes: item.observacoes || null,
        criado_por: item.criadoPor || 'Sincronização Local',
        modificado_por: item.modificadoPor || null,
      }));

      // Tenta inserir na nuvem
      const { error: insertErr } = await supabase
        .from('reservations')
        .insert(payloads);

      if (insertErr) {
        console.warn('Erro ao inserir com auditoria, tentando payload básico:', insertErr.message);
        const basicPayloads = unsyncedLocal.map((item) => ({
          dia: item.dia,
          sala: item.sala,
          hora_inicial: item.horaInicial,
          hora_final: item.horaFinal,
          solicitante: item.solicitante,
          setor: item.setor,
          glpi: (item.glpi || '').replace('#', '').trim(),
          observacoes: item.observacoes || null,
        }));

        const retry = await supabase.from('reservations').insert(basicPayloads);
        if (retry.error) {
          console.error('Falha ao persistir reservas no Supabase:', retry.error.message);
          return { syncedCount: 0, total: cloudReservations.length, data: cloudReservations, error: retry.error.message };
        }
      }

      // Re-busca a lista completa e oficial do Supabase
      const { data: finalRows } = await supabase
        .from('reservations')
        .select('*')
        .order('dia', { ascending: true })
        .order('hora_inicial', { ascending: true });

      const finalReservations = (finalRows || []).map((row: DbReservation) => toAppReservation(row));
      saveLocalReservations(finalReservations);

      console.log(`✅ Sincronização concluída com sucesso: ${unsyncedLocal.length} reservas enviadas para a nuvem!`);
      return {
        syncedCount: unsyncedLocal.length,
        total: finalReservations.length,
        data: finalReservations,
      };
    } catch (err: any) {
      console.error('Erro na sincronização de dados locais:', err);
      return { syncedCount: 0, total: local.length, data: local, error: err.message };
    }
  },

  // Contagem de reservas pendentes de sincronização
  async getSyncStatus(): Promise<{ localCount: number; cloudCount: number; unsyncedCount: number }> {
    const local = getLocalReservations();
    if (!isSupabaseConfigured || !supabase) {
      return { localCount: local.length, cloudCount: 0, unsyncedCount: local.length };
    }
    try {
      const { data } = await supabase.from('reservations').select('id, dia, sala, hora_inicial, hora_final, glpi, solicitante');
      const cloud = data || [];
      const getFp = (r: any) =>
        `${(r.dia || '').trim()}|${(r.sala || '').trim()}|${(r.hora_inicial || r.horaInicial || '').trim()}|${(r.hora_final || r.horaFinal || '').trim()}|${(r.glpi || '').replace('#', '').trim()}|${(r.solicitante || '').trim().toLowerCase()}`;
      const cloudFpSet = new Set(cloud.map(getFp));
      const unsynced = local.filter((r) => !cloudFpSet.has(getFp(r)));
      return { localCount: local.length, cloudCount: cloud.length, unsyncedCount: unsynced.length };
    } catch {
      return { localCount: local.length, cloudCount: 0, unsyncedCount: 0 };
    }
  },

  // 1. Listar todas as reservas (com sincronização prioritária de reservas de hoje em diante)
  async getAll(): Promise<{ data: Reservation[]; isSupabase: boolean; syncedCount?: number; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { data: getLocalReservations(), isSupabase: false };
    }

    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Busca prioritária 1: Todas as reservas de hoje e futuras (nunca truncadas por histórico passado)
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('reservations')
        .select('*')
        .gte('dia', todayStr)
        .order('dia', { ascending: true })
        .order('hora_inicial', { ascending: true })
        .limit(1000);

      // Busca prioritária 2: Histórico recente (passadas)
      const { data: pastData, error: pastError } = await supabase
        .from('reservations')
        .select('*')
        .lt('dia', todayStr)
        .order('dia', { ascending: false })
        .limit(200);

      if (upcomingError && pastError) {
        console.warn('Erro ao consultar Supabase, utilizando fallback local:', upcomingError?.message || pastError?.message);
        return { data: getLocalReservations(), isSupabase: false, error: upcomingError?.message || pastError?.message };
      }

      const allRows = [...(upcomingData || []), ...(pastData || [])];
      const cloudReservations = allRows.map((row: DbReservation) => toAppReservation(row));

      // Mesclagem resiliente: preserva reservas locais e mantém a versão mais recente
      const local = getLocalReservations();
      const localMap = new Map<string, Reservation>();
      local.forEach((r) => localMap.set(r.id, r));

      const finalMap = new Map<string, Reservation>(localMap);
      cloudReservations.forEach((c) => {
        const existingLocal = finalMap.get(c.id);
        if (!existingLocal) {
          finalMap.set(c.id, c);
        } else {
          const localTime = new Date(existingLocal.modificadoEm || existingLocal.criadoEm || 0).getTime();
          const cloudTime = new Date(c.modificadoEm || c.criadoEm || 0).getTime();
          if (cloudTime > localTime) {
            finalMap.set(c.id, c);
          }
        }
      });

      const merged = Array.from(finalMap.values());
      saveLocalReservations(merged);
      return { data: merged, isSupabase: true };
    } catch (err: any) {
      console.warn('Falha de conexão com o Supabase, operando no modo local resiliente:', err?.message || err);
      return { data: getLocalReservations(), isSupabase: false, error: err?.message };
    }
  },

  // 2. Criar uma nova reserva (Garantia Local-First: Salva localmente IMEDIATAMENTE antes da rede)
  async create(
    reservationData: Omit<Reservation, 'id' | 'criadoEm'>
  ): Promise<{ data: Reservation; isSupabase: boolean; error?: string }> {
    const localId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `res-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newReservation: Reservation = {
      ...reservationData,
      id: localId,
      criadoEm: new Date().toISOString(),
    };

    // ETAPA 1: Grava SEMPRE no armazenamento local primeiro
    // Isso garante que no celular a reserva fica gravada e reservada com 100% de sucesso
    const local = getLocalReservations();
    const updated = [newReservation, ...local.filter((r) => r.id !== localId)];
    saveLocalReservations(updated);

    if (!isSupabaseConfigured || !supabase) {
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

      if (reservationData.filial) basePayload.filial = reservationData.filial;
      if (reservationData.criadoPor) basePayload.criado_por = reservationData.criadoPor;
      if (reservationData.modificadoPor) basePayload.modificado_por = reservationData.modificadoPor;

      const { data, error } = await supabase
        .from('reservations')
        .insert([basePayload])
        .select()
        .single();

      if (error) {
        console.warn('Erro com payload completo no Supabase, tentando payload básico:', error.message);
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
          console.warn('Supabase indisponível no momento, mantendo reserva local com sucesso:', retryResult.error.message);
          return { data: newReservation, isSupabase: false, error: retryResult.error.message };
        }

        const saved = toAppReservation(retryResult.data as DbReservation);
        // Atualiza o registro local com o ID definitivo gerado no Supabase
        const currentLocal = getLocalReservations();
        const replacedLocal = currentLocal.map((r) => (r.id === localId ? saved : r));
        saveLocalReservations(replacedLocal);
        return { data: saved, isSupabase: true };
      }

      const savedReservation = toAppReservation(data as DbReservation);
      // Atualiza o registro local com o ID definitivo gerado no Supabase
      const currentLocal = getLocalReservations();
      const replacedLocal = currentLocal.map((r) => (r.id === localId ? savedReservation : r));
      saveLocalReservations(replacedLocal);
      return { data: savedReservation, isSupabase: true };
    } catch (err: any) {
      console.warn('Supabase timeout ou rede lenta, mantendo reserva salva localmente:', err?.message || err);
      return { data: newReservation, isSupabase: false, error: err?.message };
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
        saveLocalReservations([...mapped, ...getLocalReservations()]);
        return { data: mapped, isSupabase: true };
      }

      const mapped = (data as DbReservation[]).map((d) => toAppReservation(d));
      saveLocalReservations([...mapped, ...getLocalReservations()]);
      return { data: mapped, isSupabase: true };
    } catch (err: any) {
      console.error('Erro no createMany:', err);
      const local = getLocalReservations();
      const updated = [...localCreated, ...local];
      saveLocalReservations(updated);
      return { data: localCreated, isSupabase: false, error: err.message };
    }
  },

  // 3. Atualizar reserva existente (Garantia Local-First: Salva localmente IMEDIATAMENTE)
  async update(
    id: string,
    reservationData: Omit<Reservation, 'id' | 'criadoEm'>
  ): Promise<{ success: boolean; isSupabase: boolean; data?: Reservation; error?: string }> {
    const local = getLocalReservations();
    const timestamp = new Date().toISOString();

    const updatedItem: Reservation = {
      ...reservationData,
      id,
      criadoEm: (reservationData as any).criadoEm || timestamp,
      modificadoEm: timestamp,
    };

    // ETAPA 1: Salva imediatamente no armazenamento local para resposta instantânea
    const updatedLocalFirst = local.map((item) => (item.id === id ? updatedItem : item));
    saveLocalReservations(updatedLocalFirst);

    if (!isSupabaseConfigured || !supabase) {
      return { success: true, isSupabase: false, data: updatedItem };
    }

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

    if (reservationData.filial) basePayload.filial = reservationData.filial;

    const fullPayload: Record<string, any> = { ...basePayload };
    if (reservationData.criadoPor) fullPayload.criado_por = reservationData.criadoPor;
    if (reservationData.modificadoPor) fullPayload.modificado_por = reservationData.modificadoPor;
    if (reservationData.modificadoEm) fullPayload.modificado_em = reservationData.modificadoEm;

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
        console.warn('Supabase não pôde persistir no momento, mantendo atualização local:', error.message);
        return { success: true, isSupabase: false, data: updatedItem, error: error.message };
      }

      if (data && data.length > 0) {
        const savedReservation = toAppReservation(data[0] as DbReservation);
        const currentLocal = getLocalReservations();
        const updatedLocal = currentLocal.map((item) => (item.id === id ? savedReservation : item));
        if (!updatedLocal.some((item) => item.id === savedReservation.id)) {
          updatedLocal.unshift(savedReservation);
        }
        saveLocalReservations(updatedLocal);
        return { success: true, isSupabase: true, data: savedReservation };
      }

      return { success: true, isSupabase: false, data: updatedItem };
    } catch (err: any) {
      console.warn('Timeout ou falha ao atualizar no Supabase, mantendo atualização local:', err?.message || err);
      return { success: true, isSupabase: false, data: updatedItem, error: err?.message };
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
