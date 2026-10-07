import { Filial } from '../types';

const LOCAL_STORAGE_KEY = 'filiais_bellinati_facilities_v1';

// 6 Filiais Oficiais da Bellinati Perez
export const DEFAULT_FILIAIS: Filial[] = [
  {
    id: 'filial-maringa',
    nome: 'Maringá (Matriz)',
    cidade: 'Maringá',
    estado: 'PR',
    endereco: 'Av. Duque de Caxias, 882 - Zona 01, Maringá - PR',
    responsavel: 'Facilities Matriz / Alyson Souza',
    observacoes: 'Sede Principal Corporativa Bellinati Perez com auditório principal e salas executivas.',
    isMatriz: true,
    ativa: true,
    criadaEm: '2026-01-01T00:00:00Z',
  },
  {
    id: 'filial-curitiba-park',
    nome: 'Curitiba Park & Business',
    cidade: 'Curitiba',
    estado: 'PR',
    endereco: 'Rua Prof. Pedro Viriato Parigot de Souza, 3901 - Mossunguê, Curitiba - PR',
    responsavel: 'Coordenação Regional PR / Facilities',
    observacoes: 'Edifício Park & Business - Unidade com salas para diretoria e conferências.',
    isMatriz: false,
    ativa: true,
    criadaEm: '2026-01-01T00:00:00Z',
  },
  {
    id: 'filial-curitiba-cebp',
    nome: 'Curitiba/CEBP',
    cidade: 'Curitiba',
    estado: 'PR',
    endereco: 'Centro Empresarial Bellinati Perez - CEBP, Curitiba - PR',
    responsavel: 'Administração Predial CEBP',
    observacoes: 'Complexo de operações e treinamentos corporativos.',
    isMatriz: false,
    ativa: true,
    criadaEm: '2026-01-01T00:00:00Z',
  },
  {
    id: 'filial-curitiba-marechal',
    nome: 'Curitiba/Marechal',
    cidade: 'Curitiba',
    estado: 'PR',
    endereco: 'Av. Marechal Floriano Peixoto, Curitiba - PR',
    responsavel: 'Supervisão de Operações Marechal',
    observacoes: 'Salas para atendimento operacional e reuniões de equipe.',
    isMatriz: false,
    ativa: true,
    criadaEm: '2026-01-01T00:00:00Z',
  },
  {
    id: 'filial-curitiba-toronto',
    nome: 'Curitiba/Toronto',
    cidade: 'Curitiba',
    estado: 'PR',
    endereco: 'Edifício Toronto Corporate, Curitiba - PR',
    responsavel: 'Gestão de Espaços Corporativos',
    observacoes: 'Salas executivas equipadas com videoconferência.',
    isMatriz: false,
    ativa: true,
    criadaEm: '2026-01-01T00:00:00Z',
  },
  {
    id: 'filial-fortaleza-planalto',
    nome: 'Fortaleza/planalto',
    cidade: 'Fortaleza',
    estado: 'CE',
    endereco: 'Av. Santos Dumont / Planalto Business, Fortaleza - CE',
    responsavel: 'Facilities Regional Nordeste',
    observacoes: 'Auditório 215, salas executivas e espaços de contingência.',
    isMatriz: false,
    ativa: true,
    criadaEm: '2026-01-01T00:00:00Z',
  },
];

function getStoredFiliais(): Filial[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_FILIAIS));
      return DEFAULT_FILIAIS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Garante que todas as filiais padrão estejam presentes
      const existingNames = new Set(parsed.map((f: Filial) => f.nome.toLowerCase().trim()));
      const missingDefaults = DEFAULT_FILIAIS.filter(
        (df) => !existingNames.has(df.nome.toLowerCase().trim())
      );
      if (missingDefaults.length > 0) {
        const merged = [...parsed, ...missingDefaults];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
    return DEFAULT_FILIAIS;
  } catch {
    return DEFAULT_FILIAIS;
  }
}

function saveStoredFiliais(filiais: Filial[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filiais));
  } catch (e) {
    console.error('Erro ao salvar filiais no localStorage:', e);
  }
}

export const filialService = {
  async getAll(options?: { apenasAtivas?: boolean }): Promise<{ data: Filial[]; error: string | null }> {
    const list = getStoredFiliais();
    const filtered = options?.apenasAtivas ? list.filter((f) => f.ativa) : list;
    return { data: filtered, error: null };
  },

  async getById(id: string): Promise<{ data: Filial | null; error: string | null }> {
    const list = getStoredFiliais();
    const item = list.find((f) => f.id === id) || null;
    return { data: item, error: item ? null : 'Filial não encontrada.' };
  },

  async create(data: {
    nome: string; // Campo Filial / Nome da Unidade (Obrigatório)
    cidade: string; // Cidade (Obrigatório)
    estado: string; // Estado (Obrigatório)
    endereco: string; // Endereço (Obrigatório)
    responsavel: string; // Responsável (Obrigatório)
    observacoes?: string; // Observações (Único campo opcional)
    isMatriz?: boolean;
    ativa?: boolean;
    modificadoPor?: string;
  }): Promise<{ data: Filial | null; error: string | null }> {
    // Validação estrita: Todos os campos são obrigatórios, exceto observações
    const trimmedNome = data.nome.trim();
    const trimmedCidade = data.cidade.trim();
    const trimmedEstado = data.estado.trim();
    const trimmedEndereco = data.endereco.trim();
    const trimmedResponsavel = data.responsavel.trim();

    if (!trimmedNome) {
      return { data: null, error: 'O campo Filial (Nome da Unidade) é obrigatório.' };
    }
    if (!trimmedCidade) {
      return { data: null, error: 'O campo Cidade é obrigatório.' };
    }
    if (!trimmedEstado) {
      return { data: null, error: 'O campo Estado (UF) é obrigatório.' };
    }
    if (!trimmedEndereco) {
      return { data: null, error: 'O campo Endereço é obrigatório.' };
    }
    if (!trimmedResponsavel) {
      return { data: null, error: 'O campo Responsável é obrigatório.' };
    }

    const list = getStoredFiliais();
    const exists = list.some((f) => f.nome.toLowerCase().trim() === trimmedNome.toLowerCase());
    if (exists) {
      return { data: null, error: `Já existe uma filial cadastrada com o nome "${trimmedNome}".` };
    }

    const novaFilial: Filial = {
      id: `filial-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nome: trimmedNome,
      cidade: trimmedCidade,
      estado: trimmedEstado.toUpperCase(),
      endereco: trimmedEndereco,
      responsavel: trimmedResponsavel,
      observacoes: data.observacoes?.trim() || '', // ÚNICO CAMPO OPCIONAL
      isMatriz: Boolean(data.isMatriz),
      ativa: data.ativa ?? true,
      criadaEm: new Date().toISOString(),
      modificadoPor: data.modificadoPor,
    };

    const updated = [...list, novaFilial];
    saveStoredFiliais(updated);
    return { data: novaFilial, error: null };
  },

  async update(
    id: string,
    data: {
      nome?: string;
      cidade?: string;
      estado?: string;
      endereco?: string;
      responsavel?: string;
      observacoes?: string;
      isMatriz?: boolean;
      ativa?: boolean;
      modificadoPor?: string;
    }
  ): Promise<{ data: Filial | null; error: string | null }> {
    const list = getStoredFiliais();
    const idx = list.findIndex((f) => f.id === id);
    if (idx === -1) {
      return { data: null, error: 'Filial não encontrada.' };
    }

    const existing = list[idx];

    // Validação estrita se os campos foram fornecidos para atualização
    if (data.nome !== undefined && !data.nome.trim()) {
      return { data: null, error: 'O campo Filial (Nome da Unidade) é obrigatório.' };
    }
    if (data.cidade !== undefined && !data.cidade.trim()) {
      return { data: null, error: 'O campo Cidade é obrigatório.' };
    }
    if (data.estado !== undefined && !data.estado.trim()) {
      return { data: null, error: 'O campo Estado (UF) é obrigatório.' };
    }
    if (data.endereco !== undefined && !data.endereco.trim()) {
      return { data: null, error: 'O campo Endereço é obrigatório.' };
    }
    if (data.responsavel !== undefined && !data.responsavel.trim()) {
      return { data: null, error: 'O campo Responsável é obrigatório.' };
    }

    const updatedFilial: Filial = {
      ...existing,
      nome: data.nome !== undefined ? data.nome.trim() : existing.nome,
      cidade: data.cidade !== undefined ? data.cidade.trim() : existing.cidade,
      estado: data.estado !== undefined ? data.estado.trim().toUpperCase() : existing.estado,
      endereco: data.endereco !== undefined ? data.endereco.trim() : existing.endereco,
      responsavel: data.responsavel !== undefined ? data.responsavel.trim() : existing.responsavel,
      observacoes: data.observacoes !== undefined ? data.observacoes.trim() : existing.observacoes, // ÚNICO CAMPO OPCIONAL
      isMatriz: data.isMatriz !== undefined ? data.isMatriz : existing.isMatriz,
      ativa: data.ativa !== undefined ? data.ativa : existing.ativa,
      modificadoPor: data.modificadoPor || existing.modificadoPor,
    };

    list[idx] = updatedFilial;
    saveStoredFiliais(list);
    return { data: updatedFilial, error: null };
  },

  async delete(id: string): Promise<{ success: boolean; error: string | null }> {
    const list = getStoredFiliais();
    const item = list.find((f) => f.id === id);
    if (!item) {
      return { success: false, error: 'Filial não encontrada.' };
    }
    if (item.isMatriz) {
      return { success: false, error: 'A Matriz Maringá não pode ser excluída por segurança do sistema.' };
    }

    const updated = list.filter((f) => f.id !== id);
    saveStoredFiliais(updated);
    return { success: true, error: null };
  },
};
