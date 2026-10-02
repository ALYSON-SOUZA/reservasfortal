import React from 'react';
import { FilterOptions } from '../types';
import { X, Search, Calendar, User, Ticket, Building, Layers, RotateCcw, CheckCircle, Eye, EyeOff, CalendarRange, AlertCircle } from 'lucide-react';
import { DEFAULT_SALAS, DEFAULT_SETORES } from '../utils/mockData';
import { formatDateBR, getTodayString } from '../utils/dateUtils';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onApplyFilters: (newFilters: FilterOptions) => void;
  onResetFilters: () => void;
  availableRooms: string[];
  availableSectors: string[];
  totalFiltered: number;
  totalAll: number;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  availableRooms,
  availableSectors,
}) => {
  const [tempFilters, setTempFilters] = React.useState<FilterOptions>(filters);

  React.useEffect(() => {
    setTempFilters(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const roomsList = Array.from(new Set([...DEFAULT_SALAS, ...availableRooms]));
  const sectorsList = Array.from(new Set([...DEFAULT_SETORES, ...availableSectors]));

  const hasChanges =
    Boolean(tempFilters.data) ||
    Boolean(tempFilters.dataInicio) ||
    Boolean(tempFilters.dataFim) ||
    Boolean(tempFilters.solicitante) ||
    Boolean(tempFilters.glpi) ||
    Boolean(tempFilters.sala) ||
    Boolean(tempFilters.setor) ||
    tempFilters.mostrarEncerradas;

  const isInvalidRange = Boolean(
    tempFilters.dataInicio &&
    tempFilters.dataFim &&
    tempFilters.dataInicio > tempFilters.dataFim
  );

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isInvalidRange) return;
    onApplyFilters(tempFilters);
    onClose();
  };

  const handleReset = () => {
    const emptyFilters: FilterOptions = {
      data: '',
      dataInicio: '',
      dataFim: '',
      solicitante: '',
      glpi: '',
      sala: '',
      setor: '',
      mostrarEncerradas: false,
    };
    setTempFilters(emptyFilters);
    onResetFilters();
  };

  // Helper date preset actions
  const applyPreset = (preset: 'today' | 'next7' | 'thisMonth' | 'clearDates') => {
    const now = new Date();
    const todayStr = getTodayString(now);

    if (preset === 'today') {
      setTempFilters((prev) => ({
        ...prev,
        data: '',
        dataInicio: todayStr,
        dataFim: todayStr,
      }));
    } else if (preset === 'next7') {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      setTempFilters((prev) => ({
        ...prev,
        data: '',
        dataInicio: todayStr,
        dataFim: getTodayString(nextWeek),
      }));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setTempFilters((prev) => ({
        ...prev,
        data: '',
        dataInicio: getTodayString(firstDay),
        dataFim: getTodayString(lastDay),
      }));
    } else if (preset === 'clearDates') {
      setTempFilters((prev) => ({
        ...prev,
        data: '',
        dataInicio: '',
        dataFim: '',
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#252A34]/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#252A34]/20 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Topo do Modal (Bordô #7D1416) */}
        <div className="bg-[#7D1416] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#AD2F3B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 text-white flex items-center justify-center font-bold shadow-md">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-raleway leading-tight text-white">
                Pesquisa & Filtros de Reservas
              </h3>
              <p className="text-xs text-white/80 font-dm font-normal">
                Filtre por período (data inicial e final), chamado GLPI, solicitante ou sala
              </p>
            </div>
          </div>
          <button
            id="btn-fechar-modal-filtro"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário de Filtros */}
        <form onSubmit={handleApply} className="p-6 space-y-4 font-dm">
          
          {/* SEÇÃO: FILTRAGEM POR PERÍODO (DATA INICIAL E DATA FINAL) */}
          <div className="p-4 bg-[#EAEAEA]/50 border border-slate-300 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-[#252A34] flex items-center gap-1.5 font-raleway uppercase tracking-wide">
                <CalendarRange className="w-4 h-4 text-[#AD2F3B]" />
                <span>Filtrar por Período de Datas</span>
              </label>

              {/* Botões de Atalhos de Período */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPreset('today')}
                  className="px-2 py-0.5 text-[11px] font-bold bg-white hover:bg-[#AD2F3B]/10 hover:border-[#AD2F3B] text-[#252A34] border border-slate-300 rounded-lg transition cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('next7')}
                  className="px-2 py-0.5 text-[11px] font-bold bg-white hover:bg-[#AD2F3B]/10 hover:border-[#AD2F3B] text-[#252A34] border border-slate-300 rounded-lg transition cursor-pointer"
                >
                  Próximos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('thisMonth')}
                  className="px-2 py-0.5 text-[11px] font-bold bg-white hover:bg-[#AD2F3B]/10 hover:border-[#AD2F3B] text-[#252A34] border border-slate-300 rounded-lg transition cursor-pointer"
                >
                  Este Mês
                </button>
                {(tempFilters.dataInicio || tempFilters.dataFim || tempFilters.data) && (
                  <button
                    type="button"
                    onClick={() => applyPreset('clearDates')}
                    className="px-2 py-0.5 text-[11px] font-bold bg-[#AD2F3B]/10 hover:bg-[#AD2F3B]/20 text-[#AD2F3B] border border-[#AD2F3B]/30 rounded-lg transition cursor-pointer"
                  >
                    Limpar Período
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Data Inicial */}
              <div>
                <label htmlFor="filtro-modal-data-inicio" className="block text-xs font-semibold text-[#252A34] mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#AD2F3B]" />
                  <span>Data Inicial</span>
                </label>
                <input
                  id="filtro-modal-data-inicio"
                  type="date"
                  value={tempFilters.dataInicio || tempFilters.data || ''}
                  onChange={(e) => {
                    setTempFilters({
                      ...tempFilters,
                      data: '',
                      dataInicio: e.target.value,
                    });
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white border-2 border-slate-200 focus:border-[#AD2F3B] rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/30 text-[#252A34] font-medium"
                />
              </div>

              {/* Data Final */}
              <div>
                <label htmlFor="filtro-modal-data-fim" className="block text-xs font-semibold text-[#252A34] mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#AD2F3B]" />
                  <span>Data Final</span>
                </label>
                <input
                  id="filtro-modal-data-fim"
                  type="date"
                  value={tempFilters.dataFim || ''}
                  onChange={(e) => {
                    setTempFilters({
                      ...tempFilters,
                      data: '',
                      dataFim: e.target.value,
                    });
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-white border-2 border-slate-200 focus:border-[#AD2F3B] rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/30 text-[#252A34] font-medium"
                />
              </div>
            </div>

            {/* Aviso se range inválido */}
            {isInvalidRange && (
              <div className="p-2 bg-[#7D1416]/10 border border-[#AD2F3B]/30 rounded-xl text-[#7D1416] text-xs flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#AD2F3B]" />
                <span>A Data Inicial não pode ser posterior à Data Final.</span>
              </div>
            )}

            {/* Resumo do Período Selecionado */}
            {(tempFilters.dataInicio || tempFilters.dataFim) && !isInvalidRange && (
              <div className="text-[11px] text-[#252A34]/80 font-semibold bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-1.5">
                <span className="text-[#AD2F3B] font-bold">✓ Período ativo:</span>
                {tempFilters.dataInicio && tempFilters.dataFim ? (
                  <span>
                    De <strong>{formatDateBR(tempFilters.dataInicio)}</strong> até{' '}
                    <strong>{formatDateBR(tempFilters.dataFim)}</strong>
                  </span>
                ) : tempFilters.dataInicio ? (
                  <span>
                    A partir de <strong>{formatDateBR(tempFilters.dataInicio)}</strong>
                  </span>
                ) : (
                  <span>
                    Até <strong>{formatDateBR(tempFilters.dataFim)}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Filtro Solicitante */}
            <div>
              <label htmlFor="filtro-modal-solicitante" className="block text-xs font-bold text-[#252A34] mb-1.5 flex items-center gap-1.5 font-dm">
                <User className="w-3.5 h-3.5 text-[#252A34]" />
                <span>Por Nome do Solicitante</span>
              </label>
              <div className="relative">
                <input
                  id="filtro-modal-solicitante"
                  type="text"
                  placeholder="Ex: Alyson, Mariana..."
                  value={tempFilters.solicitante}
                  onChange={(e) => setTempFilters({ ...tempFilters, solicitante: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] font-medium"
                />
                <Search className="w-4 h-4 text-[#252A34]/50 absolute left-3 top-3" />
              </div>
            </div>

            {/* Filtro GLPI */}
            <div>
              <label htmlFor="filtro-modal-glpi" className="block text-xs font-bold text-[#252A34] mb-1.5 flex items-center gap-1.5 font-dm">
                <Ticket className="w-3.5 h-3.5 text-[#AD2F3B]" />
                <span>Por Chamado GLPI</span>
              </label>
              <div className="relative">
                <input
                  id="filtro-modal-glpi"
                  type="text"
                  placeholder="Ex: 104928"
                  value={tempFilters.glpi}
                  onChange={(e) => setTempFilters({ ...tempFilters, glpi: e.target.value })}
                  className="w-full pl-8 pr-3 py-2.5 text-sm bg-slate-50 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] font-bold"
                />
                <span className="absolute left-3 top-2.5 text-[#252A34]/50 font-bold text-sm">#</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Filtro Sala */}
            <div>
              <label htmlFor="filtro-modal-sala" className="block text-xs font-bold text-[#252A34] mb-1.5 flex items-center gap-1.5 font-dm">
                <Building className="w-3.5 h-3.5 text-[#252A34]" />
                <span>Por Sala</span>
              </label>
              <select
                id="filtro-modal-sala"
                value={tempFilters.sala}
                onChange={(e) => setTempFilters({ ...tempFilters, sala: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] font-medium"
              >
                <option value="">Todas as Salas</option>
                {roomsList.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Setor */}
            <div>
              <label htmlFor="filtro-modal-setor" className="block text-xs font-bold text-[#252A34] mb-1.5 flex items-center gap-1.5 font-dm">
                <Layers className="w-3.5 h-3.5 text-[#AD2F3B]" />
                <span>Por Setor / Departamento</span>
              </label>
              <select
                id="filtro-modal-setor"
                value={tempFilters.setor}
                onChange={(e) => setTempFilters({ ...tempFilters, setor: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] font-medium"
              >
                <option value="">Todos os Setores</option>
                {sectorsList.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle de Histórico / Encerradas */}
          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center justify-between p-3 bg-[#EAEAEA]/40 hover:bg-[#EAEAEA]/80 rounded-xl border border-[#252A34]/15 cursor-pointer transition">
              <div className="flex items-center gap-2.5">
                {tempFilters.mostrarEncerradas ? (
                  <Eye className="w-4 h-4 text-[#AD2F3B]" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-400" />
                )}
                <div>
                  <span className="text-xs font-bold text-[#252A34] block font-raleway">
                    Incluir histórico de reuniões passadas
                  </span>
                  <span className="text-[11px] text-[#252A34]/70 font-dm">
                    Por padrão, exibe apenas agendamentos ativos
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={tempFilters.mostrarEncerradas}
                onChange={(e) => setTempFilters({ ...tempFilters, mostrarEncerradas: e.target.checked })}
                className="w-4 h-4 text-[#AD2F3B] rounded border-slate-300 focus:ring-[#AD2F3B]"
              />
            </label>
          </div>

          {/* Rodapé de Ações */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {hasChanges ? (
              <button
                type="button"
                id="btn-modal-limpar-filtros"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs text-[#AD2F3B] hover:text-[#7D1416] font-bold px-2.5 py-1 rounded-xl bg-[#AD2F3B]/10 hover:bg-[#AD2F3B]/20 border border-[#AD2F3B]/30 transition font-dm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpar Filtros</span>
              </button>
            ) : (
              <div className="text-[11px] text-[#252A34]/50 font-medium">Nenhum filtro aplicado</div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-[#252A34] hover:bg-slate-100 rounded-xl border border-slate-300 transition font-dm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-aplicar-filtros"
                type="submit"
                disabled={isInvalidRange}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#FF2E63] hover:bg-[#AD2F3B] disabled:opacity-50 text-white rounded-xl transition shadow-lg shadow-[#FF2E63]/30 font-raleway tracking-wide cursor-pointer active:scale-95"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Aplicar Pesquisa</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
