import React, { useState, useEffect } from 'react';
import { Reservation } from '../types';
import {
  notificationService,
  NotificationSettings,
} from '../services/notificationService';
import {
  messagingService,
  MessagingConfig,
  EmailDispatchLog,
  WhatsAppDispatchLog,
  MessagingProviderType,
  WhatsAppProviderType,
} from '../services/messagingService';
import {
  X,
  Bell,
  BellRing,
  BellOff,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Calendar,
  ExternalLink,
  Mail,
  Send,
  Settings,
  Eye,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Inbox,
  Building2,
  FileText,
  MessageSquare,
  Smartphone,
  Copy,
  CheckCheck,
  Share2,
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Reservation[];
  onSelectReservation?: (reservation: Reservation) => void;
  onToast?: (type: 'success' | 'info' | 'warning' | 'error', message: string, title?: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  reservations,
  onSelectReservation,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'messaging' | 'history'>('schedule');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [settings, setSettings] = useState<NotificationSettings>(() => notificationService.getSettings());
  const [messagingConfig, setMessagingConfig] = useState<MessagingConfig>(() => messagingService.getConfig());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isRequesting, setIsRequesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // Estados de E-mail
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [dispatchingEmailResId, setDispatchingEmailResId] = useState<string | null>(null);
  const [previewEmailReservation, setPreviewEmailReservation] = useState<Reservation | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailDispatchLog[]>(() => messagingService.getDispatchHistory());

  // Estados de WhatsApp
  const [testWhatsAppPhone, setTestWhatsAppPhone] = useState(messagingConfig.testPhoneNumber || '');
  const [isSendingTestWhatsApp, setIsSendingTestWhatsApp] = useState(false);
  const [dispatchingWhatsAppResId, setDispatchingWhatsAppResId] = useState<string | null>(null);
  const [previewWhatsAppReservation, setPreviewWhatsAppReservation] = useState<Reservation | null>(null);
  const [whatsAppLogs, setWhatsAppLogs] = useState<WhatsAppDispatchLog[]>(() => messagingService.getWhatsAppDispatchHistory());
  const [historySubTab, setHistorySubTab] = useState<'all' | 'email' | 'whatsapp'>('all');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setPermission(notificationService.getPermissionStatus());
    setSettings(notificationService.getSettings());
    const config = messagingService.getConfig();
    setMessagingConfig(config);
    setTestWhatsAppPhone(config.testPhoneNumber || '');
    setEmailLogs(messagingService.getDispatchHistory());
    setWhatsAppLogs(messagingService.getWhatsAppDispatchHistory());

    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setEmailLogs(messagingService.getDispatchHistory());
      setWhatsAppLogs(messagingService.getWhatsAppDispatchHistory());
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const schedule = notificationService.getTodayAlertSchedule(reservations, settings.leadMinutes, currentTime);

  // --- HANDLERS DE NOTIFICAÇÃO NATIVA ---

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const res = await notificationService.requestPermission();
      setPermission(res);
      setSettings(notificationService.getSettings());
      if (res === 'granted') {
        if (onToast) {
          onToast(
            'success',
            'Notificações no navegador ativadas! Você receberá avisos 15 minutos antes de cada reserva.',
            'Avisos Ativados'
          );
        }
      } else if (res === 'denied') {
        if (onToast) {
          onToast(
            'warning',
            'Permissão negada no navegador. Permita notificações nas configurações do site para receber avisos.',
            'Notificações Bloqueadas'
          );
        }
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestNotification = () => {
    setTestSent(true);
    const sent = notificationService.sendTestNotification(() => {
      if (schedule.length > 0 && onSelectReservation) {
        onSelectReservation(schedule[0].reservation);
      }
    });

    if (sent) {
      if (onToast) {
        onToast('success', 'Notificação enviada com sucesso no sistema!', 'Teste Realizado');
      }
    } else {
      if (onToast) {
        onToast(
          'info',
          'Sinal sonoro emitido! Como as notificações do navegador não estão autorizadas, o alerta sonoro tocará quando a aba estiver aberta.',
          'Alerta Sonoro Emitido'
        );
      }
    }

    setTimeout(() => setTestSent(false), 3000);
  };

  const handleResetHistory = () => {
    notificationService.resetSentHistory();
    messagingService.clearDispatchHistory();
    messagingService.clearWhatsAppDispatchHistory();
    setEmailLogs([]);
    setWhatsAppLogs([]);
    setCurrentTime(new Date());
    if (onToast) {
      onToast('info', 'Histórico de alertas e disparos de mensageria resetado para a sessão.', 'Histórico Limpo');
    }
  };

  // --- HANDLERS DE E-MAIL ---

  const handleToggleEmailService = () => {
    const updated = messagingService.saveConfig({ enabled: !messagingConfig.enabled });
    setMessagingConfig(updated);
    if (onToast) {
      onToast(
        updated.enabled ? 'success' : 'info',
        updated.enabled
          ? 'Disparo automático de e-mail ativado! O solicitante receberá um e-mail 15 minutos antes da reunião.'
          : 'Disparo automático de e-mail desativado.',
        updated.enabled ? 'E-mail Automático Ativo' : 'E-mail Desativado'
      );
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    try {
      const res = await messagingService.sendTestEmail(testEmailAddress);
      setEmailLogs(messagingService.getDispatchHistory());
      if (onToast) {
        onToast('success', res.message, 'Mensageria Integrada');
      }
    } catch (err: any) {
      if (onToast) {
        onToast('error', err.message || 'Falha ao enviar e-mail de teste.', 'Erro no Envio');
      }
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleManualDispatchEmail = async (res: Reservation) => {
    setDispatchingEmailResId(res.id);
    try {
      const result = await messagingService.dispatchReservationReminder(res, undefined, true);
      setEmailLogs(messagingService.getDispatchHistory());
      if (onToast) {
        onToast('success', result.message, 'E-mail Disparado');
      }
    } catch (err: any) {
      if (onToast) {
        onToast('error', err.message || 'Erro ao despachar e-mail.', 'Falha de Disparo');
      }
    } finally {
      setDispatchingEmailResId(null);
    }
  };

  // --- HANDLERS DE WHATSAPP ---

  const handleToggleWhatsAppService = () => {
    const updated = messagingService.saveConfig({ whatsappEnabled: !messagingConfig.whatsappEnabled });
    setMessagingConfig(updated);
    if (onToast) {
      onToast(
        updated.whatsappEnabled ? 'success' : 'info',
        updated.whatsappEnabled
          ? 'Disparo automático via WhatsApp ativado! Lembretes serão enviados 15 min antes via API de mensageria.'
          : 'Disparo automático via WhatsApp desativado.',
        updated.whatsappEnabled ? 'WhatsApp Automático Ativo' : 'WhatsApp Desativado'
      );
    }
  };

  const handleSendTestWhatsApp = async () => {
    setIsSendingTestWhatsApp(true);
    try {
      const res = await messagingService.sendTestWhatsAppMessage(testWhatsAppPhone);
      setWhatsAppLogs(messagingService.getWhatsAppDispatchHistory());
      if (onToast) {
        onToast('success', res.message, 'WhatsApp Despachado');
      }
    } catch (err: any) {
      if (onToast) {
        onToast('error', err.message || 'Falha ao despachar WhatsApp de teste.', 'Erro no Envio');
      }
    } finally {
      setIsSendingTestWhatsApp(false);
    }
  };

  const handleManualDispatchWhatsApp = async (res: Reservation) => {
    setDispatchingWhatsAppResId(res.id);
    try {
      const result = await messagingService.dispatchWhatsAppReminder(res, undefined, true);
      setWhatsAppLogs(messagingService.getWhatsAppDispatchHistory());
      if (onToast) {
        onToast('success', result.message, 'WhatsApp Disparado');
      }
    } catch (err: any) {
      if (onToast) {
        onToast('error', err.message || 'Erro ao despachar WhatsApp.', 'Falha de Disparo');
      }
    } finally {
      setDispatchingWhatsAppResId(null);
    }
  };

  const handleOpenWhatsAppWeb = (res: Reservation) => {
    const phone = messagingService.resolveSolicitantePhone(res.solicitante);
    const text = messagingService.generateWhatsAppMessage(res, messagingConfig.leadMinutes);
    const url = messagingService.generateWhatsAppWebUrl(phone, text);
    window.open(url, '_blank');
  };

  const handleUpdateConfig = (partial: Partial<MessagingConfig>) => {
    const updated = messagingService.saveConfig(partial);
    setMessagingConfig(updated);
  };

  // Preview do modelo de e-mail
  const emailPreviewTemplate = previewEmailReservation
    ? messagingService.generateEmailTemplate(
        previewEmailReservation,
        messagingConfig.leadMinutes,
        messagingService.resolveSolicitanteEmail(previewEmailReservation.solicitante, messagingConfig.companyDomain)
      )
    : null;

  // Preview da mensagem de WhatsApp
  const whatsAppPreviewText = previewWhatsAppReservation
    ? messagingService.generateWhatsAppMessage(previewWhatsAppReservation, messagingConfig.leadMinutes)
    : null;
  const whatsAppPreviewPhone = previewWhatsAppReservation
    ? messagingService.resolveSolicitantePhone(previewWhatsAppReservation.solicitante)
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal em Bordô #7D1416 (Identidade Bellinati Perez) */}
        <div className="bg-[#7D1416] text-white px-5 py-4 flex items-center justify-between border-b-2 border-[#AD2F3B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-md">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white font-raleway leading-none">
                  Central de Notificações & Mensageria
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-[#7D1416] font-dm-sans leading-none flex items-center gap-1">
                  <Mail className="w-3 h-3 text-[#7D1416]" />
                  <span>E-mail</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white font-dm-sans leading-none flex items-center gap-1 shadow-xs">
                  <MessageSquare className="w-3 h-3 text-white" />
                  <span>WhatsApp 15m</span>
                </span>
              </div>
              <p className="text-xs text-[#EAEAEA]/80 font-dm-sans mt-1">
                Lembretes automáticos 15 min antes via pop-up, e-mail e API corporativa de WhatsApp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores de Navegação */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 flex items-center justify-between font-dm-sans text-xs">
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'schedule'
                  ? 'border-[#7D1416] text-[#7D1416]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Cronograma do Dia ({schedule.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('messaging')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'messaging'
                  ? 'border-[#7D1416] text-[#7D1416]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configurações de Mensageria</span>
              {(messagingConfig.enabled || messagingConfig.whatsappEnabled) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 px-3 font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'border-[#7D1416] text-[#7D1416]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Histórico de Disparos ({emailLogs.length + whatsAppLogs.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetHistory}
            title="Limpar histórico de disparos de hoje para permitir re-notificações"
            className="text-[11px] text-slate-500 hover:text-[#AD2F3B] font-semibold flex items-center gap-1 transition-colors cursor-pointer pb-2"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Resetar Histórico</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm font-dm-sans flex-1">
          {/* ======================================================== */}
          {/* ABA 1: CRONOGRAMA DO DIA COM DISPAROS INTEGRADOS */}
          {/* ======================================================== */}
          {activeTab === 'schedule' && (
            <>
              {/* Canais de Alerta: Pop-up Navegador, E-mail e WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1.1 Pop-up Navegador */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-rose-100 text-[#7D1416] rounded-lg">
                      <Bell className="w-4 h-4 text-[#AD2F3B]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#252A34]">Navegador</div>
                      <div className="text-[10px] text-slate-500">
                        {permission === 'granted' ? 'Ativo na tela' : 'Pendente'}
                      </div>
                    </div>
                  </div>
                  {permission === 'granted' ? (
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      disabled={testSent}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                      title="Testar alerta no navegador"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestPermission}
                      className="px-2 py-1 bg-[#AD2F3B] hover:bg-[#7D1416] text-white text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      Autorizar
                    </button>
                  )}
                </div>

                {/* 1.2 E-mail Automático */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                      <Mail className="w-4 h-4 text-blue-700" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#252A34]">E-mail 15m</div>
                      <div className="text-[10px] text-slate-500">
                        {messagingConfig.enabled ? 'Ativo' : 'Desativado'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleEmailService}
                    className={`w-10 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${
                      messagingConfig.enabled ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
                        messagingConfig.enabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 1.3 WhatsApp Mensageria */}
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                      <MessageSquare className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950">WhatsApp 15m</div>
                      <div className="text-[10px] text-emerald-700">
                        {messagingConfig.whatsappEnabled ? 'API Conectada' : 'Desativado'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleWhatsAppService}
                    className={`w-10 h-5.5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${
                      messagingConfig.whatsappEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
                        messagingConfig.whatsappEnabled ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Lista de Reservas do Dia */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="font-bold text-[#7D1416] font-raleway text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#AD2F3B]" />
                    <span>Lembretes Programados para Hoje ({schedule.length})</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    Disparo automático <strong>15 minutos antes</strong>
                  </span>
                </div>

                {schedule.length === 0 ? (
                  <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      Nenhuma reunião agendada para hoje.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Assim que novas reuniões forem cadastradas, o monitoramento automático de E-mail e WhatsApp funcionará aqui.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {schedule.map((item) => {
                      const res = item.reservation;
                      const solicitanteEmail = messagingService.resolveSolicitanteEmail(
                        res.solicitante,
                        messagingConfig.companyDomain
                      );
                      const solicitantePhone = messagingService.resolveSolicitantePhone(res.solicitante);
                      const isEmailSent = item.emailSent;
                      const isWppSent = item.whatsappSent;

                      let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                      let statusLabel = '';

                      if (item.status === 'finished') {
                        statusLabel = 'Concluída';
                        badgeColor = 'bg-slate-100 text-slate-500 border-slate-200';
                      } else if (item.status === 'in_progress') {
                        statusLabel = 'Em Andamento';
                        badgeColor = 'bg-[#7D1416] text-white font-bold shadow-xs';
                      } else if (item.status === 'triggered') {
                        statusLabel = '⏰ 15 min Atingido';
                        badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                      } else {
                        statusLabel = `Alerta às ${item.alertTimeFormatted} (em ${item.minutesUntilAlert} min)`;
                        badgeColor = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                      }

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-[#AD2F3B]/50 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#7D1416] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                              {res.sala.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-[#7D1416] font-raleway text-sm">
                                  {res.sala}
                                </span>
                                <span className="text-xs font-mono font-bold text-[#252A34]">
                                  {res.horaInicial} às {res.horaFinal}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                  {statusLabel}
                                </span>
                              </div>

                              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-700">{res.solicitante}</span>
                                <span>•</span>
                                <span className="text-slate-400 font-mono text-[11px]">{solicitanteEmail}</span>
                                <span>•</span>
                                <span className="text-slate-400 font-mono text-[11px]">+{solicitantePhone}</span>
                                <span>•</span>
                                <span className="font-mono text-[#7D1416] font-bold">GLPI #{res.glpi}</span>
                              </div>

                              {/* Badges de Status dos Canais */}
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {/* Badge E-mail */}
                                {isEmailSent ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    <Check className="w-3 h-3 text-blue-600" />
                                    <span>E-mail Enviado</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    <Clock className="w-2.5 h-2.5 text-slate-400" />
                                    <span>E-mail em 15m</span>
                                  </span>
                                )}

                                {/* Badge WhatsApp */}
                                {isWppSent ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCheck className="w-3 h-3 text-emerald-600" />
                                    <span>WhatsApp Enviado</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50/60 text-emerald-800 border border-emerald-200">
                                    <Clock className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>WhatsApp em 15m</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ações Rápidas por Reserva */}
                          <div className="flex items-center gap-1.5 self-end md:self-center shrink-0 flex-wrap">
                            {/* Botão de Disparo E-mail */}
                            <button
                              type="button"
                              onClick={() => handleManualDispatchEmail(res)}
                              disabled={dispatchingEmailResId === res.id}
                              title="Disparar e-mail de lembrete imediatamente"
                              className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              <Mail className="w-3 h-3" />
                              <span>{dispatchingEmailResId === res.id ? '...' : 'E-mail'}</span>
                            </button>

                            {/* Botão de Disparo WhatsApp API */}
                            <button
                              type="button"
                              onClick={() => handleManualDispatchWhatsApp(res)}
                              disabled={dispatchingWhatsAppResId === res.id}
                              title="Disparar lembrete via API de WhatsApp corporativa"
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>{dispatchingWhatsAppResId === res.id ? '...' : 'WhatsApp'}</span>
                            </button>

                            {/* Botão Abrir WhatsApp Web */}
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppWeb(res)}
                              title="Abrir no WhatsApp Web com mensagem pré-preenchida"
                              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            {/* Botão Prévia WhatsApp */}
                            <button
                              type="button"
                              onClick={() => setPreviewWhatsAppReservation(res)}
                              title="Ver prévia da mensagem no balão do WhatsApp"
                              className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Botão Prévia E-mail */}
                            <button
                              type="button"
                              onClick={() => setPreviewEmailReservation(res)}
                              title="Ver prévia do e-mail formatado"
                              className="p-1 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ======================================================== */}
          {/* ABA 2: CONFIGURAÇÃO DE MENSAGERIA & WHATSAPP */}
          {/* ======================================================== */}
          {activeTab === 'messaging' && (
            <div className="space-y-5">
              {/* Card 1: API de Mensageria (WhatsApp) */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4.5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-950 font-raleway text-base leading-tight">
                        Lembrete Automático via API de WhatsApp (15 min antes)
                      </h4>
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                        Envia uma mensagem formatada diretamente para o WhatsApp do solicitante com sala, pauta e GLPI.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <span className="text-xs font-bold text-emerald-950">
                      {messagingConfig.whatsappEnabled ? 'WHATSAPP ATIVO' : 'DESATIVADO'}
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleWhatsAppService}
                      className={`w-12 h-6.5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                        messagingConfig.whatsappEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
                          messagingConfig.whatsappEnabled ? 'translate-x-5.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Parâmetros do WhatsApp */}
                <div className="bg-white border border-emerald-100 rounded-xl p-3.5 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Provedor de WhatsApp */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Provedor da API de WhatsApp
                      </label>
                      <select
                        value={messagingConfig.whatsappProvider}
                        onChange={(e) =>
                          handleUpdateConfig({ whatsappProvider: e.target.value as WhatsAppProviderType })
                        }
                        className="w-full text-xs font-dm-sans bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="evolution_api">Evolution API / Baileys (Microserviço Bellinati)</option>
                        <option value="z_api">Z-API (WhatsApp Corporativo)</option>
                        <option value="twilio_whatsapp">Twilio WhatsApp Business</option>
                        <option value="webhook_whatsapp">Webhook WhatsApp Corporativo / n8n</option>
                        <option value="direct_mock">Simulador Local (Ambiente de Testes)</option>
                      </select>
                    </div>

                    {/* Instância WhatsApp */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nome da Instância / Dispositivo
                      </label>
                      <input
                        type="text"
                        value={messagingConfig.whatsappInstance}
                        onChange={(e) => handleUpdateConfig({ whatsappInstance: e.target.value })}
                        placeholder="bellinati-salas"
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* URL do Endpoint */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Endpoint da API de Envio (POST HTTP)
                    </label>
                    <input
                      type="url"
                      value={messagingConfig.whatsappApiUrl}
                      onChange={(e) => handleUpdateConfig({ whatsappApiUrl: e.target.value })}
                      placeholder="https://api.whatsapp.bellinatiperez.com.br/message/sendText/bellinati-salas"
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* API Key / Token */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Token / API Key de Autorização WhatsApp
                    </label>
                    <input
                      type="password"
                      value={messagingConfig.whatsappApiKey}
                      onChange={(e) => handleUpdateConfig({ whatsappApiKey: e.target.value })}
                      placeholder="Token secreto da API de mensageria..."
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Teste do WhatsApp */}
                  <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="w-full sm:w-auto flex-1">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Número de celular para teste (DDD + Número):
                      </label>
                      <input
                        type="tel"
                        value={testWhatsAppPhone}
                        onChange={(e) => {
                          setTestWhatsAppPhone(e.target.value);
                          handleUpdateConfig({ testPhoneNumber: e.target.value });
                        }}
                        placeholder="41999998888"
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setPreviewWhatsAppReservation(schedule[0]?.reservation || reservations[0] || null)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Balão</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendTestWhatsApp}
                        disabled={isSendingTestWhatsApp}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSendingTestWhatsApp ? 'Disparando...' : 'Enviar WhatsApp de Teste'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: E-mail Corporativo */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#7D1416] text-white flex items-center justify-center shrink-0 shadow-md">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#7D1416] font-raleway text-base leading-tight">
                        Disparo de E-mail Corporativo (15 min antes)
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Envia e-mail em formato HTML Bellinati Perez para o e-mail corporativo do solicitante.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <span className="text-xs font-bold text-slate-700">
                      {messagingConfig.enabled ? 'E-MAIL ATIVO' : 'DESATIVADO'}
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleEmailService}
                      className={`w-12 h-6.5 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                        messagingConfig.enabled ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
                          messagingConfig.enabled ? 'translate-x-5.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Domínio Corporativo dos Solicitantes
                    </label>
                    <input
                      type="text"
                      value={messagingConfig.companyDomain}
                      onChange={(e) => handleUpdateConfig({ companyDomain: e.target.value })}
                      placeholder="@bellinatiperez.com.br"
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#AD2F3B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      E-mail para Teste de Envio
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        placeholder="seu.email@bellinatiperez.com.br"
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#AD2F3B]"
                      />
                      <button
                        type="button"
                        onClick={handleSendTestEmail}
                        disabled={isSendingTestEmail}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {isSendingTestEmail ? '...' : 'Testar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 3: HISTÓRICO DE DISPAROS (E-MAIL & WHATSAPP) */}
          {/* ======================================================== */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setHistorySubTab('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      historySubTab === 'all'
                        ? 'bg-[#7D1416] text-white shadow-xs'
                        : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    Todos ({emailLogs.length + whatsAppLogs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistorySubTab('whatsapp')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      historySubTab === 'whatsapp'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp ({whatsAppLogs.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistorySubTab('email')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      historySubTab === 'email'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    <span>E-mail ({emailLogs.length})</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-semibold">
                  Auditoria de Mensageria Corporativa (LGPD)
                </span>
              </div>

              {/* Lista Unificada ou Filtrada */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {/* Registros de WhatsApp */}
                {(historySubTab === 'all' || historySubTab === 'whatsapp') &&
                  whatsAppLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">{log.solicitante}</span>
                            <span className="text-emerald-700 font-mono text-[11px] font-bold">
                              +{log.recipientPhone}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              WhatsApp Entregue
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>Sala: <strong>{log.sala}</strong> ({log.horario})</span>
                            <span>•</span>
                            <span>GLPI #{log.glpi}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-400">Provedor: {log.provider}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-[11px] text-slate-400">{log.sentAt}</span>
                      </div>
                    </div>
                  ))}

                {/* Registros de E-mail */}
                {(historySubTab === 'all' || historySubTab === 'email') &&
                  emailLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-blue-700" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">{log.solicitante}</span>
                            <span className="text-slate-500 font-mono text-[11px]">&lt;{log.recipientEmail}&gt;</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              E-mail Enviado
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>Sala: <strong>{log.sala}</strong> ({log.horario})</span>
                            <span>•</span>
                            <span>GLPI #{log.glpi}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-400">Provedor: {log.provider}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-[11px] text-slate-400">{log.sentAt}</span>
                      </div>
                    </div>
                  ))}

                {whatsAppLogs.length === 0 && emailLogs.length === 0 && (
                  <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                    <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      Nenhum envio registrado até o momento nesta sessão.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* MODAL DE PRÉVIA DO WHATSAPP (BALÃO DE CHAT ESTILO APP) */}
        {/* ======================================================== */}
        {previewWhatsAppReservation && whatsAppPreviewText && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
            <div
              className="bg-[#0b141a] text-white w-full max-w-lg rounded-2xl shadow-2xl border border-emerald-900/40 flex flex-col max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do WhatsApp */}
              <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#313d45]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    BP
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white leading-tight">
                      Bellinati Perez • Sistema de Salas
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono">
                      +{whatsAppPreviewPhone} • API Conectada
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewWhatsAppReservation(null)}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Fundo do Chat do WhatsApp */}
              <div className="p-4 overflow-y-auto flex-1 bg-[#0b141a] bg-radial from-[#111b21] to-[#0b141a]">
                <div className="max-w-[88%] ml-auto bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-xs p-3.5 shadow-md border border-[#02735e] text-xs leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
                  {whatsAppPreviewText}
                  <div className="text-right text-[10px] text-emerald-200/80 font-mono flex items-center justify-end gap-1 pt-1">
                    <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                  </div>
                </div>
              </div>

              {/* Barra de Ações do Modal de WhatsApp */}
              <div className="bg-[#202c33] p-3 border-t border-[#313d45] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsAppPreviewText);
                    setCopiedWhatsApp(true);
                    setTimeout(() => setCopiedWhatsApp(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-[#111b21] hover:bg-black text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedWhatsApp ? 'Copiado!' : 'Copiar'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenWhatsAppWeb(previewWhatsAppReservation);
                      setPreviewWhatsAppReservation(null);
                    }}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Abrir Web</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleManualDispatchWhatsApp(previewWhatsAppReservation);
                      setPreviewWhatsAppReservation(null);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Disparar API Agora</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL DE PRÉVIA DO E-MAIL */}
        {/* ======================================================== */}
        {previewEmailReservation && emailPreviewTemplate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#7D1416] text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-[#AD2F3B]">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-white" />
                  <span className="font-bold font-raleway text-sm">
                    Prévia do E-mail ao Solicitante
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewEmailReservation(null)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 space-y-1">
                <div>
                  <strong>Assunto:</strong> {emailPreviewTemplate.subject}
                </div>
                <div>
                  <strong>Para:</strong>{' '}
                  {messagingService.resolveSolicitanteEmail(
                    previewEmailReservation.solicitante,
                    messagingConfig.companyDomain
                  )}
                </div>
              </div>

              <div className="p-4 overflow-y-auto flex-1 bg-white">
                <div
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                  dangerouslySetInnerHTML={{ __html: emailPreviewTemplate.html }}
                />
              </div>

              <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPreviewEmailReservation(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleManualDispatchEmail(previewEmailReservation);
                    setPreviewEmailReservation(null);
                  }}
                  className="px-4 py-1.5 bg-[#7D1416] hover:bg-[#AD2F3B] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar E-mail Agora</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-dm-sans">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Monitoramento multicanal de 15 min ativo em segundo plano</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252A34] hover:bg-black text-white font-bold font-dm-sans rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
