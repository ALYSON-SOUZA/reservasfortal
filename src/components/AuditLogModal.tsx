import React, { useState, useMemo } from 'react';
import { AuditLogItem } from '../types';
import { auditService } from '../services/auditService';
import {
  X,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Ticket,
  DoorOpen,
} from 'lucide-react';
import { formatDateBR } from '../utils/dateUtils';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMaster?: boolean;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  isMaster = false,
}) => {
  const [logs, setLogs] = useState<AuditLogItem[]>(() => auditService.getLogs());
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('TODAS');
  const [dateFilter, setDateFilter] = useState<string>('');

  const refreshLogs = () => {
    setLogs(auditService.getLogs());
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'TODAS' && log.acao !== actionFilter) {
        return false;
      }
      if (dateFilter && !log.dataHora.startsWith(dateFilter)) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesQuery =
          log.titulo.toLowerCase().includes(query) ||
          log.detalhes.toLowerCase().includes(query) ||
          (log.usuarioNome && log.usuarioNome.toLowerCase().includes(query)) ||
          (log.glpi && log.glpi.toLowerCase().includes(query)) ||
          (log.sala && log.sala.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [logs, actionFilter, dateFilter, search]);

  const handleExportCsv = () => {
    const csvContent = auditService.exportCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Auditoria_Reservas_BellinatiPerez_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getActionBadge = (acao: AuditLogItem['acao']) => {
    switch (acao) {
      case 'CRIACAO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Criação
          </span>
        );
      case 'EDICAO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            Edição
          </span>
        );
      case 'EXCLUSAO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            Exclusão
          </span>
        );
      case 'CHECKIN':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Check-in
          </span>
        );
      case 'LIBERACAO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            Liberação Antecipada
          </span>
        );
      case 'USUARIO_ATUALIZADO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
            Gestão de Usuário
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Sistema
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-dm-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header em Bordô #7D1416 */}
        <div className="bg-[#7D1416] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b-2 border-[#AD2F3B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold shadow-md">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-raleway text-white">
                  Histórico de Auditoria & Governança
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FF2E63] text-white">
                  LGPD & Segurança
                </span>
              </div>
              <p className="text-xs text-[#EAEAEA]/80">
                Rastreabilidade de todas as ações de criação, edição, check-in e liberação de salas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar de Filtros e Busca */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center flex-wrap gap-2 flex-1 min-w-[280px]">
            {/* Input Busca */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por chamado, solicitante, sala ou detalhes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#7D1416]"
              />
            </div>

            {/* Filtro por Ação */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#7D1416]"
            >
              <option value="TODAS">Todas as Ações</option>
              <option value="CRIACAO">Criação de Reserva</option>
              <option value="EDICAO">Edição de Reserva</option>
              <option value="EXCLUSAO">Exclusão de Reserva</option>
              <option value="CHECKIN">Check-in Realizado</option>
              <option value="LIBERACAO">Liberação Antecipada</option>
              <option value="USUARIO_ATUALIZADO">Alteração de Usuário</option>
            </select>

            {/* Filtro por Data */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#7D1416]"
            />

            {(search || actionFilter !== 'TODAS' || dateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setActionFilter('TODAS');
                  setDateFilter('');
                }}
                className="p-1.5 text-xs text-slate-500 hover:text-slate-800"
                title="Limpar Filtros"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#7D1416] border border-slate-300 text-xs font-bold font-raleway flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#AD2F3B]" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Tabela de Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">Nenhum registro de auditoria encontrado com os filtros atuais.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition shadow-2xs"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5">{getActionBadge(log.acao)}</div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#252A34] text-xs font-raleway">
                        {log.titulo}
                      </span>
                      {log.glpi && (
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 font-mono text-[10px] rounded-md border border-slate-200 font-bold">
                          GLPI #{log.glpi}
                        </span>
                      )}
                      {log.sala && (
                        <span className="px-1.5 py-0.2 bg-[#7D1416]/10 text-[#7D1416] text-[10px] rounded-md font-semibold">
                          {log.sala}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {log.detalhes}
                    </p>
                  </div>
                </div>

                <div className="sm:text-right shrink-0 text-[11px] text-slate-500 border-t sm:border-t-0 pt-1 sm:pt-0 border-slate-100">
                  <div className="flex items-center sm:justify-end gap-1 font-medium text-slate-700">
                    <User className="w-3 h-3 text-[#AD2F3B]" />
                    <span>{log.usuarioNome}</span>
                  </div>
                  <div className="flex items-center sm:justify-end gap-1 text-[10px] text-slate-400 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.dataHora).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 px-5 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Total de registros: <strong>{filteredLogs.length}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#7D1416] text-white rounded-xl text-xs font-bold hover:bg-[#AD2F3B] transition cursor-pointer"
          >
            Fechar Auditoria
          </button>
        </div>
      </div>
    </div>
  );
};
