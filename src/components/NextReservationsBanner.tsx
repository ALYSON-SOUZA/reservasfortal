import React from 'react';
import { Reservation } from '../types';
import { getReservationStatus, isReservationExpired } from '../utils/dateUtils';
import { CalendarClock, Clock, CalendarDays, Bell, BellRing } from 'lucide-react';

interface NextReservationsBannerProps {
  reservations: Reservation[];
  onOpenNewModal: () => void;
  onOpenFilterModal: () => void;
  onOpenNotificationCenter?: () => void;
  notificationStatus?: 'granted' | 'default' | 'denied' | 'unsupported';
}

export const NextReservationsBanner: React.FC<NextReservationsBannerProps> = ({
  reservations,
  onOpenNewModal,
  onOpenFilterModal,
  onOpenNotificationCenter,
  notificationStatus = 'default',
}) => {
  const now = new Date();

  // Próximas reservas (ativas / não encerradas)
  const nextReservations = reservations.filter(
    (r) => !isReservationExpired(r.dia, r.horaFinal, now)
  );

  // Reuniões em andamento agora
  const inProgress = nextReservations.filter(
    (r) => getReservationStatus(r.dia, r.horaInicial, r.horaFinal, now) === 'em_andamento'
  );

  // Reuniões hoje
  const todayCount = nextReservations.filter((r) => {
    const status = getReservationStatus(r.dia, r.horaInicial, r.horaFinal, now);
    return status === 'em_andamento' || status === 'agendada_hoje';
  }).length;

  // Reuniões agendadas para os próximos dias (futuras)
  const futureCount = nextReservations.filter((r) => {
    const status = getReservationStatus(r.dia, r.horaInicial, r.horaFinal, now);
    return status === 'futura';
  }).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs px-3 sm:px-4 py-2 sm:py-2.5 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
      {/* Título e Foco nas Próximas Reservas */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#7D1416] text-white flex items-center justify-center shrink-0 shadow-xs">
          <CalendarClock className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-bold text-[#7D1416] font-raleway leading-none">
            Próximas Reservas
          </h2>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold font-dm-sans bg-[#AD2F3B]/10 text-[#AD2F3B] border border-[#AD2F3B]/30 leading-none">
            {nextReservations.length} agendamento{nextReservations.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Mini Indicadores Compactos ajustados para barra fina */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-dm-sans">
        {/* Em andamento */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF2E63]/10 border border-[#FF2E63]/30">
          <span className={`w-2 h-2 rounded-full ${inProgress.length > 0 ? 'bg-[#FF2E63] animate-ping' : 'bg-slate-300'}`}></span>
          <span className="text-[#252A34]/80 font-medium">Agora:</span>
          <strong className="text-[#252A34] font-bold text-xs">{inProgress.length} em andamento</strong>
        </div>

        {/* Hoje */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#AD2F3B]/10 border border-[#AD2F3B]/30">
          <Clock className="w-3.5 h-3.5 text-[#AD2F3B]" />
          <span className="text-[#252A34]/80 font-medium">Hoje:</span>
          <strong className="text-[#7D1416] font-bold text-xs">{todayCount} reunião(ões)</strong>
        </div>

        {/* Agendadas */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200">
          <CalendarDays className="w-3.5 h-3.5 text-[#252A34]" />
          <span className="text-[#252A34]/80 font-medium">Agendadas:</span>
          <strong className="text-[#252A34] font-bold text-xs">{futureCount} futura(s)</strong>
        </div>

        {/* Chip de Avisos 15 min */}
        {onOpenNotificationCenter && (
          <button
            type="button"
            onClick={onOpenNotificationCenter}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold transition-all active:scale-95 cursor-pointer ${
              notificationStatus === 'granted'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-white text-[#AD2F3B] border-[#AD2F3B]/40 hover:bg-[#AD2F3B]/10'
            }`}
            title="Clique para configurar avisos automáticos de 15 minutos antes de cada reserva"
          >
            {notificationStatus === 'granted' ? (
              <BellRing className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Bell className="w-3.5 h-3.5 text-[#AD2F3B]" />
            )}
            <span className="font-bold text-[11px] sm:text-xs">
              {notificationStatus === 'granted' ? 'Avisos 15m Ativos' : 'Avisos 15m'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
