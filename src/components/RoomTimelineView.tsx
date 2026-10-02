import React, { useState, useMemo } from 'react';
import { Reservation, Sala } from '../types';
import { formatDateBR, getTodayString, getReservationStatus, getConflictingReservations, formatDateTimeBR } from '../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  Users,
  Building,
  Info,
  Tv,
  CheckCircle2,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';

interface RoomTimelineViewProps {
  reservations: Reservation[];
  rooms: Sala[];
  onSelectReservation: (res: Reservation) => void;
  onCreateSlot: (roomName: string, date: string, startHour: string) => void;
}

const START_HOUR = 7; // 07:00
const END_HOUR = 21; // 21:00
const TOTAL_HOURS = END_HOUR - START_HOUR; // 14 hours

export const RoomTimelineView: React.FC<RoomTimelineViewProps> = ({
  reservations,
  rooms,
  onSelectReservation,
  onCreateSlot,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [filterFilial, setFilterFilial] = useState<string>('TODAS');

  const todayStr = getTodayString();
  const isToday = selectedDate === todayStr;

  // Change date helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(getTodayString(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(getTodayString(d));
  };

  const handleToday = () => {
    setSelectedDate(getTodayString());
  };

  // Filter rooms
  const activeRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (!r.ativa) return false;
      if (filterFilial === 'TODAS') return true;
      return r.filial === filterFilial;
    });
  }, [rooms, filterFilial]);

  // Unique branches
  const filiais = useMemo(() => {
    const set = new Set<string>();
    rooms.forEach((r) => set.add(r.filial));
    return Array.from(set);
  }, [rooms]);

  // Daily reservations
  const dailyReservations = useMemo(() => {
    return reservations.filter((r) => r.dia === selectedDate);
  }, [reservations, selectedDate]);

  // Hours array [7, 8, 9, 10, ..., 21]
  const hours = useMemo(() => {
    const arr = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      arr.push(h);
    }
    return arr;
  }, []);

  // Helper to calculate position in percentage
  const getPositionStyles = (horaInicial: string, horaFinal: string) => {
    const [startH, startM] = horaInicial.split(':').map(Number);
    const [endH, endM] = horaFinal.split(':').map(Number);

    const startInHours = startH + (startM || 0) / 60;
    const endInHours = endH + (endM || 0) / 60;

    const clampedStart = Math.max(START_HOUR, Math.min(END_HOUR, startInHours));
    const clampedEnd = Math.max(START_HOUR, Math.min(END_HOUR, endInHours));

    const leftPercent = ((clampedStart - START_HOUR) / TOTAL_HOURS) * 100;
    const widthPercent = Math.max(2, ((clampedEnd - clampedStart) / TOTAL_HOURS) * 100);

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // Current time position indicator
  const now = new Date();
  const currentHourFloat = now.getHours() + now.getMinutes() / 60;
  const showCurrentTimeLine = isToday && currentHourFloat >= START_HOUR && currentHourFloat <= END_HOUR;
  const currentTimePercent = ((currentHourFloat - START_HOUR) / TOTAL_HOURS) * 100;

  return (
    <div className="bg-white rounded-2xl border-2 border-[#252A34]/10 shadow-sm p-4 sm:p-5 mb-6 overflow-hidden">
      {/* Top Header / Date Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#7D1416]/10 text-[#7D1416] flex items-center justify-center font-bold">
            <CalendarDays className="w-5 h-5 text-[#7D1416]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#7D1416] font-raleway leading-tight">
              Grade de Ocupação & Linha do Tempo
            </h2>
            <p className="text-xs text-[#252A34]/70 font-dm">
              Visualização de horários ocupados e livres por sala em tempo real
            </p>
          </div>
        </div>

        {/* Date Selector Controls */}
        <div className="flex items-center gap-2 flex-wrap font-dm">
          {/* Filial Filter */}
          {filiais.length > 1 && (
            <select
              value={filterFilial}
              onChange={(e) => setFilterFilial(e.target.value)}
              className="text-xs font-bold font-dm px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-hidden text-[#252A34] focus:ring-2 focus:ring-[#AD2F3B]"
            >
              <option value="TODAS">Todas as Unidades</option>
              {filiais.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition cursor-pointer"
              title="Dia Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer font-dm ${
                isToday ? 'bg-[#AD2F3B] text-white shadow-xs' : 'hover:bg-white text-slate-700'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition cursor-pointer"
              title="Próximo Dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold font-dm bg-white border border-slate-300 rounded-xl text-[#252A34] outline-hidden cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Quick Summary Header */}
      <div className="flex items-center justify-between mb-3 text-xs font-dm text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#7D1416] capitalize font-raleway text-sm">
            {formatDateBR(selectedDate)}
          </span>
          <span className="text-slate-400">•</span>
          <span>{dailyReservations.length} reunião(ões) agendada(s)</span>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-[11px] flex-wrap font-dm">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#7D1416] border border-[#AD2F3B]"></span>
            <span>Em Andamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#AD2F3B]"></span>
            <span>Agendada Hoje</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#252A34]"></span>
            <span>Futura</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300"></span>
            <span>Encerrada</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-800 font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Conflito</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border border-dashed border-emerald-500 bg-emerald-50"></span>
            <span>Livre (Clique p/ agendar)</span>
          </div>
        </div>
      </div>

      {/* Timeline Grid Stage */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
        <div className="overflow-x-auto min-w-[760px]">
          {/* Header Hours Row */}
          <div className="flex border-b border-slate-200 bg-[#252A34] text-white">
            <div className="w-48 sm:w-56 p-3 text-xs font-bold font-raleway uppercase tracking-wider text-slate-300 shrink-0 border-r border-slate-700">
              Salas & Unidades
            </div>
            <div className="flex-1 relative flex">
              {hours.slice(0, -1).map((h) => (
                <div
                  key={h}
                  className="flex-1 text-center py-2.5 text-[11px] font-bold font-raleway border-r border-white/10 text-slate-300"
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Rooms Rows */}
          <div className="divide-y divide-slate-200">
            {activeRooms.map((room) => {
              const roomReservations = dailyReservations.filter(
                (r) => r.sala.trim().toLowerCase() === room.nome.trim().toLowerCase()
              );

              return (
                <div key={room.id} className="flex hover:bg-slate-100/60 transition group min-h-[64px]">
                  {/* Left Column: Room info */}
                  <div className="w-48 sm:w-56 p-3 shrink-0 border-r border-slate-200 bg-white flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#252A34] font-raleway truncate">
                        {room.nome}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-raleway">
                      <span className="truncate">{room.filial.replace(' - CE', '').replace(' - Matriz (PR)', '')}</span>
                      {room.capacidade && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-md">
                          <Users className="w-2.5 h-2.5" />
                          {room.capacidade}p
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Timeline Slot Stage */}
                  <div className="flex-1 relative bg-white flex items-center">
                    {/* Background hour grid dividers */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {hours.slice(0, -1).map((h) => (
                        <div
                          key={h}
                          onClick={() => onCreateSlot(room.nome, selectedDate, `${String(h).padStart(2, '0')}:00`)}
                          className="flex-1 border-r border-slate-100 hover:bg-[#AD2F3B]/5 pointer-events-auto cursor-pointer transition"
                          title={`Clique para agendar na sala ${room.nome} às ${String(h).padStart(2, '0')}:00`}
                        />
                      ))}
                    </div>

                    {/* Current Time Red Line Indicator */}
                    {showCurrentTimeLine && (
                      <div
                        className="absolute top-0 bottom-0 z-20 w-0.5 bg-[#AD2F3B] pointer-events-none"
                        style={{ left: `${currentTimePercent}%` }}
                      >
                        <div className="w-2 h-2 rounded-full bg-[#AD2F3B] -ml-[3px] -mt-1 shadow-sm" />
                      </div>
                    )}

                    {/* Reservation Blocks */}
                    {roomReservations.map((res, rIdx) => {
                      const pos = getPositionStyles(res.horaInicial, res.horaFinal);
                      const status = getReservationStatus(res.dia, res.horaInicial, res.horaFinal);
                      const conflicts = getConflictingReservations(res, roomReservations);
                      const hasConflict = conflicts.length > 0;

                      let bgClass = 'bg-[#AD2F3B] text-white border-[#7D1416] shadow-sm shadow-[#AD2F3B]/20';
                      if (status === 'em_andamento') {
                        bgClass = 'bg-[#7D1416] text-white font-extrabold border-[#AD2F3B] shadow-md shadow-[#7D1416]/40';
                      } else if (status === 'encerrada') {
                        bgClass = 'bg-slate-200 text-[#252A34]/70 border-slate-300';
                      } else if (status === 'futura') {
                        bgClass = 'bg-[#252A34] text-white border-slate-900 shadow-sm';
                      }

                      // If there is conflict, apply distinct amber warning styling and offset if overlapping
                      const conflictStyle = hasConflict
                        ? 'ring-2 ring-amber-400 border-amber-500 opacity-95'
                        : '';

                      return (
                        <div
                          key={res.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectReservation(res);
                          }}
                          style={{
                            left: pos.left,
                            width: pos.width,
                            zIndex: hasConflict ? 15 + rIdx : 10,
                          }}
                          className={`absolute top-1.5 bottom-1.5 rounded-xl p-1.5 sm:p-2 border transition-all duration-150 cursor-pointer overflow-hidden flex flex-col justify-between hover:scale-[1.02] hover:z-40 hover:shadow-lg ${bgClass} ${conflictStyle}`}
                          title={`${hasConflict ? '⚠️ CONFLITO DE HORÁRIO DETECTADO! ' : ''}#${res.glpi} - ${res.solicitante} (${res.setor}) | ${res.horaInicial} às ${res.horaFinal}${hasConflict ? ` (Sobrepõe com ${conflicts.map(c => `${c.solicitante}`).join(', ')})` : ''}${(res.modificadoPor || res.criadoPor) ? ` | Modificado por ${res.modificadoPor || res.criadoPor} em ${formatDateTimeBR(res.modificadoEm || res.criadoEm)}` : ''}`}
                        >
                          <div className="flex items-center justify-between gap-1 leading-none">
                            <span className="text-[11px] font-bold truncate flex items-center gap-0.5">
                              {hasConflict && <AlertTriangle className="w-3 h-3 text-amber-300 shrink-0 inline" />}
                              {res.horaInicial} - {res.horaFinal}
                            </span>
                            <span className="font-mono text-[10.5px] font-black opacity-95 shrink-0 bg-black/20 px-1 py-0.2 rounded">
                              #{res.glpi}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium truncate font-raleway leading-tight flex items-center justify-between gap-1">
                            <span className="truncate">{res.solicitante}</span>
                            {hasConflict && (
                              <span className="text-[9px] bg-amber-400 text-amber-950 font-black px-1 rounded-sm shrink-0">
                                CONFLITO
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
