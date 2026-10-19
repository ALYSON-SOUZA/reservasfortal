import React, { useMemo } from 'react';
import { Reservation } from '../types';
import { formatDateBR, timeToMinutes } from '../utils/dateUtils';
import { Clock, CheckCircle2, AlertTriangle, Sparkles, User, Ticket } from 'lucide-react';

interface AvailabilityRadarProps {
  dia: string;
  sala: string;
  horaInicial: string;
  horaFinal: string;
  existingReservations: Reservation[];
  editingReservationId?: string;
  onSelectTimeSlot?: (start: string, end: string) => void;
}

export const AvailabilityRadar: React.FC<AvailabilityRadarProps> = ({
  dia,
  sala,
  horaInicial,
  horaFinal,
  existingReservations,
  editingReservationId,
  onSelectTimeSlot,
}) => {
  const START_HOUR = 7; // 07:00
  const END_HOUR = 21; // 21:00
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60; // 840 minutes

  // Reservas desta sala e deste dia
  const dayReservations = useMemo(() => {
    if (!dia || !sala) return [];
    const targetSala = sala.trim().toLowerCase();
    return existingReservations.filter((r) => {
      if (r.id === editingReservationId) return false;
      return r.dia === dia && r.sala.trim().toLowerCase() === targetSala;
    });
  }, [dia, sala, existingReservations, editingReservationId]);

  // Checar colisão com a seleção atual
  const collision = useMemo(() => {
    if (!horaInicial || !horaFinal || horaInicial >= horaFinal) return null;
    const selStart = timeToMinutes(horaInicial);
    const selEnd = timeToMinutes(horaFinal);

    for (const r of dayReservations) {
      const rStart = timeToMinutes(r.horaInicial);
      const rEnd = timeToMinutes(r.horaFinal);
      if (selStart < rEnd && selEnd > rStart) {
        return r;
      }
    }
    return null;
  }, [dayReservations, horaInicial, horaFinal]);

  // Posição percentual do slot selecionado
  const selectedSpan = useMemo(() => {
    if (!horaInicial || !horaFinal || horaInicial >= horaFinal) return null;
    const startMin = Math.max(timeToMinutes(horaInicial), START_HOUR * 60);
    const endMin = Math.min(timeToMinutes(horaFinal), END_HOUR * 60);

    const left = ((startMin - START_HOUR * 60) / TOTAL_MINUTES) * 100;
    const width = Math.max(2, ((endMin - startMin) / TOTAL_MINUTES) * 100);

    return {
      left: `${Math.max(0, Math.min(100, left))}%`,
      width: `${Math.max(1, Math.min(100 - left, width))}%`,
    };
  }, [horaInicial, horaFinal]);

  // Lista de horas do dia para réguas
  const hours = useMemo(() => {
    const list = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      list.push(h);
    }
    return list;
  }, []);

  // Sugestões de slots livres
  const freeSuggestions = useMemo(() => {
    if (!dia || !sala) return [];
    // Candidate standard 1h slots
    const candidates = [
      { start: '08:00', end: '09:00' },
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '11:00', end: '12:00' },
      { start: '13:30', end: '14:30' },
      { start: '14:30', end: '15:30' },
      { start: '15:30', end: '16:30' },
      { start: '16:30', end: '17:30' },
    ];

    return candidates.filter((cand) => {
      const cStart = timeToMinutes(cand.start);
      const cEnd = timeToMinutes(cand.end);
      const hasOverlap = dayReservations.some((r) => {
        const rStart = timeToMinutes(r.horaInicial);
        const rEnd = timeToMinutes(r.horaFinal);
        return cStart < rEnd && cEnd > rStart;
      });
      return !hasOverlap;
    }).slice(0, 4);
  }, [dia, sala, dayReservations]);

  if (!dia || !sala) {
    return (
      <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 font-dm-sans">
        Selecione uma data e uma sala para visualizar o radar de disponibilidade em tempo real.
      </div>
    );
  }

  return (
    <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3 font-dm-sans shadow-xs">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#7D1416] text-white flex items-center justify-center text-xs shadow-xs">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#7D1416] font-raleway flex items-center gap-1.5">
              Radar de Disponibilidade em Tempo Real
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
                Ao Vivo
              </span>
            </span>
            <span className="text-[11px] text-slate-500 block">
              {sala} — {formatDateBR(dia)} ({dayReservations.length} agendamento{dayReservations.length === 1 ? '' : 's'})
            </span>
          </div>
        </div>

        {/* Status de colisão ao vivo */}
        {collision ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Conflito detectado com GLPI #{collision.glpi}!</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Horário Disponível e Livre</span>
          </div>
        )}
      </div>

      {/* Régua Visual / Timeline (07h às 21h) */}
      <div className="space-y-1.5">
        <div className="relative w-full h-11 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner select-none">
          {/* Marcadores de hora de fundo */}
          <div className="absolute inset-0 flex">
            {hours.slice(0, -1).map((h) => (
              <div
                key={h}
                className="flex-1 border-r border-slate-100 h-full flex flex-col justify-between py-1 px-0.5 text-[9px] text-slate-400 font-mono"
              >
                <span>{h}h</span>
              </div>
            ))}
          </div>

          {/* Reservas Ocupadas da Sala no Dia */}
          {dayReservations.map((r) => {
            const rStart = Math.max(timeToMinutes(r.horaInicial), START_HOUR * 60);
            const rEnd = Math.min(timeToMinutes(r.horaFinal), END_HOUR * 60);
            const left = ((rStart - START_HOUR * 60) / TOTAL_MINUTES) * 100;
            const width = Math.max(2, ((rEnd - rStart) / TOTAL_MINUTES) * 100);

            return (
              <div
                key={r.id}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                title={`Ocupado: ${r.horaInicial} às ${r.horaFinal} por ${r.solicitante} (GLPI #${r.glpi})`}
                className="absolute top-1 bottom-1 bg-[#AD2F3B] text-white rounded-lg px-1.5 flex items-center justify-center text-[10px] font-bold shadow-xs truncate cursor-help opacity-90 hover:opacity-100 transition-opacity z-10 border border-white/40"
              >
                <span className="truncate">
                  {r.horaInicial}-{r.horaFinal} (#{r.glpi})
                </span>
              </div>
            );
          })}

          {/* Destaque do Período que o Usuário está Selecionando */}
          {selectedSpan && (
            <div
              style={{
                left: selectedSpan.left,
                width: selectedSpan.width,
              }}
              className={`absolute top-0 bottom-0 pointer-events-none z-20 border-2 rounded-xl transition-all ${
                collision
                  ? 'bg-rose-500/35 border-rose-600 animate-pulse'
                  : 'bg-emerald-500/30 border-emerald-600'
              }`}
            >
              <div
                className={`absolute -top-1 right-1 px-1.5 py-0.2 rounded-md text-[9px] font-bold text-white shadow-xs ${
                  collision ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                {horaInicial} - {horaFinal}
              </div>
            </div>
          )}
        </div>

        {/* Legenda rápida */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-white border border-slate-300"></span>
              Livre
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#AD2F3B]"></span>
              Ocupado
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 border border-emerald-600"></span>
              Sua Seleção
            </span>
          </div>

          {collision && (
            <span className="text-rose-700 font-semibold truncate max-w-[280px]">
              Ocupado por: {collision.solicitante} ({collision.horaInicial} às {collision.horaFinal})
            </span>
          )}
        </div>
      </div>

      {/* Sugestões de Horários Livres (1 Clique para Preencher) */}
      {freeSuggestions.length > 0 && onSelectTimeSlot && (
        <div className="pt-1 border-t border-slate-200/80 flex items-center flex-wrap gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#AD2F3B]" />
            Sugestões livres:
          </span>
          {freeSuggestions.map((slot) => (
            <button
              key={`${slot.start}-${slot.end}`}
              type="button"
              onClick={() => onSelectTimeSlot(slot.start, slot.end)}
              className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 text-[#7D1416] border border-slate-200 hover:border-[#AD2F3B] text-[11px] font-bold transition cursor-pointer shadow-2xs"
            >
              {slot.start} - {slot.end}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
