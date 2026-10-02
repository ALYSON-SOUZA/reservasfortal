import { supabase, isSupabaseConfigured, toAppSetor, toDbSetor } from '../lib/supabase';
import { Setor, DbSetor, Reservation } from '../types';
import { DEFAULT_SETORES } from '../utils/mockData';

const LOCAL_STORAGE_KEY = 'setores_facilities_bellinati_v2';

export function getDefaultSetores(): Setor[] {
  return DEFAULT_SETORES.map((nome, index) => ({
    id: `setor-default-${index + 1}`,
    nome,
    descricao: `Setor ${nome}`,
    ativo: true,
    criadoEm: new Date('2026-01-01T00:00:00Z').toISOString(),
  }));
}

export function getLocalSetores(): Setor[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: Setor[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Verifica se existem setores do padrão antigo
        const hasLegacySetores = parsed.some((s) =>
          s.nome.includes('Tecnologia da Informação') ||
          s.nome.includes('Recursos Humanos') ||
          s.nome.includes('Financeiro e Controladoria') ||
          s.nome.includes('Operações e Logística') ||
          s.nome.includes('Marketing e Comunicação') ||
          s.nome.includes('Jurídico e Compliance') ||
          s.nome.includes('Diretoria Executiva') ||
          s.nome.includes('Atendimento ao Cliente')
        );

        if (!hasLegacySetores) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Erro ao ler setores do localStorage:', e);
  }
  const defaults = getDefaultSetores();
  saveLocalSetores(defaults);
  return defaults;
}

export function saveLocalSetores(setores: Setor[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(setores));
  } catch (e) {
    console.error('Erro ao salvar setores no localStorage:', e);
  }
}

export const setorService = {
  // 1. Listar setores
  async getAll(options?: { apenasAtivos?: boolean }): Promise<{
    data: Setor[];
    isSupabase: boolean;
    error?: string;
  }> {
    const apenasAtivos = options?.apenasAtivos ?? true;

    if (!isSupabaseConfigured || !supabase) {
      let local = getLocalSetores();
      if (apenasAtivos) {
        local = local.filter((s) => s.ativo);
      }
      return { data: local, isSupabase: false };
    }

    try {
      let query = supabase.from('setores').select('*').order('nome', { ascending: true });

      if (apenasAtivos) {
        query = query.eq('ativo', true);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Erro ao consultar setores no Supabase, usando local:', error.message);
        let local = getLocalSetores();
        if (apenasAtivos) local = local.filter((s) => s.ativo);
        return { data: local, isSupabase: false, error: error.message };
      }

      if (data && data.length > 0) {
        const mapped = data.map((row: DbSetor) => toAppSetor(row));
        saveLocalSetores(mapped);
        return { data: mapped, isSupabase: true };
      } else {
        const local = getLocalSetores();
        return { data: local, isSupabase: true };
      }
    } catch (err: any) {
      console.error('Erro de conexão com setores no Supabase:', err);
      let local = getLocalSetores();
      if (apenasAtivos) local = local.filter((s) => s.ativo);
      return { data: local, isSupabase: false, error: err.message };
    }
  },

  // 2. Criar novo setor
  async create(
    setorData: Omit<Setor, 'id' | 'criadoEm'>
  ): Promise<{ data?: Setor; error?: string; isSupabase: boolean }> {
    const trimmedNome = setorData.nome.trim();
    if (!trimmedNome) {
      return { error: 'O nome do setor é obrigatório.', isSupabase: false };
    }

    const currentSetores = getLocalSetores();
    const isDuplicate = currentSetores.some(
      (s) => s.nome.toLowerCase().trim() === trimmedNome.toLowerCase()
    );
    if (isDuplicate) {
      return {
        error: `Já existe um setor cadastrado com o nome "${trimmedNome}".`,
        isSupabase: false,
      };
    }

    const localId = `setor-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newSetor: Setor = {
      ...setorData,
      nome: trimmedNome,
      descricao: setorData.descricao?.trim() || '',
      ativo: setorData.ativo ?? true,
      id: localId,
      criadoEm: new Date().toISOString(),
    };

    if (!isSupabaseConfigured || !supabase) {
      const updated = [...currentSetores, newSetor];
      saveLocalSetores(updated);
      return { data: newSetor, isSupabase: false };
    }

    try {
      const dbPayload = toDbSetor(newSetor);
      const { data, error } = await supabase.from('setores').insert([dbPayload]).select().single();

      if (error) {
        console.warn('Erro ao inserir setor no Supabase:', error.message);
        const updated = [...currentSetores, newSetor];
        saveLocalSetores(updated);
        return { data: newSetor, isSupabase: false, error: error.message };
      }

      const saved = toAppSetor(data as DbSetor);
      const updated = [...currentSetores, saved];
      saveLocalSetores(updated);
      return { data: saved, isSupabase: true };
    } catch (err: any) {
      console.error('Erro ao criar setor no Supabase:', err);
      const updated = [...currentSetores, newSetor];
      saveLocalSetores(updated);
      return { data: newSetor, isSupabase: false, error: err.message };
    }
  },

  // 3. Atualizar setor
  async update(
    id: string,
    setorData: Partial<Omit<Setor, 'id' | 'criadoEm'>>
  ): Promise<{ success: boolean; data?: Setor; error?: string; isSupabase: boolean }> {
    const currentSetores = getLocalSetores();
    const existing = currentSetores.find((s) => s.id === id);

    if (!existing) {
      return { success: false, error: 'Setor não encontrado.', isSupabase: false };
    }

    if (setorData.nome && setorData.nome.trim().toLowerCase() !== existing.nome.toLowerCase()) {
      const duplicate = currentSetores.some(
        (s) => s.id !== id && s.nome.toLowerCase().trim() === setorData.nome!.toLowerCase().trim()
      );
      if (duplicate) {
        return {
          success: false,
          error: `Já existe outro setor com o nome "${setorData.nome.trim()}".`,
          isSupabase: false,
        };
      }
    }

    const updatedSetor: Setor = {
      ...existing,
      ...setorData,
      nome: setorData.nome ? setorData.nome.trim() : existing.nome,
      descricao: setorData.descricao !== undefined ? setorData.descricao.trim() : existing.descricao,
      ativo: setorData.ativo !== undefined ? setorData.ativo : existing.ativo,
    };

    if (!isSupabaseConfigured || !supabase) {
      const updatedList = currentSetores.map((s) => (s.id === id ? updatedSetor : s));
      saveLocalSetores(updatedList);
      return { success: true, data: updatedSetor, isSupabase: false };
    }

    try {
      const dbPayload = toDbSetor(updatedSetor);
      const { data, error } = await supabase
        .from('setores')
        .update(dbPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.warn('Erro ao atualizar setor no Supabase:', error.message);
        const updatedList = currentSetores.map((s) => (s.id === id ? updatedSetor : s));
        saveLocalSetores(updatedList);
        return { success: true, data: updatedSetor, isSupabase: false, error: error.message };
      }

      const saved = toAppSetor(data as DbSetor);
      const updatedList = currentSetores.map((s) => (s.id === id ? saved : s));
      saveLocalSetores(updatedList);
      return { success: true, data: saved, isSupabase: true };
    } catch (err: any) {
      console.error('Erro na atualização de setor no Supabase:', err);
      const updatedList = currentSetores.map((s) => (s.id === id ? updatedSetor : s));
      saveLocalSetores(updatedList);
      return { success: true, data: updatedSetor, isSupabase: false, error: err.message };
    }
  },

  // 4. Excluir setor
  async delete(
    id: string,
    existingReservations: Reservation[] = []
  ): Promise<{ success: boolean; isSoftDeleted: boolean; message: string; isSupabase: boolean; error?: string }> {
    const currentSetores = getLocalSetores();
    const setorToDelete = currentSetores.find((s) => s.id === id);

    if (!setorToDelete) {
      return {
        success: false,
        isSoftDeleted: false,
        message: 'Setor não encontrado para exclusão.',
        isSupabase: false,
      };
    }

    const hasReservations = existingReservations.some(
      (r) => r.setor.trim().toLowerCase() === setorToDelete.nome.trim().toLowerCase()
    );

    if (hasReservations) {
      const result = await this.update(id, { ativo: false });
      return {
        success: result.success,
        isSoftDeleted: true,
        message: `O setor "${setorToDelete.nome}" possui reservas vinculadas e foi DESATIVADO para proteger o histórico.`,
        isSupabase: result.isSupabase,
        error: result.error,
      };
    }

    if (!isSupabaseConfigured || !supabase) {
      const updatedList = currentSetores.filter((s) => s.id !== id);
      saveLocalSetores(updatedList);
      return {
        success: true,
        isSoftDeleted: false,
        message: `Setor "${setorToDelete.nome}" excluído com sucesso.`,
        isSupabase: false,
      };
    }

    try {
      const { error } = await supabase.from('setores').delete().eq('id', id);

      if (error) {
        console.warn('Erro ao excluir setor no Supabase:', error.message);
        const result = await this.update(id, { ativo: false });
        return {
          success: result.success,
          isSoftDeleted: true,
          message: `Setor desativado com segurança.`,
          isSupabase: true,
          error: error.message,
        };
      }

      const updatedList = currentSetores.filter((s) => s.id !== id);
      saveLocalSetores(updatedList);
      return {
        success: true,
        isSoftDeleted: false,
        message: `Setor "${setorToDelete.nome}" removido do banco.`,
        isSupabase: true,
      };
    } catch (err: any) {
      console.error('Falha ao remover setor:', err);
      const updatedList = currentSetores.filter((s) => s.id !== id);
      saveLocalSetores(updatedList);
      return {
        success: true,
        isSoftDeleted: false,
        message: `Setor removido localmente com sucesso.`,
        isSupabase: false,
        error: err.message,
      };
    }
  },

  // 5. Inscrição em Tempo Real (Supabase Realtime)
  subscribeToChanges(onReload: () => void): () => void {
    if (!isSupabaseConfigured || !supabase) {
      return () => {};
    }

    try {
      const channel = supabase
        .channel('setores-realtime-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'setores' }, (payload) => {
          console.log('⚡ Atualização Realtime de Setores recebida:', payload);
          onReload();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Não foi possível conectar ao canal Realtime de setores:', err);
      return () => {};
    }
  },
};

