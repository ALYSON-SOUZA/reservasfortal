import React, { useState } from 'react';
import { Reservation, Sala, AppUser } from '../types';
import {
  formatDateBR,
  formatDateTimeBR,
  getReservationStatus,
  getConflictingReservations,
  getConflictPriorityInfo,
} from '../utils/dateUtils';
import { canEditOrDelete } from '../utils/rbac';
import {
  X,
  Ticket,
  Building,
  Calendar,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Edit2,
  Trash2,
  Users,
  ShieldCheck,
  Lock,
  Star,
} from 'lucide-react';

interface ReservationDetailModalProps {
  isOpen: boolean;
  reservation: Reservation | null;
  currentUser?: AppUser | null;
  allReservations?: Reservation[];
  rooms?: Sala[];
  onClose: () => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
  onViewUserProfile?: (solicitante: string) => void;
}

export const ReservationDetailModal: React.FC<ReservationDetailModalProps> = ({
  isOpen,
  reservation,
  currentUser,
  allReservations = [],
  rooms = [],
  onClose,
  onEdit,
  onDelete,
  onViewUserProfile,
}) => {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedGlpi, setCopiedGlpi] = useState(false);
  const canManage = canEditOrDelete(currentUser);

  if (!isOpen || !reservation) return null;

  const numeroGlpi = (reservation.glpi || '').replace('#', '').trim();
  const conflictInfo = getConflictPriorityInfo(reservation, allReservations);
  const hasConflict = conflictInfo.hasConflict;
  const isPriority = conflictInfo.isPriority;
  const conflicts = conflictInfo.conflicts;
  const status = getReservationStatus(reservation.dia, reservation.horaInicial, reservation.horaFinal);

  // Busca detalhes adicionais da sala (capacidade, filial, recursos)
  const roomDetail = rooms.find(
    (r) => r.nome.trim().toLowerCase() === (reservation.sala || '').trim().toLowerCase()
  );

  // Formata o dia completo da semana
  const getFullDateDisplay = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day, 12, 0, 0);
      return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return formatDateBR(dateStr);
    }
  };

  // Calcula a duração em horas e minutos
  const calculateDurationText = (start: string, end: string) => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const diffMin = endMin - startMin;
      if (diffMin <= 0) return '';
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      if (h > 0 && m > 0) return `${h}h ${m}min`;
      if (h > 0) return `${h} hora${h > 1 ? 's' : ''}`;
      return `${m} minutos`;
    } catch {
      return '';
    }
  };

  // Copia o número do GLPI
  const handleCopyGlpi = () => {
    navigator.clipboard.writeText(numeroGlpi);
    setCopiedGlpi(true);
    setTimeout(() => setCopiedGlpi(false), 2000);
  };

  // Copia o resumo completo formatado
  const handleCopyFormattedSummary = () => {
    const lines = [
      `📋 *DETALHES DO CHAMADO GLPI #${numeroGlpi}* — Bellinati Perez`,
      `• *Sala:* ${reservation.sala} ${roomDetail ? `(${roomDetail.filial})` : ''}`,
      `• *Data:* ${formatDateBR(reservation.dia)} (${getFullDateDisplay(reservation.dia)})`,
      `• *Horário:* ${reservation.horaInicial} às ${reservation.horaFinal} (${calculateDurationText(reservation.horaInicial, reservation.horaFinal)})`,
      `• *Solicitante:* ${reservation.solicitante}`,
      `• *Setor:* ${reservation.setor}`,
    ];

    if (reservation.observacoes) {
      lines.push(`• *Pauta / Observações:* ${reservation.observacoes}`);
    }

    if (hasConflict) {
      lines.push(
        `⚠️ *ALERTA DE CONFLITO:* Detectada sobreposição de horário com ${conflicts.length} reserva(s) na mesma sala.`
      );
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Badge do status da reserva (Brandbook Bellinati Perez)
  const renderStatusBadge = () => {
    switch (status) {
      case 'em_andamento':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FF2E63] text-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>EM ANDAMENTO</span>
          </span>
        );
      case 'agendada_hoje':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#AD2F3B]/20 text-white border border-white/30">
            <Clock className="w-3.5 h-3.5 text-white" />
            <span>AGENDADA PARA HOJE</span>
          </span>
        );
      case 'futura':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
            <Calendar className="w-3.5 h-3.5 text-white" />
            <span>AGENDAMENTO FUTURO</span>
          </span>
        );
      case 'encerrada':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/80 border border-white/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-white/80" />
            <span>FINALIZADA / ENCERRADA</span>
          </span>
        );
    }
  };

  return (
    <div
      id="modal-detalhes-reserva"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-dm-sans animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal em Bordô #7D1416 com GLPI e Status */}
        <div className="bg-[#7D1416] text-white p-5 sm:p-6 relative border-b-2 border-[#AD2F3B]">
          <button
            id="btn-fechar-detalhes-x"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="absolute top-4 right-4 p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-3 mb-2.5">
            {/* GLPI Pill em Destaque */}
            <div
              onClick={handleCopyGlpi}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-1.5 rounded-xl cursor-pointer transition group"
              title="Clique para copiar número do GLPI"
            >
              <Ticket className="w-4 h-4 text-white" />
              <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wider">
                #{numeroGlpi || 'SEM NÚMERO'}
              </span>
              {copiedGlpi ? (
                <span className="text-[10px] bg-white text-[#7D1416] font-bold px-1.5 py-0.2 rounded-md">
                  Copiado!
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition" />
              )}
            </div>

            {/* Badge de Status */}
            {renderStatusBadge()}

            {/* Marcador de Prioridade GLPI Mais Antigo */}
            {hasConflict && isPriority && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold font-dm-sans bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-xs">
                <Star className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300" />
                <span>Chamado Prioritário (Mais Antigo)</span>
              </span>
            )}
            {hasConflict && !isPriority && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold font-dm-sans bg-amber-500/20 text-amber-200 border border-amber-400/40 shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                <span>Conflito (Precedência #{conflictInfo.priorityReservation?.glpi})</span>
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-raleway text-white tracking-wide flex items-center gap-2">
            Detalhamento do Chamado
          </h2>
          <p className="text-xs sm:text-sm text-[#EAEAEA]/80 font-dm-sans font-medium mt-0.5">
            Informações completas do agendamento de sala e registro de auditoria
          </p>
        </div>

        {/* Corpo dos Detalhes */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto font-dm-sans">
          {/* Alerta de Conflito de Horário com Regra de Antiguidade */}
          {hasConflict && isPriority && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-950 flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
              <div className="text-xs flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <strong className="text-sm font-bold font-raleway text-emerald-900">
                    ⭐ Chamado Prioritário por Antiguidade (Regra Oficial GLPI)
                  </strong>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                    Prioridade 1
                  </span>
                </div>
                <p className="text-emerald-900 font-medium leading-relaxed">
                  Esta reunião concorre com outro(s) agendamento(s) para a <strong>{reservation.sala}</strong>, porém detém a <strong>prioridade oficial</strong> de ocupação por possuir o chamado GLPI mais antigo (menor número de chamado: <strong>#{reservation.glpi}</strong>).
                </p>
                <div className="space-y-1.5 mt-2.5 pt-2 border-t border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide block">
                    Agendamentos concorrentes posteriores ({conflicts.length}):
                  </span>
                  {conflicts.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white/90 p-2 rounded-xl border border-emerald-200 flex items-center justify-between text-xs font-semibold text-emerald-950"
                    >
                      <span>• {c.solicitante} ({c.setor})</span>
                      <span className="font-mono text-emerald-800 font-bold">
                        {c.horaInicial} às {c.horaFinal} | GLPI #{c.glpi}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasConflict && !isPriority && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 flex items-start gap-3 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div className="text-xs flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <strong className="text-sm font-bold font-raleway text-amber-900">
                    ⚠️ Conflito de Horário (Chamado Concorrente Posterior)
                  </strong>
                  <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider">
                    Secundário
                  </span>
                </div>
                <p className="text-amber-900 font-medium leading-relaxed">
                  Esta reunião possui sobreposição de horários na <strong>{reservation.sala}</strong> com o chamado mais antigo <strong>GLPI #{conflictInfo.priorityReservation?.glpi} ({conflictInfo.priorityReservation?.solicitante})</strong>, que possui prioridade de ocupação no espaço.
                </p>
                <div className="space-y-1.5 mt-2.5 pt-2 border-t border-amber-200">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide block">
                    Agendamento prioritário e concorrentes:
                  </span>
                  {conflicts.map((c) => {
                    const isPrioritary = c.id === conflictInfo.priorityReservation?.id;
                    return (
                      <div
                        key={c.id}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                          isPrioritary
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-white/90 border-amber-200 text-amber-950'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {isPrioritary && <Star className="w-3 h-3 text-emerald-600 fill-emerald-500 shrink-0" />}
                          <span>• {c.solicitante} ({c.setor})</span>
                          {isPrioritary && (
                            <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black uppercase">
                              Prioritário
                            </span>
                          )}
                        </span>
                        <span className="font-mono">
                          {c.horaInicial} às {c.horaFinal} | GLPI #{c.glpi}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Grid Principal de Informações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card Sala */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7D1416] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Building className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Sala Reservada
                </span>
                <div className="font-bold text-[#7D1416] text-sm sm:text-base font-raleway truncate">
                  {reservation.sala}
                </div>
                {roomDetail && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">{roomDetail.filial}</span>
                    {roomDetail.capacidade && (
                      <span className="inline-flex items-center gap-0.5 bg-white px-1.5 py-0.2 rounded border border-slate-200 font-bold text-[10px]">
                        <Users className="w-2.5 h-2.5" />
                        {roomDetail.capacidade} pessoas
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Card Data */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7D1416] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Data da Reunião
                </span>
                <div className="font-bold text-[#252A34] text-sm sm:text-base font-raleway">
                  {formatDateBR(reservation.dia)}
                </div>
                <span className="text-xs text-slate-500 font-medium capitalize">
                  {getFullDateDisplay(reservation.dia)}
                </span>
              </div>
            </div>

            {/* Card Horário */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#AD2F3B] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Horário & Duração
                </span>
                <div className="font-mono font-bold text-[#252A34] text-sm sm:text-base flex items-center gap-1.5">
                  <span>{reservation.horaInicial}</span>
                  <span className="text-slate-400 font-normal">às</span>
                  <span>{reservation.horaFinal}</span>
                </div>
                {calculateDurationText(reservation.horaInicial, reservation.horaFinal) && (
                  <span className="inline-block mt-0.5 text-xs font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    ⏱️ Duração: {calculateDurationText(reservation.horaInicial, reservation.horaFinal)}
                  </span>
                )}
              </div>
            </div>

            {/* Card Solicitante & Setor */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-[#7D1416] flex items-center justify-center shrink-0 shadow-xs font-raleway font-bold text-base">
                {reservation.solicitante ? reservation.solicitante.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Solicitante & Setor
                  </span>
                  {onViewUserProfile && (
                    <button
                      type="button"
                      onClick={() => onViewUserProfile(reservation.solicitante)}
                      className="text-[11px] text-[#AD2F3B] hover:text-[#7D1416] font-bold underline underline-offset-2 cursor-pointer flex items-center gap-1"
                    >
                      <User className="w-3 h-3" />
                      <span>Ver Perfil</span>
                    </button>
                  )}
                </div>
                <div className="font-bold text-[#252A34] text-sm sm:text-base font-raleway truncate">
                  {reservation.solicitante}
                </div>
                <div className="mt-0.5">
                  <span className="inline-block text-xs font-semibold bg-slate-100 text-[#252A34] px-2 py-0.5 rounded-md border border-slate-200">
                    {reservation.setor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Observações / Pauta do Chamado */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-2 mb-1.5 text-[#7D1416] font-bold text-xs font-raleway">
              <FileText className="w-4 h-4 text-[#AD2F3B]" />
              <span>Observações / Pauta da Reserva:</span>
            </div>
            <div className="text-xs sm:text-sm text-[#252A34] leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-200 min-h-[48px]">
              {reservation.observacoes ? (
                reservation.observacoes
              ) : (
                <span className="text-slate-400 italic">Nenhuma observação informada neste agendamento.</span>
              )}
            </div>
          </div>

          {/* Recursos da Sala (se existirem) */}
          {roomDetail?.recursos && roomDetail.recursos.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Recursos Disponíveis nesta Sala:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {roomDetail.recursos.map((rec, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold bg-white text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs"
                  >
                    ✓ {rec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Histórico & Auditoria */}
          <div className="p-3.5 bg-slate-100/70 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7D1416]" />
              <span>Registro de Auditoria do Sistema</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400">Criado em: </span>
                <strong className="text-slate-700">
                  {formatDateTimeBR(reservation.criadoEm)}
                </strong>
                {reservation.criadoPor && (
                  <span className="text-slate-500"> por {reservation.criadoPor}</span>
                )}
              </div>
              {(reservation.modificadoEm || reservation.modificadoPor) && (
                <div>
                  <span className="text-slate-400">Última alteração: </span>
                  <strong className="text-slate-700">
                    {formatDateTimeBR(reservation.modificadoEm)}
                  </strong>
                  {reservation.modificadoPor && (
                    <span className="text-slate-500"> por {reservation.modificadoPor}</span>
                  )}
                </div>
              )}
            </div>
            <div className="pt-1 text-[10px] text-slate-400 font-mono truncate">
              ID interno: {reservation.id}
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="bg-slate-50 p-4 sm:p-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          {/* Botão Copiar Resumo */}
          <button
            id="btn-copiar-detalhes-chamado"
            onClick={handleCopyFormattedSummary}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#252A34] border border-slate-300 text-xs sm:text-sm font-semibold font-dm-sans flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            {copiedSummary ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Resumo Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copiar Detalhes</span>
              </>
            )}
          </button>

          {canManage ? (
            <div className="flex items-center gap-2">
              {/* Botão Excluir */}
              <button
                id="btn-detalhes-excluir"
                onClick={() => {
                  onClose();
                  onDelete(reservation);
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 text-[#252A34] hover:bg-[#FF2E63] hover:text-white text-xs sm:text-sm font-semibold font-dm flex items-center gap-1.5 transition cursor-pointer"
                title="Excluir agendamento (Acesso Master)"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Excluir</span>
              </button>

              {/* Botão Editar (Bordô #7D1416) */}
              <button
                id="btn-detalhes-editar"
                onClick={() => {
                  onClose();
                  onEdit(reservation);
                }}
                className="px-4 py-2 rounded-xl bg-[#7D1416] hover:bg-[#AD2F3B] text-white text-xs sm:text-sm font-bold font-raleway flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Edit2 className="w-4 h-4 text-white" />
                <span>Editar Agendamento</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div
                className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium flex items-center gap-1.5 select-none"
                title="Apenas o Usuário Master possui privilégio para editar ou excluir reservas."
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Edição/Exclusão restrita ao Master</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
