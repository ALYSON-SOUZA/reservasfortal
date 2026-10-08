import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Crown,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  Edit3,
  Calendar,
  Building2,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';
import { AppUser, UserRole } from '../types';
import {
  isMasterUser,
  isMasterCpf,
  findMasterUser,
  cleanCPF,
  getMasterPassword,
  updateMasterPassword,
  verifyMasterCredentials,
  MASTER_USERS,
} from '../utils/rbac';
import { maskCPF } from '../utils/lgpdUtils';
import { authService, extractFirstName, formatCPF } from '../services/authService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: {
    nome: string;
    cpf?: string;
    primeiroNome?: string;
    role?: UserRole;
    loginEm?: string;
    filial?: string;
  } | null;
  currentUser: AppUser | null;
  onUpdateCurrentUser?: (user: AppUser) => void;
  onToast?: (type: 'success' | 'warning' | 'error' | 'info', message: string, title?: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  currentUser,
  onUpdateCurrentUser,
  onToast,
}) => {
  // Estado de edição
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedNome, setEditedNome] = useState('');
  const [showCpf, setShowCpf] = useState(false);
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'perfil' | 'masters'>('perfil');

  // Estado para elevação de privilégios caso o operador logado seja comum
  const [isElevateOpen, setIsElevateOpen] = useState(false);
  const [elevateMasterCpf, setElevateMasterCpf] = useState('');
  const [elevateMasterPassword, setElevateMasterPassword] = useState('');
  const [elevateError, setElevateError] = useState<string | null>(null);

  // Verifica se o operador autenticado atual é Master
  const isOperatorMaster = isMasterUser(currentUser);

  // Determina se o usuário do perfil visualizado é um Usuário Master
  const targetCpfDigits = targetUser?.cpf ? cleanCPF(targetUser.cpf) : '';
  const detectedTargetMaster = targetCpfDigits ? findMasterUser(targetCpfDigits) : undefined;
  const isTargetMaster = Boolean(detectedTargetMaster) || targetUser?.role === 'MASTER';

  // Sincroniza formulário ao abrir o modal
  useEffect(() => {
    if (targetUser) {
      setEditedNome(targetUser.nome || '');
      setIsEditMode(false);
      setNewMasterPassword('');
      setIsElevateOpen(false);
      setElevateError(null);
    }
  }, [targetUser, isOpen]);

  if (!isOpen || !targetUser) return null;

  const currentPassword = isTargetMaster && targetCpfDigits ? getMasterPassword(targetCpfDigits) : '';

  // Handler para salvar alterações (apenas se for Master autenticado)
  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOperatorMaster) {
      onToast?.(
        'error',
        'Ação não autorizada: Apenas Administradores Master possuem permissão para salvar alterações de perfil.',
        'Acesso Negado'
      );
      return;
    }

    const trimmedNome = editedNome.trim();
    if (!trimmedNome || trimmedNome.length < 3) {
      onToast?.('warning', 'O nome completo deve conter no mínimo 3 caracteres.', 'Validação');
      return;
    }

    // Se informou nova senha para um usuário Master
    if (isTargetMaster && targetCpfDigits && newMasterPassword.trim()) {
      if (newMasterPassword.trim().length < 4) {
        onToast?.('warning', 'A nova Senha Master deve ter no mínimo 4 caracteres.', 'Senha Inválida');
        return;
      }
      updateMasterPassword(targetCpfDigits, newMasterPassword.trim());
    }

    // Se estiver editando a própria sessão do usuário logado
    const isSelf = currentUser && targetUser.cpf && cleanCPF(currentUser.cpf) === targetCpfDigits;
    if (isSelf && currentUser) {
      const updatedUser: AppUser = {
        ...currentUser,
        nome: trimmedNome,
        primeiroNome: extractFirstName(trimmedNome),
      };
      authService.updateCurrentUser(updatedUser);
      onUpdateCurrentUser?.(updatedUser);
    }

    setIsEditMode(false);
    setNewMasterPassword('');
    onToast?.(
      'success',
      `Os dados de "${trimmedNome}" foram atualizados com sucesso por Administrador Master!`,
      'Cadastro Atualizado'
    );
  };

  // Handler para autenticação Master temporária (elevação de privilégio)
  const handleElevateMaster = (e: React.FormEvent) => {
    e.preventDefault();
    setElevateError(null);

    const cleanDigits = cleanCPF(elevateMasterCpf);
    if (!cleanDigits) {
      setElevateError('Informe o CPF do Administrador Master.');
      return;
    }

    if (!isMasterCpf(cleanDigits)) {
      setElevateError('O CPF informado não pertence a um Administrador Master registrado.');
      return;
    }

    if (!verifyMasterCredentials(cleanDigits, elevateMasterPassword)) {
      setElevateError('Senha Master incorreta. Verificação de segurança falhou.');
      return;
    }

    // Sucesso na elevação
    const masterObj = findMasterUser(cleanDigits);
    const elevatedUser = authService.login(cleanDigits, masterObj?.nome || 'Master', elevateMasterPassword);
    onUpdateCurrentUser?.(elevatedUser);
    setIsElevateOpen(false);
    setIsEditMode(true);
    onToast?.(
      'success',
      `Privilégios de Administrador Master liberados para ${elevatedUser.primeiroNome}!`,
      'Acesso Master Concedido'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6">
        {/* Header do Modal com Identidade Visual Bordô Bellinati Perez */}
        <div className="bg-[#7D1416] text-white p-5 sm:p-6 border-b-2 border-[#AD2F3B] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-md">
                {isTargetMaster ? <Crown className="w-6 h-6 text-amber-300" /> : <User className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold font-raleway text-white tracking-wide">
                    Ficha Cadastral do Usuário
                  </h2>
                  {isTargetMaster ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-[#252A34] text-[10px] font-black uppercase tracking-wider">
                      Master
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                      Comum
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#EAEAEA]/80 font-dm-sans">
                  Gestão de Acessos & Privilégios • Bellinati Perez Facilities
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Abas Superiores (visíveis para Masters) */}
          {isOperatorMaster && (
            <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('perfil')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-raleway transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'perfil'
                    ? 'bg-white text-[#7D1416] shadow-sm'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Dados do Perfil</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('masters')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-raleway transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'masters'
                    ? 'bg-white text-[#7D1416] shadow-sm'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Diretório Master (Equipe)</span>
              </button>
            </div>
          )}
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-5 font-dm-sans max-h-[75vh] overflow-y-auto">
          {activeTab === 'perfil' ? (
            <>
              {/* Status de Segurança e Permissões de Edição */}
              {isOperatorMaster ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Você está autenticado como <strong>Administrador Master ({currentUser?.primeiroNome})</strong>. Edição liberada.
                    </span>
                  </div>
                  {!isEditMode ? (
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#7D1416] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Dados</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold font-raleway transition cursor-pointer"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start sm:items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="leading-relaxed">
                      <strong>🔒 Modo Somente Leitura:</strong> Alteração de dados cadastrais e senhas é restrita a <strong>Administradores Master</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsElevateOpen(true)}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 text-[11px] font-bold font-raleway border border-amber-400 transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Liberar com Senha Master</span>
                  </button>
                </div>
              )}

              {/* Modal / Bloco de Elevação de Privilégio Master */}
              {isElevateOpen && !isOperatorMaster && (
                <div className="p-4 rounded-2xl bg-slate-50 border-2 border-[#7D1416]/30 text-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold font-raleway text-[#7D1416] text-sm">
                      <Unlock className="w-4 h-4 text-[#AD2F3B]" />
                      <span>Autenticação de Administrador Master</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsElevateOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Para habilitar o modo de edição, confirme as credenciais de qualquer usuário Master registrado.
                  </p>
                  <form onSubmit={handleElevateMaster} className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="CPF do Master (000.000.000-00)"
                        value={elevateMasterCpf}
                        onChange={(e) => setElevateMasterCpf(formatCPF(cleanCPF(e.target.value).slice(0, 11)))}
                        className="px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:border-[#AD2F3B] outline-hidden"
                      />
                      <input
                        type="password"
                        placeholder="Senha Master"
                        value={elevateMasterPassword}
                        onChange={(e) => setElevateMasterPassword(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs focus:border-[#AD2F3B] outline-hidden"
                      />
                    </div>
                    {elevateError && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{elevateError}</span>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsElevateOpen(false)}
                        className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-xl bg-[#7D1416] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway flex items-center gap-1.5"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Confirmar Acesso</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Formulário Principal de Exibição / Edição */}
              <form onSubmit={handleSaveChanges} className="space-y-4">
                {/* Cartão de Identificação Principal */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center font-raleway font-black text-2xl shrink-0 shadow-sm ${
                      isTargetMaster
                        ? 'bg-gradient-to-br from-[#7D1416] to-[#AD2F3B] text-white'
                        : 'bg-slate-200 text-[#7D1416]'
                    }`}
                  >
                    {isTargetMaster ? '👑' : (targetUser.nome || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Nome Completo do Colaborador
                    </span>
                    {isEditMode ? (
                      <input
                        type="text"
                        required
                        value={editedNome}
                        onChange={(e) => setEditedNome(e.target.value)}
                        placeholder="Nome completo"
                        className="w-full px-3 py-2 text-sm font-semibold rounded-xl border-2 border-[#AD2F3B] focus:ring-2 focus:ring-[#AD2F3B]/20 outline-hidden bg-white text-slate-800"
                      />
                    ) : (
                      <h3 className="text-lg font-bold text-[#252A34] font-raleway truncate">
                        {targetUser.nome || 'Nome não informado'}
                      </h3>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-500 font-medium">
                        Primeiro Nome: <strong>{extractFirstName(editedNome || targetUser.nome)}</strong>
                      </span>
                      {targetUser.filial && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{targetUser.filial}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grid de Informações Cadastrais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* CPF */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      CPF (Cadastro de Pessoa Física)
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-[#252A34]">
                        {targetUser.cpf
                          ? showCpf
                            ? formatCPF(cleanCPF(targetUser.cpf))
                            : maskCPF(targetUser.cpf)
                          : 'Não informado'}
                      </span>
                      {targetUser.cpf && (
                        <button
                          type="button"
                          onClick={() => setShowCpf(!showCpf)}
                          className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          title={showCpf ? 'Ocultar CPF' : 'Visualizar CPF'}
                        >
                          {showCpf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Perfil de Acesso */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Nível de Privilégio no Sistema
                    </span>
                    <div className="flex items-center gap-2">
                      {isTargetMaster ? (
                        <>
                          <Crown className="w-4 h-4 text-amber-500" />
                          <span className="font-bold text-xs text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                            Administrador Master
                          </span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 text-slate-500" />
                          <span className="font-bold text-xs text-slate-800 bg-slate-200 px-2 py-0.5 rounded-md border border-slate-300">
                            Usuário Operacional (Acesso Livre)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seção de Senha Master (caso o perfil seja Master) */}
                {isTargetMaster && (
                  <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold font-raleway text-amber-950 text-xs">
                        <KeyRound className="w-4 h-4 text-amber-700" />
                        <span>Credencial de Acesso Master</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full border border-amber-300">
                        Autenticação Obrigatória
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-300 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Senha Vigente:
                        </span>
                        <span className="font-mono font-black text-sm text-[#7D1416]">
                          {isOperatorMaster
                            ? showPassword
                              ? currentPassword || 'Padronizada'
                              : '••••••••••••'
                            : '•••••••••••• (Oculta por Segurança)'}
                        </span>
                      </div>
                      {isOperatorMaster && currentPassword && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>

                    {isEditMode && isOperatorMaster && (
                      <div className="pt-2 border-t border-amber-200/80 space-y-1.5">
                        <label className="block text-[11px] font-bold text-amber-950 font-raleway">
                          Redefinir Senha deste Master:
                        </label>
                        <input
                          type="text"
                          placeholder="Digite nova senha (mínimo 4 caracteres)"
                          value={newMasterPassword}
                          onChange={(e) => setNewMasterPassword(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border-2 border-amber-300 bg-white focus:border-[#AD2F3B] outline-hidden"
                        />
                        <span className="text-[10px] text-slate-500 block">
                          Deixe em branco caso não queira alterar a senha atual.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Resumo de Permissões no Sistema */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block font-raleway flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-[#AD2F3B]" />
                    <span>Permissões e Capacidades no Sistema:</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Agendar novas reuniões</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Visualizar pauta e relatórios</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Exportar dados para PDF e CSV</span>
                    </div>

                    {isTargetMaster ? (
                      <>
                        <div className="flex items-center gap-2 text-[#7D1416] font-bold">
                          <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Editar qualquer reserva</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#7D1416] font-bold">
                          <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Excluir reservas de salas</span>
                        </div>
                        <div className="flex items-center gap-2 text-[#7D1416] font-bold">
                          <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Gerenciar Salas, Setores e Filiais</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Edição de reservas restrita</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>Exclusão de reservas restrita</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Botões de Ação para o Modo de Edição */}
                {isEditMode && isOperatorMaster && (
                  <div className="pt-2 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway flex items-center gap-2 shadow-md shadow-[#FF2E63]/30 transition cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Salvar Alterações</span>
                    </button>
                  </div>
                )}
              </form>
            </>
          ) : (
            /* Aba de Diretório da Equipe Master (exclusiva para Masters) */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-center gap-2.5">
                <Crown className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  Lista oficial de todos os <strong>{MASTER_USERS.length} Administradores Master</strong> pré-configurados no sistema Bellinati Perez com plenos poderes.
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {MASTER_USERS.map((mu, idx) => {
                  const currentPw = getMasterPassword(mu.cpfDigits);
                  const isCurrentTarget = cleanCPF(targetUser.cpf || '') === mu.cpfPadded || cleanCPF(targetUser.cpf || '') === mu.cpfDigits;

                  return (
                    <div
                      key={mu.cpfDigits}
                      className={`p-3.5 flex items-center justify-between text-xs transition ${
                        isCurrentTarget ? 'bg-amber-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#7D1416] text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-[#252A34] font-raleway text-sm truncate">
                            {mu.nome}
                          </strong>
                          <span className="font-mono text-slate-500 text-[11px]">
                            CPF: {mu.cpfFormatado}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-[#7D1416] text-xs block">
                          Senha: {currentPw}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Ativo • Master
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-dm-sans">
            Bellinati Perez • Sistema de Reserva de Salas
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
