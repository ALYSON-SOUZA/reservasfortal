import React, { useState, useMemo, useEffect } from 'react';
import { Reservation, Sala, Filial } from '../types';
import {
  X as CloseIcon,
  TrendingUp as TrendingUpIcon,
  Clock as ClockIcon,
  Building as BuildingIcon,
  Building2 as Building2Icon,
  Layers as LayersIcon,
  Calendar as CalendarIcon,
  Award as AwardIcon,
  CheckCircle2 as CheckCircle2Icon,
  RotateCcw as RotateCcwIcon,
  ChevronDown as ChevronDownIcon,
  BarChart3 as BarChart3Icon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  resolveReservationFilial,
  buildRoomFilialMap,
  filterReservations,
  PeriodOption,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getFutureRange,
} from '../utils/filialUtils';
import { formatDateBR, getTodayString } from '../utils/dateUtils';

export type MetricReportType = 'geral' | 'por_sala' | 'por_setor' | 'turnos';

interface AnalyticsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Reservation[];
  rooms: Sala[];
  filiais?: Filial[];
  initialFilial?: string;
}

export const AnalyticsDashboardModal: React.FC<AnalyticsDashboardModalProps> = ({
  isOpen,
  onClose,
  reservations = [],
  rooms = [],
  filiais = [],
  initialFilial = '',
}) => {
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
    reservations.forEach((res) => {
      const resFilial = resolveReservationFilial(res, roomFilialMap);
      if (resFilial && !list.includes(resFilial)) list.push(resFilial);
    });
    return list.sort();
  }, [filiais, rooms, reservations, roomFilialMap]);

  // ========================================================
  // ESTADOS DE FILTRO: DATA INICIAL, DATA FINAL, FILIAL E TIPO
  // Regra de ouro: Sem filtragem deve aparecer todas as reservas em aberto!
  // ========================================================
  const [reportType, setReportType] = useState<MetricReportType>('geral');
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

  // Aplicar atalhos rápidos de período
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

  // Redefinir para o padrão solicitado: todas as reservas em aberto
  const handleResetFilters = () => {
    setReportType('geral');
    setSelectedFilial('');
    setDataInicio('');
    setDataFim('');
    setActivePreset('abertas');
  };

  // Filtragem idêntica à do relatório: por filial, data inicial e data final
  const filtered = useMemo(() => {
    const periodOption: PeriodOption = dataInicio || dataFim ? 'personalizado' : (activePreset as PeriodOption) || 'abertas';
    return filterReservations(reservations, {
      filial: selectedFilial,
      periodo: periodOption,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      roomFilialMap,
    });
  }, [reservations, selectedFilial, activePreset, dataInicio, dataFim, roomFilialMap]);

  // Métrica 1: Total de horas agendadas
  const totalHours = useMemo(() => {
    let total = 0;
    filtered.forEach((r) => {
      const [startH, startM] = r.horaInicial.split(':').map(Number);
      const [endH, endM] = r.horaFinal.split(':').map(Number);
      const diff = (endH || 0) + (endM || 0) / 60 - ((startH || 0) + (startM || 0) / 60);
      if (diff > 0) total += diff;
    });
    return Math.round(total * 10) / 10;
  }, [filtered]);

  // Métrica 2: Duração média em minutos
  const avgDurationMinutes = useMemo(() => {
    if (filtered.length === 0) return 0;
    return Math.round((totalHours * 60) / filtered.length);
  }, [filtered.length, totalHours]);

  // Métrica 3: Reuniões por Sala
  const roomData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      const s = r.sala || 'Não informada';
      counts[s] = (counts[s] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, total]) => ({
        name: name.replace('Sala ', ''),
        fullName: name,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Sala mais demandada
  const topRoom = roomData.length > 0 ? roomData[0] : null;

  // Métrica 4: Reuniões por Setor
  const sectorData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      const sec = r.setor || 'Não informado';
      counts[sec] = (counts[sec] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, total]) => ({
        name,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filtered]);

  // Setor líder
  const topSector = sectorData.length > 0 ? sectorData[0] : null;

  // Métrica 5: Distribuição por Turno (Manhã, Tarde, Noite)
  const shiftData = useMemo(() => {
    let manha = 0; // antes das 12:00
    let tarde = 0; // 12:00 às 18:00
    let noite = 0; // após 18:00

    filtered.forEach((r) => {
      const h = parseInt(r.horaInicial.split(':')[0], 10);
      if (h < 12) manha++;
      else if (h < 18) tarde++;
      else noite++;
    });

    return [
      { name: 'Manhã (07h-12h)', value: manha, color: '#AD2F3B', pct: filtered.length ? Math.round((manha / filtered.length) * 100) : 0 },
      { name: 'Tarde (12h-18h)', value: tarde, color: '#7D1416', pct: filtered.length ? Math.round((tarde / filtered.length) * 100) : 0 },
      { name: 'Noite (18h-22h)', value: noite, color: '#252A34', pct: filtered.length ? Math.round((noite / filtered.length) * 100) : 0 },
    ];
  }, [filtered]);

  // Descrição do escopo de análise
  const scopeDescription = useMemo(() => {
    const filialLabel = selectedFilial ? selectedFilial : 'Todas as Filiais';
    let periodLabel = 'Todas em Aberto';
    if (dataInicio && dataFim) {
      periodLabel = `${formatDateBR(dataInicio)} a ${formatDateBR(dataFim)}`;
    } else if (dataInicio) {
      periodLabel = `A partir de ${formatDateBR(dataInicio)}`;
    } else if (dataFim) {
      periodLabel = `Até ${formatDateBR(dataFim)}`;
    } else if (activePreset === 'hoje') {
      periodLabel = 'Hoje';
    } else if (activePreset === 'semana') {
      periodLabel = 'Esta Semana';
    } else if (activePreset === 'mes') {
      periodLabel = 'Este Mês';
    } else if (activePreset === 'proximos_7') {
      periodLabel = 'Próximos 7 Dias';
    } else if (activePreset === 'proximos_30') {
      periodLabel = 'Próximos 30 Dias';
    }

    return { filialLabel, periodLabel };
  }, [selectedFilial, dataInicio, dataFim, activePreset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#252A34]/70 backdrop-blur-xs animate-in fade-in duration-200 font-dm-sans">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full overflow-hidden border border-[#252A34]/20 flex flex-col max-h-[92vh]">
        
        {/* Header com Bordô Oficial Bellinati Perez */}
        <div className="bg-[#7D1416] text-white p-5 flex items-center justify-between border-b-2 border-[#AD2F3B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white shadow-md shrink-0">
              <TrendingUpIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-raleway text-white flex items-center gap-2">
                <span>Painel de Métricas & Ocupação de Salas</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-mono font-medium">
                  Bellinati Perez
                </span>
              </h2>
              <p className="text-xs text-white/80 font-dm-sans">
                Indicadores executivos com filtro de Data Inicial e Data Final por filial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fechar janela"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* BARRA DE CONFIGURAÇÃO: MÉTRICA, FILIAL, DATA INICIAL/FINAL */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Escolher a Métrica / Relatório */}
            <div>
              <label
                htmlFor="select-metrica-relatorio"
                className="block text-xs font-bold uppercase tracking-wider text-[#7D1416] font-raleway mb-1.5 flex items-center gap-1"
              >
                <BarChart3Icon className="w-3.5 h-3.5 text-[#AD2F3B]" />
                <span>1. Tipo de Métricas:</span>
              </label>
              <div className="relative">
                <select
                  id="select-metrica-relatorio"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as MetricReportType)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-[#252A34] focus:ring-2 focus:ring-[#7D1416] focus:border-transparent transition shadow-2xs appearance-none pr-8 cursor-pointer"
                >
                  <option value="geral">Visão Geral & Indicadores Chave</option>
                  <option value="por_sala">Ocupação Detalhada por Sala</option>
                  <option value="por_setor">Demandas por Setor Solicitante</option>
                  <option value="turnos">Turnos & Horários de Pico</option>
                </select>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 2. Escolher a Filial */}
            <div>
              <label
                htmlFor="select-filial-metrica"
                className="block text-xs font-bold uppercase tracking-wider text-[#7D1416] font-raleway mb-1.5 flex items-center gap-1"
              >
                <Building2Icon className="w-3.5 h-3.5 text-[#AD2F3B]" />
                <span>2. Filial:</span>
              </label>
              <div className="relative">
                <select
                  id="select-filial-metrica"
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
                <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* 3. Data Inicial */}
            <div>
              <label
                htmlFor="input-data-inicial-metrica"
                className="block text-xs font-bold uppercase tracking-wider text-[#7D1416] font-raleway mb-1.5 flex items-center gap-1"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#AD2F3B]" />
                <span>3. Data Inicial:</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="input-data-inicial-metrica"
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
                htmlFor="input-data-final-metrica"
                className="block text-xs font-bold uppercase tracking-wider text-[#7D1416] font-raleway mb-1.5 flex items-center gap-1"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#AD2F3B]" />
                <span>4. Data Final:</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="input-data-final-metrica"
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

            {/* Redefinir para padrão de todas em aberto */}
            {(selectedFilial || dataInicio || dataFim || reportType !== 'geral') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] text-[#7D1416] hover:text-[#AD2F3B] font-bold hover:underline cursor-pointer"
                title="Voltar para cálculo sobre todas as reservas em aberto"
              >
                <RotateCcwIcon className="w-3 h-3" />
                <span>Padrão (Todas em Aberto)</span>
              </button>
            )}
          </div>

          {/* Banner de Status e Métricas calculadas */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-700">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                <CheckCircle2Icon className="w-3.5 h-3.5 text-emerald-600" />
                Métricas calculadas sobre {filtered.length}{' '}
                {filtered.length === 1 ? 'reserva' : 'reservas'}
              </span>

              <span className="text-slate-400 hidden sm:inline">•</span>

              <span className="text-slate-600">
                Filial: <strong>{scopeDescription.filialLabel}</strong>
              </span>

              <span className="text-slate-400 hidden sm:inline">•</span>

              <span className="text-slate-600">
                Período: <strong>{scopeDescription.periodLabel}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CORPO DE MÉTRICAS E GRÁFICOS                              */}
        {/* ======================================================== */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-white">
          {/* Se nenhuma reserva for encontrada no filtro */}
          {filtered.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/50">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
              <h3 className="text-base font-bold text-[#252A34] font-raleway">Nenhum dado para este filtro</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Não há registros para a filial <strong>{scopeDescription.filialLabel}</strong> no período{' '}
                <strong>{scopeDescription.periodLabel}</strong>.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#7D1416] text-white text-xs font-bold font-raleway hover:bg-[#AD2F3B] transition shadow-xs cursor-pointer"
              >
                <RotateCcwIcon className="w-3.5 h-3.5" />
                <span>Calcular Métricas de Todas as Reservas em Aberto</span>
              </button>
            </div>
          ) : (
            <>
              {/* 4 CARDS DE INDICADORES CHAVE (KPIs) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:shadow-xs transition">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider font-raleway text-[#252A34]">
                      Total Reuniões
                    </span>
                    <CalendarIcon className="w-4 h-4 text-[#AD2F3B]" />
                  </div>
                  <div className="text-2xl font-black text-[#7D1416] font-raleway">{filtered.length}</div>
                  <div className="text-[10px] text-slate-500 font-dm-sans">
                    {!dataInicio && !dataFim && activePreset === 'abertas' ? 'Reservas em aberto' : 'Agendamentos no período'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:shadow-xs transition">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider font-raleway text-[#252A34]">
                      Horas Ocupadas
                    </span>
                    <ClockIcon className="w-4 h-4 text-[#AD2F3B]" />
                  </div>
                  <div className="text-2xl font-black text-[#7D1416] font-raleway">{totalHours}h</div>
                  <div className="text-[10px] text-slate-500 font-dm-sans">Volume total de agenda</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:shadow-xs transition">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider font-raleway text-[#252A34]">
                      Duração Média
                    </span>
                    <ClockIcon className="w-4 h-4 text-[#252A34]" />
                  </div>
                  <div className="text-2xl font-black text-[#252A34] font-raleway">{avgDurationMinutes} min</div>
                  <div className="text-[10px] text-slate-500 font-dm-sans">Média por chamado</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:shadow-xs transition">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider font-raleway text-[#252A34]">
                      Sala Mais Usada
                    </span>
                    <AwardIcon className="w-4 h-4 text-[#AD2F3B]" />
                  </div>
                  <div className="text-sm sm:text-base font-bold text-[#7D1416] font-raleway truncate" title={topRoom?.fullName}>
                    {topRoom ? topRoom.name : 'N/D'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-dm-sans">
                    {topRoom ? `${topRoom.total} reuniões agendadas` : 'Sem registros'}
                  </div>
                </div>
              </div>

              {/* GRÁFICOS: EXIBIÇÃO CONFORME O TIPO ESCOLHIDO */}
              {(reportType === 'geral' || reportType === 'por_sala') && (
                <div className="bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[#7D1416] uppercase tracking-wider font-raleway flex items-center gap-1.5">
                      <BuildingIcon className="w-4 h-4 text-[#AD2F3B]" />
                      Volume de Reservas por Sala de Reunião
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Filial: <strong>{scopeDescription.filialLabel}</strong>
                    </span>
                  </div>
                  <div className="h-64 w-full">
                    {roomData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={roomData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                          <XAxis
                            dataKey="name"
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            tick={{ fontSize: 10, fill: '#252A34' }}
                          />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#252A34' }} />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                          />
                          <Bar dataKey="total" name="Reuniões" fill="#7D1416" radius={[6, 6, 0, 0]}>
                            {roomData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#FF2E63' : '#7D1416'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Sem dados suficientes para exibição gráfica
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(reportType === 'geral' || reportType === 'por_setor') && (
                <div className="bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[#7D1416] uppercase tracking-wider font-raleway flex items-center gap-1.5">
                      <LayersIcon className="w-4 h-4 text-[#AD2F3B]" />
                      Demanda de Reuniões por Setor Corporativo
                    </h3>
                    {topSector && (
                      <span className="text-[11px] text-slate-600 font-medium">
                        Setor Líder: <strong className="text-[#7D1416]">{topSector.name}</strong> ({topSector.total} agendamentos)
                      </span>
                    )}
                  </div>
                  <div className="h-64 w-full">
                    {sectorData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={sectorData}
                          layout="vertical"
                          margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                        >
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#252A34' }} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#252A34' }} width={90} />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                          />
                          <Bar dataKey="total" name="Reuniões" fill="#AD2F3B" radius={[0, 6, 6, 0]}>
                            {sectorData.map((entry, index) => (
                              <Cell key={`sec-${index}`} fill={index === 0 ? '#7D1416' : '#AD2F3B'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Sem dados suficientes
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DISTRIBUIÇÃO POR TURNO (HORÁRIOS DE PICO) */}
              {(reportType === 'geral' || reportType === 'turnos') && (
                <div className="bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200">
                  <h3 className="text-xs font-bold text-[#7D1416] uppercase tracking-wider font-raleway mb-3 flex items-center gap-1.5">
                    <ClockIcon className="w-4 h-4 text-[#AD2F3B]" />
                    Distribuição de Horários e Turnos de Pico
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {shiftData.map((shift) => (
                      <div
                        key={shift.name}
                        className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: shift.color }} />
                          <div>
                            <span className="text-xs font-bold text-[#252A34] block">{shift.name}</span>
                            <span className="text-[10px] text-slate-500">{shift.pct}% do total</span>
                          </div>
                        </div>
                        <span className="text-sm font-black font-dm-sans text-[#7D1416]">
                          {shift.value} {shift.value === 1 ? 'reunião' : 'reuniões'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Escopo: <strong>{scopeDescription.filialLabel}</strong> • Período: <strong>{scopeDescription.periodLabel}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-[#252A34] text-xs font-bold transition cursor-pointer self-end sm:self-auto"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
