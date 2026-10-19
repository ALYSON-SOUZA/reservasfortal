import { Reservation, Sala } from '../types';
import { isReservationExpired, getTodayString } from './dateUtils';

/**
 * Lista das 6 Filiais Oficiais da Bellinati Perez
 */
export const OFFICIAL_FILIAIS_LIST = [
  'Maringá (Matriz)',
  'Curitiba Park & Business',
  'Curitiba/CEBP',
  'Curitiba/Marechal',
  'Curitiba/Toronto',
  'Fortaleza/planalto',
] as const;

export type PeriodOption =
  | 'abertas'
  | 'hoje'
  | 'semana'
  | 'mes'
  | 'proximos_7'
  | 'proximos_30'
  | 'personalizado';

/**
 * Normaliza qualquer variação de nome de filial para a nomenclatura canônica corporativa da Bellinati Perez.
 * Lida com variações como "Maringá" / "Maringá (Matriz)", "Fortaleza - CE" / "Fortaleza/planalto",
 * "Curitiba Park" / "Curitiba Park & Business", maiúsculas/minúsculas, espaços e acentos.
 */
export function normalizeFilialName(name?: string | null): string {
  if (!name) return '';
  const s = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (s.includes('maringa') || s.includes('matriz')) {
    return 'Maringá (Matriz)';
  }
  if (s.includes('park') || s.includes('business')) {
    return 'Curitiba Park & Business';
  }
  if (s.includes('cebp')) {
    return 'Curitiba/CEBP';
  }
  if (s.includes('marechal')) {
    return 'Curitiba/Marechal';
  }
  if (s.includes('toronto')) {
    return 'Curitiba/Toronto';
  }
  if (s.includes('fortaleza') || s.includes('planalto')) {
    return 'Fortaleza/planalto';
  }

  // Se for uma filial personalizada cadastrada pelo usuário, preserva o nome original trimado
  return name.trim();
}

/**
 * Constrói um mapa em memória de Sala -> Filial normalizada
 */
export function buildRoomFilialMap(rooms: Sala[] = []): Map<string, string> {
  const map = new Map<string, string>();
  rooms.forEach((r) => {
    if (r.nome && r.filial) {
      map.set(r.nome.toLowerCase().trim(), normalizeFilialName(r.filial));
    }
  });
  return map;
}

/**
 * Heurística corporativa de mapeamento Sala -> Filial
 * Mapeia salas padrão do sistema quando a filial não foi explicitamente gravada no registro legado
 */
export function getRoomFilialFallback(salaNome?: string | null): string {
  if (!salaNome) return '';
  const s = salaNome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // 1. Fortaleza/planalto
  if (
    s.includes('auditorio 2') ||
    s.includes('215') ||
    s.includes('216') ||
    s.includes('212') ||
    s.includes('116') ||
    s.includes('118') ||
    s.includes('fortaleza') ||
    s.includes('planalto')
  ) {
    return 'Fortaleza/planalto';
  }

  // 2. Curitiba/Toronto
  if (
    s === 'reuniao 14' ||
    s === 'reuniao 13' ||
    s === 'reuniao 12' ||
    s === 'reuniao 10' ||
    s === 'reuniao 8' ||
    s === 'reuniao 7' ||
    s.includes('toronto')
  ) {
    return 'Curitiba/Toronto';
  }

  // 3. Curitiba Park & Business
  if (
    s === 'auditorio 9' ||
    s === 'reuniao 9' ||
    s === 'auditorio 12' ||
    s.includes('park') ||
    s.includes('business')
  ) {
    return 'Curitiba Park & Business';
  }

  // 4. Curitiba/Marechal
  if (
    s === 'reuniao 1' ||
    s === 'reuniao 4' ||
    s === 'reuniao 15' ||
    s === 'reuniao 16' ||
    s === 'executiva 19' ||
    s === 'reuniao 21' ||
    s === 'reuniao 22' ||
    s.includes('marechal')
  ) {
    return 'Curitiba/Marechal';
  }

  // 5. Curitiba/CEBP
  if (s.includes('cebp')) {
    return 'Curitiba/CEBP';
  }

  // 6. Maringá (Matriz)
  if (s === 'reuniao 11' || s.includes('maringa') || s.includes('matriz')) {
    return 'Maringá (Matriz)';
  }

  return '';
}

/**
 * Identifica a filial de uma reserva com alta precisão através de cadeia de resolução:
 * 1. Campo `filial` na própria reserva (se preenchido e normalizado)
 * 2. Lookup no cadastro dinâmico de Salas (`rooms` ou `Map<string, string>`)
 * 3. Mapeamento heurístico de salas oficiais Bellinati Perez
 * 4. Fallback padrão "Maringá (Matriz)" caso não identificado
 */
export function resolveReservationFilial(
  res: Reservation,
  roomsOrMap?: Sala[] | Map<string, string>
): string {
  // 1. Campo explícito na reserva
  if (res.filial && res.filial.trim()) {
    const normalized = normalizeFilialName(res.filial);
    if (normalized) return normalized;
  }

  const cleanSala = (res.sala || '').toLowerCase().trim();

  // 2. Busca no Mapa ou lista de Salas
  if (roomsOrMap) {
    if (roomsOrMap instanceof Map) {
      const fromMap = roomsOrMap.get(cleanSala);
      if (fromMap) return normalizeFilialName(fromMap);
    } else if (Array.isArray(roomsOrMap) && roomsOrMap.length > 0) {
      const matched = roomsOrMap.find(
        (r) => r.nome && r.nome.toLowerCase().trim() === cleanSala && r.filial && r.filial.trim()
      );
      if (matched && matched.filial) {
        return normalizeFilialName(matched.filial);
      }
    }
  }

  // 3. Heurística baseada no nome da sala
  const fallback = getRoomFilialFallback(res.sala);
  if (fallback) {
    return fallback;
  }

  // 4. Fallback corporativo
  return 'Maringá (Matriz)';
}

/**
 * Valida se uma reserva corresponde ao filtro de filial ativo.
 * Trata comparação insensível a maiúsculas/minúsculas e variações ortográficas.
 */
export function matchesFilialFilter(
  res: Reservation,
  filterFilial: string | undefined | null,
  roomsOrMap?: Sala[] | Map<string, string>
): boolean {
  if (!filterFilial || !filterFilial.trim()) {
    return true; // Sem filtro de filial ativo -> exibe todas
  }

  const targetNormalized = normalizeFilialName(filterFilial);
  const resFilial = resolveReservationFilial(res, roomsOrMap);
  const resNormalized = normalizeFilialName(resFilial);

  return resNormalized.toLowerCase() === targetNormalized.toLowerCase();
}

/**
 * Checa se uma reserva está aberta (não expirada no tempo corrente)
 */
export function isReservationOpen(res: Reservation, now: Date = new Date()): boolean {
  return !isReservationExpired(res.dia, res.horaFinal, now);
}

/**
 * Retorna o intervalo da semana corrente (YYYY-MM-DD)
 */
export function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Domingo
  const distanceToMonday = (dayOfWeek + 6) % 7; // dias desde segunda-feira

  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: getTodayString(monday),
    end: getTodayString(sunday),
  };
}

/**
 * Retorna o intervalo do mês corrente (YYYY-MM-DD)
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    start: getTodayString(firstDay),
    end: getTodayString(lastDay),
  };
}

/**
 * Retorna o intervalo a partir de hoje até N dias futuros (YYYY-MM-DD)
 */
export function getFutureRange(days: number): { start: string; end: string } {
  const now = new Date();
  const future = new Date(now);
  future.setDate(now.getDate() + days);

  return {
    start: getTodayString(now),
    end: getTodayString(future),
  };
}

/**
 * Função centralizada de filtragem utilizada nos relatórios corporativos
 */
export function filterReservations(
  reservations: Reservation[],
  options: {
    filial?: string;
    periodo?: PeriodOption;
    dataInicio?: string;
    dataFim?: string;
    roomFilialMap?: Map<string, string>;
  }
): Reservation[] {
  const now = new Date();
  const today = getTodayString(now);

  return reservations.filter((res) => {
    // 1. Filtro de Filial
    if (options.filial && options.filial.trim()) {
      if (!matchesFilialFilter(res, options.filial, options.roomFilialMap)) {
        return false;
      }
    }

    // 2. Filtro por Período
    if (options.dataInicio && res.dia < options.dataInicio) return false;
    if (options.dataFim && res.dia > options.dataFim) return false;

    if (!options.dataInicio && !options.dataFim) {
      if (options.periodo === 'abertas') {
        if (!isReservationOpen(res, now)) return false;
      } else if (options.periodo === 'hoje') {
        if (res.dia !== today) return false;
      } else if (options.periodo === 'semana') {
        const { start, end } = getCurrentWeekRange();
        if (res.dia < start || res.dia > end) return false;
      } else if (options.periodo === 'mes') {
        const { start, end } = getCurrentMonthRange();
        if (res.dia < start || res.dia > end) return false;
      } else if (options.periodo === 'proximos_7') {
        const { start, end } = getFutureRange(7);
        if (res.dia < start || res.dia > end) return false;
      } else if (options.periodo === 'proximos_30') {
        const { start, end } = getFutureRange(30);
        if (res.dia < start || res.dia > end) return false;
      }
    }

    return true;
  });
}
