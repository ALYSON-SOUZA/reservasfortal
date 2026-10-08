import React, { useState, useMemo, useEffect } from 'react';
import { Reservation, Sala, Filial, FilterOptions } from '../types';
import { formatDateBR, getConflictPriorityInfo, getReservationStatus, getTodayString } from '../utils/dateUtils';
import {
  Printer,
  X,
  FileSpreadsheet,
  FileDown,
  Building2,
  Calendar,
  Layers,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { exportReservationsPDF } from '../utils/pdfExport';
import {
  resolveReservationFilial,
  buildRoomFilialMap,
  filterReservations,
  PeriodOption,
  isReservationOpen,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getFutureRange,
} from '../utils/filialUtils';

export type ReportType = 'em_aberto' | 'geral' | 'conflitos' | 'por_sala' | 'por_setor';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // allReservations contendo todas as reservas do sistema
  allReservations?: Reservation[];
  // reservations para compatibilidade reversa
  reservations?: Reservation[];
  rooms?: Sala[];
  filiais?: Filial[];
  initialFilial?: string;
  filters?: FilterOptions;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  allReservations = [],
  reservations = [],
  rooms = [],
  filiais = [],
  initialFilial = '',
  filters,
}) => {
  // Base de dados principal: prefere allReservations, com fallback para reservations
  const baseReservations = useMemo(() => {
    if (allReservations && allReservations.length > 0) return allReservations;
    return reservations;
  }, [allReservations, reservations]);

  // Mapa de filial por sala
  const roomFilialMap = useMemo(() => buildRoomFilialMap(rooms), [rooms]);

  // Lista dinâmica de filiais disponíveis
  const availableFiliais = useMemo(() => {
    const list: string[] = [];
    filiais.forEach((f) => {
      if (f.nome && !list.includes(f.nome)) list.push(f.nome);
    });
    rooms.forEach((r) => {
      if (r.filial && !list.includes(r.filial)) list.push(r.filial);
    });
    baseReservations.forEach((res) => {
      const resFilial = resolveReservationFilial(res, roomFilialMap);
      if (resFilial && !list.includes(resFilial)) list.push(resFilial);
    });
    return list.sort();
  }, [filiais, rooms, baseReservations, roomFilialMap]);

  // ========================================================
  // ESTADOS DE FILTRO: DATA INICIAL, DATA FINAL, FILIAL E TIPO
  // Regra de ouro: Sem filtragem deve aparecer todas as reservas em aberto!
  // ========================================================
  const [reportType, setReportType] = useState<ReportType>('em_aberto');
  const [selectedFilial, setSelectedFilial] = useState<string>(initialFilial || '');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string>('abertas');

  // Atualiza filial inicial caso abra com contexto prévio
  useEffect(() => {
    if (isOpen && initialFilial) {
      setSelectedFilial(initialFilial);
    }
  }, [isOpen, initialFilial]);

  // Função para aplicar atalhos rápidos de período
  const applyPeriodPreset = (preset: 'abertas' | 'hoje' | 'semana' | 'mes' | 'proximos_7' | 'proximos_30') => {
    setActivePreset(preset);
    if (preset === 'abertas') {
      setDataInicio('');
      setDataFim('');
    } else if (preset === 'hoje') {
      const today = getTodayString();
      setDataInicio(today);
      setDataFim(today);
    } else if (preset === 'semana') {
      const { start, end } = getCurrentWeekRange();
      setDataInicio(start);
      setDataFim(end);
    } else if (preset === 'mes') {
      const { start, end } = getCurrentMonthRange();
      setDataInicio(start);
      setDataFim(end);
    } else if (preset === 'proximos_7') {
      const { start, end } = getFutureRange(7);
      setDataInicio(start);
      setDataFim(end);
    } else if (preset === 'proximos_30') {
      const { start, end } = getFutureRange(30);
      setDataInicio(start);
      setDataFim(end);
    }
  };

  // Redefine para o padrão solicitado: todas as reservas em aberto
  const handleResetFilters = () => {
    setReportType('em_aberto');
    setSelectedFilial('');
    setDataInicio('');
    setDataFim('');
    setActivePreset('abertas');
  };

  // Aplica filtragem por filial, data inicial e data final sobre todas as reservas
  const filteredData = useMemo(() => {
    const periodOption: PeriodOption = dataInicio || dataFim ? 'personalizado' : (activePreset as PeriodOption) || 'abertas';
    return filterReservations(baseReservations, {
      filial: selectedFilial,
      periodo: periodOption,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      roomFilialMap,
    });
  }, [baseReservations, selectedFilial, activePreset, dataInicio, dataFim, roomFilialMap]);

  // Ordena por data e hora de início
  const sortedReservations = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (a.dia !== b.dia) return a.dia.localeCompare(b.dia);
      return a.horaInicial.localeCompare(b.horaInicial);
    });
  }, [filteredData]);

  // Agrupamento por sala para o relatório "por_sala"
  const roomSummary = useMemo(() => {
    const summary: Record<
      string,
      { count: number; totalMinutes: number; filial: string; reservations: Reservation[] }
    > = {};

    sortedReservations.forEach((res) => {
      const roomKey = res.sala || 'Sala Não Definida';
      if (!summary[roomKey]) {
        summary[roomKey] = {
          count: 0,
          totalMinutes: 0,
          filial: resolveReservationFilial(res, roomFilialMap),
          reservations: [],
        };
      }
      summary[roomKey].count++;
      summary[roomKey].reservations.push(res);

      const [sh, sm] = res.horaInicial.split(':').map(Number);
      const [eh, em] = res.horaFinal.split(':').map(Number);
      const diff = (eh || 0) * 60 + (em || 0) - ((sh || 0) * 60 + (sm || 0));
      if (diff > 0) summary[roomKey].totalMinutes += diff;
    });

    return Object.entries(summary)
      .map(([name, data]) => ({
        room: name,
        ...data,
        hoursFormatted: `${Math.floor(data.totalMinutes / 60)}h ${data.totalMinutes % 60}m`,
      }))
      .sort((a, b) => b.count - a.count);
  }, [sortedReservations, roomFilialMap]);

  // Agrupamento por setor para o relatório "por_setor"
  const sectorSummary = useMemo(() => {
    const summary: Record<string, { count: number; totalMinutes: number; solicitantes: Set<string> }> = {};

    sortedReservations.forEach((res) => {
      const sectorKey = res.setor || 'Setor Não Definido';
      if (!summary[sectorKey]) {
        summary[sectorKey] = {
          count: 0,
          totalMinutes: 0,
          solicitantes: new Set(),
        };
      }
      summary[sectorKey].count++;
      if (res.solicitante) summary[sectorKey].solicitantes.add(res.solicitante);

      const [sh, sm] = res.horaInicial.split(':').map(Number);
      const [eh, em] = res.horaFinal.split(':').map(Number);
      const diff = (eh || 0) * 60 + (em || 0) - ((sh || 0) * 60 + (sm || 0));
      if (diff > 0) summary[sectorKey].totalMinutes += diff;
    });

    return Object.entries(summary)
      .map(([setor, data]) => ({
        setor,
        count: data.count,
        totalHours: `${Math.floor(data.totalMinutes / 60)}h ${data.totalMinutes % 60}m`,
        solicitantesCount: data.solicitantes.size,
      }))
      .sort((a, b) => b.count - a.count);
  }, [sortedReservations]);

  // Conflitos detectados na listagem
  const conflictReservations = useMemo(() => {
    return sortedReservations.filter((r) => {
      const info = getConflictPriorityInfo(r, sortedReservations);
      return info.hasConflict;
    });
  }, [sortedReservations]);

  // Título e escopo descritivo para impressão / cabeçalho
  const reportTitleDesc = useMemo(() => {
    let typeName = 'Reservas em Aberto';
    if (reportType === 'geral') typeName = 'Geral de Reservas';
    if (reportType === 'conflitos') typeName = 'Conflitos & Precedência GLPI';
    if (reportType === 'por_sala') typeName = 'Ocupação Consolidada por Sala';
    if (reportType === 'por_setor') typeName = 'Consolidado por Setor Solicitante';

    const filialName = selectedFilial ? selectedFilial : 'Todas as Filiais';

    let periodName = 'Todas em Aberto';
    if (dataInicio && dataFim) {
      periodName = `${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}`;
    } else if (dataInicio) {
      periodName = `A partir de ${formatDateBR(dataInicio)}`;
    } else if (dataFim) {
      periodName = `Até ${formatDateBR(dataFim)}`;
    } else if (activePreset === 'hoje') {
      periodName = 'Hoje';
    } else if (activePreset === 'semana') {
      periodName = 'Esta Semana';
    } else if (activePreset === 'mes') {
      periodName = 'Este Mês';
    } else if (activePreset === 'proximos_7') {
      periodName = 'Próximos 7 Dias';
    } else if (activePreset === 'proximos_30') {
      periodName = 'Próximos 30 Dias';
    }

    return { typeName, filialName, periodName };
  }, [reportType, selectedFilial, dataInicio, dataFim, activePreset]);

  if (!isOpen) return null;

  // Exportação CSV formatada
  const handleExportCSV = () => {
    if (sortedReservations.length === 0) return;

    const headers = [
      'DIA',
      'FILIAL',
      'SALA',
      'HORA INICIAL',
      'HORA FINAL',
      'STATUS',
      'SOLICITANTE',
      'SETOR',
      'GLPI',
      'CADASTRADO POR (CPF)',
      'OBSERVACOES',
    ];

    const rows = sortedReservations.map((r) => {
      const st = getReservationStatus(r.dia, r.horaInicial, r.horaFinal);
      const fil = resolveReservationFilial(r, roomFilialMap);
      return [
        formatDateBR(r.dia),
        `"${fil}"`,
        `"${r.sala}"`,
        r.horaInicial,
        r.horaFinal,
        `"${st}"`,
        `"${r.solicitante}"`,
        `"${r.setor}"`,
        `"#${r.glpi}"`,
        `"${r.criadoPor || 'Operador'}${r.criadoPorCpf ? ` - CPF: ${r.criadoPorCpf}` : ''}"`,
        `"${(r.observacoes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `relatorio_reservas_${selectedFilial ? selectedFilial.replace(/[\s/]/g, '_') : 'todas_filiais'}_${
        new Date().toISOString().slice(0, 10)
      }.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportação PDF / Impressão
  const handlePrintPDF = () => {
    const filterDesc = `Relatório: ${reportTitleDesc.typeName} | Filial: ${reportTitleDesc.filialName} | Período: ${reportTitleDesc.periodName} (${sortedReservations.length} agendamentos)`;
    exportReservationsPDF(
      sortedReservations,
      `Bellinati Perez - ${reportTitleDesc.typeName} - ${reportTitleDesc.filialName}`,
      filterDesc
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-dm-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Modal em Bordô #7D1416 */}
        <div className="bg-[#7D1416] text-white px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#AD2F3B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#7D1416] flex items-center justify-center font-bold shadow-md shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-raleway leading-tight text-white flex items-center gap-2">
                <span>Central de Relatórios Corporativos</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-mono font-medium">
                  Bellinati Perez
                </span>
              </h2>
              <p className="text-xs text-[#EAEAEA]/80 font-medium mt-0.5">
                Escolha o relatório, a filial e o período com Data Inicial e Data Final para conferência e exportação
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              id="btn-exportar-csv"
              type="button"
              onClick={handleExportCSV}
              disabled={sortedReservations.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white border border-white/20 text-xs font-semibold transition active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span className="hidden md:inline">Exportar Planilha (CSV)</span>
              <span className="md:hidden">CSV</span>
            </button>

            <button
              id="btn-imprimir-relatorio"
              type="button"
              onClick={handlePrintPDF}
              disabled={sortedReservations.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] disabled:opacity-40 text-white text-xs font-bold font-raleway tracking-wide transition shadow-md shadow-[#FF2E63]/30 active:scale-95 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Exportar PDF / Imprimir</span>
            </button>

            <button
              id="btn-fechar-relatorio"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer ml-1"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* BARRA DE CONFIGURAÇÃO: RELATÓRIO, FILIAL, DATA INICIAL/FINAL */}
        {/* ======================================================== */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Escolher o Relatório */}
            <div>
              <label
                htmlFor="select-tipo-relatorio"
                className="block text-xs font-bold uppercase tracking-wider text-[#7D1416] font-raleway mb-1.5 flex items-center gap-1"
              >
                <Layers className="w-3.5 h-3.5 text-[#AD2F3B]" />
                <span>1. Relatório:</span>
              </label>
              <div className="relative">
                <select
                  id="select-tipo-relatorio"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-[#252A34] focus:ring-2 focus:ring-[#7D1416] focus:border-transparent transition shadow-2xs appearance-none pr-8 cursor-pointer"
                >
                  <option value="em_aberto">Reservas em Aberto (Ativas / Futuras)</option>
                  <option value="geral">Geral Completo (Todas as Reservas)</option>
                  <option value="conflitos">Conflitos de Sala & Precedência GLPI</option>
                  <option value="por_sala">Resumo Consolidado por Sala</option>
                  <option value="por_setor">Resumo Consolidado por Setor</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 2. Escolher a Filial */}
            <div>
              <label
                htmlFor="select-filial-relatorio"
                className="block text-xs font-bold uppercase tracking-wider text-[#7D1416] font-raleway mb-1.5 flex items-center gap-1"
              >
                <Building2 className="w-3.5 h-3.5 text-[#AD2F3B]" />
                <span>2. Filial:</span>
              </label>
              <div className="relative">
                <select
                  id="select-filial-relatorio"
                  value={selectedFilial}
                  onChange={(e) => setSelectedFilial(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-[#252A34] focus:ring-2 focus:ring-[#7D1416] focus:border-transparent transition shadow-2xs appearance-none pr-8 cursor-pointer"
                >
                  <option value="">Todas as Filiais (Geral da Empresa)</option>
                  {availableFiliais.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 3. Data Inicial */}
            <div>
              <label
                htmlFor="input-data-inicial-relatorio"
                className="block text-xs font-bold uppercase tracking-wider text-[#7D1416] font-raleway mb-1.5 flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-[#AD2F3B]" />
                <span>3. Data Inicial:</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="input-data-inicial-relatorio"
                  value={dataInicio}
                  onChange={(e) => {
                    setDataInicio(e.target.value);
                    setActivePreset('personalizado');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#252A34] focus:ring-2 focus:ring-[#7D1416] focus:border-transparent transition shadow-2xs cursor-pointer"
                />
              </div>
            </div>

            {/* 4. Data Final */}
            <div>
              <label
                htmlFor="input-data-final-relatorio"
                className="block text-xs font-bold uppercase tracking-wider text-[#7D1416] font-raleway mb-1.5 flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-[#AD2F3B]" />
                <span>4. Data Final:</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="input-data-final-relatorio"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                    setActivePreset('personalizado');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#252A34] focus:ring-2 focus:ring-[#7D1416] focus:border-transparent transition shadow-2xs cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Atalhos Rápidos de Período (Pills compactos) */}
          <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Atalhos:</span>
              <button
                type="button"
                onClick={() => applyPeriodPreset('abertas')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  !dataInicio && !dataFim && activePreset === 'abertas'
                    ? 'bg-[#7D1416] text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Todas em Aberto (Padrão)
              </button>

              <button
                type="button"
                onClick={() => applyPeriodPreset('hoje')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activePreset === 'hoje'
                    ? 'bg-[#7D1416] text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={() => applyPeriodPreset('semana')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activePreset === 'semana'
                    ? 'bg-[#7D1416] text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Esta Semana
              </button>

              <button
                type="button"
                onClick={() => applyPeriodPreset('mes')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activePreset === 'mes'
                    ? 'bg-[#7D1416] text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Este Mês
              </button>

              <button
                type="button"
                onClick={() => applyPeriodPreset('proximos_7')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activePreset === 'proximos_7'
                    ? 'bg-[#7D1416] text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                Próximos 7 Dias
              </button>

              {(dataInicio || dataFim) && (
                <button
                  type="button"
                  onClick={() => applyPeriodPreset('abertas')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                  title="Limpar datas e voltar para todas em aberto"
                >
                  ✕ Limpar Datas
                </button>
              )}
            </div>

            {/* Botão de Redefinir para Padrão (Todas em aberto) */}
            {(selectedFilial || dataInicio || dataFim || reportType !== 'em_aberto') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] text-[#7D1416] hover:text-[#AD2F3B] font-bold hover:underline cursor-pointer"
                title="Voltar para exibição padrão de todas as reservas em aberto"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Padrão (Todas em Aberto)</span>
              </button>
            )}
          </div>

          {/* Banner de status / Feedback rápido de conformidade */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-700">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {sortedReservations.length}{' '}
                {sortedReservations.length === 1 ? 'reserva encontrada' : 'reservas encontradas'}
              </span>

              <span className="text-slate-400 hidden sm:inline">•</span>

              <span className="text-slate-600">
                Filial: <strong>{reportTitleDesc.filialName}</strong>
              </span>

              <span className="text-slate-400 hidden sm:inline">•</span>

              <span className="text-slate-600">
                Período: <strong>{reportTitleDesc.periodName}</strong>
              </span>

              {conflictReservations.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px]">
                  ⚠️ {conflictReservations.length} com sobreposição
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ÁREA DE VISUALIZAÇÃO E IMPRESSÃO                         */}
        {/* ======================================================== */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 bg-white text-[#252A34]" id="area-impressao">
          {/* Cabeçalho do Relatório */}
          <div className="border-b-2 border-[#7D1416] pb-3.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-[#7D1416]" />
                <h1 className="text-xl sm:text-2xl font-black text-[#7D1416] font-raleway tracking-tight">
                  BELLINATI PEREZ — {reportTitleDesc.typeName.toUpperCase()}
                </h1>
              </div>
              <p className="text-xs text-[#252A34]/70 font-semibold mt-0.5">
                Unidade: <strong className="text-[#7D1416]">{reportTitleDesc.filialName}</strong> • Período:{' '}
                <strong className="text-[#7D1416]">{reportTitleDesc.periodName}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-[#252A34]/70 font-medium">
              <p>
                Gerado em: <strong>{new Date().toLocaleString('pt-BR')}</strong>
              </p>
              <p>
                Total de Registros: <strong className="text-[#7D1416] font-bold">{sortedReservations.length}</strong>
              </p>
            </div>
          </div>

          {/* Se nenhuma reserva for encontrada */}
          {sortedReservations.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
              <h3 className="text-base font-bold text-[#252A34] font-raleway">Nenhuma reserva encontrada</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Não há agendamentos para a filial <strong>{reportTitleDesc.filialName}</strong> no período{' '}
                <strong>{reportTitleDesc.periodName}</strong>.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7D1416] text-white text-xs font-bold font-raleway hover:bg-[#AD2F3B] transition shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Exibir Todas as Reservas em Aberto</span>
              </button>
            </div>
          ) : (
            <>
              {/* TIPO: CONSOLIDADO POR SALA */}
              {reportType === 'por_sala' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {roomSummary.map((item, idx) => (
                      <div
                        key={item.room}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-xs transition"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-[#7D1416] font-raleway">{item.room}</span>
                          <span className="px-2 py-0.5 bg-[#7D1416]/10 text-[#7D1416] rounded-full text-[10px] font-bold font-mono">
                            #{idx + 1}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2">{item.filial}</p>
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                          <span className="text-slate-600">
                            <strong>{item.count}</strong> {item.count === 1 ? 'reunião' : 'reuniões'}
                          </span>
                          <span className="font-mono text-slate-700 font-bold">{item.hoursFormatted}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#7D1416] font-raleway mt-6 mb-2">
                    Detalhamento dos Agendamentos por Sala:
                  </h3>
                </div>
              )}

              {/* TIPO: CONSOLIDADO POR SETOR */}
              {reportType === 'por_setor' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sectorSummary.map((sec) => (
                      <div key={sec.setor} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60">
                        <h4 className="text-xs font-black text-[#7D1416] font-raleway">{sec.setor}</h4>
                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span>Total de Reuniões:</span>
                            <strong>{sec.count}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Tempo Reservado:</span>
                            <span className="font-mono font-bold">{sec.totalHours}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Solicitantes Únicos:</span>
                            <span>{sec.solicitantesCount}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#7D1416] font-raleway mt-6 mb-2">
                    Detalhamento das Reuniões por Setor:
                  </h3>
                </div>
              )}

              {/* TIPO: CONFLITOS */}
              {reportType === 'conflitos' && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Exibindo análise de concorrência de agenda. Em caso de sobreposição, a Bellinati Perez prioriza o
                    chamado GLPI mais antigo (menor número).
                  </span>
                </div>
              )}

              {/* TABELA PADRÃO DE AGENDAMENTOS */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#7D1416] text-white font-bold font-raleway uppercase tracking-wide">
                      <th className="p-2.5 border-r border-[#AD2F3B]">Dia</th>
                      <th className="p-2.5 border-r border-[#AD2F3B]">Horário</th>
                      <th className="p-2.5 border-r border-[#AD2F3B]">Filial</th>
                      <th className="p-2.5 border-r border-[#AD2F3B]">Sala</th>
                      <th className="p-2.5 border-r border-[#AD2F3B]">Solicitante</th>
                      <th className="p-2.5 border-r border-[#AD2F3B]">Setor</th>
                      <th className="p-2.5 border-r border-[#AD2F3B]">GLPI</th>
                      <th className="p-2.5 border-r border-[#AD2F3B]">Cadastrado Por</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {sortedReservations.map((r, index) => {
                      const resFilial = resolveReservationFilial(r, roomFilialMap);
                      const status = getReservationStatus(r.dia, r.horaInicial, r.horaFinal);
                      const conflictInfo = getConflictPriorityInfo(r, sortedReservations);

                      let statusBadge = (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          Confirmada
                        </span>
                      );

                      if (status === 'em_andamento') {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                            ● Em Andamento
                          </span>
                        );
                      } else if (status === 'agendada_hoje') {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Hoje
                          </span>
                        );
                      } else if (status === 'futura') {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            Futura
                          </span>
                        );
                      } else if (status === 'encerrada') {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                            Encerrada
                          </span>
                        );
                      }

                      return (
                        <tr
                          key={r.id || `${r.dia}-${r.horaInicial}-${index}`}
                          className={`hover:bg-slate-50/80 transition ${
                            conflictInfo.hasConflict ? 'bg-amber-50/40' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          }`}
                        >
                          <td className="p-2.5 font-bold font-mono text-slate-900 whitespace-nowrap">
                            {formatDateBR(r.dia)}
                          </td>
                          <td className="p-2.5 font-mono text-slate-700 whitespace-nowrap">
                            {r.horaInicial} - {r.horaFinal}
                          </td>
                          <td className="p-2.5 font-semibold text-slate-700 text-[11px] whitespace-nowrap">
                            {resFilial}
                          </td>
                          <td className="p-2.5 font-bold text-[#7D1416] whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span>{r.sala}</span>
                              {conflictInfo.hasConflict && (
                                <span title="Conflito de data/hora detectado" className="text-xs">
                                  ⚠️
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-slate-800">{r.solicitante}</td>
                          <td className="p-2.5 text-slate-700">{r.setor}</td>
                          <td className="p-2.5 font-mono font-bold text-[#AD2F3B] whitespace-nowrap">
                            #{r.glpi}
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-600">
                            <div>{r.criadoPor || 'Operador'}</div>
                            {r.criadoPorCpf && (
                              <div className="text-[10px] text-slate-400 font-mono">CPF: {r.criadoPorCpf}</div>
                            )}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {statusBadge}
                              {conflictInfo.hasConflict && conflictInfo.isPriority && (
                                <span
                                  className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  title="Detém a prioridade no horário por ter o GLPI mais antigo"
                                >
                                  ⭐ Prioridade
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Rodapé Interno com Totalizadores */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                <div>
                  Exibindo <strong>{sortedReservations.length}</strong> reuniões para a filial{' '}
                  <strong className="text-slate-800">{reportTitleDesc.filialName}</strong> • Período:{' '}
                  <strong className="text-slate-800">{reportTitleDesc.periodName}</strong>.
                </div>
                <div>
                  Bellinati Perez Facilities & TI • Governança Corporativa de Espaços
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
