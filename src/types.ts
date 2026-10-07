export type UserRole = 'MASTER' | 'COMMON';

export interface AppUser {
  cpf: string;
  nome: string;
  primeiroNome: string;
  loginEm: string;
  role: UserRole;
}

export interface Reservation {
  id: string;
  dia: string; // YYYY-MM-DD
  sala: string;
  filial?: string; // Unidade/Filial da reserva
  horaInicial: string; // HH:mm
  horaFinal: string; // HH:mm
  solicitante: string;
  setor: string;
  glpi: string;
  observacoes?: string;
  criadoEm: string;
  criadoPor?: string;
  criadoPorCpf?: string; // CPF do operador responsável pelo cadastro (Rastreabilidade)
  modificadoPor?: string;
  modificadoPorCpf?: string;
  modificadoEm?: string;
}

export interface FilialInfo {
  id: string;
  nome: string;
  isMatriz: boolean;
  cidade: string;
  badge?: string;
}

export interface Filial {
  id: string;
  nome: string; // Campo Filial / Nome da Unidade (Obrigatório)
  cidade: string; // Cidade (Obrigatório)
  estado: string; // UF / Estado (Obrigatório)
  endereco: string; // Endereço / Localização (Obrigatório)
  responsavel: string; // Responsável / Facilities (Obrigatório)
  observacoes?: string; // Observações Gerais (ÚNICO CAMPO OPCIONAL)
  isMatriz: boolean;
  ativa: boolean;
  criadaEm: string;
  modificadoPor?: string;
}

export interface Sala {
  id: string;
  nome: string;
  filial: string;
  capacidade?: number | null;
  recursos?: string[]; // ex: ['TV', 'Videoconferência', 'Projetor', 'Quadro Branco', 'Ar-Condicionado']
  ativa: boolean;
  criadoEm: string;
  atualizadoEm?: string;
  modificadoPor?: string;
}

export interface DbSala {
  id: string;
  nome: string;
  filial: string;
  capacidade?: number | null;
  recursos?: string[] | null;
  ativa: boolean;
  criado_em: string;
  atualizado_em?: string;
}

export interface Setor {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criadoEm: string;
  modificadoPor?: string;
}

export interface DbSetor {
  id: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  created_at?: string;
}

export type ReservationStatus = 'em_andamento' | 'agendada_hoje' | 'futura' | 'encerrada';

export interface FilterOptions {
  data?: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  solicitante: string;
  glpi: string;
  sala: string;
  setor: string;
  filial: string;
  mostrarEncerradas: boolean;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

