/**
 * Sistema de Rate Limiting & Proteção contra Força Bruta
 * Conformidade com a LGPD (Lei nº 13.709/2018 - Art. 46: Segurança da Informação)
 * Bellinati Perez Facilities & TI
 */

export interface RateLimitStatus {
  clientIp: string;
  isBlocked: boolean;
  lockoutSeconds: number;
  remainingAttempts: number;
  maxAttempts: number;
  attempts: number;
  message?: string;
}

const LOCAL_STORAGE_RATE_KEY = 'bellinati_auth_rate_limit_v1';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos

// ========================================================
// 1. RATE LIMITING DE CHAMADAS DE API DO SUPABASE (CLIENT-SIDE)
// ========================================================

class SupabaseApiRateLimiter {
  private callTimestamps: number[] = [];
  private readonly maxCallsPer10Seconds = 30;
  private readonly maxCallsPerMinute = 90;
  private isThrottled = false;
  private throttleUntil = 0;

  /**
   * Verifica se a próxima chamada à API do Supabase é permitida
   * Lança erro com status 429 caso o limite seja ultrapassado.
   */
  public checkLimit(): { allowed: boolean; retryAfter?: number; error?: string } {
    const now = Date.now();

    // Se estiver em estado de throttle temporário
    if (this.isThrottled && now < this.throttleUntil) {
      const waitSeconds = Math.ceil((this.throttleUntil - now) / 1000);
      return {
        allowed: false,
        retryAfter: waitSeconds,
        error: `⚠️ Proteção LGPD / Rate Limit: Muitas requisições simultâneas ao banco de dados Supabase. Aguarde ${waitSeconds}s para prevenir sobrecarga.`,
      };
    }

    // Limpar timestamps com mais de 60 segundos
    this.callTimestamps = this.callTimestamps.filter((t) => now - t < 60000);

    // Checar janela curta (10 segundos)
    const recent10s = this.callTimestamps.filter((t) => now - t < 10000).length;
    if (recent10s >= this.maxCallsPer10Seconds) {
      this.isThrottled = true;
      this.throttleUntil = now + 5000; // 5 segundos de pausa
      return {
        allowed: false,
        retryAfter: 5,
        error: '⚠️ Rate limit preventivo: volume anormal de requisições ao Supabase detectado. Pausa de 5s aplicada.',
      };
    }

    // Checar janela de 1 minuto
    if (this.callTimestamps.length >= this.maxCallsPerMinute) {
      this.isThrottled = true;
      this.throttleUntil = now + 10000; // 10 segundos de pausa
      return {
        allowed: false,
        retryAfter: 10,
        error: '⚠️ Limite de requisições por minuto ao Supabase atingido. Aguarde alguns instantes.',
      };
    }

    this.isThrottled = false;
    this.callTimestamps.push(now);
    return { allowed: true };
  }

  public getStatus() {
    const now = Date.now();
    this.callTimestamps = this.callTimestamps.filter((t) => now - t < 60000);
    return {
      callsInLastMinute: this.callTimestamps.length,
      maxCallsPerMinute: this.maxCallsPerMinute,
      isThrottled: this.isThrottled && now < this.throttleUntil,
      remainingInWindow: Math.max(0, this.maxCallsPerMinute - this.callTimestamps.length),
    };
  }
}

export const supabaseRateLimiter = new SupabaseApiRateLimiter();

// ========================================================
// 2. RATE LIMITING DE AUTENTICAÇÃO POR IP NA TELA DE LOGIN
// ========================================================

/**
 * Lê o estado de rate limit local como fallback seguro caso o servidor esteja indisponível
 */
function getLocalRateLimitFallback(): RateLimitStatus {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_RATE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const now = Date.now();
      if (data.blockedUntil && data.blockedUntil > now) {
        const lockoutSeconds = Math.ceil((data.blockedUntil - now) / 1000);
        return {
          clientIp: data.clientIp || '127.0.0.1 (Local)',
          isBlocked: true,
          lockoutSeconds,
          remainingAttempts: 0,
          maxAttempts: MAX_ATTEMPTS,
          attempts: data.attempts || MAX_ATTEMPTS,
        };
      }
      // Se a janela expirou, limpa
      if (data.firstAttemptAt && now - data.firstAttemptAt > LOCKOUT_MS) {
        localStorage.removeItem(LOCAL_STORAGE_RATE_KEY);
      } else {
        const remaining = Math.max(0, MAX_ATTEMPTS - (data.attempts || 0));
        return {
          clientIp: data.clientIp || '127.0.0.1 (Local)',
          isBlocked: remaining <= 0,
          lockoutSeconds: 0,
          remainingAttempts: remaining,
          maxAttempts: MAX_ATTEMPTS,
          attempts: data.attempts || 0,
        };
      }
    }
  } catch {
    // ignore
  }

  return {
    clientIp: 'Verificando IP...',
    isBlocked: false,
    lockoutSeconds: 0,
    remainingAttempts: MAX_ATTEMPTS,
    maxAttempts: MAX_ATTEMPTS,
    attempts: 0,
  };
}

function saveLocalRateLimitFallback(attempts: number, blockedUntil: number | null, ip?: string) {
  try {
    const payload = {
      attempts,
      blockedUntil,
      clientIp: ip || '127.0.0.1 (Local)',
      firstAttemptAt: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_RATE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export const loginRateLimiter = {
  /**
   * Consulta o status atual de bloqueio do IP atual no backend (com fallback local)
   */
  async getStatus(): Promise<RateLimitStatus> {
    try {
      const res = await fetch('/api/auth/rate-limit-status', {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        // Sincroniza fallback local
        if (data.isBlocked) {
          saveLocalRateLimitFallback(
            data.attempts,
            Date.now() + (data.lockoutSeconds * 1000),
            data.clientIp
          );
        }
        return data;
      }
    } catch {
      // Fallback local se estiver offline
    }
    return getLocalRateLimitFallback();
  },

  /**
   * Registra uma tentativa de login (sucesso ou falha) por IP
   */
  async recordAttempt(success: boolean, identifier?: string): Promise<RateLimitStatus> {
    try {
      const res = await fetch('/api/auth/record-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success, identifier }),
      });

      if (res.ok) {
        const data = await res.json();
        if (success) {
          localStorage.removeItem(LOCAL_STORAGE_RATE_KEY);
        } else if (data.isBlocked) {
          saveLocalRateLimitFallback(
            data.attempts,
            Date.now() + (data.lockoutSeconds * 1000),
            data.clientIp
          );
        } else {
          saveLocalRateLimitFallback(data.attempts, null, data.clientIp);
        }
        return data;
      }
    } catch {
      // Fallback offline
    }

    // Tratamento no fallback local
    const current = getLocalRateLimitFallback();
    if (success) {
      localStorage.removeItem(LOCAL_STORAGE_RATE_KEY);
      return {
        ...current,
        attempts: 0,
        remainingAttempts: MAX_ATTEMPTS,
        isBlocked: false,
        lockoutSeconds: 0,
      };
    }

    const newAttempts = current.attempts + 1;
    const isBlocked = newAttempts >= MAX_ATTEMPTS;
    const blockedUntil = isBlocked ? Date.now() + LOCKOUT_MS : null;
    const lockoutSeconds = isBlocked ? Math.ceil(LOCKOUT_MS / 1000) : 0;

    saveLocalRateLimitFallback(newAttempts, blockedUntil, current.clientIp);

    return {
      clientIp: current.clientIp,
      isBlocked,
      lockoutSeconds,
      remainingAttempts: Math.max(0, MAX_ATTEMPTS - newAttempts),
      maxAttempts: MAX_ATTEMPTS,
      attempts: newAttempts,
      message: isBlocked
        ? 'Bloqueio de Segurança LGPD ativado: Limite de 5 tentativas por IP excedido.'
        : `Tentativa incorreta. Restam ${Math.max(0, MAX_ATTEMPTS - newAttempts)} tentativa(s).`,
    };
  },

  /**
   * Reseta o contador de tentativas após autenticação bem-sucedida
   */
  async reset(ip?: string): Promise<void> {
    try {
      localStorage.removeItem(LOCAL_STORAGE_RATE_KEY);
      await fetch('/api/auth/reset-rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // ignore
    }
  },

  /**
   * Formata segundos no formato MM:SS
   */
  formatSeconds(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },
};
