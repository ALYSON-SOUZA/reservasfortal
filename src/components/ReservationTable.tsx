import React, { useState } from 'react';
import { Reservation, AppUser } from '../types';
import { formatDateBR, getReservationStatus, getConflictingReservations, formatDateTimeBR, formatShortAuditDate } from '../utils/dateUtils';
import { canEditOrDelete } from '../utils/rbac';
import {
  Calendar,
  Clock,
  User,
  Building,
  Ticket,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock3,
  CalendarCheck,
  FileText,
  Plus,
  Eye,
  Lock,
} from 'lucide-react';

interface ReservationTableProps {
  reservations: Reservation[];
  currentUser?: AppUser | null;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
  onAddNew: () => void;
  onViewDetails?: (reservation: Reservation) => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
}

export const ReservationTable: React.FC<ReservationTableProps> = ({
  reservations,
  currentUser,
  onEdit,
  onDelete,
  onAddNew,
  onViewDetails,
  hasActiveFilters,
  onResetFilters,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const canManage = canEditOrDelete(currentUser);

  const handleCopy = (res: Reservation) => {
    const text = `📋 Reserva de Sala — Bellinati Perez:\n• Sala: ${res.sala}\n• Data: ${formatDateBR(res.dia)}\n• Horário: ${res.horaInicial} às ${res.horaFinal}\n• Solicitante: ${res.solicitante} (${res.setor})\n• GLPI: #${res.glpi}`;
    navigator.clipboard.writeText(text);
    setCopiedId(res.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (dia: string, horaInicial: string, horaFinal: string) => {
    const status = getReservationStatus(dia, horaInicial, horaFinal);

    switch (status) {
      case 'em_andamento':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-dm-sans bg-[#FF2E63] text-white shadow-xs whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            Em Andamento
          </span>
        );
      case 'agendada_hoje':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-dm-sans bg-[#AD2F3B]/10 text-[#AD2F3B] border border-[#AD2F3B]/30 whitespace-nowrap">
            <Clock3 className="w-3 h-3 text-[#AD2F3B]" />
            Hoje
          </span>
        );
      case 'futura':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold font-dm-sans bg-slate-100 text-[#252A34] border border-slate-200 whitespace-nowrap">
            <CalendarCheck className="w-3 h-3 text-[#252A34]" />
            Agendada
          </span>
        );
      case 'encerrada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium font-dm-sans bg-slate-200/80 text-slate-500 border border-slate-300 whitespace-nowrap">
            <AlertCircle className="w-3 h-3 text-slate-400" />
            Encerrada
          </span>
        );
    }
  };

  if (reservations.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#AD2F3B]/10 text-[#7D1416] mx-auto flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[#7D1416] font-raleway mb-1">
          Nenhuma reserva encontrada
        </h3>
        <p className="text-sm font-dm-sans text-[#252A34]/70 max-w-md mx-auto mb-6">
          Não há reservas que correspondam aos filtros ativos ou os horários agendados já foram encerrados.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {hasActiveFilters && onResetFilters && (
            <button
              onClick={onResetFilters}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#252A34] text-xs font-bold font-dm-sans transition cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
          <button
            onClick={onAddNew}
            className="px-4 py-2 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway transition shadow-md shadow-[#FF2E63]/30 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Reserva</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Card List (md:hidden) */}
      <div className="md:hidden space-y-3">
        {reservations.map((res) => {
          const isPast = getReservationStatus(res.dia, res.horaInicial, res.horaFinal) === 'encerrada';
          const conflicts = getConflictingReservations(res, reservations);
          const hasConflict = conflicts.length > 0;

          return (
            <div
              key={res.id}
              className={`bg-white rounded-2xl p-4 border shadow-xs transition ${
                hasConflict
                  ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-300'
                  : 'border-slate-200/90'
              } ${isPast ? 'opacity-65 bg-slate-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {getStatusBadge(res.dia, res.horaInicial, res.horaFinal)}
                  {hasConflict && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-dm-sans bg-amber-100 text-amber-950 border border-amber-300 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-amber-700" />
                      Conflito ({conflicts.length})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onViewDetails?.(res)}
                  className="font-mono font-bold text-xs bg-[#7D1416] text-white hover:bg-[#AD2F3B] px-2.5 py-1 rounded-lg border border-[#AD2F3B] flex items-center gap-1.5 cursor-pointer transition shadow-2xs group active:scale-95"
                  title="Clique para ver detalhamento do chamado GLPI"
                >
                  <Ticket className="w-3.5 h-3.5 text-white/90 group-hover:scale-110 transition-transform" />
                  <span>#{res.glpi}</span>
                </button>
              </div>

              {/* Alerta de Conflito Mobile */}
              {hasConflict && (
                <div className="mb-2.5 p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-950 font-dm-sans">
                  <div className="flex items-center gap-1 font-bold text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Sobreposição de horário:</span>
                  </div>
                  {conflicts.map((c) => (
                    <p key={c.id} className="pl-4.5 mt-0.5 text-amber-900 font-medium">
                      • {c.solicitante} ({c.horaInicial} às {c.horaFinal}) — GLPI #{c.glpi}
                    </p>
                  ))}
                </div>
              )}

              <div className="space-y-2 text-xs font-dm-sans">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#7D1416] font-raleway flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#AD2F3B]" />
                    {res.sala}
                  </span>
                  <span className="font-bold text-[#252A34] flex items-center gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-[#AD2F3B]" />
                    {formatDateBR(res.dia)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 bg-slate-50 p-2 rounded-xl">
                  <span className="flex items-center gap-1 font-mono font-bold text-[#252A34]">
                    <Clock className="w-3.5 h-3.5 text-[#AD2F3B]" />
                    {res.horaInicial} às {res.horaFinal}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-bold text-[11px] text-slate-700">
                    {res.setor}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-700 pt-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-[#252A34]">{res.solicitante}</span>
                  </div>
                  {(res.modificadoPor || res.criadoPor) && (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200" title={`Modificado em ${formatDateTimeBR(res.modificadoEm || res.criadoEm)}`}>
                      Modif: <strong>{res.modificadoPor || res.criadoPor}</strong> ({formatShortAuditDate(res.modificadoEm || res.criadoEm)})
                    </span>
                  )}
                </div>

                {res.observacoes && (
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-[#252A34] flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#AD2F3B] shrink-0 mt-0.5" />
                    <span>{res.observacoes}</span>
                  </div>
                )}
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-slate-100">
                <button
                  onClick={() => handleCopy(res)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold font-dm-sans flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedId === res.id ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>

                {canManage ? (
                  <>
                    <button
                      onClick={() => onEdit(res)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#AD2F3B] hover:text-white text-[#252A34] text-xs font-semibold font-dm flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => onDelete(res)}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-[#FF2E63] hover:text-white text-xs font-semibold font-dm transition cursor-pointer"
                      title="Excluir reserva"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-400 text-[11px] font-medium font-dm border border-slate-200 select-none"
                    title="Apenas o Usuário Master tem permissão para editar ou excluir reservas."
                  >
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Apenas Master</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop / Tablet Table View (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto lg:overflow-x-visible">
          <table className="w-full table-fixed text-left border-collapse font-dm-sans text-xs sm:text-sm">
            {/* Header da Tabela em Bordô #7D1416 (Identidade Bellinati Perez) */}
            <thead>
              <tr className="bg-[#7D1416] text-white border-b-2 border-[#AD2F3B] text-[11px] sm:text-xs font-bold font-raleway tracking-wider select-none">
                <th className="py-3 px-3 w-[12%] text-white">STATUS</th>
                <th className="py-3 px-2.5 w-[10%] text-white">DATA</th>
                <th className="py-3 px-3 w-[22%] text-white">SALA</th>
                <th className="py-3 px-2.5 w-[13%] text-white">HORÁRIO</th>
                <th className="py-3 px-3 w-[18%] text-white">SOLICITANTE</th>
                <th className="py-3 px-2.5 w-[12%] text-white">SETOR</th>
                <th className="py-3 px-2 w-[7%] text-white">GLPI</th>
                <th className="py-3 px-2.5 w-[6%] text-right text-white">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs sm:text-sm font-dm-sans">
              {reservations.map((res, index) => {
                const isPast = getReservationStatus(res.dia, res.horaInicial, res.horaFinal) === 'encerrada';
                const conflicts = getConflictingReservations(res, reservations);
                const hasConflict = conflicts.length > 0;

                return (
                  <tr
                    key={res.id}
                    id={`reserva-row-${res.id}`}
                    className={`hover:bg-[#AD2F3B]/5 transition-colors ${
                      hasConflict
                        ? 'bg-amber-50/50 hover:bg-amber-100/50 border-l-4 border-l-amber-500'
                        : isPast
                        ? 'bg-slate-100/50 opacity-70'
                        : index % 2 === 0
                        ? 'bg-white'
                        : 'bg-[#EAEAEA]/35'
                    }`}
                  >
                    {/* Status */}
                    <td className="py-2.5 px-3 align-middle">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(res.dia, res.horaInicial, res.horaFinal)}
                        {hasConflict && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-dm-sans bg-amber-100 text-amber-950 border border-amber-300 animate-pulse whitespace-nowrap"
                            title={`Conflito com: ${conflicts.map(c => `${c.solicitante} (${c.horaInicial}-${c.horaFinal})`).join(', ')}`}
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                            <span>Conflito ({conflicts.length})</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* DIA */}
                    <td className="py-2.5 px-2.5 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-bold text-[#252A34] text-xs font-mono">
                        <Calendar className="w-3.5 h-3.5 text-[#AD2F3B] shrink-0" />
                        <span>{formatDateBR(res.dia)}</span>
                      </div>
                    </td>

                    {/* SALA */}
                    <td className="py-2.5 px-3 align-middle overflow-hidden">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Building className="w-3.5 h-3.5 text-[#7D1416]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[#7D1416] font-raleway truncate text-xs sm:text-sm" title={res.sala}>
                            {res.sala}
                          </div>
                          {hasConflict && (
                            <span className="text-[10px] text-amber-800 font-bold block truncate" title={`Conflita com ${conflicts.map(c => c.solicitante).join(', ')}`}>
                              ⚠️ Conflita com {conflicts.length} reserva(s)
                            </span>
                          )}
                          {res.observacoes && (
                            <span
                              className="text-[11px] text-[#252A34]/70 truncate flex items-center gap-1 cursor-help"
                              title={`Observações: ${res.observacoes}`}
                            >
                              <FileText className="w-3 h-3 text-[#AD2F3B] shrink-0" />
                              <span className="truncate">{res.observacoes}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* HORA INICIAL / FINAL */}
                    <td className="py-2.5 px-2.5 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[#252A34] font-mono text-xs">
                        <Clock className="w-3.5 h-3.5 text-[#AD2F3B] shrink-0" />
                        <span className={`font-bold px-1 py-0.5 rounded text-[11px] ${hasConflict ? 'bg-amber-100 text-amber-950 font-black' : 'bg-slate-100 text-[#252A34]'}`}>
                          {res.horaInicial}
                        </span>
                        <span className="text-slate-400 text-[10px]">às</span>
                        <span className={`font-bold px-1 py-0.5 rounded text-[11px] ${hasConflict ? 'bg-amber-100 text-amber-950 font-black' : 'bg-slate-100 text-[#252A34]'}`}>
                          {res.horaFinal}
                        </span>
                      </div>
                    </td>

                    {/* SOLICITANTE */}
                    <td className="py-2.5 px-3 align-middle overflow-hidden">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0" title={res.solicitante}>
                          <div className="w-5 h-5 rounded-full bg-slate-200 text-[#7D1416] flex items-center justify-center font-bold text-[10px] shrink-0">
                            {res.solicitante.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-[#252A34] truncate text-xs sm:text-sm">
                            {res.solicitante}
                          </span>
                        </div>
                        {(res.modificadoPor || res.criadoPor) && (
                          <div
                            className="flex items-center gap-1 text-[10px] text-slate-500 font-medium truncate mt-0.5"
                            title={`Modificado por ${res.modificadoPor || res.criadoPor} em ${formatDateTimeBR(res.modificadoEm || res.criadoEm)}`}
                          >
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200 truncate">
                              Modif: <strong>{res.modificadoPor || res.criadoPor}</strong>
                            </span>
                            <span className="text-slate-400 font-mono text-[9px] shrink-0">
                              {formatShortAuditDate(res.modificadoEm || res.criadoEm)}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* SETOR */}
                    <td className="py-2.5 px-2.5 align-middle overflow-hidden">
                      <span
                        className="inline-block max-w-full text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-[#252A34] rounded-md border border-slate-200 truncate"
                        title={res.setor}
                      >
                        {res.setor}
                      </span>
                    </td>

                    {/* GLPI (Botão Interativo em Bordô #7D1416) */}
                    <td className="py-2.5 px-2 align-middle whitespace-nowrap">
                      <button
                        type="button"
                        id={`btn-glpi-badge-${res.id}`}
                        onClick={() => onViewDetails?.(res)}
                        className="font-mono font-bold text-[11px] sm:text-xs bg-[#7D1416] hover:bg-[#AD2F3B] text-white px-2 py-0.5 rounded-lg border border-[#AD2F3B] inline-flex items-center gap-1 cursor-pointer transition shadow-2xs group active:scale-95"
                        title="Clique para abrir todo o detalhamento do chamado GLPI"
                      >
                        <Ticket className="w-3 h-3 text-white/90 group-hover:scale-110 transition-transform" />
                        <span>#{res.glpi}</span>
                      </button>
                    </td>

                    {/* AÇÕES */}
                    <td className="py-2.5 px-2.5 align-middle whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details Button */}
                        <button
                          id={`btn-detalhes-${res.id}`}
                          onClick={() => onViewDetails?.(res)}
                          title="Ver detalhamento do chamado"
                          className="p-1 rounded-md text-slate-500 hover:text-[#7D1416] hover:bg-slate-100 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Copy summary button */}
                        <button
                          id={`btn-copiar-${res.id}`}
                          onClick={() => handleCopy(res)}
                          title="Copiar dados da reserva"
                          className="p-1 rounded-md text-slate-500 hover:text-[#252A34] hover:bg-slate-100 transition cursor-pointer"
                        >
                          {copiedId === res.id ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Edit Button */}
                        {canManage ? (
                          <button
                            id={`btn-editar-${res.id}`}
                            onClick={() => onEdit(res)}
                            title="Editar reserva (Acesso Master)"
                            className="p-1 rounded-md text-[#252A34] hover:text-[#7D1416] hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span
                            title="Edição restrita: Apenas o Usuário Master pode alterar reservas"
                            className="p-1 text-slate-300 cursor-not-allowed inline-flex items-center"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-300" />
                          </span>
                        )}

                        {/* Delete Button */}
                        {canManage && (
                          <button
                            id={`btn-excluir-${res.id}`}
                            onClick={() => onDelete(res)}
                            title="Excluir reserva (Acesso Master)"
                            className="p-1 rounded-md text-slate-400 hover:text-[#AD2F3B] hover:bg-[#AD2F3B]/10 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
