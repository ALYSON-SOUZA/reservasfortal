import { AppUser, UserRole } from '../types';

/**
 * Definição dos Usuários Master Oficiais — Bellinati Perez
 * Cadastrados e validados exclusivamente conforme especificação:
 */
export interface MasterUserDefinition {
  nome: string;
  cpfDigits: string; // formato numérico (com ou sem zero à esquerda)
  cpfPadded: string; // 11 dígitos com zero à esquerda
  cpfFormatado: string;
  passwordDefault: string;
}

export const MASTER_USERS: MasterUserDefinition[] = [
  {
    nome: 'Alyson de Moura Souza',
    cpfDigits: '61881619320',
    cpfPadded: '61881619320',
    cpfFormatado: '618.816.193-20',
    passwordDefault: '@mouraS0501',
  },
  {
    nome: 'David Vidal do Carmo',
    cpfDigits: '9038570902',
    cpfPadded: '09038570902',
    cpfFormatado: '090.385.709-02',
    passwordDefault: 'David903',
  },
  {
    nome: 'Debora Regina da Silva Belin',
    cpfDigits: '4488936903',
    cpfPadded: '04488936903',
    cpfFormatado: '044.889.369-03',
    passwordDefault: 'Debora448',
  },
  {
    nome: 'Joao Henrique da Rocha',
    cpfDigits: '11247416909',
    cpfPadded: '11247416909',
    cpfFormatado: '112.474.169-09',
    passwordDefault: 'Joao112',
  },
  {
    nome: 'Kelly Jaqueline Huzar',
    cpfDigits: '2286454922',
    cpfPadded: '02286454922',
    cpfFormatado: '022.864.549-22',
    passwordDefault: 'Kelly228',
  },
  {
    nome: 'Mateus Daniel Rodrigues Damasceno',
    cpfDigits: '11994947985',
    cpfPadded: '11994947985',
    cpfFormatado: '119.949.479-85',
    passwordDefault: 'Mateus119',
  },
  {
    nome: 'Odair de Souza Junior',
    cpfDigits: '9726717906',
    cpfPadded: '09726717906',
    cpfFormatado: '097.267.179-06',
    passwordDefault: 'Odair972',
  },
  {
    nome: 'Ricardo de Paula Zinke',
    cpfDigits: '83357246015',
    cpfPadded: '83357246015',
    cpfFormatado: '833.572.460-15',
    passwordDefault: 'Ricardo833',
  },
  {
    nome: 'Ane Caroline de Souza Bonete',
    cpfDigits: '8832280922',
    cpfPadded: '08832280922',
    cpfFormatado: '088.322.809-22',
    passwordDefault: 'Ane883',
  },
];

const MASTER_CUSTOM_PASSWORDS_KEY = 'bellinati_master_passwords_v2';

/**
 * Remove qualquer formatação do CPF (pontos, traços, espaços)
 */
export function cleanCPF(cpfRaw: string): string {
  return (cpfRaw || '').replace(/\D/g, '');
}

/**
 * Normaliza dígitos do CPF garantindo 11 dígitos com zero à esquerda
 */
export function normalizeCPF(cpfRaw: string): string {
  const digits = cleanCPF(cpfRaw);
  return digits.length < 11 ? digits.padStart(11, '0') : digits;
}

/**
 * Localiza a definição do Usuário Master correspondente ao CPF informado
 */
export function findMasterUser(cpfRaw: string): MasterUserDefinition | undefined {
  const digits = cleanCPF(cpfRaw);
  const padded = normalizeCPF(cpfRaw);
  const unpadded = digits.replace(/^0+/, '');

  return MASTER_USERS.find(
    (u) =>
      u.cpfDigits === digits ||
      u.cpfPadded === padded ||
      u.cpfDigits.replace(/^0+/, '') === unpadded
  );
}

/**
 * Verifica se um CPF informado corresponde a algum dos 8 usuários Master oficiais
 */
export function isMasterCpf(cpfRaw: string): boolean {
  return Boolean(findMasterUser(cpfRaw));
}

/**
 * Obtém a senha vigente do usuário Master (suporta senha personalizada redefinida)
 */
export function getMasterPassword(cpfRaw: string): string {
  const master = findMasterUser(cpfRaw);
  if (!master) return '';

  try {
    const customPasswords = JSON.parse(localStorage.getItem(MASTER_CUSTOM_PASSWORDS_KEY) || '{}');
    const key = master.cpfPadded;
    if (customPasswords[key]) {
      return customPasswords[key];
    }
  } catch {}

  return master.passwordDefault;
}

/**
 * Redefine a senha de um usuário Master de forma segura e persistente
 */
export function updateMasterPassword(cpfRaw: string, newPassword: string): boolean {
  const master = findMasterUser(cpfRaw);
  if (!master) return false;

  try {
    const customPasswords = JSON.parse(localStorage.getItem(MASTER_CUSTOM_PASSWORDS_KEY) || '{}');
    customPasswords[master.cpfPadded] = newPassword;
    localStorage.setItem(MASTER_CUSTOM_PASSWORDS_KEY, JSON.stringify(customPasswords));
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida se as credenciais fornecidas conferem com o acesso Master
 */
export function verifyMasterCredentials(cpfRaw: string, password?: string): boolean {
  if (!isMasterCpf(cpfRaw)) return false;
  const expectedPassword = getMasterPassword(cpfRaw);
  return Boolean(password && password.trim() === expectedPassword);
}

/**
 * Verifica se o usuário autenticado possui o papel de MASTER
 */
export function isMasterUser(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'MASTER' && isMasterCpf(user.cpf);
}

/**
 * Guarda RBAC Rigoroso:
 * Edição: Apenas usuários autenticados com Senha Master.
 * Exclusão: Apenas usuários autenticados com Senha Master.
 * Criação e Visualização: Liberadas para todos os usuários autenticados.
 */
export function canEditReservation(user: AppUser | null | undefined): boolean {
  return isMasterUser(user);
}

export function canDeleteReservation(user: AppUser | null | undefined): boolean {
  return isMasterUser(user);
}

export function canEditOrDelete(user: AppUser | null | undefined): boolean {
  return isMasterUser(user);
}

/**
 * Permissões comuns (disponíveis para todos os usuários cadastrados)
 */
export function canCreateReservation(user: AppUser | null | undefined): boolean {
  return Boolean(user);
}

export function canExportReports(user: AppUser | null | undefined): boolean {
  return Boolean(user);
}

export function canViewReservations(user: AppUser | null | undefined): boolean {
  return Boolean(user);
}

// Compatibilidade retroativa
export const MASTER_CPF = MASTER_USERS[0].cpfDigits;
export const MASTER_PASSWORD = MASTER_USERS[0].passwordDefault;
