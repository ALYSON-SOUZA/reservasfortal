import React, { useState, useEffect } from 'react';
import { Reservation } from '../types';
import {
  notificationService,
  NotificationSettings,
} from '../services/notificationService';
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
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [settings, setSettings] = useState<NotificationSettings>(() => notificationService.getSettings());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isRequesting, setIsRequesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setPermission(notificationService.getPermissionStatus());
    setSettings(notificationService.getSettings());

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const schedule = notificationService.getTodayAlertSchedule(reservations, settings.leadMinutes, currentTime);
  const history = notificationService.getRecentHistory();

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

  const handleToggleSound = () => {
    const updated = notificationService.saveSettings({ sound: !settings.sound });
    setSettings(updated);
    if (updated.sound) {
      notificationService.playChimeSound();
    }
  };

  const handleToggleEnabled = () => {
    const updated = notificationService.saveSettings({ enabled: !settings.enabled });
    setSettings(updated);
  };

  const handleChangeLeadMinutes = (minutes: number) => {
    const updated = notificationService.saveSettings({ leadMinutes: minutes });
    setSettings(updated);
  };

  const handleResetHistory = () => {
    notificationService.resetSentHistory();
    setCurrentTime(new Date());
    if (onToast) {
      onToast('info', 'Histórico de alertas disparados resetado para a sessão.', 'Histórico Limpo');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal em Bordô #7D1416 (Identidade Bellinati Perez) */}
        <div className="bg-[#7D1416] text-white px-5 py-4 flex items-center justify-between border-b-2 border-[#AD2F3B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-md">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-raleway leading-none">
                  Central de Notificações Agendadas
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-[#7D1416] font-dm-sans leading-none">
                  15 Minutos Antes
                </span>
              </div>
              <p className="text-xs text-[#EAEAEA]/80 font-dm-sans mt-1">
                Avisos automáticos no computador e som de alerta antes do início das reservas
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm font-dm-sans flex-1">
          {/* Card 1: Status da Permissão do Navegador */}
          <div className="rounded-xl border p-4 transition-all">
            {permission === 'granted' ? (
              <div className="flex items-start justify-between gap-3 bg-emerald-50/70 border-emerald-200 p-3.5 rounded-xl border">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900 font-raleway text-base leading-tight">
                      Notificações do Navegador Ativas
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      O navegador tem permissão para exibir alertas na sua área de trabalho. Você receberá uma notificação com o nome da sala, GLPI e detalhes{' '}
                      <strong>{settings.leadMinutes} minutos antes</strong> de cada reunião agendada.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testSent}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold font-dm-sans rounded-lg transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3" />
                  <span>{testSent ? 'Enviado!' : 'Testar Agora'}</span>
                </button>
              </div>
            ) : permission === 'denied' ? (
              <div className="flex items-start justify-between gap-3 bg-rose-50/80 border-rose-200 p-3.5 rounded-xl border">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-100 text-[#7D1416] rounded-lg shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-rose-900 font-raleway text-base leading-tight">
                      Notificações Bloqueadas pelo Navegador
                    </h4>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      As notificações nativas estão bloqueadas para este endereço. Para ativá-las:
                      clique no ícone de <strong>Cadeado / Permissões</strong> ao lado do endereço no navegador e altere
                      "Notificações" para <strong>Permitir</strong>.
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1 font-semibold">
                      💡 Enquanto isso, o sistema continuará emitindo sinais sonoros e alertas visuais integrados se a aba estiver aberta.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="px-3 py-1.5 bg-[#AD2F3B] hover:bg-[#7D1416] active:scale-95 text-white text-xs font-bold font-dm-sans rounded-lg transition-all shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Testar Som</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/80 border-amber-200 p-3.5 rounded-xl border">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                    <Bell className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 font-raleway text-base leading-tight">
                      Autorização de Notificações Pendente
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Autorize as notificações do navegador para receber avisos nativos na sua tela 15 minutos antes de qualquer reserva começar.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  disabled={isRequesting}
                  className="px-4 py-2 bg-[#FF2E63] hover:bg-[#AD2F3B] active:scale-95 text-white text-xs font-bold font-raleway tracking-wide rounded-xl transition-all shrink-0 cursor-pointer shadow-md shadow-[#FF2E63]/30 flex items-center justify-center gap-2"
                >
                  <BellRing className="w-4 h-4" />
                  <span>{isRequesting ? 'Solicitando...' : 'ATIVAR NOTIFICAÇÕES'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 2: Preferências de Alerta & Som */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h4 className="font-bold text-[#7D1416] font-raleway text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#AD2F3B]" />
              <span>Configurações dos Alertas</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Interruptor de Ativação Geral */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-slate-100 text-[#7D1416] rounded-lg">
                    {settings.enabled ? <Bell className="w-4 h-4 text-[#AD2F3B]" /> : <BellOff className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#252A34]">Avisos Automáticos</div>
                    <div className="text-[11px] text-slate-500">Monitorar reservas ativas</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleEnabled}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    settings.enabled ? 'bg-[#AD2F3B]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      settings.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Interruptor de Som (Chime Sintetizado) */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-slate-100 text-[#7D1416] rounded-lg">
                    {settings.sound ? <Volume2 className="w-4 h-4 text-[#AD2F3B]" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#252A34]">Som de Alerta</div>
                    <div className="text-[11px] text-slate-500">Chime harmônico via Web Audio</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                    settings.sound ? 'bg-[#AD2F3B]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      settings.sound ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Tempo de Antecedência */}
            <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#AD2F3B]" />
                <span className="text-xs font-bold text-[#252A34]">Tempo de antecedência do aviso:</span>
              </div>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                {[5, 10, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleChangeLeadMinutes(mins)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      settings.leadMinutes === mins
                        ? 'bg-[#7D1416] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#7D1416]'
                    }`}
                  >
                    {mins} min{mins === 15 ? ' (Padrão)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Cronograma de Alertas do Dia */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="font-bold text-[#7D1416] font-raleway text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#AD2F3B]" />
                <span>Cronograma de Avisos para Hoje ({schedule.length})</span>
              </h4>
              <button
                type="button"
                onClick={handleResetHistory}
                title="Limpar histórico de disparos de hoje para permitir re-notificações"
                className="text-[11px] text-slate-500 hover:text-[#AD2F3B] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Resetar Histórico</span>
              </button>
            </div>

            {schedule.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center font-dm">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  Nenhuma reunião agendada para hoje.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Assim que novas reuniões forem cadastradas para hoje, os alertas de 15 minutos aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 font-dm">
                {schedule.map((item) => {
                  const res = item.reservation;

                  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  let statusLabel = '';

                  if (item.status === 'finished') {
                    statusLabel = 'Concluída';
                    badgeColor = 'bg-slate-100 text-slate-500 border-slate-200';
                  } else if (item.status === 'in_progress') {
                    statusLabel = 'Em Andamento';
                    badgeColor = 'bg-[#7D1416] text-white font-bold shadow-xs';
                  } else if (item.status === 'triggered') {
                    statusLabel = '🔔 Alerta Disparado';
                    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                  } else {
                    statusLabel = `Alerta às ${item.alertTimeFormatted} (em ${item.minutesUntilAlert} min)`;
                    badgeColor = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                  }

                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-[#AD2F3B]/50 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#7D1416] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {res.sala.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#7D1416] font-raleway text-sm">
                              {res.sala}
                            </span>
                            <span className="text-xs font-mono font-bold text-[#252A34]/80">
                              {res.horaInicial} às {res.horaFinal}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badgeColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap font-dm-sans">
                            <span>{res.solicitante} ({res.setor})</span>
                            <span>•</span>
                            <span className="font-mono text-[#7D1416] font-bold">GLPI #{res.glpi}</span>
                          </div>
                        </div>
                      </div>

                      {onSelectReservation && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectReservation(res);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-[#252A34] bg-slate-100 hover:bg-[#AD2F3B] hover:text-white rounded-lg transition-colors flex items-center gap-1 self-end sm:self-center shrink-0 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ver Chamado</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 4: Histórico da Sessão */}
          {history.length > 0 && (
            <div className="pt-2 border-t border-slate-200 font-dm-sans">
              <h5 className="text-xs font-bold text-slate-600 mb-2">
                Avisos disparados recentemente nesta sessão:
              </h5>
              <div className="space-y-1.5 text-xs text-slate-600 max-h-32 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-1 px-2.5 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        {h.sala} ({h.horario}) — {h.solicitante}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">às {h.disparadoEm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-dm-sans">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Monitoramento ativo a cada 10s
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
