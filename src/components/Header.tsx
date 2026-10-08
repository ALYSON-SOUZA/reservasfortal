import React, { useEffect, useState } from 'react';
import {
  Clock,
  Plus,
  Building2,
  Printer,
  BarChart3,
  Layers,
  Settings,
  LogOut,
  Calendar,
  Bell,
  Crown,
  MapPin,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { FilterOptions, AppUser, Filial } from '../types';
import { maskCPF } from '../utils/lgpdUtils';

interface HeaderProps {
  onOpenNewModal: () => void;
  onOpenAiModal: () => void;
  onOpenCalendarModal: () => void;
  onOpenHelpModal: () => void;
  onOpenReportModal: () => void;
  onOpenFilterModal: () => void;
  onOpenNotificationCenter: () => void;
  notificationStatus?: 'granted' | 'default' | 'denied' | 'unsupported';
  onResetFilters?: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenAnalyticsModal: () => void;
  onOpenSectorManagerModal: () => void;
  onOpenRoomManagerModal: () => void;
  isCpfMasked?: boolean;
  onToggleCpfMask?: () => void;
  activeView?: 'list' | 'timeline';
  onToggleView?: (view: 'list' | 'timeline') => void;
  isSupabaseLive?: boolean;
  filters: FilterOptions;
  nextCount: number;
  currentUser?: AppUser | null;
  onLogout?: () => void;
  onOpenUserProfileModal?: (user: AppUser) => void;
  onSelectFilial?: (filial: string) => void;
  onOpenBranchManagerModal?: () => void;
  filiaisList?: Filial[];
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewModal,
  onOpenAiModal,
  onOpenCalendarModal,
  onOpenHelpModal,
  onOpenReportModal,
  onOpenFilterModal,
  onOpenNotificationCenter,
  notificationStatus = 'default',
  onResetFilters,
  onOpenAnalyticsModal,
  onOpenSectorManagerModal,
  onOpenRoomManagerModal,
  onOpenBranchManagerModal,
  isCpfMasked = true,
  onToggleCpfMask,
  filiaisList = [],
  onOpenSupabaseModal,
  isSupabaseLive,
  filters,
  currentUser,
  onLogout,
  onOpenUserProfileModal,
  onSelectFilial,
}) => {
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentDateTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Contar quantos filtros estão ativos
  const activeFiltersCount = [
    Boolean(filters.dataInicio || filters.dataFim || filters.data),
    Boolean(filters.solicitante),
    Boolean(filters.glpi),
    Boolean(filters.sala),
    Boolean(filters.setor),
    filters.mostrarEncerradas,
  ].filter(Boolean).length;

  return (
    <header className="bg-[#7D1416] text-white border-b-2 border-[#AD2F3B] shadow-xl relative overflow-hidden">
      {/* Detalhe superior em Rubro e Rosa (saturação restrita a fio de luz) */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#AD2F3B] via-[#FF2E63] to-[#AD2F3B]" />

      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-3 sm:py-3.5">
        {/* Upper Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Brand & User Profile */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center flex-wrap gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#7D1416] flex items-center justify-center font-black shadow-md shrink-0">
                <Building2 className="w-5 h-5 stroke-[2.5]" />
              </div>

              <div className="flex items-center flex-wrap gap-3">
                <div className="flex flex-col">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white font-raleway leading-none">
                    Reserva de Salas
                  </h1>
                  <span className="text-[11px] text-[#EAEAEA]/80 font-raleway font-semibold tracking-wider uppercase mt-0.5">
                    Bellinati Perez
                  </span>
                </div>

                {/* OPERADOR LOGADO AO LADO DO NOME COM POPUP DE PERFIL */}
                {currentUser && (
                  <div className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-xl bg-white/10 border border-white/20 text-xs hover:bg-white/15 transition shadow-xs">
                    <button
                      type="button"
                      id="btn-user-profile-header"
                      onClick={() => onOpenUserProfileModal?.(currentUser)}
                      title={`Ver perfil e permissões de ${currentUser.nome} (${currentUser.role === 'MASTER' ? 'Administrador Master' : 'Usuário Comum'}). Clique para abrir ficha cadastral.`}
                      className="inline-flex items-center gap-2 text-left cursor-pointer group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-white text-[#7D1416] font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {currentUser.role === 'MASTER' ? '👑' : currentUser.primeiroNome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col text-left leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white font-dm text-xs leading-none group-hover:text-amber-200 transition-colors">
                            {currentUser.primeiroNome}
                          </span>
                          {currentUser.role === 'MASTER' ? (
                            <span
                              title="Usuário Master: Privilégio total para editar e excluir reservas"
                              className="px-1.5 py-0.2 rounded-md bg-amber-400 text-[#252A34] text-[9px] font-black uppercase tracking-wider leading-none shadow-xs"
                            >
                              MASTER
                            </span>
                          ) : (
                            <span
                              title="Usuário Comum: Criação de reservas e consulta liberadas"
                              className="px-1.5 py-0.2 rounded-md bg-white/20 text-white text-[9px] font-bold uppercase tracking-wider leading-none"
                            >
                              COMUM
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] text-[#EAEAEA]/80 font-mono leading-none">
                            CPF {isCpfMasked ? maskCPF(currentUser.cpf) : currentUser.cpf}
                          </span>
                        </div>
                      </div>
                    </button>

                    {onToggleCpfMask && (
                      <button
                        type="button"
                        onClick={onToggleCpfMask}
                        title={isCpfMasked ? 'LGPD: CPF mascarado para privacidade. Clique para exibir.' : 'Clique para ocultar CPF'}
                        className="text-[#EAEAEA]/70 hover:text-white p-1 transition cursor-pointer ml-0.5"
                      >
                        {isCpfMasked ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    )}

                    {onLogout && (
                      <button
                        type="button"
                        id="btn-logout-header"
                        onClick={onLogout}
                        title={`Conectado como ${currentUser.nome} (${currentUser.role === 'MASTER' ? 'Master Administrador' : 'Usuário Comum'}). Clique para sair.`}
                        className="p-1 hover:bg-[#FF2E63]/30 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer ml-0.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Clock */}
            <div className="lg:hidden flex items-center gap-1.5 text-xs text-[#EAEAEA] font-mono">
              <Clock className="w-3.5 h-3.5 text-white/80" />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Controls and Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botão de Métricas / Analytics */}
            <button
              type="button"
              id="btn-analytics-header"
              onClick={onOpenAnalyticsModal}
              title="Ver métricas de ocupação e gráficos de reuniões"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#EAEAEA]" />
              <span className="hidden sm:inline">Métricas</span>
            </button>

            {/* Botão Gerenciar Setores */}
            <button
              type="button"
              id="btn-setores-header"
              onClick={onOpenSectorManagerModal}
              title="Gerenciar lista de setores e departamentos"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-[#EAEAEA]" />
              <span className="hidden md:inline">Setores</span>
            </button>

            {/* Botão Gerenciar Salas */}
            <button
              type="button"
              id="btn-salas-header"
              onClick={onOpenRoomManagerModal}
              title="Gerenciar salas, filiais, recursos e capacidades"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-[#EAEAEA]" />
              <span className="hidden md:inline">Salas</span>
            </button>

            {/* Botão Gerenciar e Cadastrar Filiais */}
            {onOpenBranchManagerModal && (
              <button
                type="button"
                id="btn-filiais-header"
                onClick={onOpenBranchManagerModal}
                title="Cadastrar e gerenciar filiais e unidades"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-[#EAEAEA]" />
                <span className="hidden md:inline">Filiais</span>
              </button>
            )}

            {/* Botão Calendário Mensal */}
            <button
              type="button"
              id="btn-abrir-calendario-header"
              onClick={onOpenCalendarModal}
              title="Visão Mensal em Calendário e Observações de Reservas"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold font-dm-sans transition shadow-xs hover:border-white/40 active:scale-95 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-[#EAEAEA]" />
              <span className="hidden sm:inline">Calendário</span>
            </button>

            {/* Botão Avisos Agendados (15 min antes) */}
            <button
              type="button"
              id="btn-notificacoes-header"
              onClick={onOpenNotificationCenter}
              title={
                notificationStatus === 'granted'
                  ? 'Avisos de 15 minutos ATIVOS no navegador. Clique para gerenciar.'
                  : 'Ativar avisos de 15 minutos antes das reservas no navegador.'
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer relative ${
                notificationStatus === 'granted'
                  ? 'bg-white/20 text-white border-white/40'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Avisos 15m</span>
              {notificationStatus === 'granted' ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Notificações ativas" />
              ) : (
                <span className="px-1 py-0.2 bg-[#FF2E63] text-white rounded-md text-[9px] font-black font-dm-sans leading-none">
                  Ativar
                </span>
              )}
            </button>

            {/* Botão de Relatório */}
            <button
              type="button"
              id="btn-abrir-relatorio-header"
              onClick={onOpenReportModal}
              title="Gerar relatório impresso ou exportar PDF / CSV"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#EAEAEA]" />
              <span className="hidden sm:inline">Relatório</span>
            </button>

            {/* BOTÃO DE NOVA RESERVA (Call-to-Action com Rosa #FF2E63 - 4% Accent) */}
            <button
              type="button"
              id="btn-nova-reserva-header"
              onClick={onOpenNewModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway tracking-wide transition-all shadow-lg shadow-[#FF2E63]/30 active:scale-95 cursor-pointer border border-white/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>NOVA RESERVA</span>
            </button>
          </div>
        </div>

        {/* Barra de Acesso Rápido de Filiais (Estilo "Salas" Bellinati Perez) */}
        <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-thin max-w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#EAEAEA]/80 font-raleway flex items-center gap-1 shrink-0 mr-1">
              <MapPin className="w-3.5 h-3.5 text-amber-300" />
              <span>Filiais:</span>
            </span>

            {/* Todas as Filiais */}
            <button
              type="button"
              id="btn-filial-todas"
              onClick={() => onSelectFilial?.('')}
              title="Exibir todas as salas e filiais"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                !filters.filial
                  ? 'bg-white text-[#7D1416] font-bold border border-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Todas</span>
            </button>

            {/* 1. Maringá (Matriz) - Com Destaque Especial */}
            <button
              type="button"
              id="btn-filial-maringa"
              onClick={() => onSelectFilial?.(filters.filial === 'Maringá (Matriz)' ? '' : 'Maringá (Matriz)')}
              title="Matriz Maringá — PR (Sede Principal Bellinati Perez)"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                filters.filial === 'Maringá (Matriz)'
                  ? 'bg-amber-400 text-[#252A34] font-black border-2 border-amber-300 ring-2 ring-amber-400/50 shadow-md'
                  : 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-400/50 ring-1 ring-amber-400/30'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Maringá</span>
              <span className="px-1.5 py-0.2 bg-amber-400/30 text-amber-100 rounded text-[9px] font-black uppercase tracking-wider">
                Matriz
              </span>
            </button>

            {/* 2. Curitiba Park & Business */}
            <button
              type="button"
              id="btn-filial-curitiba-park"
              onClick={() => onSelectFilial?.(filters.filial === 'Curitiba Park & Business' ? '' : 'Curitiba Park & Business')}
              title="Unidade Curitiba Park & Business — PR"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                filters.filial === 'Curitiba Park & Business'
                  ? 'bg-white text-[#7D1416] font-bold border border-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#EAEAEA]" />
              <span>Curitiba Park & Business</span>
            </button>

            {/* 3. Curitiba/CEBP */}
            <button
              type="button"
              id="btn-filial-curitiba-cebp"
              onClick={() => onSelectFilial?.(filters.filial === 'Curitiba/CEBP' ? '' : 'Curitiba/CEBP')}
              title="Unidade Curitiba / CEBP — PR"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                filters.filial === 'Curitiba/CEBP'
                  ? 'bg-white text-[#7D1416] font-bold border border-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#EAEAEA]" />
              <span>Curitiba/CEBP</span>
            </button>

            {/* 4. Curitiba/Marechal */}
            <button
              type="button"
              id="btn-filial-curitiba-marechal"
              onClick={() => onSelectFilial?.(filters.filial === 'Curitiba/Marechal' ? '' : 'Curitiba/Marechal')}
              title="Unidade Curitiba / Marechal — PR"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                filters.filial === 'Curitiba/Marechal'
                  ? 'bg-white text-[#7D1416] font-bold border border-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#EAEAEA]" />
              <span>Curitiba/Marechal</span>
            </button>

            {/* 5. Curitiba/Toronto */}
            <button
              type="button"
              id="btn-filial-curitiba-toronto"
              onClick={() => onSelectFilial?.(filters.filial === 'Curitiba/Toronto' ? '' : 'Curitiba/Toronto')}
              title="Unidade Curitiba / Toronto — PR"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                filters.filial === 'Curitiba/Toronto'
                  ? 'bg-white text-[#7D1416] font-bold border border-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#EAEAEA]" />
              <span>Curitiba/Toronto</span>
            </button>

            {/* 6. Fortaleza/planalto */}
            <button
              type="button"
              id="btn-filial-fortaleza-planalto"
              onClick={() => onSelectFilial?.(filters.filial === 'Fortaleza/planalto' ? '' : 'Fortaleza/planalto')}
              title="Unidade Fortaleza / planalto — CE"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                filters.filial === 'Fortaleza/planalto'
                  ? 'bg-white text-[#7D1416] font-bold border border-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#EAEAEA]" />
              <span>Fortaleza/planalto</span>
            </button>

            {/* Filiais Customizadas Cadastradas */}
            {filiaisList
              .filter(
                (f) =>
                  ![
                    'Maringá (Matriz)',
                    'Curitiba Park & Business',
                    'Curitiba/CEBP',
                    'Curitiba/Marechal',
                    'Curitiba/Toronto',
                    'Fortaleza/planalto',
                  ].includes(f.nome)
              )
              .map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onSelectFilial?.(filters.filial === f.nome ? '' : f.nome)}
                  title={`Unidade ${f.nome} — ${f.cidade}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                    filters.filial === f.nome
                      ? 'bg-white text-[#7D1416] font-bold border border-white shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-[#EAEAEA]" />
                  <span>{f.nome}</span>
                </button>
              ))}

            {/* Botão Acesso Rápido para Registro/Gerenciamento de Filiais */}
            {onOpenBranchManagerModal && (
              <button
                type="button"
                id="btn-cadastrar-filial-quick"
                onClick={onOpenBranchManagerModal}
                title="Cadastrar nova filial ou gerenciar unidades"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white border border-white/20 text-xs font-bold font-dm-sans transition shadow-xs active:scale-95 cursor-pointer shrink-0 ml-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Filial</span>
              </button>
            )}
          </div>

          {filters.filial && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-white/90 font-mono">
                Unidade ativa: <strong className="text-white">{filters.filial}</strong>
              </span>
              <button
                type="button"
                onClick={() => onSelectFilial?.('')}
                className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-lg font-bold transition cursor-pointer"
                title="Remover filtro de filial"
              >
                Limpar ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
