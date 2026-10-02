import React from 'react';
import { FilterOptions } from '../types';
import { Search, Calendar, User, Ticket, RotateCcw, Eye, EyeOff, Building, Layers, CalendarRange, AlertCircle } from 'lucide-react';
import { DEFAULT_SALAS, DEFAULT_SETORES } from '../utils/mockData';
import { getTodayString } from '../utils/dateUtils';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (newFilters: FilterOptions) => void;
  onResetFilters: () => void;
  availableRooms: string[];
  availableSectors: string[];
  totalFiltered: number;
  totalAll: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  availableRooms,
  availableSectors,
  totalFiltered,
  totalAll,
}) => {
  const roomsList = Array.from(new Set([...DEFAULT_SALAS, ...availableRooms]));
  const sectorsList = Array.from(new Set([...DEFAULT_SETORES, ...availableSectors]));

  const hasActiveFilters =
    Boolean(filters.data) ||
    Boolean(filters.dataInicio) ||
    Boolean(filters.dataFim) ||
    Boolean(filters.solicitante) ||
    Boolean(filters.glpi) ||
    Boolean(filters.sala) ||
    Boolean(filters.setor) ||
    filters.mostrarEncerradas;

  const isInvalidRange = Boolean(
    filters.dataInicio &&
    filters.dataFim &&
    filters.dataInicio > filters.dataFim
  );

  const applyPreset = (preset: 'today' | 'next7' | 'thisMonth' | 'clearDates') => {
    const now = new Date();
    const todayStr = getTodayString(now);

    if (preset === 'today') {
      onFilterChange({
        ...filters,
        data: '',
        dataInicio: todayStr,
        dataFim: todayStr,
      });
    } else if (preset === 'next7') {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      onFilterChange({
        ...filters,
        data: '',
        dataInicio: todayStr,
        dataFim: getTodayString(nextWeek),
      });
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      onFilterChange({
        ...filters,
        data: '',
        dataInicio: getTodayString(firstDay),
        dataFim: getTodayString(lastDay),
      });
    } else if (preset === 'clearDates') {
      onFilterChange({
        ...filters,
        data: '',
        dataInicio: '',
        dataFim: '',
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#252A34]/10 shadow-sm p-4 sm:p-5 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#7D1416]/10 text-[#7D1416] flex items-center justify-center font-bold">
            <Search className="w-4 h-4 text-[#7D1416]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#7D1416] font-raleway">
              Pesquisar & Filtrar Reservas
            </h2>
            <p className="text-xs text-[#252A34]/70 font-dm">
              Filtre por período com data inicial e data final, chamado GLPI, solicitante, sala ou setor
            </p>
          </div>
        </div>

        {/* Counter indicator */}
        <div className="flex items-center gap-2 text-xs font-dm">
          <span className="text-[#252A34]/70">Exibindo:</span>
          <span className="font-bold px-2 py-0.5 bg-[#EAEAEA] text-[#252A34] rounded-md font-dm">
            {totalFiltered} de {totalAll} registros
          </span>
          {hasActiveFilters && (
            <button
              id="btn-limpar-filtros"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs text-[#AD2F3B] hover:text-[#7D1416] font-bold ml-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Atalhos Rápidos de Período */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3 text-xs font-dm">
        <span className="text-xs font-bold text-[#252A34] flex items-center gap-1 mr-1">
          <CalendarRange className="w-3.5 h-3.5 text-[#AD2F3B]" />
          <span>Atalhos de Período:</span>
        </span>
        <button
          type="button"
          onClick={() => applyPreset('today')}
          className="px-2.5 py-1 text-[11px] font-bold bg-[#EAEAEA] hover:bg-[#AD2F3B]/10 hover:border-[#AD2F3B] text-[#252A34] border border-slate-300 rounded-lg transition cursor-pointer"
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => applyPreset('next7')}
          className="px-2.5 py-1 text-[11px] font-bold bg-[#EAEAEA] hover:bg-[#AD2F3B]/10 hover:border-[#AD2F3B] text-[#252A34] border border-slate-300 rounded-lg transition cursor-pointer"
        >
          Próximos 7 dias
        </button>
        <button
          type="button"
          onClick={() => applyPreset('thisMonth')}
          className="px-2.5 py-1 text-[11px] font-bold bg-[#EAEAEA] hover:bg-[#AD2F3B]/10 hover:border-[#AD2F3B] text-[#252A34] border border-slate-300 rounded-lg transition cursor-pointer"
        >
          Este Mês
        </button>
        {(filters.dataInicio || filters.dataFim || filters.data) && (
          <button
            type="button"
            onClick={() => applyPreset('clearDates')}
            className="px-2.5 py-1 text-[11px] font-bold bg-[#AD2F3B]/10 hover:bg-[#AD2F3B]/20 text-[#AD2F3B] border border-[#AD2F3B]/30 rounded-lg transition cursor-pointer"
          >
            Limpar Período
          </button>
        )}
      </div>

      {/* Grid of Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 font-dm">
        {/* 1. Filter by Data Inicial */}
        <div>
          <label htmlFor="filtro-data-inicio" className="block text-xs font-bold text-[#252A34] mb-1 flex items-center gap-1 font-dm">
            <Calendar className="w-3.5 h-3.5 text-[#AD2F3B]" />
            <span>Data Inicial</span>
          </label>
          <input
            id="filtro-data-inicio"
            type="date"
            value={filters.dataInicio || filters.data || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                data: '',
                dataInicio: e.target.value,
              })
            }
            className="w-full px-2.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] transition font-medium"
          />
        </div>

        {/* 2. Filter by Data Final */}
        <div>
          <label htmlFor="filtro-data-fim" className="block text-xs font-bold text-[#252A34] mb-1 flex items-center gap-1 font-dm">
            <Calendar className="w-3.5 h-3.5 text-[#AD2F3B]" />
            <span>Data Final</span>
          </label>
          <input
            id="filtro-data-fim"
            type="date"
            value={filters.dataFim || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                data: '',
                dataFim: e.target.value,
              })
            }
            className="w-full px-2.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] transition font-medium"
          />
        </div>

        {/* 3. Filter by Solicitante */}
        <div>
          <label htmlFor="filtro-solicitante" className="block text-xs font-bold text-[#252A34] mb-1 flex items-center gap-1 font-dm">
            <User className="w-3.5 h-3.5 text-[#252A34]" />
            <span>Solicitante</span>
          </label>
          <div className="relative">
            <input
              id="filtro-solicitante"
              type="text"
              placeholder="Ex: Carlos..."
              value={filters.solicitante}
              onChange={(e) => onFilterChange({ ...filters, solicitante: e.target.value })}
              className="w-full pl-7 pr-2 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] transition font-medium"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
          </div>
        </div>

        {/* 4. Filter by GLPI */}
        <div>
          <label htmlFor="filtro-glpi" className="block text-xs font-bold text-[#252A34] mb-1 flex items-center gap-1 font-dm">
            <Ticket className="w-3.5 h-3.5 text-[#AD2F3B]" />
            <span>Chamado GLPI</span>
          </label>
          <div className="relative">
            <input
              id="filtro-glpi"
              type="text"
              placeholder="Ex: 104928"
              value={filters.glpi}
              onChange={(e) => onFilterChange({ ...filters, glpi: e.target.value })}
              className="w-full pl-6 pr-2 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] transition font-bold"
            />
            <span className="text-slate-400 absolute left-2 top-2 text-xs font-bold">#</span>
          </div>
        </div>

        {/* 5. Filter by Sala */}
        <div>
          <label htmlFor="filtro-sala" className="block text-xs font-bold text-[#252A34] mb-1 flex items-center gap-1 font-dm">
            <Building className="w-3.5 h-3.5 text-[#252A34]" />
            <span>Sala</span>
          </label>
          <select
            id="filtro-sala"
            value={filters.sala}
            onChange={(e) => onFilterChange({ ...filters, sala: e.target.value })}
            className="w-full px-2.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] transition font-medium"
          >
            <option value="">Todas as Salas</option>
            {roomsList.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Filter by Setor */}
        <div>
          <label htmlFor="filtro-setor" className="block text-xs font-bold text-[#252A34] mb-1 flex items-center gap-1 font-dm">
            <Layers className="w-3.5 h-3.5 text-[#AD2F3B]" />
            <span>Setor / Depto</span>
          </label>
          <select
            id="filtro-setor"
            value={filters.setor}
            onChange={(e) => onFilterChange({ ...filters, setor: e.target.value })}
            className="w-full px-2.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] transition font-medium"
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

      {/* Alerta se Data Inicial > Data Final */}
      {isInvalidRange && (
        <div className="mt-2.5 p-2 bg-[#7D1416]/10 border border-[#AD2F3B]/30 rounded-xl text-[#7D1416] text-xs flex items-center gap-1.5 font-bold font-dm">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#AD2F3B]" />
          <span>Atenção: A Data Inicial não pode ser posterior à Data Final.</span>
        </div>
      )}

      {/* Auto-Hide Expired Toggle Notice */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-dm">
        <div className="flex items-center gap-2 text-[#252A34]/80">
          <span className="w-2 h-2 rounded-full bg-[#AD2F3B] animate-pulse"></span>
          <span>
            <strong>Regra de Exibição:</strong> Por padrão, reuniões encerradas são ocultadas a menos que você defina um período específico ou marque o histórico.
          </span>
        </div>

        <button
          id="btn-toggle-encerradas"
          onClick={() => onFilterChange({ ...filters, mostrarEncerradas: !filters.mostrarEncerradas })}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
            filters.mostrarEncerradas
              ? 'bg-[#AD2F3B]/10 text-[#7D1416] border-[#AD2F3B]/30 hover:bg-[#AD2F3B]/20'
              : 'bg-slate-50 text-[#252A34]/70 border-slate-200 hover:bg-slate-100'
          }`}
        >
          {filters.mostrarEncerradas ? (
            <>
              <Eye className="w-3.5 h-3.5 text-[#AD2F3B]" />
              <span>Mostrando histórico encerrado</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              <span>Ver histórico / reservas encerradas</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
