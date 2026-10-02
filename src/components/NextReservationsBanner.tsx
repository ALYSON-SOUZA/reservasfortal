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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-4 sm:px-5 py-3.5 sm:py-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
      {/* Título e Foco nas Próximas Reservas */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#7D1416] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#7D1416]/20">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-[#7D1416] font-raleway leading-none">
              Próximas Reservas
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-dm-sans bg-[#AD2F3B]/10 text-[#AD2F3B] border border-[#AD2F3B]/30">
              {nextReservations.length} agendamento{nextReservations.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-[#252A34]/70 font-dm-sans font-medium mt-0.5">
            Exibição em tempo real das reuniões ativas e agendamentos futuros
          </p>
        </div>
      </div>

      {/* Mini Indicadores Compactos com a paleta oficial Bellinati Perez */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs font-dm-sans">
        {/* Em andamento (Rosa #FF2E63 usado estritamente como accent/alerta de 4%) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FF2E63]/10 border border-[#FF2E63]/30">
          <span className={`w-2.5 h-2.5 rounded-full ${inProgress.length > 0 ? 'bg-[#FF2E63] animate-ping' : 'bg-slate-300'}`}></span>
          <span className="text-[#252A34]/80 font-semibold">Agora:</span>
          <strong className="text-[#252A34] font-bold font-dm-sans text-sm">{inProgress.length} em andamento</strong>
        </div>

        {/* Hoje (Rubro #AD2F3B) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#AD2F3B]/10 border border-[#AD2F3B]/30">
          <Clock className="w-3.5 h-3.5 text-[#AD2F3B]" />
          <span className="text-[#252A34]/80 font-semibold">Hoje:</span>
          <strong className="text-[#7D1416] font-bold font-dm-sans text-sm">{todayCount} reunião(ões)</strong>
        </div>

        {/* Agendadas (Grafite #252A34 / Base neutra) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
          <CalendarDays className="w-3.5 h-3.5 text-[#252A34]" />
          <span className="text-[#252A34]/80 font-semibold">Agendadas:</span>
          <strong className="text-[#252A34] font-bold font-dm-sans text-sm">{futureCount} futura(s)</strong>
        </div>

        {/* Chip de Avisos 15 min */}
        {onOpenNotificationCenter && (
          <button
            type="button"
            onClick={onOpenNotificationCenter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold transition-all active:scale-95 cursor-pointer ${
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
            <span className="font-bold">
              {notificationStatus === 'granted' ? 'Avisos 15m Ativos' : 'Avisos 15m'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
