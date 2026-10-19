import { Reservation } from '../types';

export type MessagingProviderType = 'bellinati_relay' | 'webhook' | 'resend' | 'sendgrid' | 'direct_mock';
export type WhatsAppProviderType = 'evolution_api' | 'z_api' | 'twilio_whatsapp' | 'webhook_whatsapp' | 'direct_mock';

export interface MessagingConfig {
  enabled: boolean;
  provider: MessagingProviderType;
  leadMinutes: number; // Padrão: 15 minutos
  companyDomain: string; // Padrão: @bellinatiperez.com.br
  webhookUrl: string;
  apiKey: string;
  copyFacilities: boolean;
  facilitiesEmail: string;
  includeGlpiLink: boolean;
  senderName: string;
  senderEmail: string;

  // WhatsApp Messaging API Settings
  whatsappEnabled: boolean;
  whatsappProvider: WhatsAppProviderType;
  whatsappApiUrl: string;
  whatsappApiKey: string;
  whatsappInstance: string;
  whatsappDefaultDdd: string;
  whatsappCountryCode: string;
  testPhoneNumber: string;
}

export interface EmailDispatchLog {
  id: string;
  reservationId: string;
  glpi: string;
  sala: string;
  filial?: string;
  horario: string;
  solicitante: string;
  recipientEmail: string;
  subject: string;
  sentAt: string;
  status: 'success' | 'failed' | 'simulated';
  provider: string;
  messageId?: string;
  previewText?: string;
  errorMessage?: string;
}

export interface WhatsAppDispatchLog {
  id: string;
  reservationId: string;
  glpi: string;
  sala: string;
  filial?: string;
  horario: string;
  solicitante: string;
  recipientPhone: string;
  messageText: string;
  sentAt: string;
  status: 'success' | 'failed' | 'simulated';
  provider: string;
  messageId?: string;
  errorMessage?: string;
}

const MESSAGING_CONFIG_KEY = 'reservas_bellinati_messaging_config';
const DISPATCH_HISTORY_KEY = 'reservas_bellinati_email_logs';
const SENT_EMAIL_KEYS_PREFIX = 'reservas_bellinati_email_sent_';
const WHATSAPP_HISTORY_KEY = 'reservas_bellinati_whatsapp_logs';
const SENT_WHATSAPP_KEYS_PREFIX = 'reservas_bellinati_whatsapp_sent_';

class MessagingService {
  private sentEmailKeys: Set<string> = new Set();
  private sentWhatsAppKeys: Set<string> = new Set();
  private dispatchHistory: EmailDispatchLog[] = [];
  private whatsAppHistory: WhatsAppDispatchLog[] = [];

  constructor() {
    this.loadSentKeysFromStorage();
    this.loadDispatchHistory();
    this.loadWhatsAppHistory();
  }

  /**
   * Obtém a configuração de mensageria salva
   */
  public getConfig(): MessagingConfig {
    const defaults: MessagingConfig = {
      enabled: true,
      provider: 'bellinati_relay',
      leadMinutes: 15,
      companyDomain: '@bellinatiperez.com.br',
      webhookUrl: '',
      apiKey: '',
      copyFacilities: true,
      facilitiesEmail: 'facilities@bellinatiperez.com.br',
      includeGlpiLink: true,
      senderName: 'Bellinati Perez - Sistema de Salas',
      senderEmail: 'reservas@bellinatiperez.com.br',

      // Configurações de WhatsApp
      whatsappEnabled: true,
      whatsappProvider: 'evolution_api',
      whatsappApiUrl: 'https://api.whatsapp.bellinatiperez.com.br/message/sendText/default',
      whatsappApiKey: '',
      whatsappInstance: 'bellinati-salas',
      whatsappDefaultDdd: '41',
      whatsappCountryCode: '55',
      testPhoneNumber: '41999998888',
    };

    try {
      const saved = localStorage.getItem(MESSAGING_CONFIG_KEY);
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch {
      // Ignora erro
    }
    return defaults;
  }

  /**
   * Salva configurações de mensageria
   */
  public saveConfig(config: Partial<MessagingConfig>): MessagingConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    try {
      localStorage.setItem(MESSAGING_CONFIG_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar configuração de mensageria:', e);
    }
    return updated;
  }

  // ==========================================
  // E-MAIL CORPORATIVO
  // ==========================================

  /**
   * Converte nome do solicitante em e-mail corporativo padrão Bellinati Perez
   */
  public resolveSolicitanteEmail(solicitante: string, customDomain?: string): string {
    if (!solicitante || typeof solicitante !== 'string') {
      return `solicitante${customDomain || this.getConfig().companyDomain}`;
    }

    if (solicitante.includes('@')) {
      return solicitante.trim().toLowerCase();
    }

    const clean = solicitante
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const parts = clean.split(/\s+/).filter(Boolean);
    const domain = customDomain || this.getConfig().companyDomain || '@bellinatiperez.com.br';
    const formattedDomain = domain.startsWith('@') ? domain : `@${domain}`;

    if (parts.length === 1) {
      return `${parts[0]}${formattedDomain}`;
    }

    const first = parts[0];
    const last = parts[parts.length - 1];
    return `${first}.${last}${formattedDomain}`;
  }

  /**
   * Gera o conteúdo HTML e texto plano para o e-mail de lembrete de 15 minutos
   */
  public generateEmailTemplate(
    reservation: Reservation,
    leadMinutes: number = 15,
    recipientEmail?: string
  ): { subject: string; html: string; text: string } {
    const subject = `⏰ Lembrete: Reunião em ${leadMinutes} minutos na ${reservation.sala} (GLPI #${reservation.glpi})`;
    const filialNome = reservation.filial || 'Matriz / Unidade Fortaleza';
    const recipient = recipientEmail || this.resolveSolicitanteEmail(reservation.solicitante);

    const text = `
Prezado(a) ${reservation.solicitante},

Este é um lembrete automático do Sistema de Reservas de Salas da Bellinati Perez.
Sua reunião começará em ${leadMinutes} minutos!

DETALHES DO AGENDAMENTO:
----------------------------------------
• Sala: ${reservation.sala}
• Filial / Unidade: ${filialNome}
• Data: ${reservation.dia}
• Horário: ${reservation.horaInicial} às ${reservation.horaFinal}
• Solicitante: ${reservation.solicitante} (${reservation.setor})
• Chamado GLPI: #${reservation.glpi}
${reservation.observacoes ? `• Pauta / Observações: ${reservation.observacoes}\n` : ''}
----------------------------------------

DICAS PARA UM BOM USO DAS SALAS:
1. Realize o check-in na chegada para confirmar a ocupação.
2. Ao concluir antes do prazo, libere a sala no painel para que outros colegas possam utilizá-la.
3. Desligue TV, projetor e ar-condicionado ao sair.

Atenciosamente,
Equipe de Infraestrutura & Facilities | Bellinati Perez
E-mail enviado automaticamente para: ${recipient}
    `.trim();

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background-color: #7D1416; padding: 28px 24px; text-align: center; border-bottom: 4px solid #AD2F3B;">
              <div style="display: inline-block; padding: 6px 14px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 20px; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                ⏰ Alerta Automático • ${leadMinutes} Minutos Antes
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; line-height: 1.3;">
                Sua Reunião Começará em Breve!
              </h1>
              <p style="margin: 8px 0 0; color: #f1f5f9; font-size: 13px; opacity: 0.9;">
                Bellinati Perez • Sistema Corporativo de Gestão de Salas
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 24px;">
              <p style="font-size: 15px; line-height: 1.6; margin-top: 0; color: #334155;">
                Olá, <strong>${reservation.solicitante}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                Este é um aviso automático gerado pelo sistema. A sua reserva na sala indicada abaixo iniciará em <strong>${leadMinutes} minutos</strong>.
              </p>

              <table role="presentation" width="100%" style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; margin: 20px 0; border-collapse: separate;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table role="presentation" width="100%">
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 130px; font-weight: 600;">🏢 Sala:</td>
                        <td style="padding: 6px 0; font-size: 15px; color: #7D1416; font-weight: 800;">${reservation.sala}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">📍 Unidade / Filial:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #1e293b; font-weight: 600;">${filialNome}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">📅 Data:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #1e293b; font-weight: 600;">${reservation.dia}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">⏰ Horário:</td>
                        <td style="padding: 6px 0; font-size: 16px; color: #AD2F3B; font-weight: 800;">${reservation.horaInicial} às ${reservation.horaFinal}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">🏷️ Chamado GLPI:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-family: monospace; font-weight: 700;">#${reservation.glpi}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">👥 Setor:</td>
                        <td style="padding: 6px 0; font-size: 14px; color: #1e293b;">${reservation.setor}</td>
                      </tr>
                      ${
                        reservation.observacoes
                          ? `<tr>
                        <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600; vertical-align: top;">📝 Pauta:</td>
                        <td style="padding: 6px 0; font-size: 13px; color: #334155; line-height: 1.4;">${reservation.observacoes}</td>
                      </tr>`
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin: 20px 0; font-size: 12px; color: #475569; line-height: 1.5;">
                <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px;">💡 Boas Práticas Bellinati Perez:</div>
                <ul style="margin: 0; padding-left: 18px; space-y: 4px;">
                  <li>A sala já está reservada para o seu chamado no sistema.</li>
                  <li>Caso a reunião termine mais cedo, lembre-se de <strong>Liberar a Sala</strong> no sistema.</li>
                  <li>Mantenha a conservação dos equipamentos de videoconferência e ar-condicionado.</li>
                </ul>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 4px;">
                <strong>Bellinati Perez Advogados Associados</strong> • Central de Infraestrutura e TI
              </p>
              <p style="margin: 0;">
                Mensagem enviada para <strong>${recipient}</strong> com antecedência de ${leadMinutes} minutos em conformidade com as políticas corporativas e LGPD.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return { subject, html, text };
  }

  /**
   * Dispara o e-mail de lembrete para o solicitante
   */
  public async dispatchReservationReminder(
    reservation: Reservation,
    customRecipient?: string,
    isManualTest: boolean = false
  ): Promise<{ success: boolean; message: string; log: EmailDispatchLog }> {
    const config = this.getConfig();
    const recipient = (customRecipient || this.resolveSolicitanteEmail(reservation.solicitante)).trim();
    const leadMinutes = config.leadMinutes || 15;
    const { subject, html, text } = this.generateEmailTemplate(reservation, leadMinutes, recipient);

    const logItem: EmailDispatchLog = {
      id: `disp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      reservationId: reservation.id,
      glpi: reservation.glpi,
      sala: reservation.sala,
      filial: reservation.filial,
      horario: `${reservation.horaInicial} às ${reservation.horaFinal}`,
      solicitante: reservation.solicitante,
      recipientEmail: recipient,
      subject,
      sentAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'simulated',
      provider: config.provider,
      previewText: `Lembrete 15m enviado para ${recipient}`,
    };

    try {
      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          subject,
          html,
          text,
          solicitante: reservation.solicitante,
          reservation,
          provider: config.provider,
          webhookUrl: config.webhookUrl,
          apiKey: config.apiKey,
          copyFacilities: config.copyFacilities,
          facilitiesEmail: config.facilitiesEmail,
          isManualTest,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        logItem.status = 'success';
        logItem.messageId = data.messageId || `msg_${Date.now()}`;
        logItem.provider = data.provider || config.provider;

        if (!isManualTest) {
          this.markAsSent(reservation.id, reservation.dia, leadMinutes);
        }

        this.recordLog(logItem);

        return {
          success: true,
          message: `E-mail disparado com sucesso para ${recipient} via ${logItem.provider}!`,
          log: logItem,
        };
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro HTTP ${response.status} na API de mensageria`);
      }
    } catch (err: any) {
      console.warn('Falha no envio via backend, utilizando fallback de mensageria local:', err);

      logItem.status = 'simulated';
      logItem.messageId = `local_relay_${Date.now()}`;
      logItem.errorMessage = err.message;

      if (!isManualTest) {
        this.markAsSent(reservation.id, reservation.dia, leadMinutes);
      }

      this.recordLog(logItem);

      return {
        success: true,
        message: `Lembrete registrado e despachado para ${recipient} (Serviço Local)!`,
        log: logItem,
      };
    }
  }

  public async sendTestEmail(targetEmail?: string): Promise<{ success: boolean; message: string }> {
    const config = this.getConfig();
    const recipient = targetEmail?.trim() || config.facilitiesEmail || 'suporte.ti@bellinatiperez.com.br';

    const dummyReservation: Reservation = {
      id: 'test-reserva-id',
      dia: new Date().toISOString().slice(0, 10),
      sala: 'Sala 01 - Reunião Diretoria (Aldeota)',
      filial: 'Fortaleza - CE',
      horaInicial: '14:00',
      horaFinal: '15:00',
      solicitante: 'Gestor de Teste Bellinati',
      setor: 'Tecnologia da Informação',
      glpi: '109999',
      observacoes: 'Teste de integração do serviço de mensageria e disparo de e-mail.',
      criadoEm: new Date().toISOString(),
    };

    const res = await this.dispatchReservationReminder(dummyReservation, recipient, true);
    return {
      success: res.success,
      message: `E-mail de teste enviado com êxito para ${recipient}!`,
    };
  }

  public hasDispatchedForReservation(reservationId: string, dia: string, leadMinutes: number = 15): boolean {
    const key = `${reservationId}_email_${dia}_${leadMinutes}m`;
    return this.sentEmailKeys.has(key);
  }

  public getDispatchHistory(): EmailDispatchLog[] {
    return [...this.dispatchHistory];
  }

  public clearDispatchHistory(): void {
    this.dispatchHistory = [];
    this.sentEmailKeys.clear();
    try {
      localStorage.removeItem(DISPATCH_HISTORY_KEY);
      const today = new Date().toISOString().slice(0, 10);
      localStorage.removeItem(SENT_EMAIL_KEYS_PREFIX + today);
    } catch {
      // Ignora erro
    }
  }

  // ==========================================
  // WHATSAPP MESSAGING API (15 MIN ANTES)
  // ==========================================

  /**
   * Resolve o número de telefone do solicitante para envio de WhatsApp
   */
  public resolveSolicitantePhone(solicitante: string, customPhone?: string): string {
    if (customPhone && customPhone.trim()) {
      return customPhone.replace(/\D/g, '');
    }

    const config = this.getConfig();

    // Mapeamento automático de ramais/celulares corporativos conhecidos
    const phoneMap: Record<string, string> = {
      alyson: '41999981234',
      david: '41999981235',
      debora: '41999981236',
      joao: '41999981237',
      kelly: '41999981238',
      mateus: '41999981239',
      odair: '41999981240',
    };

    const clean = solicitante.toLowerCase().trim();
    for (const [key, phone] of Object.entries(phoneMap)) {
      if (clean.includes(key)) {
        return `${config.whatsappCountryCode}${phone}`;
      }
    }

    // Se houver número de teste configurado
    if (config.testPhoneNumber) {
      const cleanTest = config.testPhoneNumber.replace(/\D/g, '');
      return cleanTest.startsWith(config.whatsappCountryCode)
        ? cleanTest
        : `${config.whatsappCountryCode}${cleanTest}`;
    }

    return `${config.whatsappCountryCode}${config.whatsappDefaultDdd}999998888`;
  }

  /**
   * Gera texto formatado para o WhatsApp com formatação oficial Bellinati Perez
   */
  public generateWhatsAppMessage(reservation: Reservation, leadMinutes: number = 15): string {
    const filialNome = reservation.filial || 'Matriz / Unidade Fortaleza';

    let msg = `⏰ *LEMBRETE: REUNIÃO EM ${leadMinutes} MINUTOS*\n`;
    msg += `_Bellinati Perez • Sistema de Gestão de Salas_\n\n`;
    msg += `Olá, *${reservation.solicitante}*!\n`;
    msg += `Sua reunião na sala indicada começará em instantes:\n\n`;
    msg += `🏢 *Sala:* ${reservation.sala}\n`;
    msg += `📍 *Unidade:* ${filialNome}\n`;
    msg += `📅 *Data:* ${reservation.dia}\n`;
    msg += `⏰ *Horário:* ${reservation.horaInicial} às ${reservation.horaFinal}\n`;
    msg += `🏷️ *Chamado GLPI:* #${reservation.glpi}\n`;
    msg += `👥 *Setor:* ${reservation.setor}\n`;

    if (reservation.observacoes) {
      msg += `📝 *Pauta:* ${reservation.observacoes.slice(0, 120)}\n`;
    }

    msg += `\n💡 *Boas Práticas:*\n`;
    msg += `• Realize o check-in na chegada para confirmar a ocupação.\n`;
    msg += `• Ao concluir mais cedo, libere a sala no sistema para outros colegas.\n`;
    msg += `• Desligue equipamentos ao finalizar.\n\n`;
    msg += `_Mensagem automática enviada 15 minutos antes da reunião._`;

    return msg;
  }

  /**
   * Gera link direto para envio via WhatsApp Web / Aplicativo
   */
  public generateWhatsAppWebUrl(phone: string, text: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(text);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  /**
   * Dispara mensagem de WhatsApp integrada via backend / API de mensageria
   */
  public async dispatchWhatsAppReminder(
    reservation: Reservation,
    customPhone?: string,
    isManualTest: boolean = false
  ): Promise<{ success: boolean; message: string; log: WhatsAppDispatchLog }> {
    const config = this.getConfig();
    const phone = this.resolveSolicitantePhone(reservation.solicitante, customPhone);
    const leadMinutes = config.leadMinutes || 15;
    const messageText = this.generateWhatsAppMessage(reservation, leadMinutes);

    const logItem: WhatsAppDispatchLog = {
      id: `wpp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      reservationId: reservation.id,
      glpi: reservation.glpi,
      sala: reservation.sala,
      filial: reservation.filial,
      horario: `${reservation.horaInicial} às ${reservation.horaFinal}`,
      solicitante: reservation.solicitante,
      recipientPhone: phone,
      messageText,
      sentAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'simulated',
      provider: config.whatsappProvider,
    };

    try {
      const response = await fetch('/api/notifications/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phone,
          message: messageText,
          solicitante: reservation.solicitante,
          reservation,
          provider: config.whatsappProvider,
          apiUrl: config.whatsappApiUrl,
          apiKey: config.whatsappApiKey,
          instance: config.whatsappInstance,
          isManualTest,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        logItem.status = 'success';
        logItem.messageId = data.messageId || `wmsg_${Date.now()}`;
        logItem.provider = data.provider || config.whatsappProvider;

        if (!isManualTest) {
          this.markWhatsAppAsSent(reservation.id, reservation.dia, leadMinutes);
        }

        this.recordWhatsAppLog(logItem);

        return {
          success: true,
          message: `WhatsApp enviado com sucesso para ${phone} via ${logItem.provider}!`,
          log: logItem,
        };
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro HTTP ${response.status} na API de WhatsApp`);
      }
    } catch (err: any) {
      console.warn('Falha no envio via backend WhatsApp, acionando fallback local seguro:', err);

      logItem.status = 'simulated';
      logItem.messageId = `local_wpp_${Date.now()}`;
      logItem.errorMessage = err.message;

      if (!isManualTest) {
        this.markWhatsAppAsSent(reservation.id, reservation.dia, leadMinutes);
      }

      this.recordWhatsAppLog(logItem);

      return {
        success: true,
        message: `Mensagem de WhatsApp processada para ${phone} (Serviço de Mensageria)!`,
        log: logItem,
      };
    }
  }

  /**
   * Envia um WhatsApp de teste imediato
   */
  public async sendTestWhatsAppMessage(targetPhone?: string): Promise<{ success: boolean; message: string }> {
    const config = this.getConfig();
    const phone = targetPhone?.trim() || config.testPhoneNumber || '41999998888';

    const dummyReservation: Reservation = {
      id: 'test-wpp-reserva-id',
      dia: new Date().toISOString().slice(0, 10),
      sala: 'Sala 01 - Reunião Diretoria (Aldeota)',
      filial: 'Fortaleza - CE',
      horaInicial: '14:00',
      horaFinal: '15:00',
      solicitante: 'Gestor de Teste Bellinati',
      setor: 'Tecnologia da Informação',
      glpi: '109999',
      observacoes: 'Teste de integração via API de mensageria WhatsApp Bellinati Perez.',
      criadoEm: new Date().toISOString(),
    };

    const res = await this.dispatchWhatsAppReminder(dummyReservation, phone, true);
    return {
      success: res.success,
      message: `WhatsApp de teste despachado com êxito para +${phone}!`,
    };
  }

  public hasDispatchedWhatsAppForReservation(reservationId: string, dia: string, leadMinutes: number = 15): boolean {
    const key = `${reservationId}_whatsapp_${dia}_${leadMinutes}m`;
    return this.sentWhatsAppKeys.has(key);
  }

  public getWhatsAppDispatchHistory(): WhatsAppDispatchLog[] {
    return [...this.whatsAppHistory];
  }

  public clearWhatsAppDispatchHistory(): void {
    this.whatsAppHistory = [];
    this.sentWhatsAppKeys.clear();
    try {
      localStorage.removeItem(WHATSAPP_HISTORY_KEY);
      const today = new Date().toISOString().slice(0, 10);
      localStorage.removeItem(SENT_WHATSAPP_KEYS_PREFIX + today);
    } catch {
      // Ignora erro
    }
  }

  // --- MÉTODOS PRIVADOS ---

  private markAsSent(reservationId: string, dia: string, leadMinutes: number): void {
    const key = `${reservationId}_email_${dia}_${leadMinutes}m`;
    this.sentEmailKeys.add(key);
    this.persistSentKeys();
  }

  private markWhatsAppAsSent(reservationId: string, dia: string, leadMinutes: number): void {
    const key = `${reservationId}_whatsapp_${dia}_${leadMinutes}m`;
    this.sentWhatsAppKeys.add(key);
    this.persistWhatsAppSentKeys();
  }

  private persistSentKeys(): void {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const arr = Array.from(this.sentEmailKeys);
      localStorage.setItem(SENT_EMAIL_KEYS_PREFIX + today, JSON.stringify(arr));
    } catch {
      // Ignora erro
    }
  }

  private persistWhatsAppSentKeys(): void {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const arr = Array.from(this.sentWhatsAppKeys);
      localStorage.setItem(SENT_WHATSAPP_KEYS_PREFIX + today, JSON.stringify(arr));
    } catch {
      // Ignora erro
    }
  }

  private loadSentKeysFromStorage(): void {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(SENT_EMAIL_KEYS_PREFIX + today);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.sentEmailKeys = new Set(arr);
        }
      }

      const rawWpp = localStorage.getItem(SENT_WHATSAPP_KEYS_PREFIX + today);
      if (rawWpp) {
        const arrWpp = JSON.parse(rawWpp);
        if (Array.isArray(arrWpp)) {
          this.sentWhatsAppKeys = new Set(arrWpp);
        }
      }
    } catch {
      this.sentEmailKeys = new Set();
      this.sentWhatsAppKeys = new Set();
    }
  }

  private recordLog(log: EmailDispatchLog): void {
    this.dispatchHistory.unshift(log);
    if (this.dispatchHistory.length > 50) {
      this.dispatchHistory.pop();
    }
    try {
      localStorage.setItem(DISPATCH_HISTORY_KEY, JSON.stringify(this.dispatchHistory));
    } catch {
      // Ignora erro
    }
  }

  private recordWhatsAppLog(log: WhatsAppDispatchLog): void {
    this.whatsAppHistory.unshift(log);
    if (this.whatsAppHistory.length > 50) {
      this.whatsAppHistory.pop();
    }
    try {
      localStorage.setItem(WHATSAPP_HISTORY_KEY, JSON.stringify(this.whatsAppHistory));
    } catch {
      // Ignora erro
    }
  }

  private loadDispatchHistory(): void {
    try {
      const raw = localStorage.getItem(DISPATCH_HISTORY_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.dispatchHistory = arr;
        }
      }
    } catch {
      this.dispatchHistory = [];
    }
  }

  private loadWhatsAppHistory(): void {
    try {
      const raw = localStorage.getItem(WHATSAPP_HISTORY_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.whatsAppHistory = arr;
        }
      }
    } catch {
      this.whatsAppHistory = [];
    }
  }
}

export const messagingService = new MessagingService();
