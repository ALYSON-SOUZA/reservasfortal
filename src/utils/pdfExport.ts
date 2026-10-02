import { Reservation } from '../types';
import { formatDateBR, getConflictPriorityInfo } from './dateUtils';

/**
 * Generates and triggers a formatted PDF / Print View for reservations
 * Fully aligned with Bellinati Perez Brandbook
 */
export const exportReservationsToPDF = (
  reservations: Reservation[],
  title: string = 'Relatório de Reservas de Salas - Bellinati Perez',
  filtersApplied?: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita pop-ups para gerar o documento PDF.');
    return;
  }

  const dateNow = new Date().toLocaleString('pt-BR');

  // Sort by date and start time
  const sorted = [...reservations].sort((a, b) => {
    if (a.dia !== b.dia) return a.dia.localeCompare(b.dia);
    return a.horaInicial.localeCompare(b.horaInicial);
  });

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Raleway:wght@700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm;
    }
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #252A34;
      margin: 0;
      padding: 15px;
      background: #FFFFFF;
      font-size: 12px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #7D1416;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-family: 'Raleway', sans-serif;
      font-size: 22px;
      font-weight: 900;
      color: #7D1416;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-sub {
      font-size: 12px;
      color: #AD2F3B;
      font-weight: 600;
      margin-top: 2px;
    }
    .meta-info {
      text-align: right;
      font-size: 10px;
      color: #252A34;
      opacity: 0.8;
    }
    .filter-badge {
      display: inline-block;
      background: #EAEAEA;
      color: #7D1416;
      border: 1px solid #AD2F3B;
      padding: 4px 10px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 11px;
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th {
      background-color: #7D1416;
      color: #FFFFFF;
      text-align: left;
      padding: 8px 10px;
      font-size: 11px;
      font-family: 'Raleway', sans-serif;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #EAEAEA;
      font-size: 11px;
    }
    tr:nth-child(even) {
      background-color: #F8F9FA;
    }
    .glpi-tag {
      font-family: monospace;
      font-weight: bold;
      color: #AD2F3B;
    }
    .time-tag {
      font-weight: bold;
      color: #252A34;
    }
    .summary-box {
      margin-top: 18px;
      padding: 10px 14px;
      background: #EAEAEA;
      border-left: 4px solid #7D1416;
      border-radius: 6px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 600;
      color: #252A34;
    }
    .footer {
      margin-top: 24px;
      text-align: center;
      font-size: 9px;
      color: #252A34;
      opacity: 0.6;
      border-top: 1px solid #EAEAEA;
      padding-top: 8px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">BELLINATI PEREZ</h1>
      <div class="brand-sub">Sistema de Gestão & Agendamento de Salas de Reunião</div>
    </div>
    <div class="meta-info">
      <div><strong>Emissão:</strong> ${dateNow}</div>
      <div><strong>Total de Registros:</strong> ${sorted.length}</div>
    </div>
  </div>

  ${filtersApplied ? `<div class="filter-badge">Filtros Ativos: ${filtersApplied}</div>` : ''}

  <table>
    <thead>
      <tr>
        <th style="width: 10%;">Data</th>
        <th style="width: 12%;">Horário</th>
        <th style="width: 22%;">Sala / Espaço</th>
        <th style="width: 20%;">Solicitante</th>
        <th style="width: 16%;">Setor / Depto</th>
        <th style="width: 10%;">GLPI</th>
        <th style="width: 10%;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${sorted
        .map((r) => {
          const conflictInfo = getConflictPriorityInfo(r, reservations);
          let statusBadge = '<span style="display:inline-block; padding:2px 6px; background:#EAEAEA; color:#7D1416; font-weight:700; border-radius:4px; font-size:10px;">Confirmada</span>';
          let rowBg = '';

          if (conflictInfo.hasConflict) {
            if (conflictInfo.isPriority) {
              statusBadge = '<span style="display:inline-block; padding:2px 6px; background:#D1FAE5; color:#065F46; font-weight:800; border-radius:4px; font-size:10px; border:1px solid #10B981;">⭐ Prioridade GLPI</span>';
              rowBg = 'background-color: #F0FDF4;';
            } else {
              statusBadge = `<span style="display:inline-block; padding:2px 6px; background:#FEF3C7; color:#92400E; font-weight:700; border-radius:4px; font-size:10px; border:1px solid #F59E0B;">⚠️ Conflito (#${conflictInfo.priorityReservation?.glpi})</span>`;
              rowBg = 'background-color: #FFFBEB;';
            }
          }

          return `
        <tr style="${rowBg}">
          <td><strong>${formatDateBR(r.dia)}</strong></td>
          <td class="time-tag">${r.horaInicial} - ${r.horaFinal}</td>
          <td><strong style="color: #7D1416;">${r.sala}</strong></td>
          <td>${r.solicitante}</td>
          <td>${r.setor}</td>
          <td class="glpi-tag">#${r.glpi}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
        })
        .join('')}
    </tbody>
  </table>

  <div class="summary-box">
    <div><strong>Total de Agendamentos:</strong> ${sorted.length} reuniões</div>
    <div><strong>Relatório Gerado por:</strong> Bellinati Perez — Facilities & Tecnologia</div>
  </div>

  <div class="footer">
    Documento gerado automaticamente pelo Sistema de Agendamento Bellinati Perez • Confidencial e de uso interno
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

// Aliases for compatibility
export const exportReservationsPDF = exportReservationsToPDF;
