import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Crown,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { authService, formatCPF, isValidCPF, extractFirstName } from '../services/authService';
import { MASTER_CPF, MASTER_PASSWORD, isMasterCpf, cleanCPF } from '../utils/rbac';
import { AppUser, UserRole } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'COMMON' | 'MASTER'>('COMMON');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Detecta se o CPF digitado no momento corresponde ao CPF Master oficial
  const digitsOnly = cleanCPF(cpf);
  const isCurrentCpfMaster = isMasterCpf(digitsOnly);

  // Sincroniza o modo visual caso o usuário digite o CPF Master diretamente
  useEffect(() => {
    if (isCurrentCpfMaster && authMode !== 'MASTER') {
      setAuthMode('MASTER');
      if (!nome) {
        setNome('Gestor Master Bellinati');
      }
    }
  }, [isCurrentCpfMaster, authMode, nome]);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = formatCPF(e.target.value);
    setCpf(masked);
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

  // Alterna manualmente entre modo Colaborador e Administrador Master
  const handleSelectMode = (mode: 'COMMON' | 'MASTER') => {
    setAuthMode(mode);
    setError(null);
    if (mode === 'MASTER') {
      setCpf(formatCPF(MASTER_CPF));
      if (!nome) setNome('Gestor Master Bellinati');
    } else {
      if (digitsOnly === MASTER_CPF) {
        setCpf('');
        setNome('');
      }
      setPassword('');
    }
  };

  // Preenchimento rápido para homologação e auditoria das credenciais Master
  const handleQuickFillMaster = () => {
    setAuthMode('MASTER');
    setCpf(formatCPF(MASTER_CPF));
    setNome('Moura - Gestor Master');
    setPassword(MASTER_PASSWORD);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedNome = nome.trim();
    if (!trimmedNome || trimmedNome.length < 3) {
      setError('Por favor, informe seu nome completo (mínimo de 3 caracteres).');
      return;
    }

    if (digitsOnly.length !== 11) {
      setError('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    if (!isValidCPF(digitsOnly)) {
      setError('O CPF informado possui dígitos verificadores inválidos.');
      return;
    }

    // Se for acesso Master (por modo ou CPF detectado), validação estrita da senha Master
    if (authMode === 'MASTER' || isCurrentCpfMaster) {
      if (!password) {
        setError('Por favor, digite a Senha de Acesso Master.');
        return;
      }
      if (password !== MASTER_PASSWORD) {
        setError('Senha Master incorreta para o CPF 618.816.193-20. Verifique as credenciais administrativas.');
        return;
      }
    }

    setIsLoading(true);
    setTimeout(() => {
      try {
        const user = authService.login(digitsOnly, trimmedNome, password);
        setIsLoading(false);
        onLoginSuccess(user);
      } catch (err: any) {
        setIsLoading(false);
        setError(err.message || 'Falha ao autenticar.');
      }
    }, 350);
  };

  const previewFirstName = extractFirstName(nome);
  const showMasterFields = authMode === 'MASTER' || isCurrentCpfMaster;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7D1416]/95 via-[#252A34] to-[#16181F] flex items-center justify-center p-4 sm:p-6 font-dm selection:bg-[#7D1416] selection:text-white">
      {/* Luzes de fundo decorativas */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#7D1416]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-[#FF2E63]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Principal */}
        <div className="bg-white rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 backdrop-blur-sm">
          
          {/* Cabeçalho da Marca Bellinati Perez */}
          <div className="text-center mb-5">
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

          {/* Marcador e Alternância de Privilégios (RBAC Toggle) */}
          <div className="mb-5 p-1 bg-[#EAEAEA] rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              id="tab-login-comum"
              onClick={() => handleSelectMode('COMMON')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'COMMON' && !isCurrentCpfMaster
                  ? 'bg-white text-[#252A34] shadow-xs'
                  : 'text-slate-600 hover:text-[#252A34]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Usuário Comum</span>
            </button>

            <button
              type="button"
              id="tab-login-master"
              onClick={() => handleSelectMode('MASTER')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                showMasterFields
                  ? 'bg-[#7D1416] text-white shadow-md'
                  : 'text-slate-600 hover:text-[#7D1416]'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>Acesso Master</span>
            </button>
          </div>

          {/* Indicador Visual Dinâmico de Privilégio Master */}
          {showMasterFields ? (
            <div
              id="badge-indicador-master"
              className="mb-4 p-3 bg-[#7D1416]/10 border-2 border-[#AD2F3B]/40 rounded-2xl flex items-start gap-2.5 animate-in fade-in duration-200"
            >
              <div className="w-7 h-7 rounded-xl bg-[#7D1416] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Crown className="w-4 h-4 text-amber-300" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#7D1416] font-raleway text-xs">
                    Privilégio Master Detectado
                  </span>
                  <span className="px-1.5 py-0.2 bg-[#AD2F3B] text-white text-[9px] font-black uppercase rounded-md tracking-wider">
                    Full Access
                  </span>
                </div>
                <p className="text-[11px] text-[#252A34]/80 mt-0.5 leading-snug">
                  Permissão total de administrador: exclusão, atualização e edição de todas as reservas liberadas.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Acesso operacional: criação e consulta de reservas liberadas.</span>
            </div>
          )}

          {/* Formulário de Autenticação */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Mensagem de Erro */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#AD2F3B] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

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
                  placeholder={showMasterFields ? 'Ex: Moura - Gestor Master' : 'Ex: Alyson Souza Barreto'}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[#AD2F3B] focus:ring-4 focus:ring-[#AD2F3B]/15 outline-hidden transition text-sm font-semibold text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white font-dm"
                  autoFocus={!showMasterFields}
                />
              </div>
              {nome.trim().length >= 3 && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold font-dm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Identificado como: <strong>{previewFirstName}</strong></span>
                </div>
              )}
            </div>

            {/* Input CPF */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-cpf" className="block text-xs font-bold text-slate-700 font-raleway">
                  CPF {showMasterFields ? '(MASTER)' : ''} *
                </label>
                {showMasterFields && (
                  <span className="text-[10px] font-bold text-[#AD2F3B] font-mono">
                    Oficial: 618.816.193-20
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ShieldCheck className={`w-4 h-4 ${isCurrentCpfMaster ? 'text-[#7D1416]' : 'text-slate-400'}`} />
                </div>
                <input
                  id="login-cpf"
                  type="text"
                  required
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 outline-hidden transition text-sm font-mono font-bold text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white ${
                    isCurrentCpfMaster
                      ? 'border-[#7D1416] focus:border-[#7D1416] focus:ring-4 focus:ring-[#7D1416]/15'
                      : 'border-slate-200 focus:border-[#AD2F3B] focus:ring-4 focus:ring-[#AD2F3B]/15'
                  }`}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block font-dm">
                {isCurrentCpfMaster
                  ? '✓ CPF Master validado e identificado no sistema'
                  : 'Digite seu CPF cadastrado (11 dígitos numéricos)'}
              </span>
            </div>

            {/* Input Senha Master (Condicional para Master) */}
            {showMasterFields && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-senha" className="block text-xs font-bold text-[#7D1416] font-raleway flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#AD2F3B]" />
                    <span>SENHA DE ACESSO MASTER *</span>
                  </label>
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
                    placeholder="Digite a senha Master (@mouraS0501)"
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
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                  <span>Senha de privilégio administrativo Master</span>
                  <button
                    type="button"
                    onClick={handleQuickFillMaster}
                    className="text-[#AD2F3B] hover:text-[#7D1416] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-[#AD2F3B]" />
                    <span>Auto-preencher credencial</span>
                  </button>
                </div>
              </div>
            )}

            {/* Botão de Envio (CTA com Rosa #FF2E63 - 4% Accent) */}
            <button
              id="btn-login-entrar"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-white font-bold font-raleway tracking-wider text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FF2E63]/30 transition active:scale-[0.98] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>
                    {showMasterFields ? 'Entrar como Administrador Master' : 'Entrar no Sistema'}
                  </span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé de Segurança e Dica de Acesso */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center gap-1.5 text-[11px] text-slate-500 text-center font-dm">
            <div className="flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Controle de Acesso por Privilégios (RBAC) ativo</span>
            </div>
            {!showMasterFields && (
              <button
                type="button"
                onClick={handleQuickFillMaster}
                className="text-[#AD2F3B] hover:text-[#7D1416] font-semibold text-[10px] mt-0.5 underline underline-offset-2 cursor-pointer"
              >
                Acesso administrativo? Clique para alternar para Usuário Master
              </button>
            )}
          </div>

        </div>

        {/* Rodapé Institucional */}
        <p className="text-center text-xs text-white/70 mt-4 font-medium font-dm">
          Bellinati Perez • Sistema de Gestão de Salas & Espaços
        </p>
      </div>
    </div>
  );
};
