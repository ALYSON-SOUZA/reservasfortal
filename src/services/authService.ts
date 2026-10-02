import { AppUser, UserRole } from '../types';
import { MASTER_CPF, MASTER_PASSWORD, isMasterCpf, verifyMasterCredentials, cleanCPF } from '../utils/rbac';

const USER_SESSION_KEY = 'bellinati_reserva_user_session_v1';

// Helper to format CPF as 000.000.000-00
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

// Basic CPF validation
export function isValidCPF(cpfRaw: string): boolean {
  const cpf = cpfRaw.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  
  // Check known invalid sequences
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11), 10)) return false;

  return true;
}

// Helper to extract the 1st name of the user
export function extractFirstName(fullName: string): string {
  if (!fullName) return 'Usuário';
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] || 'Usuário';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export const authService = {
  getCurrentUser(): AppUser | null {
    try {
      const stored = localStorage.getItem(USER_SESSION_KEY);
      if (stored) {
        const user: AppUser = JSON.parse(stored);
        if (user && user.nome && user.cpf) {
          const digits = cleanCPF(user.cpf);
          const computedRole: UserRole = user.role || (digits === MASTER_CPF ? 'MASTER' : 'COMMON');
          return {
            ...user,
            primeiroNome: user.primeiroNome || extractFirstName(user.nome),
            role: computedRole,
          };
        }
      }
    } catch (e) {
      console.error('Erro ao ler sessão de usuário:', e);
    }
    return null;
  },

  /**
   * Realiza a autenticação aplicando a validação de privilégios RBAC:
   * - CPF Master (61881619320): Exige senha '@mouraS0501' e concede role 'MASTER'.
   * - Demais CPFs: Role 'COMMON' (usuário operacional comum).
   */
  login(cpf: string, nome: string, password?: string): AppUser {
    const rawDigits = cleanCPF(cpf);
    const isMaster = isMasterCpf(rawDigits);

    if (isMaster) {
      if (!password || password !== MASTER_PASSWORD) {
        throw new Error('Senha Master incorreta. Verifique suas credenciais de administrador (@mouraS0501).');
      }
    }

    const formattedCpf = formatCPF(rawDigits);
    const cleanedNome = nome.trim() || (isMaster ? 'Gestor Master Bellinati' : 'Colaborador');
    const primeiroNome = extractFirstName(cleanedNome);
    const role: UserRole = isMaster ? 'MASTER' : 'COMMON';

    const user: AppUser = {
      cpf: formattedCpf,
      nome: cleanedNome,
      primeiroNome,
      loginEm: new Date().toISOString(),
      role,
    };

    try {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Erro ao salvar sessão de usuário:', e);
    }

    return user;
  },

  logout(): void {
    try {
      localStorage.removeItem(USER_SESSION_KEY);
    } catch (e) {
      console.error('Erro ao remover sessão de usuário:', e);
    }
  },
};
