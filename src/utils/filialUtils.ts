import { Reservation, Sala, Filial } from '../types';
import { isReservationExpired, getTodayString } from './dateUtils';

/**
 * Constrói mapa de correspondência de salas para suas respectivas filiais
 */
export function buildRoomFilialMap(rooms: Sala[]): Map<string, string> {
  const map = new Map<string, string>();
  rooms.forEach((r) => {
    if (r.nome && r.filial) {
      map.set(r.nome.toLowerCase().trim(), r.filial.trim());
    }
  });
  return map;
}

/**
 * Resolve a filial de uma reserva com alta precisão
 * Utiliza o campo nativo filial, o mapa de salas cadastradas e heurísticas corporativas Bellinati Perez.
 */
export function resolveReservationFilial(
  res: Reservation,
  roomFilialMap?: Map<string, string>
): string {
  if (res.filial && res.filial.trim()) return res.filial.trim();

  if (roomFilialMap) {
    const fromMap = roomFilialMap.get((res.sala || '').toLowerCase().trim());
    if (fromMap) return fromMap;
  }

  // Heurísticas de identificação por nomenclatura Bellinati Perez
  const sName = (res.sala || '').toLowerCase();
  if (sName.includes('maringá') || sName.includes('maringa') || sName.includes('matriz')) return 'Maringá (Matriz)';
  if (sName.includes('park') || sName.includes('business')) return 'Curitiba Park & Business';
  if (sName.includes('cebp')) return 'Curitiba/CEBP';
  if (sName.includes('marechal')) return 'Curitiba/Marechal';
  if (sName.includes('toronto')) return 'Curitiba/Toronto';
  if (
    sName.includes('fortaleza') ||
    sName.includes('planalto') ||
    sName.includes('215') ||
    sName.includes('216') ||
    sName.includes('212') ||
    sName.includes('116') ||
    sName.includes('118')
  ) {
    return 'Fortaleza/planalto';
  }

  return 'Outras / Geral';
}

/**
 * Verifica se a reserva está em aberto (vigente ou futura)
 */
export function isReservationOpen(res: Reservation, referenceDate: Date = new Date()): boolean {
  return !isReservationExpired(res.dia, res.horaFinal, referenceDate);
}

export type PeriodOption =
  | 'abertas' // Todas em aberto (Padrão sem filtragem)
  | 'hoje'
  | 'semana'
  | 'mes'
  | 'proximos_7'
  | 'proximos_30'
  | 'personalizado'
  | 'todas'; // Histórico completo

/**
 * Retorna as datas de início e fim da semana atual (Segunda a Domingo)
 */
export function getCurrentWeekRange(referenceDate: Date = new Date()): { start: string; end: string } {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 is Sunday
  // Ajusta para segunda-feira como início (1)
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: getTodayString(monday),
    end: getTodayString(sunday),
  };
}

/**
 * Retorna as datas de início e fim do mês atual
 */
export function getCurrentMonthRange(referenceDate: Date = new Date()): { start: string; end: string } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return {
    start: getTodayString(firstDay),
    end: getTodayString(lastDay),
  };
}

/**
 * Retorna intervalo de dias a partir de hoje
 */
export function getFutureRange(days: number, referenceDate: Date = new Date()): { start: string; end: string } {
  const start = getTodayString(referenceDate);
  const target = new Date(referenceDate);
  target.setDate(target.getDate() + days);
  const end = getTodayString(target);
  return { start, end };
}

/**
 * Filtra conjunto de reservas por filial e por período
 * Regra do usuário: "Sem filtragem deve aparecer todas as reservas em aberto."
 */
export function filterReservations(
  reservations: Reservation[],
  options: {
    filial?: string; // '' ou 'TODAS' = todas as filiais
    periodo: PeriodOption;
    dataInicio?: string;
    dataFim?: string;
    roomFilialMap?: Map<string, string>;
    referenceDate?: Date;
  }
): Reservation[] {
  const refDate = options.referenceDate || new Date();
  const todayStr = getTodayString(refDate);

  return reservations.filter((res) => {
    // 1. Filtragem por Filial
    if (options.filial && options.filial.trim() && options.filial !== 'TODAS') {
      const resFilial = resolveReservationFilial(res, options.roomFilialMap);
      if (resFilial.toLowerCase().trim() !== options.filial.toLowerCase().trim()) {
        return false;
      }
    }

    // 2. Se o usuário preencheu Data Inicial ou Data Final explicitamente
    if (options.dataInicio || options.dataFim) {
      if (options.dataInicio && res.dia < options.dataInicio) return false;
      if (options.dataFim && res.dia > options.dataFim) return false;
      return true;
    }

    // 3. Filtragem por Período / Atalho quando datas não foram preenchidas manualmente
    switch (options.periodo) {
      case 'abertas':
        // Regra de ouro: sem filtragem de datas, aparecem todas as reservas em aberto
        return isReservationOpen(res, refDate);

      case 'hoje':
        return res.dia === todayStr;

      case 'semana': {
        const { start, end } = getCurrentWeekRange(refDate);
        return res.dia >= start && res.dia <= end;
      }

      case 'mes': {
        const { start, end } = getCurrentMonthRange(refDate);
        return res.dia >= start && res.dia <= end;
      }

      case 'proximos_7': {
        const { start, end } = getFutureRange(7, refDate);
        return res.dia >= start && res.dia <= end;
      }

      case 'proximos_30': {
        const { start, end } = getFutureRange(30, refDate);
        return res.dia >= start && res.dia <= end;
      }

      case 'personalizado':
        return true;

      case 'todas':
        return true;

      default:
        // Sem filtragem de período -> todas em aberto
        return isReservationOpen(res, refDate);
    }
  });
}
