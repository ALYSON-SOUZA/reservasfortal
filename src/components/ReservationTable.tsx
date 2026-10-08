import React, { useState } from 'react';
import { Reservation, AppUser } from '../types';
import {
  formatDateBR,
  getReservationStatus,
  getConflictingReservations,
  getConflictPriorityInfo,
  formatDateTimeBR,
  formatShortAuditDate,
} from '../utils/dateUtils';
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
  Star,
} from 'lucide-react';

interface ReservationTableProps {
  reservations: Reservation[];
  allReservations?: Reservation[];
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
  allReservations,
  currentUser,
  onEdit,
  onDelete,
  onAddNew,
  onViewDetails,
  hasActiveFilters,
  onResetFilters,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showOnlyConflicts, setShowOnlyConflicts] = useState<boolean>(false);
  const canManage = canEditOrDelete(currentUser);

  // Pool de verificação de concorrência: utiliza allReservations se fornecido ou reservations
  const conflictPool = allReservations && allReservations.length > 0 ? allReservations : reservations;

  // Contagem de reservas com conflito de agenda
  const conflictCount = reservations.filter(
    (r) => getConflictPriorityInfo(r, conflictPool).hasConflict
  ).length;

  // Filtragem se o usuário optar por ver apenas as reservas em conflito
  const displayedReservations = showOnlyConflicts
    ? reservations.filter((r) => getConflictPriorityInfo(r, conflictPool).hasConflict)
    : reservations;

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
        {displayedReservations.map((res) => {
          const isPast = getReservationStatus(res.dia, res.horaInicial, res.horaFinal) === 'encerrada';
          const conflictInfo = getConflictPriorityInfo(res, conflictPool);
          const hasConflict = conflictInfo.hasConflict;
          const conflicts = conflictInfo.conflicts;

          return (
            <div
              key={res.id}
              className={`bg-white rounded-2xl p-4 transition border border-slate-200/90 shadow-xs ${isPast ? 'opacity-65 bg-slate-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-2.5 pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {getStatusBadge(res.dia, res.horaInicial, res.horaFinal)}
                  {hasConflict && (
                    <span
                      className="text-sm select-none cursor-help"
                      title={`⚠️ Conflito de data/horário detectado nesta sala (${conflicts.length} sobreposição)`}
                    >
                      ⚠️
                    </span>
                  )}
                </div>

                {/* Grupo de Ações Imediatamente Acima do Número do Chamado GLPI */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {/* Botões de Ação organizados imediatamente ACIMA do chamado */}
                  <div className="inline-flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg border border-slate-200 shadow-2xs">
                    {/* Ver detalhamento do chamado */}
                    <button
                      type="button"
                      id={`btn-mob-detalhes-${res.id}`}
                      onClick={() => onViewDetails?.(res)}
                      title="Ver detalhamento do chamado"
                      className="p-1 rounded text-slate-600 hover:text-[#7D1416] hover:bg-white transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* Copiar dados da empresa */}
                    <button
                      type="button"
                      id={`btn-mob-copiar-${res.id}`}
                      onClick={() => handleCopy(res)}
                      title="Copiar dados da empresa"
                      className="p-1 rounded text-slate-600 hover:text-[#252A34] hover:bg-white transition cursor-pointer"
                    >
                      {copiedId === res.id ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Editar reserva (Acesso Master) */}
                    {canManage ? (
                      <button
                        type="button"
                        id={`btn-mob-editar-${res.id}`}
                        onClick={() => onEdit(res)}
                        title="Editar reserva (Acesso Master)"
                        className="p-1 rounded text-[#252A34] hover:text-[#7D1416] hover:bg-white transition cursor-pointer"
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

                    {/* Excluir reserva (Acesso Master) */}
                    {canManage && (
                      <button
                        type="button"
                        id={`btn-mob-excluir-${res.id}`}
                        onClick={() => onDelete(res)}
                        title="Excluir reserva (Acesso Master)"
                        className="p-1 rounded text-slate-500 hover:text-[#AD2F3B] hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Número do Chamado GLPI (imediatamente abaixo dos botões) */}
                  <button
                    type="button"
                    onClick={() => onViewDetails?.(res)}
                    className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 cursor-pointer transition shadow-2xs group active:scale-95 bg-[#7D1416] text-white hover:bg-[#AD2F3B] border-[#AD2F3B]"
                    title="Clique para ver detalhamento do chamado GLPI"
                  >
                    <Ticket className="w-3.5 h-3.5 text-white/90 group-hover:scale-110 transition-transform" />
                    <span>#{res.glpi}</span>
                  </button>
                </div>
              </div>

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

                <div className="flex items-center justify-between p-2 rounded-xl border bg-slate-50 border-slate-200 text-slate-700">
                  <span className="flex items-center gap-1.5 font-mono font-bold">
                    {hasConflict ? (
                      <span className="text-sm select-none cursor-help mr-0.5" title="⚠️ Conflito de data/horário detectado">⚠️</span>
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-[#AD2F3B]" />
                    )}
                    <span>{res.horaInicial} às {res.horaFinal}</span>
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
                <th className="py-3 px-3 w-[11%] text-white">STATUS</th>
                <th className="py-3 px-2.5 w-[10%] text-white">DATA</th>
                <th className="py-3 px-3 w-[22%] text-white">SALA</th>
                <th className="py-3 px-2.5 w-[13%] text-white">HORÁRIO</th>
                <th className="py-3 px-3 w-[18%] text-white">SOLICITANTE</th>
                <th className="py-3 px-2.5 w-[10%] text-white">SETOR</th>
                <th className="py-3 px-3 w-[16%] text-center text-white">CHAMADO GLPI & AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-xs sm:text-sm font-dm-sans">
              {displayedReservations.map((res, index) => {
                const isPast = getReservationStatus(res.dia, res.horaInicial, res.horaFinal) === 'encerrada';
                const conflictInfo = getConflictPriorityInfo(res, conflictPool);
                const hasConflict = conflictInfo.hasConflict;
                const isPriority = conflictInfo.isPriority;
                const conflicts = conflictInfo.conflicts;

                return (
                  <tr
                    key={res.id}
                    id={`reserva-row-${res.id}`}
                    className={`hover:bg-[#AD2F3B]/5 transition-colors ${
                      hasConflict
                        ? isPriority
                          ? 'bg-emerald-50/75 hover:bg-emerald-100/75 border-t-2 border-b-2 border-emerald-300'
                          : 'bg-amber-50/80 hover:bg-amber-100/80 border-t-2 border-b-2 border-amber-300'
                        : isPast
                        ? 'bg-slate-100/50 opacity-70'
                        : index % 2 === 0
                        ? 'bg-white'
                        : 'bg-[#EAEAEA]/35'
                    }`}
                  >
                    {/* Status */}
                    <td className="py-2.5 px-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(res.dia, res.horaInicial, res.horaFinal)}
                        {hasConflict && (
                          <span
                            className="text-sm select-none cursor-help"
                            title={`⚠️ Conflito de data/horário detectado nesta sala (${conflicts.length} conflito(s))`}>
                            ⚠️
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
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 text-[#7D1416]">
                          <Building className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold font-raleway truncate text-xs sm:text-sm text-[#7D1416]" title={res.sala}>
                            {res.sala}
                          </div>
                          {res.observacoes && (
                            <span
                              className="text-[11px] text-[#252A34]/70 truncate flex items-center gap-1 cursor-help"
                              title={`Observações: ${res.observacoes}`}
                            >
                              <FileText className="w-3 h-3 text-[#AD2F3B] shrink-0 mt-0.5" />
                              <span className="truncate">{res.observacoes}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* HORA INICIAL / FINAL com apenas emoji em caso de Conflito de Data/Hora */}
                    <td className="py-2.5 px-2.5 align-middle whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {hasConflict && (
                          <span
                            title="⚠️ Conflito de data/horário detectado nesta sala."
                            className="text-sm select-none cursor-help shrink-0"
                          >
                            ⚠️
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-[#252A34] font-mono text-xs">
                          <Clock className="w-3.5 h-3.5 shrink-0 text-[#AD2F3B]" />
                          <span className="font-bold px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-[#252A34]">
                            {res.horaInicial}
                          </span>
                          <span className="text-slate-400 text-[10px]">às</span>
                          <span className="font-bold px-1.5 py-0.5 rounded text-[11px] bg-slate-100 text-[#252A34]">
                            {res.horaFinal}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* SOLICITANTE */}
                    <td className="py-2.5 px-3 align-middle overflow-hidden">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0" title={res.solicitante}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${hasConflict && isPriority ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-[#7D1416]'}`}>
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

                    {/* CHAMADO GLPI & AÇÕES (Botões organizados imediatamente ACIMA do número do chamado) */}
                    <td className={`py-2.5 px-3 align-middle whitespace-nowrap text-center ${
                      hasConflict
                        ? isPriority
                          ? 'border-r-2 border-r-emerald-300'
                          : 'border-r-2 border-r-amber-300'
                        : ''
                    }`}>
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {/* Botões de Ação organizados imediatamente ACIMA do número do chamado */}
                        <div className="inline-flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg border border-slate-200 shadow-2xs">
                          {/* Ver detalhamento do chamado */}
                          <button
                            type="button"
                            id={`btn-detalhes-${res.id}`}
                            onClick={() => onViewDetails?.(res)}
                            title="Ver detalhamento do chamado"
                            className="p-1 rounded text-slate-600 hover:text-[#7D1416] hover:bg-white transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Copiar dados da empresa */}
                          <button
                            type="button"
                            id={`btn-copiar-${res.id}`}
                            onClick={() => handleCopy(res)}
                            title="Copiar dados da empresa"
                            className="p-1 rounded text-slate-600 hover:text-[#252A34] hover:bg-white transition cursor-pointer"
                          >
                            {copiedId === res.id ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Editar reserva (Acesso Master) */}
                          {canManage ? (
                            <button
                              type="button"
                              id={`btn-editar-${res.id}`}
                              onClick={() => onEdit(res)}
                              title="Editar reserva (Acesso Master)"
                              className="p-1 rounded text-[#252A34] hover:text-[#7D1416] hover:bg-white transition cursor-pointer"
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

                          {/* Excluir reserva (Acesso Master) */}
                          {canManage && (
                            <button
                              type="button"
                              id={`btn-excluir-${res.id}`}
                              onClick={() => onDelete(res)}
                              title="Excluir reserva (Acesso Master)"
                              className="p-1 rounded text-slate-500 hover:text-[#AD2F3B] hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Número do Chamado GLPI (imediatamente abaixo dos botões) */}
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            type="button"
                            id={`btn-glpi-badge-${res.id}`}
                            onClick={() => onViewDetails?.(res)}
                            className={`font-mono font-bold text-[11px] sm:text-xs px-2.5 py-0.5 rounded-lg border inline-flex items-center gap-1 cursor-pointer transition shadow-2xs group active:scale-95 ${
                              hasConflict && isPriority
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-500 ring-2 ring-emerald-400/40'
                                : 'bg-[#7D1416] hover:bg-[#AD2F3B] text-white border-[#AD2F3B]'
                            }`}
                            title={`Clique para abrir detalhamento do chamado GLPI #${res.glpi}${hasConflict && isPriority ? ' (Prioridade 1 - Chamado mais antigo)' : ''}`}
                          >
                            <Ticket className="w-3 h-3 text-white/90 group-hover:scale-110 transition-transform" />
                            <span>#{res.glpi}</span>
                          </button>
                          {hasConflict && isPriority && (
                            <span
                              title="Chamado mais antigo do horário concorrente"
                              className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black uppercase shadow-2xs"
                            >
                              ⭐ TOP 1
                            </span>
                          )}
                        </div>
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
