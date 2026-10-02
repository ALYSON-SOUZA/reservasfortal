import { Reservation } from '../types';

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  leadMinutes: number; // Padrão: 15 minutos
  notifyAll: boolean;  // Se false, notifica todas as reuniões ou apenas do usuário
}

export interface ScheduledAlertItem {
  id: string;
  reservation: Reservation;
  alertTime: Date;
  startTime: Date;
  endTime: Date;
  alertTimeFormatted: string;
  startTimeFormatted: string;
  minutesUntilAlert: number;
  minutesUntilStart: number;
  status: 'pending' | 'triggered' | 'in_progress' | 'finished';
}

const SETTINGS_KEY = 'reservas_bellinati_notif_settings';
const SENT_KEYS_PREFIX = 'reservas_bellinati_notif_sent_';

class NotificationService {
  private audioContext: AudioContext | null = null;
  private sentNotificationKeys: Set<string> = new Set();
  private recentHistory: Array<{
    id: string;
    glpi: string;
    sala: string;
    solicitante: string;
    horario: string;
    disparadoEm: string;
  }> = [];

  constructor() {
    this.loadSentKeysFromStorage();
  }

  /**
   * Verifica se o navegador suporta a API de Notificações nativas
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Retorna o status atual de permissão do navegador
   */
  public getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Solicita permissão do navegador para exibir notificações
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const settings = this.getSettings();
        settings.enabled = true;
        this.saveSettings(settings);
      }
      return permission;
    } catch (err) {
      console.warn('Erro ao solicitar permissão de notificação:', err);
      return Notification.permission;
    }
  }

  /**
   * Obtém as configurações salvas pelo usuário
   */
  public getSettings(): NotificationSettings {
    const defaults: NotificationSettings = {
      enabled: true,
      sound: true,
      leadMinutes: 15,
      notifyAll: true,
    };

    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch {
      // Ignora erro de JSON
    }
    return defaults;
  }

  /**
   * Salva configurações atualizadas no localStorage
   */
  public saveSettings(settings: Partial<NotificationSettings>): NotificationSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Não foi possível salvar configurações de notificação no localStorage:', e);
    }
    return updated;
  }

  /**
   * Toca um chime sintetizado elegante usando a Web Audio API (sem dependência de arquivos de áudio externos)
   */
  public playChimeSound(): void {
    const settings = this.getSettings();
    if (!settings.sound) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // 1ª nota: Dó 5 (523.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5 (Ré)
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.36);

      // 2ª nota mais alta: Lá 5 (880 Hz) para efeito harmônico cristalino
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12); // A5 (Lá)
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.3, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.62);
    } catch (err) {
      console.warn('Erro ao tocar áudio de notificação:', err);
    }
  }

  /**
   * Dispara uma notificação nativa no navegador se permitido
   */
  public sendBrowserNotification(
    title: string,
    options: {
      body: string;
      tag?: string;
      icon?: string;
      data?: any;
    },
    onClick?: () => void
  ): Notification | null {
    if (this.getSettings().sound) {
      this.playChimeSound();
    }

    if (!this.isSupported() || Notification.permission !== 'granted') {
      return null;
    }

    try {
      const notification = new Notification(title, {
        body: options.body,
        tag: options.tag || 'bellinati-reserva',
        icon: options.icon || '/favicon.ico',
        requireInteraction: true,
      });

      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (onClick) onClick();
        notification.close();
      };

      return notification;
    } catch (err) {
      console.warn('Falha ao instanciar Notification:', err);
      return null;
    }
  }

  /**
   * Dispara notificação de teste para o usuário validar imediatamente no sistema operacional
   */
  public sendTestNotification(onClick?: () => void): boolean {
    const isGranted = this.isSupported() && Notification.permission === 'granted';
    
    // Toca o som mesmo se a notificação nativa estiver desabilitada
    this.playChimeSound();

    if (isGranted) {
      this.sendBrowserNotification(
        '🔔 Teste de Notificação: Reserva de Salas',
        {
          body: 'Seu navegador está configurado com sucesso! Você receberá avisos automáticos 15 minutos antes de cada reserva.',
          tag: 'test-notification-' + Date.now(),
        },
        onClick
      );
      return true;
    }
    return false;
  }

  /**
   * Gera a lista de agendamentos de alertas para o dia de hoje
   */
  public getTodayAlertSchedule(
    reservations: Reservation[],
    leadMinutes: number = 15,
    referenceDate: Date = new Date()
  ): ScheduledAlertItem[] {
    const todayStr = this.formatDateIso(referenceDate);

    return reservations
      .filter((res) => res.dia === todayStr)
      .map((res) => {
        const start = this.parseDateTime(res.dia, res.horaInicial);
        const end = this.parseDateTime(res.dia, res.horaFinal);
        const alertTime = new Date(start.getTime() - leadMinutes * 60 * 1000);

        const nowMs = referenceDate.getTime();
        const minutesUntilAlert = Math.round((alertTime.getTime() - nowMs) / 60000);
        const minutesUntilStart = Math.round((start.getTime() - nowMs) / 60000);

        const uniqueKey = this.generateNotificationKey(res, leadMinutes);
        const alreadyTriggered = this.sentNotificationKeys.has(uniqueKey);

        let status: ScheduledAlertItem['status'] = 'pending';
        if (nowMs >= end.getTime()) {
          status = 'finished';
        } else if (nowMs >= start.getTime()) {
          status = 'in_progress';
        } else if (alreadyTriggered || minutesUntilAlert <= 0) {
          status = 'triggered';
        } else {
          status = 'pending';
        }

        return {
          id: res.id,
          reservation: res,
          alertTime,
          startTime: start,
          endTime: end,
          alertTimeFormatted: alertTime.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          startTimeFormatted: res.horaInicial,
          minutesUntilAlert,
          minutesUntilStart,
          status,
        };
      })
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Motor de verificação periódica: varre as reservas de hoje e dispara os avisos de 15 minutos
   */
  public checkAndNotifyUpcomingReservations(
    reservations: Reservation[],
    referenceDate: Date = new Date(),
    onTriggerNotification?: (res: Reservation) => void
  ): Array<{ reservation: Reservation; minutesUntilStart: number; isNative: boolean }> {
    const settings = this.getSettings();
    if (!settings.enabled) return [];

    const leadMinutes = settings.leadMinutes || 15;
    const todayStr = this.formatDateIso(referenceDate);
    const triggeredList: Array<{ reservation: Reservation; minutesUntilStart: number; isNative: boolean }> = [];

    // Reservas de hoje
    const todayReservations = reservations.filter((res) => res.dia === todayStr);

    for (const res of todayReservations) {
      if (!res.horaInicial) continue;

      const startTime = this.parseDateTime(res.dia, res.horaInicial);
      const diffMs = startTime.getTime() - referenceDate.getTime();
      const minutesUntilStart = diffMs / (60 * 1000);

      // Critério de disparo:
      // O evento ainda não começou (minutesUntilStart > 0)
      // E faltam até 15 minutos (com pequena margem de 30 segundos, ou seja, <= 15.5 min)
      // E a reunião não está atrasada/passada
      if (minutesUntilStart > 0 && minutesUntilStart <= (leadMinutes + 0.5)) {
        const uniqueKey = this.generateNotificationKey(res, leadMinutes);

        if (!this.sentNotificationKeys.has(uniqueKey)) {
          // Marca como disparada para não repetir
          this.markAsSent(uniqueKey);

          // Registra no histórico da sessão
          this.recentHistory.unshift({
            id: res.id,
            glpi: res.glpi,
            sala: res.sala,
            solicitante: res.solicitante,
            horario: `${res.horaInicial} às ${res.horaFinal}`,
            disparadoEm: referenceDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          });
          if (this.recentHistory.length > 20) {
            this.recentHistory.pop();
          }

          // Dispara notificação nativa do navegador
          const title = `⏰ Reunião em 15 minutos: ${res.sala}`;
          const bodyLines = [
            `Horário: ${res.horaInicial} às ${res.horaFinal}`,
            `Solicitante: ${res.solicitante} (${res.setor})`,
            `Chamado GLPI #${res.glpi}`,
          ];
          if (res.observacoes) {
            bodyLines.push(`Pauta: ${res.observacoes.slice(0, 80)}${res.observacoes.length > 80 ? '...' : ''}`);
          }

          const notification = this.sendBrowserNotification(
            title,
            {
              body: bodyLines.join('\n'),
              tag: `reserva-15m-${res.id}`,
            },
            () => {
              if (onTriggerNotification) {
                onTriggerNotification(res);
              }
            }
          );

          triggeredList.push({
            reservation: res,
            minutesUntilStart: Math.round(minutesUntilStart),
            isNative: Boolean(notification),
          });

          // Notifica callback do app (para abrir detalhe ou exibir toast integrado)
          if (onTriggerNotification) {
            onTriggerNotification(res);
          }
        }
      }
    }

    return triggeredList;
  }

  /**
   * Retorna o histórico de notificações disparadas nesta sessão
   */
  public getRecentHistory() {
    return [...this.recentHistory];
  }

  /**
   * Limpa as notificações salvas para permitir novos testes
   */
  public resetSentHistory(): void {
    this.sentNotificationKeys.clear();
    this.recentHistory = [];
    try {
      const today = this.formatDateIso(new Date());
      localStorage.removeItem(SENT_KEYS_PREFIX + today);
    } catch {
      // Ignora erro
    }
  }

  // --- MÉTODOS AUXILIARES ---

  private generateNotificationKey(res: Reservation, leadMinutes: number): string {
    return `${res.id}_${res.dia}_${res.horaInicial}_${leadMinutes}m`;
  }

  private markAsSent(key: string): void {
    this.sentNotificationKeys.add(key);
    this.persistSentKeys();
  }

  private persistSentKeys(): void {
    try {
      const today = this.formatDateIso(new Date());
      const arr = Array.from(this.sentNotificationKeys);
      localStorage.setItem(SENT_KEYS_PREFIX + today, JSON.stringify(arr));
    } catch {
      // Ignora erro
    }
  }

  private loadSentKeysFromStorage(): void {
    try {
      const today = this.formatDateIso(new Date());
      const raw = localStorage.getItem(SENT_KEYS_PREFIX + today);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.sentNotificationKeys = new Set(arr);
        }
      }
    } catch {
      this.sentNotificationKeys = new Set();
    }
  }

  private parseDateTime(dia: string, hora: string): Date {
    const [year, month, day] = dia.split('-').map(Number);
    const [hours, minutes] = hora.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }

  private formatDateIso(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export const notificationService = new NotificationService();
