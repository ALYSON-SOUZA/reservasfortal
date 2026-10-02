import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Reservation, Sala, DbSala, Setor, DbSetor } from '../types';

const supabaseUrl: string =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://tsumftsfuuvicmpnexrc.supabase.co';

const supabaseAnonKey: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_XlsvOTwwX4BN1oafoh2LnA_t1cDZiTy';

// Verifica se as variáveis do Supabase estão configuradas com valores válidos
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key') &&
  supabaseUrl.startsWith('http')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export interface DbReservation {
  id: string;
  dia: string;
  sala: string;
  hora_inicial: string;
  hora_final: string;
  solicitante: string;
  setor: string;
  glpi: string;
  observacoes: string | null;
  created_at?: string;
  criado_por?: string | null;
  modificado_por?: string | null;
  modificado_em?: string | null;
}

export const toAppReservation = (db: DbReservation): Reservation => ({
  id: db.id,
  dia: db.dia,
  sala: db.sala,
  horaInicial: db.hora_inicial,
  horaFinal: db.hora_final,
  solicitante: db.solicitante,
  setor: db.setor,
  glpi: db.glpi,
  observacoes: db.observacoes || '',
  criadoEm: db.created_at || new Date().toISOString(),
  criadoPor: db.criado_por || undefined,
  modificadoPor: db.modificado_por || undefined,
  modificadoEm: db.modificado_em || undefined,
});

export const toDbReservation = (
  app: Omit<Reservation, 'id' | 'criadoEm'> & { id?: string }
): Partial<DbReservation> => ({
  ...(app.id ? { id: app.id } : {}),
  dia: app.dia,
  sala: app.sala,
  hora_inicial: app.horaInicial,
  hora_final: app.horaFinal,
  solicitante: app.solicitante,
  setor: app.setor,
  glpi: app.glpi,
  observacoes: app.observacoes || null,
  ...(app.criadoPor ? { criado_por: app.criadoPor } : {}),
  ...(app.modificadoPor ? { modificado_por: app.modificadoPor } : {}),
  ...(app.modificadoEm ? { modificado_em: app.modificadoEm } : {}),
});

export const toAppSala = (db: DbSala): Sala => ({
  id: db.id,
  nome: db.nome,
  filial: db.filial,
  capacidade: db.capacidade ?? null,
  recursos: db.recursos || [],
  ativa: db.ativa ?? true,
  criadoEm: db.criado_em || new Date().toISOString(),
  atualizadoEm: db.atualizado_em,
});

export const toDbSala = (
  app: Omit<Sala, 'id' | 'criadoEm' | 'atualizadoEm'> & { id?: string }
): Partial<DbSala> => ({
  ...(app.id ? { id: app.id } : {}),
  nome: app.nome,
  filial: app.filial,
  capacidade: app.capacidade ?? null,
  recursos: app.recursos || [],
  ativa: app.ativa ?? true,
});

export const toAppSetor = (db: DbSetor): Setor => ({
  id: db.id,
  nome: db.nome,
  descricao: db.descricao || '',
  ativo: db.ativo ?? true,
  criadoEm: db.created_at || new Date().toISOString(),
});

export const toDbSetor = (
  app: Omit<Setor, 'id' | 'criadoEm'> & { id?: string }
): Partial<DbSetor> => ({
  ...(app.id ? { id: app.id } : {}),
  nome: app.nome,
  descricao: app.descricao || null,
  ativo: app.ativo ?? true,
});

