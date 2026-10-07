import { Reservation } from '../types';
import { getTodayString } from './dateUtils';

export const DEFAULT_SALAS = [
  // Fortaleza/planalto
  'Auditório 2',
  // Curitiba/Toronto
  'Reunião 14',
  'Reunião 13',
  'Reunião 12',
  'Reunião 10',
  'Reunião 8',
  'Reunião 7',
  // Maringá (Matriz)
  'Reunião 11',
  'Reunião 12',
  // Curitiba Park & Business
  'Auditório 9',
  'Reunião 9',
  'Reunião 11',
  'Auditório 12',
  // Curitiba/Marechal
  'Reunião 1',
  'Reunião 4',
  'Reunião 15',
  'Reunião 16',
  'Executiva 19',
  'Reunião 21',
  'Reunião 22',
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
      sala: 'Auditório 2',
      filial: 'Fortaleza/planalto',
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
      sala: 'Auditório 2',
      filial: 'Fortaleza/planalto',
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
