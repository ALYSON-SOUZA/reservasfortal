import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  User,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  X,
  Crown,
  Sparkles,
} from 'lucide-react';
import { authService, formatCPF, isValidCPF, extractFirstName } from '../services/authService';
import {
  findMasterUser,
  cleanCPF,
} from '../utils/rbac';
import { loginRateLimiter, RateLimitStatus } from '../utils/rateLimiter';
import { AppUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cpfInputRef = useRef<HTMLInputElement>(null);

  // Rate Limiting por IP para Proteção contra Força Bruta (LGPD Art. 46)
  const [rateStatus, setRateStatus] = useState<RateLimitStatus>({
    clientIp: 'Detectando IP...',
    isBlocked: false,
    lockoutSeconds: 0,
    remainingAttempts: 5,
    maxAttempts: 5,
    attempts: 0,
  });
  const [countdown, setCountdown] = useState<number>(0);

  // Estado para Modal de Recuperação de Senha do Usuário Master
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryCpf, setRecoveryCpf] = useState('');
  const [recoveryResult, setRecoveryResult] = useState<{
    success: boolean;
    message: string;
    password?: string;
    masterName?: string;
  } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  // Inicializa verificação de Rate Limit por IP ao carregar tela
  useEffect(() => {
    let isMounted = true;
    const fetchRateStatus = async () => {
      try {
        const status = await loginRateLimiter.getStatus();
        if (isMounted) {
          setRateStatus(status);
          if (status.isBlocked && status.lockoutSeconds > 0) {
            setCountdown(status.lockoutSeconds);
          }
        }
      } catch (e) {
        console.error('Erro ao consultar rate limiter:', e);
      }
    };
    fetchRateStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // Timer decrescente de bloqueio temporário
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          loginRateLimiter.getStatus().then((st) => {
            setRateStatus(st);
            if (!st.isBlocked) setError(null);
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Identificação dinâmica por CPF sem expor perfil antecipadamente
  const digitsOnly = cleanCPF(cpf);
  const detectedMaster = findMasterUser(digitsOnly);
  const isMasterUser = Boolean(detectedMaster);

  // Ao identificar o CPF do Usuário Master, preenche dinamicamente o nome correspondente
  useEffect(() => {
    if (detectedMaster) {
      setNome(detectedMaster.nome);
    }
  }, [detectedMaster]);

  // Manipulador seguro e fluido de digitação do CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digits = cleanCPF(rawVal).slice(0, 11);
    const formatted = formatCPF(digits);
    setCpf(formatted);
    if (error) setError(null);
  };

  // Suporte aprimorado ao Backspace para não travar na pontuação (. ou -)
  const handleCpfKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const target = e.currentTarget;
      const { selectionStart, selectionEnd } = target;
      if (selectionStart && selectionStart === selectionEnd) {
        const charBefore = cpf[selectionStart - 1];
        if (charBefore === '.' || charBefore === '-') {
          e.preventDefault();
          const digits = cleanCPF(cpf);
          const subBefore = cleanCPF(cpf.slice(0, selectionStart));
          const newDigits = subBefore.slice(0, -1) + cleanCPF(cpf.slice(selectionStart));
          setCpf(formatCPF(newDigits));
        }
      }
    }
  };

  // Suporte à colagem (paste) de CPF com ou sem formatação
  const handleCpfPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const digits = cleanCPF(pastedText).slice(0, 11);
    setCpf(formatCPF(digits));
    if (error) setError(null);
  };

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNome(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedNome = nome.trim();
    const normalizedDigits = digitsOnly.length === 10 ? digitsOnly.padStart(11, '0') : digitsOnly;

    if (!normalizedDigits || normalizedDigits.length < 11) {
      setError('Por favor, digite seu CPF completo com 11 dígitos.');
      cpfInputRef.current?.focus();
      return;
    }

    if (!isValidCPF(normalizedDigits)) {
      setError('O CPF informado possui dígitos inválidos ou todos iguais.');
      return;
    }

    if (!trimmedNome || trimmedNome.length < 3) {
      setError('Por favor, informe seu nome completo (mínimo de 3 caracteres).');
      return;
    }

    // Se for o Usuário Master identificado, exige a senha administrativa correspondente
    if (isMasterUser) {
      if (!password) {
        setError('Por favor, digite a sua senha de acesso de Administrador Master.');
        return;
      }
    }

    // Validação preventiva de bloqueio por IP (LGPD Art. 46)
    if (rateStatus.isBlocked || countdown > 0) {
      setError(
        `🔒 Acesso temporariamente bloqueado (LGPD): Limite de 5 tentativas por IP excedido para prevenir ataques de força bruta. Aguarde ${loginRateLimiter.formatSeconds(countdown || rateStatus.lockoutSeconds)} para tentar novamente a partir do IP ${rateStatus.clientIp}.`
      );
      return;
    }

    setIsLoading(true);
    try {
      const user = authService.login(normalizedDigits, trimmedNome, password);
      // Sucesso: reseta histórico de tentativas no backend e storage local
      await loginRateLimiter.recordAttempt(true, normalizedDigits);
      setIsLoading(false);
      onLoginSuccess(user);
    } catch (err: any) {
      // Falha: registra tentativa incorreta vinculada ao IP
      const updated = await loginRateLimiter.recordAttempt(false, normalizedDigits);
      setRateStatus(updated);
      setIsLoading(false);

      if (updated.isBlocked) {
        setCountdown(updated.lockoutSeconds);
        setError(
          `🔒 Bloqueio de Segurança LGPD Ativado: Limite de 5 tentativas incorretas atingido para o IP ${updated.clientIp}. Acesso temporariamente bloqueado por ${loginRateLimiter.formatSeconds(updated.lockoutSeconds)}.`
        );
      } else {
        setError(
          `${err.message || 'Falha ao autenticar.'} (Tentativa ${updated.attempts} de 5 permitidas para o IP ${updated.clientIp} antes do bloqueio temporário)`
        );
      }
    }
  };

  // Recuperação de senha exclusiva para o Usuário Master com proteção por IP
  const handleExecuteRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetFeedback(null);

    if (rateStatus.isBlocked || countdown > 0) {
      setRecoveryResult({
        success: false,
        message: `Ação bloqueada temporariamente para o IP ${rateStatus.clientIp}. Aguarde ${loginRateLimiter.formatSeconds(countdown)}.`,
      });
      return;
    }

    const digits = cleanCPF(recoveryCpf);

    if (!digits) {
      setRecoveryResult({
        success: false,
        message: 'Por favor, informe o CPF para recuperação de senha.',
      });
      return;
    }

    const res = authService.recoverMasterPassword(digits);
    if (!res.success) {
      // Conta como tentativa falha para prevenir enumeração de credenciais
      const updated = await loginRateLimiter.recordAttempt(false, digits);
      setRateStatus(updated);
      if (updated.isBlocked) {
        setCountdown(updated.lockoutSeconds);
      }
    }
    setRecoveryResult(res);
  };

  const handleExecuteResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryResult || !recoveryResult.success) return;
    const digits = cleanCPF(recoveryCpf);

    const res = authService.resetMasterPassword(digits, newPasswordInput);
    if (res.success) {
      setResetFeedback(`✓ Senha redefinida com sucesso! Nova senha: "${newPasswordInput}"`);
      setRecoveryResult((prev) => (prev ? { ...prev, password: newPasswordInput } : null));
      setNewPasswordInput('');
      if (cleanCPF(cpf) === digits) {
        setPassword(newPasswordInput);
      }
    } else {
      setResetFeedback(`❌ ${res.message}`);
    }
  };

  const previewFirstName = extractFirstName(nome);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7D1416]/95 via-[#252A34] to-[#16181F] flex items-center justify-center p-4 sm:p-6 font-dm-sans selection:bg-[#7D1416] selection:text-white">
      {/* Luzes de fundo corporativas */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#7D1416]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-[#FF2E63]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Principal de Autenticação */}
        <div className="bg-white rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 backdrop-blur-sm">
          {/* Cabeçalho Institucional Bellinati Perez */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#7D1416] text-white shadow-lg shadow-[#7D1416]/30 mb-3 ring-4 ring-[#AD2F3B]/20">
              <Building2 className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#7D1416] font-raleway tracking-tight">
              Reserva de Salas
            </h1>
            <p className="text-xs text-[#252A34]/70 font-raleway font-bold uppercase tracking-wider mt-0.5">
              Bellinati Perez
            </p>
          </div>

          {/* Formulário Unificado com Identificação Dinâmica */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Bloqueio Ativo por Rate Limiting / Força Bruta por IP (LGPD Art. 46) */}
            {(rateStatus.isBlocked || countdown > 0) && (
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs font-dm-sans mb-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2 font-bold font-raleway text-rose-900 text-sm mb-1">
                  <Lock className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>Bloqueio de Segurança por IP (LGPD Art. 46)</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed mb-2.5">
                  Limite de <strong>5 tentativas de autenticação</strong> atingido para o IP <strong>{rateStatus.clientIp}</strong>.
                  Para prevenir ataques de força bruta aos dados dos colaboradores, novas tentativas de acesso estão temporariamente bloqueadas.
                </p>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-rose-200">
                  <span className="text-[11px] font-semibold text-rose-800">⏳ Tempo restante para desbloqueio:</span>
                  <span className="font-mono font-black text-sm text-rose-900 px-2 py-0.5 rounded-lg bg-rose-100 border border-rose-300">
                    {loginRateLimiter.formatSeconds(countdown || rateStatus.lockoutSeconds)}
                  </span>
                </div>
              </div>
            )}

            {/* Mensagem de Erro */}
            {error && !rateStatus.isBlocked && countdown <= 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-[#AD2F3B] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Input CPF com Digitação Livre e Fluida */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-cpf" className="block text-xs font-bold text-slate-700 font-raleway">
                  CPF *
                </label>
                {cpf && (
                  <button
                    type="button"
                    onClick={() => {
                      setCpf('');
                      if (detectedMaster) setNome('');
                      setError(null);
                      cpfInputRef.current?.focus();
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  ref={cpfInputRef}
                  id="login-cpf"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  value={cpf}
                  onChange={handleCpfChange}
                  onKeyDown={handleCpfKeyDown}
                  onPaste={handleCpfPaste}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#AD2F3B] focus:ring-4 focus:ring-[#AD2F3B]/15 outline-hidden transition text-sm font-mono font-bold text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-dm-sans mt-1">
                Digite os 11 dígitos do seu CPF (a formatação com pontos e traço é aplicada automaticamente)
              </p>
            </div>

            {/* Input Nome Completo */}
            <div>
              <label htmlFor="login-nome" className="block text-xs font-bold text-slate-700 mb-1.5 font-raleway">
                NOME COMPLETO *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  id="login-nome"
                  type="text"
                  required
                  value={nome}
                  onChange={handleNomeChange}
                  placeholder="Informe seu nome completo"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#AD2F3B] focus:ring-4 focus:ring-[#AD2F3B]/15 outline-hidden transition text-sm font-semibold text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white font-dm-sans"
                />
              </div>
              {nome.trim().length >= 3 && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold font-dm-sans">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Identificado: <strong>{previewFirstName}</strong></span>
                </div>
              )}
            </div>

            {/* Aviso Dinâmico: Perfil Master Reconhecido */}
            {isMasterUser && detectedMaster && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/70 border-2 border-amber-300 text-amber-950 text-xs font-dm-sans shadow-xs animate-in fade-in">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 font-bold font-raleway text-amber-900 text-sm">
                    <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Administrador Master Reconhecido</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-400">
                    Master
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  Colaborador: <strong>{detectedMaster.nome}</strong>. Digite a sua senha administrativa abaixo para habilitar privilégios totais de edição e exclusão.
                </p>
              </div>
            )}

            {/* Aviso Dinâmico: Acesso Livre (Sem necessidade de cadastro prévio) */}
            {!isMasterUser && digitsOnly.length >= 10 && (
              <div className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-xs font-dm-sans flex items-start gap-2.5 animate-in fade-in shadow-xs">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-[11px] text-emerald-900 leading-relaxed">
                  <strong className="block font-bold font-raleway text-emerald-950 mb-0.5">
                    Acesso Livre Bellinati Perez
                  </strong>
                  Não é necessário cadastro prévio ou senha! Basta informar seu nome e CPF para consultar horários e agendar reuniões.
                </div>
              </div>
            )}

            {/* Input Senha: Exibido exclusivamente e dinamicamente quando o CPF for Usuário Master */}
            {isMasterUser && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-150 pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-senha" className="block text-xs font-bold text-[#7D1416] font-raleway flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#AD2F3B]" />
                    <span>SENHA MASTER *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryCpf(cpf);
                      setRecoveryResult(null);
                      setResetFeedback(null);
                      setIsRecoveryOpen(true);
                    }}
                    className="text-[11px] font-bold text-[#AD2F3B] hover:text-[#7D1416] underline underline-offset-2 cursor-pointer"
                  >
                    Recuperar senha
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 text-[#AD2F3B]" />
                  </div>
                  <input
                    id="login-senha"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Digite a senha de administrador master"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-[#AD2F3B]/40 focus:border-[#7D1416] focus:ring-4 focus:ring-[#7D1416]/15 outline-hidden transition text-sm font-mono font-bold text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Indicador de Proteção por IP & Limite de Tentativas (LGPD) */}
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px] font-dm-sans">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-slate-600">Proteção por IP (LGPD):</span>
                <strong className={rateStatus.remainingAttempts <= 2 ? 'text-amber-700 font-bold' : 'text-slate-800'}>
                  {rateStatus.remainingAttempts} de {rateStatus.maxAttempts} tentativa{rateStatus.remainingAttempts === 1 ? '' : 's'}
                </strong>
              </div>
              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]" title={`Endereço IP: ${rateStatus.clientIp}`}>
                IP: {rateStatus.clientIp}
              </span>
            </div>

            {/* Botão de Envio (CTA com Rosa #FF2E63) */}
            <button
              id="btn-login-entrar"
              type="submit"
              disabled={isLoading || rateStatus.isBlocked || countdown > 0}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-white font-bold font-raleway tracking-wider text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF2E63]/30 transition active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validando...</span>
                </>
              ) : rateStatus.isBlocked || countdown > 0 ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Bloqueado ({loginRateLimiter.formatSeconds(countdown || rateStatus.lockoutSeconds)})</span>
                </>
              ) : (
                <>
                  <span>{isMasterUser ? 'Entrar como Administrador Master' : 'Entrar no Sistema'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé Interno */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 text-center font-dm-sans">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Sistema Seguro Bellinati Perez • Acesso Livre & RBAC</span>
          </div>
        </div>

        {/* Rodapé Institucional */}
        <p className="text-center text-xs text-white/70 mt-4 font-medium font-dm-sans">
          Bellinati Perez • Sistema de Gestão de Salas de Reunião
        </p>
      </div>

      {/* Modal de Recuperação de Senha Restrita */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="bg-[#7D1416] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#AD2F3B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold font-raleway text-base text-white">
                    Recuperação de Senha Master
                  </h3>
                  <p className="text-[11px] text-[#EAEAEA]/80 font-dm-sans">
                    Validação de credencial administrativa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecoveryOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="p-5 sm:p-6 space-y-4 font-dm-sans">
              <form onSubmit={handleExecuteRecovery} className="space-y-3">
                <div>
                  <label htmlFor="recovery-cpf" className="block text-xs font-bold text-slate-700 mb-1 font-raleway">
                    CONFIRME SEU CPF
                  </label>
                  <input
                    id="recovery-cpf"
                    type="text"
                    required
                    value={recoveryCpf}
                    onChange={(e) => setRecoveryCpf(formatCPF(cleanCPF(e.target.value).slice(0, 11)))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-bold border-2 border-slate-200 rounded-xl focus:border-[#AD2F3B] focus:ring-2 focus:ring-[#AD2F3B]/15 outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#7D1416] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Verificar Credencial</span>
                </button>
              </form>

              {/* Resultado da Recuperação */}
              {recoveryResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    recoveryResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <p className="leading-relaxed font-medium">{recoveryResult.message}</p>

                  {recoveryResult.success && recoveryResult.password && (
                    <div className="mt-2.5 p-2.5 bg-white rounded-lg border border-emerald-300 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                          Senha Atual:
                        </span>
                        <span className="font-mono font-black text-sm text-[#7D1416]">
                          {recoveryResult.password}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPassword(recoveryResult.password || '');
                          setCpf(recoveryCpf);
                          setIsRecoveryOpen(false);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold transition cursor-pointer"
                      >
                        Usar Senha
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Formulário para Redefinir Senha se Validado */}
              {recoveryResult && recoveryResult.success && (
                <form onSubmit={handleExecuteResetPassword} className="pt-2 border-t border-slate-100 space-y-2.5">
                  <label htmlFor="new-master-password" className="block text-xs font-bold text-slate-700 font-raleway">
                    OU DEFINIR NOVA SENHA:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="new-master-password"
                      type="text"
                      placeholder="Nova senha (min. 4 caracteres)"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs font-mono font-bold border-2 border-slate-200 rounded-xl focus:border-[#AD2F3B] outline-hidden"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-[#FF2E63] hover:bg-[#AD2F3B] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Salvar
                    </button>
                  </div>
                  {resetFeedback && (
                    <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                      {resetFeedback}
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Rodapé */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRecoveryOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
