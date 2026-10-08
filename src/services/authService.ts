import { AppUser, UserRole } from '../types';
import {
  isMasterCpf,
  verifyMasterCredentials,
  findMasterUser,
  getMasterPassword,
  updateMasterPassword,
  cleanCPF,
  normalizeCPF,
} from '../utils/rbac';

const USER_SESSION_KEY = 'bellinati_reserva_user_session_v1';

// Helper to format CPF progressively as the user types
export function formatCPF(value: string): string {
  const digits = cleanCPF(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

// Basic CPF validation with open access support (any 11 numeric digits allowed for regular users)
export function isValidCPF(cpfRaw: string): boolean {
  if (isMasterCpf(cpfRaw)) return true;
  const cpf = normalizeCPF(cpfRaw);
  if (cpf.length !== 11) return false;
  
  // Seqüência de todos os dígitos iguais (ex: 000.000.000-00, 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

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
          const computedRole: UserRole = isMasterCpf(digits) ? 'MASTER' : (user.role || 'COMMON');
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
   * - CPFs Master Oficiais: Exige validação estrita da respectiva Senha Master.
   * - Demais CPFs: Role 'COMMON' (usuário operacional comum, sem exigência de senha).
   */
  login(cpf: string, nome: string, password?: string): AppUser {
    const rawDigits = cleanCPF(cpf);
    const isMaster = isMasterCpf(rawDigits);
    const masterObj = findMasterUser(rawDigits);

    if (isMaster) {
      if (!password || !verifyMasterCredentials(rawDigits, password)) {
        throw new Error(
          `Senha Master incorreta para ${masterObj?.nome || 'o usuário Master'}. Verifique as credenciais ou utilize a Recuperação de Senha Master.`
        );
      }
    }

    const formattedCpf = formatCPF(rawDigits);
    const cleanedNome = masterObj?.nome || nome.trim() || 'Colaborador';
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

  /**
   * Recuperação restrita de senha exclusiva para usuários Master
   */
  recoverMasterPassword(cpfRaw: string): { success: boolean; password?: string; message: string; masterName?: string } {
    const master = findMasterUser(cpfRaw);
    if (!master) {
      return {
        success: false,
        message: 'O CPF informado não possui privilégios de Usuário Master cadastrados no sistema.',
      };
    }

    const currentPassword = getMasterPassword(cpfRaw);
    return {
      success: true,
      password: currentPassword,
      masterName: master.nome,
      message: `Credencial Master localizada para ${master.nome}.`,
    };
  },

  /**
   * Redefinição de senha exclusiva para usuários Master
   */
  resetMasterPassword(cpfRaw: string, newPassword: string): { success: boolean; message: string } {
    if (!newPassword || newPassword.trim().length < 4) {
      return { success: false, message: 'A nova senha deve possuir no mínimo 4 caracteres.' };
    }

    const updated = updateMasterPassword(cpfRaw, newPassword.trim());
    if (updated) {
      return { success: true, message: 'Senha Master redefinida com sucesso!' };
    }
    return { success: false, message: 'Não foi possível atualizar a senha deste usuário Master.' };
  },

  logout(): void {
    try {
      localStorage.removeItem(USER_SESSION_KEY);
    } catch (e) {
      console.error('Erro ao remover sessão de usuário:', e);
    }
  },
};
