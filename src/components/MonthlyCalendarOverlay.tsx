import React, { useState, useMemo } from 'react';
import { Reservation } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface MonthlyCalendarOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Reservation[];
  onSelectReservation?: (reservation: Reservation) => void;
}

export const MonthlyCalendarOverlay: React.FC<MonthlyCalendarOverlayProps> = ({
  isOpen,
  onClose,
  reservations,
  onSelectReservation,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchGlpiOrSala, setSearchGlpiOrSala] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const monthReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (!r.dia) return false;
      const [rY, rM] = r.dia.split('-').map(Number);
      return rY === year && rM === month + 1;
    });
  }, [reservations, year, month]);

  const filteredReservations = useMemo(() => {
    if (!searchGlpiOrSala.trim()) return monthReservations;
    const term = searchGlpiOrSala.toLowerCase().replace('#', '').trim();
    return monthReservations.filter((r) => {
      const glpiMatch = (r.glpi || '').toLowerCase().includes(term);
      const salaMatch = (r.sala || '').toLowerCase().includes(term);
      const solicitanteMatch = (r.solicitante || '').toLowerCase().includes(term);
      return glpiMatch || salaMatch || solicitanteMatch;
    });
  }, [monthReservations, searchGlpiOrSala]);

  const reservationsByDay = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    filteredReservations.forEach((res) => {
      const list = map.get(res.dia) || [];
      list.push(res);
      map.set(res.dia, list);
    });

    map.forEach((list) => {
      list.sort((a, b) => a.horaInicial.localeCompare(b.horaInicial));
    });

    return map;
  }, [filteredReservations]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      date: Date;
      dateString: string;
      isCurrentMonth: boolean;
      dayNumber: number;
    }> = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      days.push({
        date: prevDate,
        dateString: `${y}-${m}-${day}`,
        isCurrentMonth: false,
        dayNumber: d,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const thisDate = new Date(year, month, d);
      const m = String(month + 1).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      days.push({
        date: thisDate,
        dateString: `${year}-${m}-${day}`,
        isCurrentMonth: true,
        dayNumber: d,
      });
    }

    const remainingSlots = 42 - days.length;
    for (let d = 1; d <= remainingSlots; d++) {
      const nextDate = new Date(year, month + 1, d);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      days.push({
        date: nextDate,
        dateString: `${y}-${m}-${day}`,
        isCurrentMonth: false,
        dayNumber: d,
      });
    }

    return days;
  }, [year, month]);

  if (!isOpen) return null;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-dm-sans animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Container Principal Compacto com Fundo Branco */}
      <div className="bg-white text-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[92vh] max-h-[760px] transition-all">
        
        {/* Top Header Compacto */}
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7D1416] text-white flex items-center justify-center shadow-xs font-bold shrink-0">
              <CalendarIcon className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-raleway text-[#7D1416] leading-tight">
                Calendário de Reservas
              </h2>
              <p className="text-[11px] text-slate-500 font-dm-sans hidden sm:block">
                Visão mensal compacta com números de chamados GLPI — Bellinati Perez
              </p>
            </div>
          </div>

          {/* Navegador de Meses & Botão Fechar */}
          <div className="flex items-center gap-2">
            {/* Campo rápido de busca por GLPI */}
            <div className="relative hidden md:block">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar GLPI..."
                value={searchGlpiOrSala}
                onChange={(e) => setSearchGlpiOrSala(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg pl-7 pr-2 py-1 focus:outline-hidden focus:border-[#AD2F3B] w-36 font-dm-sans"
              />
            </div>

            {/* Controles de Passar os Meses */}
            <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-300 shadow-2xs font-dm-sans">
              <button
                type="button"
                id="btn-calendar-prev"
                onClick={handlePrevMonth}
                title="Mês Anterior"
                className="p-1 rounded-md hover:bg-slate-100 text-slate-700 hover:text-[#7D1416] transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                type="button"
                id="btn-calendar-current"
                onClick={handleCurrentMonth}
                title="Ir para o mês atual"
                className="px-2.5 py-0.5 text-xs sm:text-sm font-bold font-raleway text-slate-800 capitalize hover:text-[#7D1416] transition cursor-pointer"
              >
                {monthName}
              </button>

              <button
                type="button"
                id="btn-calendar-next"
                onClick={handleNextMonth}
                title="Próximo Mês"
                className="p-1 rounded-md hover:bg-slate-100 text-slate-700 hover:text-[#7D1416] transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Botão Fechar */}
            <button
              type="button"
              id="btn-fechar-calendario"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold font-dm-sans transition border border-slate-300 shadow-2xs cursor-pointer"
              title="Fechar Janela"
            >
              <X className="w-3.5 h-3.5" />
              <span>Fechar</span>
            </button>
          </div>
        </div>

        {/* Cabeçalho dos Dias da Semana */}
        <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center text-xs font-bold font-raleway text-slate-700 py-1.5 shrink-0">
          {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, idx) => (
            <div key={day} className={idx === 0 || idx === 6 ? 'text-slate-400' : 'text-slate-800'}>
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        {/* Grade do Calendário Compacta */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6 bg-slate-200 gap-px p-px min-h-0 overflow-hidden font-dm-sans">
          {calendarDays.slice(0, 42).map((calDay) => {
            const dayReservations = calDay.isCurrentMonth
              ? reservationsByDay.get(calDay.dateString) || []
              : [];

            const isPast = calDay.dateString < todayStr;
            const isToday = calDay.dateString === todayStr;

            return (
              <div
                key={calDay.dateString}
                className={`p-1 flex flex-col justify-start overflow-hidden transition-all ${
                  calDay.isCurrentMonth
                    ? isToday
                      ? 'bg-rose-50/50 ring-1.5 ring-inset ring-[#AD2F3B]'
                      : isPast
                      ? 'bg-slate-50/90'
                      : 'bg-white hover:bg-slate-50'
                    : 'bg-slate-100/50 opacity-30'
                }`}
              >
                {/* Cabeçalho do Dia */}
                <div className="flex items-center justify-between mb-0.5 leading-none shrink-0">
                  <span
                    className={`text-[11px] font-bold font-raleway px-1 py-0.2 rounded-sm ${
                      isToday
                        ? 'bg-[#7D1416] text-white shadow-2xs font-extrabold'
                        : isPast
                        ? 'text-slate-400'
                        : calDay.isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-300'
                    }`}
                  >
                    {calDay.dayNumber}
                  </span>

                  {dayReservations.length > 0 && (
                    <span
                      className={`text-[9px] font-bold px-1 rounded-xs border ${
                        isToday
                          ? 'bg-[#AD2F3B]/10 text-[#7D1416] border-[#AD2F3B]/30'
                          : isPast
                          ? 'bg-slate-200 text-slate-500 border-slate-300'
                          : 'bg-slate-100 text-[#252A34] border-slate-200'
                      }`}
                    >
                      {dayReservations.length}
                    </span>
                  )}
                </div>

                {/* Lista de Reservas */}
                <div className="space-y-0.5 overflow-y-auto flex-1 pr-0.5 min-h-0">
                  {dayReservations.map((res) => {
                    const numeroGlpi = (res.glpi || '').replace('#', '').trim();

                    let badgeClass = 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-[#252A34]';

                    if (isPast) {
                      badgeClass = 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500 opacity-80';
                    } else if (isToday) {
                      badgeClass = 'bg-[#7D1416] hover:bg-[#AD2F3B] border-[#AD2F3B] text-white font-bold shadow-xs';
                    }

                    return (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => onSelectReservation?.(res)}
                        title={`Clique para ver detalhes do chamado GLPI #${numeroGlpi || 'S/N'}\nSala: ${res.sala} | Horário: ${res.horaInicial}-${res.horaFinal} | Solicitante: ${res.solicitante}`}
                        className={`w-full rounded-md px-1.5 py-0.5 border text-center transition-all flex items-center justify-between gap-1 cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs text-left ${badgeClass}`}
                      >
                        <div className="font-mono text-xs sm:text-[13px] font-bold tracking-wide truncate w-full">
                          {numeroGlpi ? (
                            <span>#{numeroGlpi}</span>
                          ) : (
                            <span className="text-[10px] italic font-normal">S/N</span>
                          )}
                        </div>

                        {isPast && (
                          <CheckCircle2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé com Legenda de Cores */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600 font-dm-sans shrink-0 gap-2">
          <div className="flex items-center gap-3">
            {/* Finalizado (Passado) */}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 border border-slate-300" />
              <span className="text-slate-500 font-medium">Finalizado (Anterior)</span>
            </span>

            {/* Destaque (Hoje) */}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#7D1416] border border-[#AD2F3B]" />
              <span className="text-[#7D1416] font-bold">Hoje (Bordô Oficial)</span>
            </span>

            {/* Futuro */}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-300" />
              <span className="text-slate-700 font-medium">Futuro (Agendado)</span>
            </span>
          </div>

          <span className="font-bold text-[#7D1416] text-xs">
            {monthReservations.length} agendamento(s) neste mês
          </span>
        </div>
      </div>
    </div>
  );
};
