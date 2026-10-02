import { supabase, isSupabaseConfigured, toAppSala, toDbSala } from '../lib/supabase';
import { Sala, Reservation, DbSala } from '../types';
import { DEFAULT_SALAS } from '../utils/mockData';

const LOCAL_STORAGE_KEY = 'salas_facilities_bellinati_v2';

// 5 Salas padrão oficiais
export function getDefaultSalas(): Sala[] {
  const roomMeta: Record<string, { capacidade: number; filial: string }> = {
    'Sala 215 - Auditório': { capacidade: 50, filial: 'Fortaleza - CE' },
    'Sala 216 - Executivos': { capacidade: 15, filial: 'Fortaleza - CE' },
    'Sala 212 - Contingencia': { capacidade: 20, filial: 'Fortaleza - CE' },
    'Sala 116 - Contingencia': { capacidade: 20, filial: 'Fortaleza - CE' },
    'Sala 118 - Contingencia': { capacidade: 20, filial: 'Fortaleza - CE' },
  };

  return DEFAULT_SALAS.map((nome, index) => {
    const meta = roomMeta[nome] || { capacidade: 20, filial: 'Fortaleza - CE' };

    return {
      id: `sala-default-${index + 1}`,
      nome,
      filial: meta.filial,
      capacidade: meta.capacidade,
      ativa: true,
      criadoEm: new Date('2026-01-01T00:00:00Z').toISOString(),
    };
  });
}

// Obter salas do localStorage local com sanitização
export function getLocalSalas(): Sala[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: Sala[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Verifica se ainda existem salas antigas que devem ser removidas
        const hasLegacyRooms = parsed.some((s) =>
          s.nome.includes('Aldeota') ||
          s.nome.includes('Meireles') ||
          s.nome.includes('Iracema') ||
          s.nome.includes('Dragão do Mar') ||
          s.nome.includes('Cocó') ||
          s.nome.includes('Papicu') ||
          s.nome.includes('Sala 01') ||
          s.nome.includes('Sala 02') ||
          s.nome.includes('Sala 03') ||
          s.nome.includes('Sala 04')
        );

        if (!hasLegacyRooms) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Erro ao ler salas do localStorage:', e);
  }
  const defaults = getDefaultSalas();
  saveLocalSalas(defaults);
  return defaults;
}

// Salvar salas no localStorage
export function saveLocalSalas(salas: Sala[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(salas));
  } catch (e) {
    console.error('Erro ao salvar salas no localStorage:', e);
  }
}

export const salaService = {
  // 1. Listar salas (com suporte a filtro por filial e status ativo)
  async getAll(options?: { filial?: string; apenasAtivas?: boolean }): Promise<{
    data: Sala[];
    isSupabase: boolean;
    error?: string;
  }> {
    const apenasAtivas = options?.apenasAtivas ?? true;
    const filial = options?.filial;

    if (!isSupabaseConfigured || !supabase) {
      let local = getLocalSalas();
      if (apenasAtivas) {
        local = local.filter((s) => s.ativa);
      }
      if (filial && filial.trim()) {
        local = local.filter((s) => s.filial.toLowerCase() === filial.toLowerCase().trim());
      }
      return { data: local, isSupabase: false };
    }

    try {
      let query = supabase.from('salas').select('*').order('nome', { ascending: true });

      if (apenasAtivas) {
        query = query.eq('ativa', true);
      }
      if (filial && filial.trim()) {
        query = query.eq('filial', filial.trim());
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Erro ao consultar salas no Supabase, utilizando fallback local:', error.message);
        let local = getLocalSalas();
        if (apenasAtivas) local = local.filter((s) => s.ativa);
        return { data: local, isSupabase: false, error: error.message };
      }

      if (data && data.length > 0) {
        const mapped = data.map((row: DbSala) => toAppSala(row));
        // Sincroniza cache local se estiver buscando todas
        if (!filial) {
          saveLocalSalas(mapped);
        }
        return { data: mapped, isSupabase: true };
      } else {
        // Tabela vazia ou primeira inicialização
        const local = getLocalSalas();
        return { data: local, isSupabase: true };
      }
    } catch (err: any) {
      console.error('Falha de conexão ao buscar salas no Supabase:', err);
      let local = getLocalSalas();
      if (apenasAtivas) local = local.filter((s) => s.ativa);
      return { data: local, isSupabase: false, error: err.message };
    }
  },

  // 2. Criar nova sala com validação de duplicidade
  async create(
    salaData: Omit<Sala, 'id' | 'criadoEm' | 'atualizadoEm'>
  ): Promise<{ data?: Sala; error?: string; isSupabase: boolean }> {
    const trimmedNome = salaData.nome.trim();
    if (!trimmedNome) {
      return { error: 'O nome da sala é obrigatório.', isSupabase: false };
    }
    if (!salaData.filial.trim()) {
      return { error: 'A filial da sala é obrigatória.', isSupabase: false };
    }

    // Verificar duplicidade localmente
    const currentSalas = getLocalSalas();
    const isDuplicate = currentSalas.some(
      (s) => s.nome.toLowerCase().trim() === trimmedNome.toLowerCase()
    );
    if (isDuplicate) {
      return {
        error: `Já existe uma sala cadastrada com o nome "${trimmedNome}".`,
        isSupabase: false,
      };
    }

    const localId = `sala-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newSala: Sala = {
      ...salaData,
      nome: trimmedNome,
      filial: salaData.filial.trim(),
      capacidade: salaData.capacidade ? Number(salaData.capacidade) : null,
      ativa: salaData.ativa ?? true,
      id: localId,
      criadoEm: new Date().toISOString(),
    };

    if (!isSupabaseConfigured || !supabase) {
      const updated = [...currentSalas, newSala];
      saveLocalSalas(updated);
      return { data: newSala, isSupabase: false };
    }

    try {
      const dbPayload = toDbSala(newSala);
      const { data, error } = await supabase.from('salas').insert([dbPayload]).select().single();

      if (error) {
        // Tratar erro de duplicidade no Postgres (unique violation code 23505)
        if (error.code === '23505') {
          return {
            error: `A sala "${trimmedNome}" já existe no banco de dados.`,
            isSupabase: true,
          };
        }
        console.warn('Erro ao inserir sala no Supabase, salvando localmente:', error.message);
        const updated = [...currentSalas, newSala];
        saveLocalSalas(updated);
        return { data: newSala, isSupabase: false, error: error.message };
      }

      const saved = toAppSala(data as DbSala);
      const updated = [...currentSalas, saved];
      saveLocalSalas(updated);
      return { data: saved, isSupabase: true };
    } catch (err: any) {
      console.error('Erro ao criar sala no Supabase:', err);
      const updated = [...currentSalas, newSala];
      saveLocalSalas(updated);
      return { data: newSala, isSupabase: false, error: err.message };
    }
  },

  // 3. Atualizar sala existente
  async update(
    id: string,
    salaData: Partial<Omit<Sala, 'id' | 'criadoEm'>>
  ): Promise<{ success: boolean; data?: Sala; error?: string; isSupabase: boolean }> {
    const currentSalas = getLocalSalas();
    const existing = currentSalas.find((s) => s.id === id);

    if (!existing) {
      return { success: false, error: 'Sala não encontrada.', isSupabase: false };
    }

    // Se alterou o nome, verificar duplicidade com outras salas
    if (salaData.nome && salaData.nome.trim().toLowerCase() !== existing.nome.toLowerCase()) {
      const duplicate = currentSalas.some(
        (s) => s.id !== id && s.nome.toLowerCase().trim() === salaData.nome!.toLowerCase().trim()
      );
      if (duplicate) {
        return {
          success: false,
          error: `Já existe outra sala com o nome "${salaData.nome.trim()}".`,
          isSupabase: false,
        };
      }
    }

    const updatedSala: Sala = {
      ...existing,
      ...salaData,
      nome: salaData.nome ? salaData.nome.trim() : existing.nome,
      filial: salaData.filial ? salaData.filial.trim() : existing.filial,
      capacidade: salaData.capacidade !== undefined ? (salaData.capacidade ? Number(salaData.capacidade) : null) : existing.capacidade,
      ativa: salaData.ativa !== undefined ? salaData.ativa : existing.ativa,
      atualizadoEm: new Date().toISOString(),
    };

    if (!isSupabaseConfigured || !supabase) {
      const updatedList = currentSalas.map((s) => (s.id === id ? updatedSala : s));
      saveLocalSalas(updatedList);
      return { success: true, data: updatedSala, isSupabase: false };
    }

    try {
      const dbPayload = toDbSala(updatedSala);
      const { data, error } = await supabase
        .from('salas')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('Erro ao atualizar sala no Supabase, salvando localmente:', error.message);
        const updatedList = currentSalas.map((s) => (s.id === id ? updatedSala : s));
        saveLocalSalas(updatedList);
        return { success: true, data: updatedSala, isSupabase: false, error: error.message };
      }

      const saved = toAppSala(data as DbSala);
      const updatedList = currentSalas.map((s) => (s.id === id ? saved : s));
      saveLocalSalas(updatedList);
      return { success: true, data: saved, isSupabase: true };
    } catch (err: any) {
      console.error('Erro na atualização da sala no Supabase:', err);
      const updatedList = currentSalas.map((s) => (s.id === id ? updatedSala : s));
      saveLocalSalas(updatedList);
      return { success: true, data: updatedSala, isSupabase: false, error: err.message };
    }
  },

  // 4. Excluir sala (ou desativar caso possua reservas vinculadas)
  async delete(
    id: string,
    existingReservations: Reservation[] = []
  ): Promise<{ success: boolean; isSoftDeleted: boolean; message: string; isSupabase: boolean; error?: string }> {
    const currentSalas = getLocalSalas();
    const salaToDelete = currentSalas.find((s) => s.id === id);

    if (!salaToDelete) {
      return {
        success: false,
        isSoftDeleted: false,
        message: 'Sala não encontrada para exclusão.',
        isSupabase: false,
      };
    }

    // Verificar se há reservas no histórico ou ativas associadas a essa sala
    const hasReservations = existingReservations.some(
      (r) => r.sala.trim().toLowerCase() === salaToDelete.nome.trim().toLowerCase()
    );

    if (hasReservations) {
      // Realiza SOFT DELETE (desativação) para preservar a integridade referencial do histórico
      const result = await this.update(id, { ativa: false });
      return {
        success: result.success,
        isSoftDeleted: true,
        message: `A sala "${salaToDelete.nome}" possui reservas vinculadas no histórico e foi DESATIVADA com segurança (não aparecerá em novas reservas).`,
        isSupabase: result.isSupabase,
        error: result.error,
      };
    }

    // Se não há reservas vinculadas, realiza HARD DELETE com segurança
    if (!isSupabaseConfigured || !supabase) {
      const updatedList = currentSalas.filter((s) => s.id !== id);
      saveLocalSalas(updatedList);
      return {
        success: true,
        isSoftDeleted: false,
        message: `Sala "${salaToDelete.nome}" excluída permanentemente com sucesso.`,
        isSupabase: false,
      };
    }

    try {
      const { error } = await supabase.from('salas').delete().eq('id', id);

      if (error) {
        console.warn('Erro ao excluir sala no Supabase:', error.message);
        // Tenta fallback para desativação em caso de foreign key constraint
        const result = await this.update(id, { ativa: false });
        return {
          success: result.success,
          isSoftDeleted: true,
          message: `Não foi possível remover fisicamente (${error.message}). A sala foi desativada.`,
          isSupabase: true,
          error: error.message,
        };
      }

      const updatedList = currentSalas.filter((s) => s.id !== id);
      saveLocalSalas(updatedList);
      return {
        success: true,
        isSoftDeleted: false,
        message: `Sala "${salaToDelete.nome}" removida com sucesso do banco de dados.`,
        isSupabase: true,
      };
    } catch (err: any) {
      console.error('Falha ao remover sala no Supabase:', err);
      const updatedList = currentSalas.filter((s) => s.id !== id);
      saveLocalSalas(updatedList);
      return {
        success: true,
        isSoftDeleted: false,
        message: `Sala removida localmente com sucesso.`,
        isSupabase: false,
        error: err.message,
      };
    }
  },

  // 5. Inscrição em Tempo Real para sincronização instantânea
  subscribeToChanges(onReload: () => void): () => void {
    if (!isSupabaseConfigured || !supabase) {
      return () => {};
    }

    try {
      const channel = supabase
        .channel('salas-realtime-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, (payload) => {
          console.log('⚡ Atualização Realtime de Salas recebida:', payload);
          onReload();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Não foi possível conectar ao canal Realtime de salas:', err);
      return () => {};
    }
  },
};
