import { Reservation } from '../types';
import { getTodayString } from './dateUtils';

export const DEFAULT_SALAS = [
  'Sala 215 - Auditório',
  'Sala 216 - Executivos',
  'Sala 212 - Contingencia',
  'Sala 116 - Contingencia',
  'Sala 118 - Contingencia',
];

export const DEFAULT_SETORES = [
  'Atração de Talentos',
  'BV',
  'Bv - Bom Pagador',
  'Controldesk',
  'Desenvolvimento Organizacional',
  'Dpto. Pessoal',
  'Facilities',
  'Limpeza e Conservação',
  'Medicina e Saúde do Trabalho',
  'Suporte',
];

export function getInitialReservations(): Reservation[] {
  return [
    {
      id: 'e1ab0e6b-e4ba-438c-8ff6-3a955f9f06d8',
      dia: '2026-10-05',
      sala: 'Sala 215 - Auditório',
      horaInicial: '09:00',
      horaFinal: '14:00',
      solicitante: 'Lais Costa de Sousa',
      setor: 'Atração de Talentos',
      glpi: '1663412',
      observacoes: '',
      criadoPor: 'Alyson',
      criadoEm: '2026-10-02T13:47:28.524Z',
    },
    {
      id: 'bdb24d8d-5745-4802-a253-b3cfc68cd623',
      dia: '2026-10-05',
      sala: 'Sala 215 - Auditório',
      horaInicial: '08:00',
      horaFinal: '13:20',
      solicitante: 'Maria Luiza Soares de Lima',
      setor: 'Facilities',
      glpi: '1665279',
      observacoes: 'Quantidade de pessoas: 6. Necessário café: NÃO. Necessário petit four: NÃO.',
      criadoPor: 'Alyson',
      criadoEm: '2026-10-02T13:47:28.524Z',
    },
  ];
}
