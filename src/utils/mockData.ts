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
  const today = new Date();
  const todayStr = getTodayString(today);

  // Tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getTodayString(tomorrow);

  // Day after tomorrow
  const nextDay = new Date(today);
  nextDay.setDate(nextDay.getDate() + 2);
  const nextDayStr = getTodayString(nextDay);

  // Yesterday (expired sample)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getTodayString(yesterday);

  return [
    {
      id: 'res-1',
      dia: todayStr,
      sala: 'Sala 215 - Auditório',
      horaInicial: '08:00',
      horaFinal: '23:59',
      solicitante: 'Carlos Eduardo Barreto',
      setor: 'Facilities',
      glpi: '104928',
      observacoes: 'Alinhamento estratégico do comitê executivo regional.',
      criadoEm: new Date().toISOString()
    },
    {
      id: 'res-2',
      dia: todayStr,
      sala: 'Sala 216 - Executivos',
      horaInicial: '09:00',
      horaFinal: '23:30',
      solicitante: 'Mariana Silveira',
      setor: 'Atração de Talentos',
      glpi: '105120',
      observacoes: 'Entrevistas de candidatos e treinamento de liderança.',
      criadoEm: new Date().toISOString()
    },
    {
      id: 'res-3',
      dia: todayStr,
      sala: 'Sala 212 - Contingencia',
      horaInicial: '14:00',
      horaFinal: '22:00',
      solicitante: 'Alyson Souza',
      setor: 'Suporte',
      glpi: '105342',
      observacoes: 'Alinhamento com a equipe remota de infraestrutura em nuvem.',
      criadoEm: new Date().toISOString()
    },
    {
      id: 'res-4',
      dia: tomorrowStr,
      sala: 'Sala 116 - Contingencia',
      horaInicial: '08:30',
      horaFinal: '17:30',
      solicitante: 'Juliana Castro',
      setor: 'Desenvolvimento Organizacional',
      glpi: '105680',
      observacoes: 'Workshop de capacitação e planejamento de campanhas.',
      criadoEm: new Date().toISOString()
    },
    {
      id: 'res-5',
      dia: nextDayStr,
      sala: 'Sala 118 - Contingencia',
      horaInicial: '10:00',
      horaFinal: '12:00',
      solicitante: 'Fernando Menezes',
      setor: 'Controldesk',
      glpi: '106015',
      observacoes: 'Monitoramento de tráfego de chamados e produtividade.',
      criadoEm: new Date().toISOString()
    },
    {
      id: 'res-6',
      dia: yesterdayStr,
      sala: 'Sala 215 - Auditório',
      horaInicial: '09:00',
      horaFinal: '11:00',
      solicitante: 'Patrícia Albuquerque',
      setor: 'BV',
      glpi: '104300',
      observacoes: 'Revisão orçamentária do primeiro semestre.',
      criadoEm: new Date(Date.now() - 86400000).toISOString()
    }
  ];
}
