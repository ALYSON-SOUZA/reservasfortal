import React from 'react';
import { FilterOptions } from '../types';
import { formatDateBR } from '../utils/dateUtils';
import { X, Filter, CalendarRange } from 'lucide-react';

interface ActiveFilterBannerProps {
  filters: FilterOptions;
  onResetFilters: () => void;
  onOpenFilterModal: () => void;
  onRemoveFilter: (key: keyof FilterOptions | 'periodo') => void;
  totalFiltered: number;
  totalNext: number;
}

export const ActiveFilterBanner: React.FC<ActiveFilterBannerProps> = ({
  filters,
  onResetFilters,
  onOpenFilterModal,
  onRemoveFilter,
  totalFiltered,
  totalNext,
}) => {
  const hasPeriodFilter = Boolean(filters.dataInicio || filters.dataFim || filters.data);

  const hasFilters =
    hasPeriodFilter ||
    Boolean(filters.solicitante) ||
    Boolean(filters.glpi) ||
    Boolean(filters.sala) ||
    Boolean(filters.setor) ||
    Boolean(filters.filial) ||
    filters.mostrarEncerradas;

  if (!hasFilters) return null;

  return (
    <div className="bg-white border border-[#AD2F3B]/30 rounded-2xl p-3.5 mb-4 text-xs font-dm text-[#252A34] flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-[#7D1416] flex items-center gap-1.5 font-raleway text-sm">
          <Filter className="w-4 h-4 text-[#AD2F3B]" /> Filtros ativos:
        </span>

        {/* Período (Data Inicial e/ou Final) */}
        {hasPeriodFilter && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[#252A34] font-semibold shadow-xs">
            <CalendarRange className="w-3.5 h-3.5 text-[#AD2F3B]" />
            {filters.dataInicio && filters.dataFim ? (
              <span>
                Período:{' '}
                <strong className="text-[#7D1416]">{formatDateBR(filters.dataInicio)}</strong> até{' '}
                <strong className="text-[#7D1416]">{formatDateBR(filters.dataFim)}</strong>
              </span>
            ) : filters.dataInicio ? (
              <span>
                A partir de:{' '}
                <strong className="text-[#7D1416]">{formatDateBR(filters.dataInicio)}</strong>
              </span>
            ) : filters.dataFim ? (
              <span>
                Até: <strong className="text-[#7D1416]">{formatDateBR(filters.dataFim)}</strong>
              </span>
            ) : (
              <span>
                Data: <strong className="text-[#7D1416]">{formatDateBR(filters.data || '')}</strong>
              </span>
            )}
            <button
              onClick={() => onRemoveFilter('periodo')}
              title="Remover filtro de período"
              className="text-[#252A34]/50 hover:text-[#AD2F3B] hover:bg-[#AD2F3B]/10 ml-1 p-0.5 rounded transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filters.solicitante && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[#252A34] font-semibold shadow-xs">
            Solicitante: <strong className="text-[#252A34]">{filters.solicitante}</strong>
            <button
              onClick={() => onRemoveFilter('solicitante')}
              className="text-[#252A34]/50 hover:text-[#AD2F3B] hover:bg-[#AD2F3B]/10 ml-1 p-0.5 rounded transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filters.glpi && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[#252A34] font-bold shadow-xs">
            GLPI: <strong className="text-white bg-[#7D1416] px-1.5 py-0.5 rounded text-[11px]">#{filters.glpi}</strong>
            <button
              onClick={() => onRemoveFilter('glpi')}
              className="text-[#252A34]/50 hover:text-[#AD2F3B] hover:bg-[#AD2F3B]/10 ml-1 p-0.5 rounded transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filters.sala && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[#252A34] font-semibold shadow-xs">
            Sala: <strong className="text-[#252A34]">{filters.sala}</strong>
            <button
              onClick={() => onRemoveFilter('sala')}
              className="text-[#252A34]/50 hover:text-[#AD2F3B] hover:bg-[#AD2F3B]/10 ml-1 p-0.5 rounded transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filters.setor && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[#252A34] font-semibold shadow-xs">
            Setor: <strong className="text-[#252A34]">{filters.setor}</strong>
            <button
              onClick={() => onRemoveFilter('setor')}
              className="text-[#252A34]/50 hover:text-[#AD2F3B] hover:bg-[#AD2F3B]/10 ml-1 p-0.5 rounded transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filters.filial && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 font-bold shadow-xs">
            Filial: <strong className="text-[#7D1416]">{filters.filial}</strong>
            <button
              onClick={() => onRemoveFilter('filial')}
              title="Remover filtro de filial"
              className="text-[#252A34]/50 hover:text-[#AD2F3B] hover:bg-[#AD2F3B]/10 ml-1 p-0.5 rounded transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {filters.mostrarEncerradas && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#AD2F3B]/10 border border-[#AD2F3B]/30 text-[#AD2F3B] font-bold shadow-xs">
            Incluindo Encerradas
            <button
              onClick={() => onRemoveFilter('mostrarEncerradas')}
              className="text-[#AD2F3B] hover:text-[#7D1416] ml-1 p-0.5 rounded transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[#252A34]/70 font-medium">
          Exibindo: <strong className="text-[#7D1416] font-bold font-raleway text-sm">{totalFiltered}</strong> de {totalNext}
        </span>
        <button
          onClick={onOpenFilterModal}
          className="text-[#AD2F3B] hover:text-[#7D1416] font-bold underline underline-offset-4 transition cursor-pointer"
        >
          Ajustar
        </button>
        <button
          onClick={onResetFilters}
          id="btn-limpar-todos-filtros-banner"
          title="Limpar todos os filtros ativos (❌)"
          className="inline-flex items-center gap-1.5 text-white bg-[#FF2E63] hover:bg-[#AD2F3B] font-bold px-3 py-1.5 rounded-xl shadow-md shadow-[#FF2E63]/30 active:scale-95 transition cursor-pointer font-raleway"
        >
          <span className="text-xs">❌</span> Limpar Filtros
        </button>
      </div>
    </div>
  );
};
