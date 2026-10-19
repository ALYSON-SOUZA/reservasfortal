import { AuditLogItem } from '../types';

const AUDIT_STORAGE_KEY = 'reservas_bellinati_audit_logs_v1';

class AuditService {
  private logs: AuditLogItem[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs(): void {
    try {
      if (typeof window === 'undefined') return;
      const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (raw) {
        this.logs = JSON.parse(raw);
      } else {
        // Seed initial audit log if empty
        this.logs = [
          {
            id: 'audit-init-1',
            dataHora: new Date(Date.now() - 3600000 * 24).toISOString(),
            acao: 'SISTEMA',
            titulo: 'Inicialização do Sistema de Auditoria',
            detalhes: 'Módulo de rastreabilidade e governança de reservas ativado com sucesso.',
            usuarioNome: 'Sistema Bellinati Perez',
          },
        ];
        this.persist();
      }
    } catch (err) {
      console.warn('Erro ao carregar logs de auditoria:', err);
      this.logs = [];
    }
  }

  private persist(): void {
    try {
      if (typeof window !== 'undefined') {
        // Limit to latest 1000 logs to conserve storage
        const trimmed = this.logs.slice(0, 1000);
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
      }
    } catch (err) {
      console.warn('Erro ao persistir logs de auditoria:', err);
    }
  }

  public getLogs(): AuditLogItem[] {
    return [...this.logs];
  }

  public logAction(entry: Omit<AuditLogItem, 'id' | 'dataHora'>): AuditLogItem {
    const item: AuditLogItem = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dataHora: new Date().toISOString(),
      ...entry,
    };
    this.logs.unshift(item);
    this.persist();
    return item;
  }

  public clearLogs(): void {
    this.logs = [
      {
        id: `audit-${Date.now()}`,
        dataHora: new Date().toISOString(),
        acao: 'SISTEMA',
        titulo: 'Logs Reiniciados',
        detalhes: 'O histórico de auditoria foi limpo por um Usuário Master.',
        usuarioNome: 'Administrador Master',
      },
    ];
    this.persist();
  }

  public exportCsv(): string {
    const header = ['ID', 'Data/Hora', 'Ação', 'Título', 'Detalhes', 'Usuário', 'CPF', 'GLPI', 'Sala'];
    const rows = this.logs.map((log) => [
      `"${log.id}"`,
      `"${new Date(log.dataHora).toLocaleString('pt-BR')}"`,
      `"${log.acao}"`,
      `"${(log.titulo || '').replace(/"/g, '""')}"`,
      `"${(log.detalhes || '').replace(/"/g, '""')}"`,
      `"${log.usuarioNome || ''}"`,
      `"${log.usuarioCpf || ''}"`,
      `"${log.glpi || ''}"`,
      `"${log.sala || ''}"`,
    ]);
    return [header.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}

export const auditService = new AuditService();
