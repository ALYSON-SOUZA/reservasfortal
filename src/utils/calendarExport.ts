import { Reservation } from '../types';
import { formatDateBR } from './dateUtils';

/**
 * Utilitário corporativo para integração e exportação para agendas externas (Google Agenda, Outlook, Apple Calendar, .ics)
 * Brandbook: Bellinati Perez
 */

function formatDateTimeForGoogle(dateStr: string, timeStr: string): string {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm
  // We format local ISO without dashes: YYYYMMDDTHHmm00
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '') + '00';
  return `${cleanDate}T${cleanTime}`;
}

export function generateGoogleCalendarUrl(reservation: Reservation): string {
  const title = encodeURIComponent(`Reserva Sala ${reservation.sala} - GLPI #${reservation.glpi} - Bellinati Perez`);
  const start = formatDateTimeForGoogle(reservation.dia, reservation.horaInicial);
  const end = formatDateTimeForGoogle(reservation.dia, reservation.horaFinal);
  const dates = `${start}/${end}`;

  const detailsText = [
    `🏢 RESERVA DE SALA DE REUNIÃO — BELLINATI PEREZ`,
    `--------------------------------------------------`,
    `• Sala: ${reservation.sala} ${reservation.filial ? `(${reservation.filial})` : ''}`,
    `• Chamado GLPI: #${reservation.glpi}`,
    `• Solicitante: ${reservation.solicitante}`,
    `• Setor: ${reservation.setor}`,
    reservation.observacoes ? `• Pauta / Observações: ${reservation.observacoes}` : '',
    reservation.criadoPor ? `• Cadastrado por: ${reservation.criadoPor}` : '',
    `--------------------------------------------------`,
    `Sistema de Gestão de Salas de Reunião Bellinati Perez`,
  ]
    .filter(Boolean)
    .join('\n');

  const details = encodeURIComponent(detailsText);
  const location = encodeURIComponent(`${reservation.sala}, ${reservation.filial || 'Matriz'} - Bellinati Perez`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

export function generateIcsContent(reservation: Reservation): string {
  const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dtStart = formatDateTimeForGoogle(reservation.dia, reservation.horaInicial);
  const dtEnd = formatDateTimeForGoogle(reservation.dia, reservation.horaFinal);
  const summary = `Reserva Sala ${reservation.sala} - GLPI #${reservation.glpi} - Bellinati Perez`;
  const location = `${reservation.sala}, ${reservation.filial || 'Matriz'} - Bellinati Perez`;
  const description = [
    `RESERVA DE SALA — BELLINATI PEREZ\\n`,
    `Sala: ${reservation.sala} (${reservation.filial || 'Matriz'})\\n`,
    `GLPI: #${reservation.glpi}\\n`,
    `Solicitante: ${reservation.solicitante}\\n`,
    `Setor: ${reservation.setor}\\n`,
    reservation.observacoes ? `Pauta: ${reservation.observacoes.replace(/\n/g, '\\n')}\\n` : '',
  ].join('');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bellinati Perez//Sistema Reserva de Salas//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:reserva-${reservation.id || Date.now()}@bellinatiperez.com.br`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcsFile(reservation: Reservation): void {
  const ics = generateIcsContent(reservation);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const sanitizedSala = reservation.sala.replace(/[^a-zA-Z0-9]/g, '_');
  a.href = url;
  a.download = `Reserva_${sanitizedSala}_GLPI_${reservation.glpi}_${reservation.dia}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateShareText(reservation: Reservation): string {
  return [
    `🏢 *RESERVA DE SALA — BELLINATI PEREZ*`,
    `📍 *Sala:* ${reservation.sala} ${reservation.filial ? `(${reservation.filial})` : ''}`,
    `📅 *Data:* ${formatDateBR(reservation.dia)}`,
    `⏰ *Horário:* ${reservation.horaInicial} às ${reservation.horaFinal}`,
    `👤 *Solicitante:* ${reservation.solicitante} (${reservation.setor})`,
    `🎫 *GLPI:* #${reservation.glpi}`,
    reservation.observacoes ? `📝 *Pauta:* ${reservation.observacoes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
