import React from 'react';
import { Reservation, FilterOptions } from '../types';
import { formatDateBR } from '../utils/dateUtils';
import { Printer, X, FileSpreadsheet, FileDown, Building2 } from 'lucide-react';
import { exportReservationsPDF } from '../utils/pdfExport';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Reservation[];
  filters: FilterOptions;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reservations,
  filters,
}) => {
  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (reservations.length === 0) return;

    const headers = ['DIA', 'SALA', 'HORA INICIAL', 'HORA FINAL', 'SOLICITANTE', 'SETOR', 'GLPI', 'OBSERVACOES'];
    const rows = reservations.map((r) => [
      formatDateBR(r.dia),
      `"${r.sala}"`,
      r.horaInicial,
      r.horaFinal,
      `"${r.solicitante}"`,
      `"${r.setor}"`,
      `"#${r.glpi}"`,
      `"${(r.observacoes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_reservas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    exportReservationsPDF(reservations, filters);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-dm-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal em Bordô #7D1416 (Identidade Bellinati Perez) */}
        <div className="bg-[#7D1416] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#AD2F3B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-[#7D1416] flex items-center justify-center font-bold shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-raleway leading-tight text-white">Relatório de Reservas de Salas</h2>
              <p className="text-xs text-[#EAEAEA]/80 font-medium">
                Exportação consolidada para conferência, auditoria e impressão — Bellinati Perez
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="btn-exportar-csv"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold transition active:scale-95 cursor-pointer font-dm-sans"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>Exportar Planilha (CSV)</span>
            </button>

            <button
              id="btn-imprimir-relatorio"
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway tracking-wide transition shadow-md shadow-[#FF2E63]/30 active:scale-95 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Exportar PDF / Imprimir</span>
            </button>

            <button
              id="btn-fechar-relatorio"
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-white text-[#252A34]" id="area-impressao">
          
          {/* Official Document Header */}
          <div className="border-b-2 border-[#7D1416] pb-4 mb-5 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2.5">
                <Building2 className="w-7 h-7 text-[#7D1416]" />
                <h1 className="text-2xl font-black text-[#7D1416] font-raleway">
                  BELLINATI PEREZ — RELATÓRIO DE RESERVAS
                </h1>
              </div>
              <p className="text-xs text-[#252A34]/70 font-semibold mt-1">
                Gestão e Governança de Salas de Reunião
              </p>
            </div>
            <div className="text-right text-xs text-[#252A34]/70 font-medium">
              <p>Gerado em: <strong>{new Date().toLocaleString('pt-BR')}</strong></p>
              <p>Total de Registros: <strong>{reservations.length}</strong></p>
            </div>
          </div>

          {/* Active Filter Criteria Badge Box */}
          <div className="bg-[#EAEAEA]/50 border border-slate-200 rounded-xl p-3.5 mb-5 text-xs text-[#252A34]">
            <p className="font-bold text-[#7D1416] font-raleway mb-1.5">Critérios de Filtro Aplicados:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                • Período:{' '}
                <strong>
                  {filters.dataInicio && filters.dataFim
                    ? `${formatDateBR(filters.dataInicio)} a ${formatDateBR(filters.dataFim)}`
                    : filters.dataInicio
                    ? `A partir de ${formatDateBR(filters.dataInicio)}`
                    : filters.dataFim
                    ? `Até ${formatDateBR(filters.dataFim)}`
                    : filters.data
                    ? formatDateBR(filters.data)
                    : 'Todos os Dias'}
                </strong>
              </div>
              <div>• Solicitante: <strong>{filters.solicitante || 'Todos'}</strong></div>
              <div>• Chamado GLPI: <strong>{filters.glpi ? `#${filters.glpi}` : 'Todos'}</strong></div>
              <div>• Sala: <strong>{filters.sala || 'Todas'}</strong></div>
            </div>
          </div>

          {/* Data Table */}
          <table className="w-full text-left text-xs border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-[#7D1416] text-white font-bold font-raleway uppercase">
                <th className="py-2.5 px-3 border-r border-[#AD2F3B]">DIA</th>
                <th className="py-2.5 px-3 border-r border-[#AD2F3B]">SALA</th>
                <th className="py-2.5 px-3 border-r border-[#AD2F3B]">HORÁRIO</th>
                <th className="py-2.5 px-3 border-r border-[#AD2F3B]">SOLICITANTE</th>
                <th className="py-2.5 px-3 border-r border-[#AD2F3B]">SETOR</th>
                <th className="py-2.5 px-3 text-white">GLPI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 font-dm-sans">
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                    Nenhuma reserva cadastrada para os filtros informados.
                  </td>
                </tr>
              ) : (
                reservations.map((r, i) => (
                  <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#EAEAEA]/30'}>
                    <td className="py-2.5 px-3 border-r border-slate-200 font-semibold">{formatDateBR(r.dia)}</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 font-bold text-[#7D1416]">{r.sala}</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 font-mono font-bold">{r.horaInicial} — {r.horaFinal}</td>
                    <td className="py-2.5 px-3 border-r border-slate-200 font-medium">{r.solicitante}</td>
                    <td className="py-2.5 px-3 border-r border-slate-200">{r.setor}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#7D1416]">#{r.glpi}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );
};
