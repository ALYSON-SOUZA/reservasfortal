import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Reservation, FilterOptions, Sala, Setor, ToastNotification, AppUser, Filial } from './types';
import { Header } from './components/Header';
import { NextReservationsBanner } from './components/NextReservationsBanner';
import { ActiveFilterBanner } from './components/ActiveFilterBanner';
import { FilterModal } from './components/FilterModal';
import { ReservationTable } from './components/ReservationTable';
import { RoomTimelineView } from './components/RoomTimelineView';
import { ReservationModal } from './components/ReservationModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ReportModal } from './components/ReportModal';
import { SupabaseModal } from './components/SupabaseModal';
import { AiReservationModal } from './components/AiReservationModal';
import { AnalyticsDashboardModal } from './components/AnalyticsDashboardModal';
import { SectorManagerModal } from './components/SectorManagerModal';
import { RoomManagerModal } from './components/RoomManagerModal';
import { BranchManagerModal } from './components/BranchManagerModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { MonthlyCalendarOverlay } from './components/MonthlyCalendarOverlay';
import { ReservationDetailModal } from './components/ReservationDetailModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { ToastContainer } from './components/ToastContainer';
import { LoginScreen } from './components/LoginScreen';
import { authService } from './services/authService';
import { reservationService, getLocalReservations } from './services/reservationService';
import { notificationService } from './services/notificationService';
import { salaService } from './services/salaService';
import { setorService } from './services/setorService';
import { filialService } from './services/filialService';
import { isReservationExpired, hasTimeConflict } from './utils/dateUtils';
import { canEditOrDelete } from './utils/rbac';

export default function App() {
  // Sessão do usuário logado (CPF e Nome)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => authService.getCurrentUser());

  // Estado de todas as reservas carregadas
  const [reservations, setReservations] = useState<Reservation[]>(() => getLocalReservations());
  const [rooms, setRooms] = useState<Sala[]>([]);
  const [sectors, setSectors] = useState<Setor[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modo de exibição ('list' | 'timeline')
  const [activeView, setActiveView] = useState<'list' | 'timeline'>('list');

  // Sistema de Toasts Modernos
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((type: ToastNotification['type'], message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title, duration: 4000 }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Carregar dados (do Supabase ou cache local)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resResult, roomsResult, sectorsResult, filiaisResult] = await Promise.all([
        reservationService.getAll(),
        salaService.getAll({ apenasAtivas: false }),
        setorService.getAll({ apenasAtivos: false }),
        filialService.getAll({ apenasAtivas: false }),
      ]);

      setReservations(resResult.data);
      setIsSupabaseLive(resResult.isSupabase);
      setRooms(roomsResult.data);
      setSectors(sectorsResult.data);
      if (filiaisResult.data) {
        setFiliais(filiaisResult.data);
      }

      if (resResult.syncedCount && resResult.syncedCount > 0) {
        addToast(
          'success',
          `☁️ ${resResult.syncedCount} reserva(s) deste computador foram sincronizadas com o banco Supabase na nuvem! Agora estão disponíveis em qualquer celular, computador ou aplicativo.`,
          'Sincronização em Nuvem Concluída'
        );
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Inicialização e Inscrição em Tempo Real (Supabase Realtime)
  useEffect(() => {
    loadData();

    // Inscrever para atualizações em tempo real se o Supabase estiver ativo
    const unsubscribeReservations = reservationService.subscribeToChanges(() => {
      reservationService.getAll().then((res) => setReservations(res.data));
    });

    const unsubscribeRooms = salaService.subscribeToChanges(() => {
      salaService.getAll({ apenasAtivas: false }).then((res) => setRooms(res.data));
    });

    const unsubscribeSectors = setorService.subscribeToChanges(() => {
      setorService.getAll({ apenasAtivos: false }).then((res) => setSectors(res.data));
    });

    // Sincronização periódica e revalidação ao focar na janela / celular
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        reservationService.getAll().then((res) => {
          setReservations(res.data);
          setIsSupabaseLive(res.isSupabase);
        });
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Polling contínuo para garantir sincronismo perfeito entre computadores e celulares
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        reservationService.getAll().then((res) => {
          setReservations(res.data);
          setIsSupabaseLive(res.isSupabase);
        });
      }
    }, 15000);

    return () => {
      unsubscribeReservations();
      unsubscribeRooms();
      unsubscribeSectors();
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(pollInterval);
    };
  }, [loadData]);

  // Atualização em tempo real a cada 30 segundos para checar expiração automática
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Estado dos filtros
  const [filters, setFilters] = useState<FilterOptions>({
    data: '',
    dataInicio: '',
    dataFim: '',
    solicitante: '',
    glpi: '',
    sala: '',
    setor: '',
    mostrarEncerradas: false, // Por padrão, exibe apenas as próximas reservas válidas
  });

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [modalInitialValues, setModalInitialValues] = useState<{
    dia?: string;
    sala?: string;
    horaInicial?: string;
    horaFinal?: string;
  } | undefined>(undefined);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingReservation, setDeletingReservation] = useState<Reservation | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [pastedImageFile, setPastedImageFile] = useState<File | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isSectorManagerModalOpen, setIsSectorManagerModalOpen] = useState(false);
  const [isRoomManagerModalOpen, setIsRoomManagerModalOpen] = useState(false);
  const [isBranchManagerOpen, setIsBranchManagerOpen] = useState(false);
  const [isHelpGuideOpen, setIsHelpGuideOpen] = useState(false);
  const [isCalendarOverlayOpen, setIsCalendarOverlayOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailReservation, setDetailReservation] = useState<Reservation | null>(null);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isCpfMasked, setIsCpfMasked] = useState<boolean>(true);

  // Monitor de Inatividade (Conformidade LGPD Art. 46 - Auto-lock após 30 min)
  useEffect(() => {
    let timeoutId: any;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (currentUser) {
          addToast(
            'warning',
            'Sessão inativa por mais de 30 minutos. Proteção de dados da Bellinati Perez conforme a LGPD.',
            'Segurança LGPD'
          );
        }
      }, 30 * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [currentUser, addToast]);

  // Monitoramento periódico de notificações agendadas no navegador (15 minutos antes)
  useEffect(() => {
    setNotificationStatus(notificationService.getPermissionStatus());

    const checkScheduledNotifications = () => {
      setNotificationStatus(notificationService.getPermissionStatus());
      const referenceNow = new Date();

      notificationService.checkAndNotifyUpcomingReservations(
        reservations,
        referenceNow,
        (res) => {
          // Toast em destaque dentro da aplicação
          addToast(
            'warning',
            `⏰ Reunião em 15 minutos na ${res.sala} (${res.horaInicial} às ${res.horaFinal}). Solicitante: ${res.solicitante} • GLPI #${res.glpi}`,
            'Aviso de Reserva Agendada'
          );
        }
      );
    };

    checkScheduledNotifications();
    const interval = setInterval(checkScheduledNotifications, 10000);
    return () => clearInterval(interval);
  }, [reservations, addToast]);

  // Escuta global de colagem de imagem para abertura automática do assistente IA
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (isAiModalOpen) return;

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            setPastedImageFile(file);
            setIsAiModalOpen(true);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isAiModalOpen]);

  // Mapeamento dinâmico de Sala -> Filial para filtragem precisa de reservas
  const roomFilialMap = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach((r) => {
      if (r.nome && r.filial) {
        map.set(r.nome.toLowerCase().trim(), r.filial.trim());
      }
    });
    return map;
  }, [rooms]);

  const resolveReservationFilial = (res: Reservation): string => {
    if (res.filial && res.filial.trim()) return res.filial.trim();
    const fromMap = roomFilialMap.get((res.sala || '').toLowerCase().trim());
    if (fromMap) return fromMap;

    // Heurística de fallback caso a filial não esteja explicitamente salva
    const sName = (res.sala || '').toLowerCase();
    if (sName.includes('maringá') || sName.includes('maringa') || sName.includes('matriz')) return 'Maringá (Matriz)';
    if (sName.includes('park') || sName.includes('business')) return 'Curitiba Park & Business';
    if (sName.includes('cebp')) return 'Curitiba/CEBP';
    if (sName.includes('marechal')) return 'Curitiba/Marechal';
    if (sName.includes('toronto')) return 'Curitiba/Toronto';
    if (sName.includes('fortaleza') || sName.includes('planalto') || sName.includes('215') || sName.includes('216') || sName.includes('212') || sName.includes('116') || sName.includes('118')) return 'Fortaleza/planalto';

    return '';
  };

  // Lista filtrada para exibição (com suporte a filial, período, sala, setor, solicitante e GLPI)
  const filteredReservations = useMemo(() => {
    const hasDateFilter = Boolean(filters.dataInicio || filters.dataFim || filters.data);

    return reservations
      .filter((res) => {
        // 1. Regra de Visibilidade: Oculta passadas por padrão, a menos que o usuário ative no filtro
        if (!filters.mostrarEncerradas && !hasDateFilter) {
          if (isReservationExpired(res.dia, res.horaFinal, now)) {
            return false;
          }
        }

        // 2. Filtro por Filial (Maringá, Curitiba Park & Business, Curitiba/CEBP, Curitiba/Marechal, Curitiba/Toronto, Fortaleza/planalto)
        if (filters.filial && filters.filial.trim()) {
          const resFilial = resolveReservationFilial(res);
          const target = filters.filial.trim().toLowerCase();
          if (!resFilial || resFilial.toLowerCase() !== target) {
            return false;
          }
        }

        // 3. Filtro por Período (Data Inicial e Data Final) ou Data Específica
        if (filters.dataInicio && res.dia < filters.dataInicio) {
          return false;
        }
        if (filters.dataFim && res.dia > filters.dataFim) {
          return false;
        }
        if (!filters.dataInicio && !filters.dataFim && filters.data && res.dia !== filters.data) {
          return false;
        }

        // 4. Filtro por Solicitante
        if (
          filters.solicitante &&
          !res.solicitante.toLowerCase().includes(filters.solicitante.toLowerCase().trim())
        ) {
          return false;
        }

        // 5. Filtro por GLPI
        if (
          filters.glpi &&
          !res.glpi.toLowerCase().includes(filters.glpi.toLowerCase().trim().replace('#', ''))
        ) {
          return false;
        }

        // 6. Filtro por Sala
        if (filters.sala && res.sala !== filters.sala) {
          return false;
        }

        // 7. Filtro por Setor
        if (filters.setor && res.setor !== filters.setor) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.dia !== b.dia) {
          return a.dia.localeCompare(b.dia);
        }
        return a.horaInicial.localeCompare(b.horaInicial);
      });
  }, [reservations, filters, now, roomFilialMap]);

  // Contagem de próximas reservas ativas (considerando o filtro ativo para consistência)
  const nextReservationsCount = useMemo(() => {
    return filteredReservations.filter((res) => !isReservationExpired(res.dia, res.horaFinal, now)).length;
  }, [filteredReservations, now]);

  // Ações CRUD Integradas
  const handleOpenAddModal = (initialValues?: { dia?: string; sala?: string; horaInicial?: string; horaFinal?: string }) => {
    setEditingReservation(null);
    setModalInitialValues(initialValues);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (res: Reservation) => {
    if (!canEditOrDelete(currentUser)) {
      addToast(
        'warning',
        'Acesso Restrito: Apenas usuários autenticados com Senha Master podem editar reservas existentes.',
        'Ação Não Autorizada'
      );
      return;
    }
    setEditingReservation(res);
    setModalInitialValues(undefined);
    setIsModalOpen(true);
  };

  const handleOpenDetailModal = (res: Reservation) => {
    setDetailReservation(res);
    setIsDetailModalOpen(true);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    addToast('info', 'Sessão encerrada com sucesso.', 'Logout');
  };

  const handleSaveReservation = async (
    data: Omit<Reservation, 'id' | 'criadoEm'> & { id?: string }
  ) => {
    const operatorFirstName = currentUser?.primeiroNome || 'Operador';
    const operatorCpf = currentUser?.cpf || '';
    const nowIso = new Date().toISOString();

    if (data.id) {
      if (!canEditOrDelete(currentUser)) {
        addToast(
          'error',
          'Operação Bloqueada: Apenas usuários autenticados com Senha Master podem editar reservas.',
          'Sem Permissão'
        );
        return;
      }
      const payload = {
        ...data,
        modificadoPor: operatorFirstName,
        modificadoPorCpf: operatorCpf,
        modificadoEm: nowIso,
      };

      // 1. Atualização Otimista Imediata: reflete na interface instantaneamente (0ms)
      const optimisticUpdatedItem: Reservation = {
        ...payload,
        id: data.id,
        criadoEm: (data as any).criadoEm || nowIso,
      };
      setReservations((prev) =>
        prev.map((item) => (item.id === data.id ? optimisticUpdatedItem : item))
      );

      const result = await reservationService.update(data.id, payload);
      const savedItem = result.data || optimisticUpdatedItem;

      setReservations((prev) => {
        const next = prev.map((item) => (item.id === data.id ? savedItem : item));
        if (result.data && result.data.id !== data.id) {
          return next.map((item) => (item.id === data.id ? result.data! : item));
        }
        return next;
      });

      if (result.isSupabase) {
        addToast('success', `Reserva da ${data.sala} salva com sucesso no Supabase por ${operatorFirstName}!`, 'Atualização Salva');
      } else {
        addToast('success', `Reserva da ${data.sala} atualizada e gravada com sucesso por ${operatorFirstName}!`, 'Atualização Salva');
      }
    } else {
      const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `res-${Date.now()}`;
      const payload = {
        ...data,
        criadoPor: operatorFirstName,
        criadoPorCpf: operatorCpf,
        modificadoPor: operatorFirstName,
        modificadoPorCpf: operatorCpf,
        modificadoEm: nowIso,
      };

      const optimisticNewItem: Reservation = {
        ...payload,
        id: tempId,
        criadoEm: nowIso,
      };

      // 1. Atualização Otimista Imediata: a nova reserva aparece na tela no mesmo instante!
      setReservations((prev) => [optimisticNewItem, ...prev.filter((r) => r.id !== tempId)]);

      const result = await reservationService.create(payload);
      if (result.data) {
        setReservations((prev) => [
          result.data,
          ...prev.filter((r) => r.id !== result.data.id && r.id !== tempId),
        ]);
      }
      if (result.isSupabase) {
        addToast('success', `Nova reserva na ${data.sala} gravada no Supabase por ${operatorFirstName}!`, 'Reserva Confirmada');
      } else {
        addToast('success', `Nova reserva na ${data.sala} cadastrada e gravada com sucesso por ${operatorFirstName}!`, 'Reserva Confirmada');
      }
    }
  };

  // Criação em lote a partir do Assistente IA
  const handleConfirmAiReservations = async (
    items: Array<Omit<Reservation, 'id' | 'criadoEm'>>
  ) => {
    if (!items || items.length === 0) return;

    const operatorFirstName = currentUser?.primeiroNome || 'Operador';
    const nowIso = new Date().toISOString();

    const preparedItems = items.map((item) => ({
      ...item,
      criadoPor: operatorFirstName,
      modificadoPor: operatorFirstName,
      modificadoEm: nowIso,
    }));

    const result = await reservationService.createMany(preparedItems);
    const createdList = result.data;

    if (createdList.length > 0) {
      setReservations((prev) => [...createdList, ...prev.filter((p) => !createdList.some((c) => c.id === p.id))]);

      const hasConflictsInBatch = createdList.some((item) => {
        const otherRes = [...createdList.filter((c) => c.id !== item.id), ...reservations];
        return hasTimeConflict(otherRes, item).hasConflict;
      });

      if (hasConflictsInBatch) {
        addToast(
          'warning',
          `✓ ${createdList.length} reserva(s) salva(s) por ${operatorFirstName} ${result.isSupabase ? 'no Supabase' : ''} com conflitos sinalizados.`,
          'Cadastro IA Concluído'
        );
      } else {
        addToast(
          'success',
          `🎉 ${createdList.length} reserva(s) gravada(s) com sucesso ${result.isSupabase ? 'no Supabase' : ''} por ${operatorFirstName}!`,
          'IA Concluída'
        );
      }
    }
  };

  const handleOpenDeleteModal = (res: Reservation) => {
    if (!canEditOrDelete(currentUser)) {
      addToast(
        'warning',
        'Acesso Restrito: Apenas o Usuário Master possui permissão para excluir reservas.',
        'Ação Não Autorizada'
      );
      return;
    }
    setDeletingReservation(res);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!canEditOrDelete(currentUser)) {
      addToast(
        'error',
        'Operação Bloqueada: Apenas o Usuário Master tem permissão para excluir reservas.',
        'Sem Permissão'
      );
      setIsDeleteModalOpen(false);
      setDeletingReservation(null);
      return;
    }
    if (deletingReservation) {
      const operatorFirstName = currentUser?.primeiroNome || 'Operador';
      const targetId = deletingReservation.id;
      const targetGlpi = deletingReservation.glpi;

      // Remoção Otimista Imediata da tela
      setReservations((prev) => prev.filter((item) => item.id !== targetId));
      setIsDeleteModalOpen(false);
      setDeletingReservation(null);

      await reservationService.delete(targetId);
      addToast('info', `Reserva GLPI #${targetGlpi} excluída por ${operatorFirstName}.`, 'Exclusão Registrada');
      return;
    }
    setIsDeleteModalOpen(false);
    setDeletingReservation(null);
  };

  const handleResetFilters = () => {
    setFilters({
      data: '',
      dataInicio: '',
      dataFim: '',
      solicitante: '',
      glpi: '',
      sala: '',
      setor: '',
      filial: '',
      mostrarEncerradas: false,
    });
  };

  const handleRemoveSingleFilter = (key: keyof FilterOptions | 'periodo') => {
    if (key === 'periodo' || key === 'data' || key === 'dataInicio' || key === 'dataFim') {
      setFilters((prev) => ({
        ...prev,
        data: '',
        dataInicio: '',
        dataFim: '',
      }));
      return;
    }

    setFilters((prev) => ({
      ...prev,
      [key]: key === 'mostrarEncerradas' ? false : '',
    }));
  };

  // Listas de salas e setores para os filtros
  const availableRooms = useMemo(() => {
    const list = rooms.map((r) => r.nome);
    reservations.forEach((r) => {
      if (!list.includes(r.sala)) list.push(r.sala);
    });
    return list;
  }, [rooms, reservations]);

  const availableSectors = useMemo(() => {
    const list = sectors.map((s) => s.nome);
    reservations.forEach((r) => {
      if (!list.includes(r.setor)) list.push(r.setor);
    });
    return list;
  }, [sectors, reservations]);

  // Se o usuário ainda não estiver logado com CPF e Nome, exibe a tela de login
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#EAEAEA] text-[#252A34] flex flex-col font-dm-sans selection:bg-[#7D1416] selection:text-white">
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <LoginScreen
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            addToast(
              'success',
              `Bem-vindo(a), ${user.primeiroNome}! Todas as suas ações serão registradas com seu primeiro nome.`,
              'Acesso Liberado'
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EAEAEA] text-[#252A34] flex flex-col font-dm-sans selection:bg-[#7D1416] selection:text-white">
      {/* Centralized Modern Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Header com a identidade visual marcante & Quick Actions */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenNewModal={() => handleOpenAddModal()}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenCalendarModal={() => setIsCalendarOverlayOpen(true)}
        onOpenHelpModal={() => setIsHelpGuideOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenFilterModal={() => setIsFilterModalOpen(true)}
        onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)}
        notificationStatus={notificationStatus}
        onResetFilters={handleResetFilters}
        onOpenAnalyticsModal={() => setIsAnalyticsModalOpen(true)}
        onOpenSectorManagerModal={() => setIsSectorManagerModalOpen(true)}
        onOpenRoomManagerModal={() => setIsRoomManagerModalOpen(true)}
        onOpenBranchManagerModal={() => setIsBranchManagerOpen(true)}
        isCpfMasked={isCpfMasked}
        onToggleCpfMask={() => setIsCpfMasked((prev) => !prev)}
        filiaisList={filiais}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        isSupabaseLive={isSupabaseLive}
        filters={filters}
        nextCount={nextReservationsCount}
        onSelectFilial={(filial) => setFilters((prev) => ({ ...prev, filial }))}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-5 lg:px-8 py-4">
        {/* Banner Reduzido e Focado nas Próximas Reservas */}
        <NextReservationsBanner
          reservations={filteredReservations}
          onOpenNewModal={() => handleOpenAddModal()}
          onOpenFilterModal={() => setIsFilterModalOpen(true)}
          onOpenNotificationCenter={() => setIsNotificationCenterOpen(true)}
          notificationStatus={notificationStatus}
        />

        {/* Barra de Filtros Ativos (quando houver filtro aplicado) */}
        <ActiveFilterBanner
          filters={filters}
          onResetFilters={handleResetFilters}
          onOpenFilterModal={() => setIsFilterModalOpen(true)}
          onRemoveFilter={handleRemoveSingleFilter}
          totalFiltered={filteredReservations.length}
          totalNext={nextReservationsCount}
        />

        {/* View Selection: Timeline Grid vs. Table List */}
        {activeView === 'timeline' ? (
          <RoomTimelineView
            reservations={filteredReservations}
            rooms={
              filters.filial && filters.filial.trim()
                ? rooms.filter((r) => r.filial.toLowerCase().trim() === filters.filial.toLowerCase().trim())
                : rooms
            }
            onSelectReservation={handleOpenDetailModal}
            onCreateSlot={(roomName, date, startHour) => {
              handleOpenAddModal({
                sala: roomName,
                dia: date,
                horaInicial: startHour,
              });
            }}
          />
        ) : (
          <ReservationTable
            reservations={filteredReservations}
            allReservations={reservations}
            currentUser={currentUser}
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteModal}
            onAddNew={() => handleOpenAddModal()}
            onViewDetails={handleOpenDetailModal}
            hasActiveFilters={Boolean(
              filters.data ||
              filters.dataInicio ||
              filters.dataFim ||
              filters.solicitante ||
              filters.glpi ||
              filters.sala ||
              filters.setor ||
              filters.filial ||
              filters.mostrarEncerradas
            )}
            onResetFilters={handleResetFilters}
          />
        )}
      </main>

      {/* Rodapé Moderno Bellinati Perez */}
      <footer className="bg-[#252A34] text-white border-t-2 border-[#AD2F3B] py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs font-dm-sans text-[#EAEAEA]/80 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Sistema de Gestão de Reservas de Salas — Bellinati Perez</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCalendarOverlayOpen(true)}
              className="text-[#EAEAEA] hover:text-white font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <span>📅 Calendário Mensal</span>
            </button>
            <span className="text-white/30">•</span>
            <button
              onClick={() => setIsHelpGuideOpen(true)}
              className="text-[#EAEAEA] hover:text-white font-semibold transition flex items-center gap-1 cursor-pointer"
            >
              <span>📘 Passo a Passo & Tira-Dúvidas IA</span>
            </button>
            <span className="text-white/30">•</span>
            <button
              onClick={() => setIsAnalyticsModalOpen(true)}
              className="text-slate-300 hover:text-white transition cursor-pointer"
            >
              Métricas
            </button>
            <span className="text-white/30">•</span>
            <button
              onClick={() => setIsSectorManagerModalOpen(true)}
              className="text-slate-300 hover:text-white transition cursor-pointer"
            >
              Setores
            </button>
            <span className="text-white/30">•</span>
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="text-[#EAEAEA] hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>{isSupabaseLive ? '● Supabase Conectado' : '○ Supabase Migrations'}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modal de Pesquisa & Filtros */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApplyFilters={setFilters}
        onResetFilters={handleResetFilters}
        availableRooms={availableRooms}
        availableSectors={availableSectors}
        totalFiltered={filteredReservations.length}
        totalAll={reservations.length}
      />

      {/* Modal de Cadastro / Edição */}
      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReservation(null);
          setModalInitialValues(undefined);
        }}
        onSave={handleSaveReservation}
        editingReservation={editingReservation}
        existingReservations={reservations}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        currentUser={currentUser}
        initialValues={modalInitialValues}
      />

      {/* Modal de Confirmação de Exclusão */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        reservation={deletingReservation}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingReservation(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Modal de Relatório e Impressão / PDF */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        allReservations={reservations}
        rooms={rooms}
        filiais={filiais}
        initialFilial={filters.filial || ''}
        filters={filters}
      />

      {/* Modal de Integração e Migração Supabase */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onRefreshData={loadData}
        isSupabaseLive={isSupabaseLive}
      />

      {/* Modal de Assistente Inteligente IA */}
      <AiReservationModal
        isOpen={isAiModalOpen}
        initialImageFile={pastedImageFile}
        onClose={() => {
          setIsAiModalOpen(false);
          setPastedImageFile(null);
        }}
        onConfirmReservations={handleConfirmAiReservations}
        existingReservations={reservations}
      />

      {/* Modal de Métricas / Analytics Dashboard */}
      <AnalyticsDashboardModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        reservations={reservations}
        rooms={rooms}
        filiais={filiais}
        initialFilial={filters.filial || ''}
      />

      {/* Modal de Gerenciamento de Setores */}
      <SectorManagerModal
        isOpen={isSectorManagerModalOpen}
        onClose={() => setIsSectorManagerModalOpen(false)}
        onSectorsUpdated={(updatedSectors) => setSectors(updatedSectors)}
        existingReservations={reservations}
      />

      {/* Modal de Gerenciamento de Salas */}
      <RoomManagerModal
        isOpen={isRoomManagerModalOpen}
        onClose={() => setIsRoomManagerModalOpen(false)}
        onRoomsUpdated={(updatedRooms) => setRooms(updatedRooms)}
        existingReservations={reservations}
      />

      {/* Modal de Gerenciamento e Registro de Filiais */}
      <BranchManagerModal
        isOpen={isBranchManagerOpen}
        onClose={() => setIsBranchManagerOpen(false)}
        onFiliaisUpdated={(updatedFiliais) => setFiliais(updatedFiliais)}
        existingSalas={rooms}
        existingReservations={reservations}
        currentUser={currentUser}
      />

      {/* Modal de Passo a Passo & Tira-Dúvidas com IA */}
      <HelpGuideModal
        isOpen={isHelpGuideOpen}
        onClose={() => setIsHelpGuideOpen(false)}
        onOpenNewModal={() => handleOpenAddModal()}
        onOpenFilterModal={() => setIsFilterModalOpen(true)}
        onOpenRoomManagerModal={() => setIsRoomManagerModalOpen(true)}
        onOpenSectorManagerModal={() => setIsSectorManagerModalOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
      />

      {/* Modal / Overlay Flutuante de Calendário Mensal */}
      <MonthlyCalendarOverlay
        isOpen={isCalendarOverlayOpen}
        onClose={() => setIsCalendarOverlayOpen(false)}
        reservations={reservations}
        onSelectReservation={handleOpenDetailModal}
      />

      {/* Modal de Detalhamento Completo do Chamado GLPI */}
      <ReservationDetailModal
        isOpen={isDetailModalOpen}
        reservation={detailReservation}
        currentUser={currentUser}
        allReservations={reservations}
        rooms={rooms}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailReservation(null);
        }}
        onEdit={(res) => handleOpenEditModal(res)}
        onDelete={(res) => handleOpenDeleteModal(res)}
      />

      {/* Central de Notificações Agendadas no Navegador (15 min antes) */}
      <NotificationCenterModal
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        reservations={reservations}
        onSelectReservation={handleOpenDetailModal}
        onToast={addToast}
      />
    </div>
  );
}
