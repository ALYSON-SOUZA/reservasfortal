import React from 'react';
import { Reservation } from '../types';
import { getReservationStatus, isReservationExpired } from '../utils/dateUtils';
import { Users, DoorOpen, Clock, TicketCheck } from 'lucide-react';

interface StatsCardsProps {
  reservations: Reservation[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ reservations }) => {
  const now = new Date();

  // Active reservations (not expired)
  const activeReservations = reservations.filter(
    (r) => !isReservationExpired(r.dia, r.horaFinal, now)
  );

  // In progress right now
  const inProgress = reservations.filter(
    (r) => getReservationStatus(r.dia, r.horaInicial, r.horaFinal, now) === 'em_andamento'
  );

  // Scheduled for today
  const scheduledToday = reservations.filter(
    (r) => {
      const status = getReservationStatus(r.dia, r.horaInicial, r.horaFinal, now);
      return status === 'em_andamento' || status === 'agendada_hoje';
    }
  );

  // Unique rooms in active use/schedule
  const uniqueRooms = new Set(activeReservations.map((r) => r.sala)).size;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Card 1: Em Andamento Agora */}
      <div id="stat-em-andamento" className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Em Andamento Agora
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{inProgress.length}</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {inProgress.length > 0 ? 'Salas ocupadas' : 'Salas livres'}
            </span>
          </div>
        </div>
        <div className="w-11 h-11 rounded-lg bg-emerald-100/80 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <DoorOpen className="w-5 h-5" />
        </div>
      </div>

      {/* Card 2: Agendadas para Hoje */}
      <div id="stat-agendadas-hoje" className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Para Hoje
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{scheduledToday.length}</span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Reuniões hoje
            </span>
          </div>
        </div>
        <div className="w-11 h-11 rounded-lg bg-blue-100/80 text-blue-600 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* Card 3: Reservas Ativas Totais */}
      <div id="stat-reservas-ativas" className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Reservas Válidas
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{activeReservations.length}</span>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {uniqueRooms} salas reservadas
            </span>
          </div>
        </div>
        <div className="w-11 h-11 rounded-lg bg-indigo-100/80 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* Card 4: Chamados GLPI Vinculados */}
      <div id="stat-glpi-vinculados" className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Chamados GLPI
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">
              {new Set(activeReservations.map((r) => r.glpi).filter(Boolean)).size}
            </span>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Tickets ativos
            </span>
          </div>
        </div>
        <div className="w-11 h-11 rounded-lg bg-amber-100/80 text-amber-600 flex items-center justify-center flex-shrink-0">
          <TicketCheck className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
