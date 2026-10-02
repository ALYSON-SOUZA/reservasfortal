import { Reservation, ReservationStatus } from '../types';

/**
 * Checks if a reservation has already finished based on its date and end time.
 */
export function isReservationExpired(dia: string, horaFinal: string, referenceDate: Date = new Date()): boolean {
  if (!dia || !horaFinal) return false;
  
  const [year, month, day] = dia.split('-').map(Number);
  const [hours, minutes] = horaFinal.split(':').map(Number);
  
  const endDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return referenceDate.getTime() > endDateTime.getTime();
}

/**
 * Determines the current status of a reservation
 */
export function getReservationStatus(dia: string, horaInicial: string, horaFinal: string, referenceDate: Date = new Date()): ReservationStatus {
  const [year, month, day] = dia.split('-').map(Number);
  const [startH, startM] = horaInicial.split(':').map(Number);
  const [endH, endM] = horaFinal.split(':').map(Number);
  
  const startDateTime = new Date(year, month - 1, day, startH, startM, 0, 0);
  const endDateTime = new Date(year, month - 1, day, endH, endM, 0, 0);
  const nowTime = referenceDate.getTime();
  
  if (nowTime > endDateTime.getTime()) {
    return 'encerrada';
  }
  
  if (nowTime >= startDateTime.getTime() && nowTime <= endDateTime.getTime()) {
    return 'em_andamento';
  }
  
  // Check if it's today
  const isToday = 
    referenceDate.getFullYear() === year &&
    referenceDate.getMonth() === (month - 1) &&
    referenceDate.getDate() === day;
    
  if (isToday) {
    return 'agendada_hoje';
  }
  
  return 'futura';
}

/**
 * Formats YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Gets today in YYYY-MM-DD format (local time)
 */
export function getTodayString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check room conflict
 */
export function hasTimeConflict(
  reservations: Reservation[],
  newReservation: { id?: string; dia: string; sala: string; horaInicial: string; horaFinal: string }
): { hasConflict: boolean; conflictingWith?: Reservation } {
  const conflicts = getConflictingReservations(newReservation, reservations);
  if (conflicts.length > 0) {
    return { hasConflict: true, conflictingWith: conflicts[0] };
  }
  return { hasConflict: false };
}

/**
 * Returns all reservations that have time overlap with a given reservation
 */
export function getConflictingReservations(
  target: { id?: string; dia: string; sala: string; horaInicial: string; horaFinal: string },
  allReservations: Reservation[]
): Reservation[] {
  if (!target.dia || !target.sala || !target.horaInicial || !target.horaFinal) return [];

  const toMinutes = (timeStr: string) => {
    const parts = (timeStr || '').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  };

  const targetStart = toMinutes(target.horaInicial);
  const targetEnd = toMinutes(target.horaFinal);
  const targetSala = (target.sala || '').trim().toLowerCase();

  return allReservations.filter((res) => {
    if (target.id && res.id === target.id) return false;
    if (res.dia !== target.dia) return false;
    if ((res.sala || '').trim().toLowerCase() !== targetSala) return false;

    const resStart = toMinutes(res.horaInicial);
    const resEnd = toMinutes(res.horaFinal);

    return targetStart < resEnd && resStart < targetEnd;
  });
}

/**
 * Formats an ISO string or Date to DD/MM/YYYY às HH:mm
 */
export function formatDateTimeBR(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return '';
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    const datePart = d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} às ${timePart}`;
  } catch {
    return isoOrDateStr;
  }
}

/**
 * Returns a short audit timestamp: DD/MM HH:mm
 */
export function formatShortAuditDate(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return '';
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    const datePart = d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
    const timePart = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} ${timePart}`;
  } catch {
    return isoOrDateStr;
  }
}

