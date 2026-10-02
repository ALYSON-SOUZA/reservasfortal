import React, { useState, useMemo } from 'react';
import { Reservation, Sala } from '../types';
import {
  X,
  TrendingUp,
  Clock,
  Building,
  Layers,
  Calendar,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AnalyticsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Reservation[];
  rooms: Sala[];
}

export const AnalyticsDashboardModal: React.FC<AnalyticsDashboardModalProps> = ({
  isOpen,
  onClose,
  reservations,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('TODOS');

  // Available months from reservations
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    reservations.forEach((r) => {
      if (r.dia && r.dia.length >= 7) {
        set.add(r.dia.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(set).sort().reverse();
  }, [reservations]);

  // Filtered reservations by month
  const filtered = useMemo(() => {
    if (selectedMonth === 'TODOS') return reservations;
    return reservations.filter((r) => r.dia.startsWith(selectedMonth));
  }, [reservations, selectedMonth]);

  // Metric 1: Total hours booked
  const totalHours = useMemo(() => {
    let total = 0;
    filtered.forEach((r) => {
      const [startH, startM] = r.horaInicial.split(':').map(Number);
      const [endH, endM] = r.horaFinal.split(':').map(Number);
      const diff = endH + endM / 60 - (startH + startM / 60);
      if (diff > 0) total += diff;
    });
    return Math.round(total * 10) / 10;
  }, [filtered]);

  // Metric 2: Average duration
  const avgDurationMinutes = useMemo(() => {
    if (filtered.length === 0) return 0;
    return Math.round((totalHours * 60) / filtered.length);
  }, [filtered.length, totalHours]);

  // Chart 1: Bookings by Room
  const roomData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      counts[r.sala] = (counts[r.sala] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, total]) => ({
        name: name.replace('Sala ', ''),
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Most requested room
  const topRoom = roomData.length > 0 ? roomData[0] : null;

  // Chart 2: Bookings by Sector
  const sectorData = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      counts[r.setor] = (counts[r.setor] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, total]) => ({
        name,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [filtered]);

  // Chart 3: Distribution by Period / Shift (Manhã, Tarde, Noite)
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
      { name: 'Manhã (07h-12h)', value: manha, color: '#AD2F3B' },
      { name: 'Tarde (12h-18h)', value: tarde, color: '#7D1416' },
      { name: 'Noite (18h-22h)', value: noite, color: '#252A34' },
    ].filter((item) => item.value > 0);
  }, [filtered]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252A34]/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-[#252A34]/20 flex flex-col max-h-[90vh]">
        {/* Header com Bordô Oficial Bellinati Perez */}
        <div className="bg-[#7D1416] text-white p-5 flex items-center justify-between border-b-2 border-[#AD2F3B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white shadow-md">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-raleway text-white">Painel de Métricas & Ocupação de Salas</h2>
              <p className="text-xs text-white/80 font-dm">
                Indicadores gerenciais de utilização e taxa de ocupação corporativa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Month */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 font-dm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#252A34]">
            <Calendar className="w-4 h-4 text-[#AD2F3B]" />
            <span>Período de Análise:</span>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-hidden text-[#252A34] focus:ring-2 focus:ring-[#AD2F3B]"
          >
            <option value="TODOS">Todo o Histórico</option>
            {availableMonths.map((m) => {
              const [y, month] = m.split('-');
              const date = new Date(Number(y), Number(month) - 1, 1);
              const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              return (
                <option key={m} value={m}>
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                </option>
              );
            })}
          </select>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 font-dm">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#EAEAEA]/50 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider font-raleway text-[#252A34]">Total Reuniões</span>
                <Calendar className="w-4 h-4 text-[#AD2F3B]" />
              </div>
              <div className="text-2xl font-bold text-[#7D1416] font-raleway">{filtered.length}</div>
              <div className="text-[10px] text-slate-500 font-dm">Agendamentos no período</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#EAEAEA]/50 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider font-raleway text-[#252A34]">Horas Ocupadas</span>
                <Clock className="w-4 h-4 text-[#AD2F3B]" />
              </div>
              <div className="text-2xl font-bold text-[#7D1416] font-raleway">{totalHours}h</div>
              <div className="text-[10px] text-slate-500 font-dm">Duração total de uso</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#EAEAEA]/50 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider font-raleway text-[#252A34]">Duração Média</span>
                <Clock className="w-4 h-4 text-[#252A34]" />
              </div>
              <div className="text-2xl font-bold text-[#252A34] font-raleway">{avgDurationMinutes} min</div>
              <div className="text-[10px] text-slate-500 font-dm">Por reunião</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#EAEAEA]/50 border border-slate-200">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider font-raleway text-[#252A34]">Sala + Demandada</span>
                <Award className="w-4 h-4 text-[#AD2F3B]" />
              </div>
              <div className="text-sm sm:text-base font-bold text-[#7D1416] font-raleway truncate">
                {topRoom ? topRoom.name : 'N/D'}
              </div>
              <div className="text-[10px] text-slate-500 font-dm">
                {topRoom ? `${topRoom.total} reuniões` : 'Sem registros'}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Reuniões por Sala */}
            <div className="bg-[#EAEAEA]/30 p-4 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold text-[#7D1416] uppercase tracking-wider font-raleway mb-3 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-[#AD2F3B]" />
                Volume de Reservas por Sala
              </h3>
              <div className="h-56 w-full">
                {roomData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roomData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <XAxis dataKey="name" interval={0} angle={-25} textAnchor="end" tick={{ fontSize: 10, fill: '#252A34' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#252A34' }} />
                      <Tooltip />
                      <Bar dataKey="total" name="Reuniões" fill="#7D1416" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Sem dados suficientes
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Top Setores Solicitantes */}
            <div className="bg-[#EAEAEA]/30 p-4 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-bold text-[#7D1416] uppercase tracking-wider font-raleway mb-3 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#AD2F3B]" />
                Setores com Maior Demanda
              </h3>
              <div className="h-56 w-full">
                {sectorData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorData} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#252A34' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#252A34' }} width={75} />
                      <Tooltip />
                      <Bar dataKey="total" name="Reuniões" fill="#AD2F3B" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Sem dados suficientes
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart 3: Turnos de Pico */}
          <div className="bg-[#EAEAEA]/30 p-4 rounded-2xl border border-slate-200">
            <h3 className="text-xs font-bold text-[#7D1416] uppercase tracking-wider font-raleway mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#AD2F3B]" />
              Distribuição por Turno (Horários de Pico)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {shiftData.map((shift) => (
                <div
                  key={shift.name}
                  className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }} />
                    <span className="text-xs font-bold text-[#252A34] font-dm">{shift.name}</span>
                  </div>
                  <span className="text-sm font-bold font-dm text-[#7D1416]">{shift.value} reuniões</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end font-dm">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-[#252A34] text-xs font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
