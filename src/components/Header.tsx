import React, { useEffect, useState } from 'react';
import {
  Clock,
  Plus,
  Building2,
  Printer,
  Search,
  Filter,
  Sparkles,
  BarChart3,
  Layers,
  Settings,
  LogOut,
  BookOpen,
  Calendar,
  Bell,
  Crown,
} from 'lucide-react';
import { FilterOptions, AppUser } from '../types';

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
  activeView?: 'list' | 'timeline';
  onToggleView?: (view: 'list' | 'timeline') => void;
  isSupabaseLive?: boolean;
  filters: FilterOptions;
  nextCount: number;
  currentUser?: AppUser | null;
  onLogout?: () => void;
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
  filters,
  currentUser,
  onLogout,
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

                {/* OPERADOR LOGADO AO LADO DO NOME */}
                {currentUser && (
                  <div className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-xl bg-white/10 border border-white/20 text-xs">
                    <div className="w-5 h-5 rounded-lg bg-white text-[#7D1416] font-black text-[10px] flex items-center justify-center shrink-0">
                      {currentUser.role === 'MASTER' ? '👑' : currentUser.primeiroNome.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col text-left leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white font-dm text-xs leading-none">
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
                      <span className="text-[9px] text-[#EAEAEA]/80 font-mono leading-none mt-0.5">
                        CPF {currentUser.cpf}
                      </span>
                    </div>
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

            {/* Botão de Como Usar & Tira-Dúvidas IA */}
            <button
              type="button"
              id="btn-como-usar-guia-header"
              onClick={onOpenHelpModal}
              title="Passo a passo de como usar o aplicativo e Tira-Dúvidas com IA"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold font-dm-sans transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#EAEAEA]" />
              <span className="hidden sm:inline">Como Usar</span>
              <span className="px-1 py-0.2 bg-[#FF2E63] text-white rounded-md text-[9px] font-black font-dm-sans leading-none">
                IA
              </span>
            </button>

            {/* BOTÃO DE PESQUISA & FILTRO + BOTÃO ❌ DE LIMPEZA */}
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                id="btn-abrir-pesquisa-header"
                onClick={onOpenFilterModal}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold font-dm-sans transition-all shadow-xs active:scale-95 cursor-pointer ${
                  activeFiltersCount > 0
                    ? 'bg-white text-[#7D1416] border-white shadow-md'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                {activeFiltersCount > 0 ? (
                  <Filter className="w-3.5 h-3.5 text-[#7D1416]" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-white" />
                )}
                <span>Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-[#FF2E63] text-white rounded-full text-[10px] font-black font-dm-sans leading-none">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {activeFiltersCount > 0 && onResetFilters && (
                <button
                  type="button"
                  id="btn-limpar-filtro-emoji-header"
                  onClick={onResetFilters}
                  title="Limpar todos os filtros ativos (❌)"
                  className="inline-flex items-center justify-center px-2 py-1.5 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-xs font-black text-white transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <span className="text-sm leading-none mr-0.5">❌</span>
                  <span className="hidden sm:inline font-dm-sans font-bold text-[11px]">Limpar</span>
                </button>
              )}
            </div>

            {/* BOTÃO DE ASSISTENTE IA */}
            <button
              type="button"
              id="btn-assistente-ia-header"
              onClick={onOpenAiModal}
              title="Preenchimento automático via IA por texto ou imagem"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#AD2F3B] hover:bg-[#AD2F3B]/80 text-white text-xs font-bold font-dm-sans tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer border border-white/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>IA</span>
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
      </div>
    </header>
  );
};
