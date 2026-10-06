import { AppUser, UserRole } from '../types';

/**
 * Constantes Oficiais de Acesso Master — Bellinati Perez
 */
export const MASTER_CPF = '61881619320';
export const MASTER_PASSWORD = '@mouraS0501';

/**
 * Remove qualquer formatação do CPF (pontos, traços, espaços)
 */
export function cleanCPF(cpfRaw: string): string {
  return (cpfRaw || '').replace(/\D/g, '');
}

/**
 * Verifica se um CPF informado corresponde ao CPF do usuário Master
 */
export function isMasterCpf(cpfRaw: string): boolean {
  return cleanCPF(cpfRaw) === MASTER_CPF;
}

/**
 * Valida se as credenciais fornecidas conferem com o acesso Master
 */
export function verifyMasterCredentials(cpfRaw: string, password?: string): boolean {
  if (!isMasterCpf(cpfRaw)) return false;
  return password === MASTER_PASSWORD;
}

/**
 * Verifica se o usuário autenticado possui o papel de MASTER
 */
export function isMasterUser(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'MASTER' && isMasterCpf(user.cpf);
}

/**
 * Guarda RBAC:
 * Edição: Permitida para todos os usuários autenticados (com auditoria de modificação).
 * Exclusão: Reservada para Usuários Master.
 */
export function canEditReservation(user: AppUser | null | undefined): boolean {
  return Boolean(user);
}

export function canDeleteReservation(user: AppUser | null | undefined): boolean {
  return isMasterUser(user);
}

export function canEditOrDelete(user: AppUser | null | undefined): boolean {
  return Boolean(user);
}

/**
 * Permissões comuns (disponíveis para todos os usuários autenticados)
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
