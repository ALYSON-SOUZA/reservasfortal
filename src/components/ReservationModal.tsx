import React, { useState, useEffect, useMemo } from 'react';
import { Reservation, Sala, Setor, AppUser } from '../types';
import { DEFAULT_SALAS, DEFAULT_SETORES } from '../utils/mockData';
import { getTodayString, hasTimeConflict, formatDateBR, formatDateTimeBR } from '../utils/dateUtils';
import {
  X,
  Calendar,
  Clock,
  Building,
  User,
  Layers,
  Ticket,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Settings,
  Users,
  Tv,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { salaService } from '../services/salaService';
import { setorService } from '../services/setorService';
import { RoomManagerModal } from './RoomManagerModal';
import { SectorManagerModal } from './SectorManagerModal';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reservationData: Omit<Reservation, 'id' | 'criadoEm'> & { id?: string }) => void;
  editingReservation?: Reservation | null;
  existingReservations: Reservation[];
  onOpenAiModal?: () => void;
  currentUser?: AppUser | null;
  initialValues?: {
    dia?: string;
    sala?: string;
    horaInicial?: string;
    horaFinal?: string;
  };
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingReservation,
  existingReservations,
  onOpenAiModal,
  currentUser,
  initialValues,
}) => {
  const [dia, setDia] = useState('');
  const [sala, setSala] = useState('');
  const [customSala, setCustomSala] = useState('');
  const [isCustomSala, setIsCustomSala] = useState(false);

  // Salas sincronizadas do Supabase / salaService
  const [availableSalas, setAvailableSalas] = useState<Sala[]>([]);
  const [isRoomManagerOpen, setIsRoomManagerOpen] = useState(false);

  // Setores sincronizados do setorService
  const [availableSetores, setAvailableSetores] = useState<Setor[]>([]);
  const [isSectorManagerOpen, setIsSectorManagerOpen] = useState(false);
  const [allowConflict, setAllowConflict] = useState(false);

  const [horaInicial, setHoraInicial] = useState('08:00');
  const [horaFinal, setHoraFinal] = useState('09:00');

  const [solicitante, setSolicitante] = useState('');
  const [setor, setSetor] = useState('');
  const [customSetor, setCustomSetor] = useState('');
  const [isCustomSetor, setIsCustomSetor] = useState(false);

  const [glpi, setGlpi] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Carregar salas e setores
  const loadSalasAndSetores = async () => {
    try {
      const [resSalas, resSetores] = await Promise.all([
        salaService.getAll({ apenasAtivas: true }),
        setorService.getAll({ apenasAtivos: true }),
      ]);
      if (resSalas.data && resSalas.data.length > 0) {
        setAvailableSalas(resSalas.data);
      }
      if (resSetores.data && resSetores.data.length > 0) {
        setAvailableSetores(resSetores.data);
      }
    } catch (err) {
      console.error('Erro ao carregar salas/setores:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSalasAndSetores();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingReservation) {
      setDia(editingReservation.dia);

      const isKnown =
        availableSalas.some((s) => s.nome === editingReservation.sala) ||
        DEFAULT_SALAS.includes(editingReservation.sala);

      if (isKnown) {
        setSala(editingReservation.sala);
        setIsCustomSala(false);
        setCustomSala('');
      } else {
        setSala('OUTRA');
        setIsCustomSala(true);
        setCustomSala(editingReservation.sala);
      }

      setHoraInicial(editingReservation.horaInicial);
      setHoraFinal(editingReservation.horaFinal);
      setSolicitante(editingReservation.solicitante);

      const isKnownSetor =
        availableSetores.some((st) => st.nome === editingReservation.setor) ||
        DEFAULT_SETORES.includes(editingReservation.setor);

      if (isKnownSetor) {
        setSetor(editingReservation.setor);
        setIsCustomSetor(false);
        setCustomSetor('');
      } else {
        setSetor('OUTRO');
        setIsCustomSetor(true);
        setCustomSetor(editingReservation.setor);
      }

      setGlpi(editingReservation.glpi);
      setObservacoes(editingReservation.observacoes || '');
      setError(null);
    } else {
      // Default new or with initialValues from Timeline slot click
      setDia(initialValues?.dia || getTodayString());
      const initialSala = initialValues?.sala || (availableSalas.length > 0 ? availableSalas[0].nome : DEFAULT_SALAS[0]);
      setSala(initialSala);
      setIsCustomSala(false);
      setCustomSala('');

      if (initialValues?.horaInicial) {
        setHoraInicial(initialValues.horaInicial);
        const [h, m] = initialValues.horaInicial.split(':').map(Number);
        const nextHour = String(Math.min(22, h + 1)).padStart(2, '0');
        setHoraFinal(`${nextHour}:${String(m).padStart(2, '0')}`);
      } else {
        setHoraInicial('08:00');
        setHoraFinal('09:00');
      }

      setSolicitante('');
      const defaultSetorName = availableSetores.length > 0 ? availableSetores[0].nome : DEFAULT_SETORES[0];
      setSetor(defaultSetorName);
      setIsCustomSetor(false);
      setCustomSetor('');
      setGlpi('');
      setObservacoes('');
      setError(null);
    }
  }, [editingReservation, isOpen, availableSalas.length, availableSetores.length, initialValues]);

  // Selected Sala Info
  const selectedSalaObj = useMemo(() => {
    const currentName = isCustomSala ? customSala : sala;
    return availableSalas.find((s) => s.nome.toLowerCase() === currentName.toLowerCase());
  }, [availableSalas, sala, customSala, isCustomSala]);

  // Real-time Conflict Detector
  const realTimeConflict = useMemo(() => {
    const finalSala = isCustomSala ? customSala.trim() : sala.trim();
    if (!dia || !finalSala || !horaInicial || !horaFinal || horaInicial >= horaFinal) {
      return null;
    }

    const check = hasTimeConflict(existingReservations, {
      id: editingReservation ? editingReservation.id : undefined,
      dia,
      sala: finalSala,
      horaInicial,
      horaFinal,
    });

    return check.hasConflict ? check.conflictingWith : null;
  }, [dia, sala, customSala, isCustomSala, horaInicial, horaFinal, existingReservations, editingReservation]);

  if (!isOpen) return null;

  const handleRoomsUpdated = (updatedRooms: Sala[], selectedRoomName?: string) => {
    setAvailableSalas(updatedRooms.filter((r) => r.ativa));
    if (selectedRoomName) {
      setSala(selectedRoomName);
      setIsCustomSala(false);
      setCustomSala('');
    }
  };

  const handleSectorsUpdated = (updatedSectors: Setor[]) => {
    setAvailableSetores(updatedSectors.filter((s) => s.ativo));
  };

  const roomNamesList = availableSalas.length > 0 ? availableSalas.map((s) => s.nome) : DEFAULT_SALAS;
  const sectorNamesList = availableSetores.length > 0 ? availableSetores.map((s) => s.nome) : DEFAULT_SETORES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalSala = isCustomSala ? customSala.trim() : sala.trim();
    const finalSetor = isCustomSetor ? customSetor.trim() : setor.trim();

    // Basic Validation
    if (!dia) {
      setError('Por favor, informe o dia da reserva.');
      return;
    }
    if (!finalSala) {
      setError('Por favor, selecione ou informe o nome da sala.');
      return;
    }
    if (!horaInicial || !horaFinal) {
      setError('Por favor, defina o horário de início e término.');
      return;
    }
    if (horaInicial >= horaFinal) {
      setError('O horário final deve ser posterior ao horário inicial.');
      return;
    }
    if (!solicitante.trim()) {
      setError('Por favor, informe o nome do solicitante.');
      return;
    }
    if (!finalSetor) {
      setError('Por favor, selecione ou informe o setor responsável.');
      return;
    }
    if (!glpi.trim()) {
      setError('Por favor, informe o número do chamado GLPI.');
      return;
    }

    // Check Conflict
    if (realTimeConflict && !allowConflict) {
      setError(
        `Conflito de horário detectado! A ${finalSala} já está ocupada por ${realTimeConflict.solicitante} (${realTimeConflict.horaInicial} às ${realTimeConflict.horaFinal}) no dia ${formatDateBR(dia)} (GLPI #${realTimeConflict.glpi}). Marque a opção de confirmação abaixo se desejar cadastrar mesmo com sobreposição.`
      );
      return;
    }

    onSave({
      id: editingReservation ? editingReservation.id : undefined,
      dia,
      sala: finalSala,
      horaInicial,
      horaFinal,
      solicitante: solicitante.trim(),
      setor: finalSetor,
      glpi: glpi.replace('#', '').trim(),
      observacoes: observacoes.trim(),
      criadoPor: editingReservation?.criadoPor || currentUser?.primeiroNome || 'Operador',
      modificadoPor: currentUser?.primeiroNome || 'Operador',
      modificadoEm: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-dm-sans">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header em Bordô #7D1416 (Brandbook Bellinati Perez) */}
          <div className="bg-[#7D1416] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#AD2F3B]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold shadow-md">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-raleway leading-tight text-white">
                  {editingReservation ? 'Editar Reserva de Sala' : 'Nova Reserva de Sala — Bellinati Perez'}
                </h2>
                <p className="text-xs text-[#EAEAEA]/80 font-dm-sans font-medium">
                  Preencha os campos obrigatórios e vincule o chamado GLPI
                </p>
              </div>
            </div>
            <button
              id="btn-fechar-modal"
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body / Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto font-dm-sans">
            {/* Banner de Auditoria de Modificação */}
            {editingReservation && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-slate-600 font-dm-sans">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#7D1416] shrink-0" />
                  <span>
                    Última alteração: <strong>{editingReservation.modificadoPor || editingReservation.criadoPor || 'Sistema'}</strong>
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {formatDateTimeBR(editingReservation.modificadoEm || editingReservation.criadoEm)}
                </span>
              </div>
            )}

            {!editingReservation && onOpenAiModal && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#AD2F3B] shrink-0" />
                  <p className="text-xs text-[#252A34] font-semibold">
                    Possui um print, mensagem ou múltiplos dias de reserva?
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-abrir-ia-dentro-modal"
                  onClick={() => {
                    onClose();
                    onOpenAiModal();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#7D1416] hover:bg-[#AD2F3B] text-white text-xs font-bold font-dm-sans transition shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Preencher com IA</span>
                </button>
              </div>
            )}

            {/* Live Conflict Warning Banner */}
            {realTimeConflict && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold font-raleway text-sm text-amber-900">
                    ⚠️ Conflito de Horário Detectado!
                  </p>
                  <p className="mt-0.5 leading-relaxed font-semibold">
                    A sala <strong>{isCustomSala ? customSala : sala}</strong> já está agendada para{' '}
                    <strong>{realTimeConflict.solicitante}</strong> ({realTimeConflict.setor}) das{' '}
                    <strong>{realTimeConflict.horaInicial} às {realTimeConflict.horaFinal}</strong> (GLPI #{realTimeConflict.glpi}).
                  </p>
                  
                  <label className="mt-2.5 flex items-center gap-2 p-2 bg-amber-100 border border-amber-300 rounded-xl cursor-pointer hover:bg-amber-200/70 transition">
                    <input
                      type="checkbox"
                      checked={allowConflict}
                      onChange={(e) => {
                        setAllowConflict(e.target.checked);
                        if (e.target.checked) setError(null);
                      }}
                      className="w-4 h-4 rounded text-amber-700 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-amber-950">
                      Permitir cadastro com sobreposição de horários (sinalizar conflito no painel)
                    </span>
                  </label>
                </div>
              </div>
            )}

            {error && !realTimeConflict && (
              <div className="p-4 rounded-xl bg-[#7D1416]/10 border-2 border-[#AD2F3B]/40 text-[#7D1416] text-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#AD2F3B] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-[#7D1416] font-raleway">Atenção:</p>
                  <p className="font-medium font-dm">{error}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* DIA */}
              <div>
                <label
                  htmlFor="form-dia"
                  className="block text-xs font-bold text-[#252A34] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#AD2F3B]" />
                  <span>DIA (Data da Reserva) *</span>
                </label>
                <input
                  id="form-dia"
                  type="date"
                  required
                  value={dia}
                  onChange={(e) => setDia(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#EAEAEA]/40 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] font-medium"
                />
              </div>

              {/* GLPI */}
              <div>
                <label
                  htmlFor="form-glpi"
                  className="block text-xs font-bold text-[#252A34] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <Ticket className="w-3.5 h-3.5 text-[#AD2F3B]" />
                  <span>Nº Chamado GLPI *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-[#252A34]/50 font-mono font-black text-sm">
                    #
                  </span>
                  <input
                    id="form-glpi"
                    type="text"
                    required
                    placeholder="Ex: 104928"
                    value={glpi}
                    onChange={(e) => setGlpi(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 text-sm bg-[#EAEAEA]/40 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* SALA COM BOTÃO DE GESTÃO E INFORMAÇÕES */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="form-sala"
                  className="text-xs font-bold text-[#252A34] uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Building className="w-3.5 h-3.5 text-[#252A34]" />
                  <span>SALA (Nome / Espaço) *</span>
                </label>
                <button
                  type="button"
                  id="btn-gerenciar-salas-inline"
                  onClick={() => setIsRoomManagerOpen(true)}
                  title="Gerenciar lista de salas no Supabase"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#252A34] hover:bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 transition cursor-pointer"
                >
                  <Settings className="w-3 h-3 text-slate-400" />
                  <span>Gerenciar Salas</span>
                </button>
              </div>

              <select
                id="form-sala"
                value={isCustomSala ? 'OUTRA' : sala}
                onChange={(e) => {
                  if (e.target.value === 'OUTRA') {
                    setIsCustomSala(true);
                  } else {
                    setIsCustomSala(false);
                    setSala(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 text-sm bg-[#EAEAEA]/40 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] font-bold"
              >
                {roomNamesList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="OUTRA">+ Outra Sala (Digitar manualmente)</option>
              </select>

              {/* Informações da Sala Selecionada */}
              {selectedSalaObj && !isCustomSala && (
                <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-slate-500">
                  <span className="font-bold text-slate-700">{selectedSalaObj.filial}</span>
                  {selectedSalaObj.capacidade && (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[11px]">
                      <Users className="w-3 h-3 text-[#AD2F3B]" />
                      Até {selectedSalaObj.capacidade} pessoas
                    </span>
                  )}
                  {selectedSalaObj.recursos && selectedSalaObj.recursos.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {selectedSalaObj.recursos.map((rec) => (
                        <span
                          key={rec}
                          className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                        >
                          {rec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isCustomSala && (
                <input
                  id="form-custom-sala"
                  type="text"
                  placeholder="Informe o nome ou número da sala personalizada"
                  value={customSala}
                  onChange={(e) => setCustomSala(e.target.value)}
                  className="w-full mt-2 px-3.5 py-2.5 text-sm bg-white border-2 border-[#AD2F3B] rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34] font-semibold"
                />
              )}
            </div>

            {/* HORA INICIAL e HORA FINAL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="form-hora-inicial"
                  className="block text-xs font-bold text-[#252A34] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-[#AD2F3B]" />
                  <span>Hora Inicial (Início) *</span>
                </label>
                <input
                  id="form-hora-inicial"
                  type="time"
                  required
                  value={horaInicial}
                  onChange={(e) => setHoraInicial(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#EAEAEA]/40 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34] font-mono font-bold"
                />
              </div>

              <div>
                <label
                  htmlFor="form-hora-final"
                  className="block text-xs font-bold text-[#252A34] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-[#AD2F3B]" />
                  <span>Hora Final (Término) *</span>
                </label>
                <input
                  id="form-hora-final"
                  type="time"
                  required
                  value={horaFinal}
                  onChange={(e) => setHoraFinal(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#EAEAEA]/40 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34] font-mono font-bold"
                />
              </div>
            </div>

            {/* SOLICITANTE e SETOR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="form-solicitante"
                  className="block text-xs font-bold text-[#252A34] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-[#252A34]" />
                  <span>SOLICITANTE (Responsável) *</span>
                </label>
                <input
                  id="form-solicitante"
                  type="text"
                  required
                  placeholder="Ex: Alyson Souza Barreto"
                  value={solicitante}
                  onChange={(e) => setSolicitante(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#EAEAEA]/40 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34] font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="form-setor"
                    className="text-xs font-bold text-[#252A34] uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#AD2F3B]" />
                    <span>SETOR (Departamento) *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSectorManagerOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#252A34] hover:bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 transition cursor-pointer"
                  >
                    <Settings className="w-3 h-3 text-slate-400" />
                    <span>Gerenciar Setores</span>
                  </button>
                </div>

                <select
                  id="form-setor"
                  value={isCustomSetor ? 'OUTRO' : setor}
                  onChange={(e) => {
                    if (e.target.value === 'OUTRO') {
                      setIsCustomSetor(true);
                    } else {
                      setIsCustomSetor(false);
                      setSetor(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#EAEAEA]/40 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34] font-semibold"
                >
                  {sectorNamesList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="OUTRO">+ Outro Departamento</option>
                </select>

                {isCustomSetor && (
                  <input
                    id="form-custom-setor"
                    type="text"
                    placeholder="Informe o departamento personalizado"
                    value={customSetor}
                    onChange={(e) => setCustomSetor(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2.5 text-sm bg-white border-2 border-[#AD2F3B] rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34]"
                  />
                )}
              </div>
            </div>

            {/* OBSERVAÇÕES (OPCIONAL) */}
            <div>
              <label
                htmlFor="form-observacoes"
                className="block text-xs font-bold text-[#252A34] uppercase tracking-wider mb-1.5"
              >
                Observações / Pauta da Reunião (Opcional)
              </label>
              <textarea
                id="form-observacoes"
                rows={2}
                placeholder="Ex: Necessário projetor HDMI, videoconferência ativa e 8 lugares..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#EAEAEA]/40 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34] font-medium"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                id="btn-cancelar-modal"
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-300 text-[#252A34] hover:bg-slate-100 text-sm font-bold transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                id="btn-salvar-reserva"
                type="submit"
                disabled={Boolean(realTimeConflict && !allowConflict)}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold font-raleway tracking-wide transition shadow-lg active:scale-95 ${
                  realTimeConflict && !allowConflict
                    ? 'bg-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-[#FF2E63] hover:bg-[#AD2F3B] shadow-[#FF2E63]/30 cursor-pointer'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {editingReservation
                    ? 'Atualizar Reserva'
                    : realTimeConflict
                    ? 'Confirmar Reserva com Conflito'
                    : 'Confirmar Reserva'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Gerenciador de Salas Integrado */}
      <RoomManagerModal
        isOpen={isRoomManagerOpen}
        onClose={() => setIsRoomManagerOpen(false)}
        onRoomsUpdated={handleRoomsUpdated}
        existingReservations={existingReservations}
        currentSelectedRoom={isCustomSala ? customSala : sala}
      />

      {/* Gerenciador de Setores Integrado */}
      <SectorManagerModal
        isOpen={isSectorManagerOpen}
        onClose={() => setIsSectorManagerOpen(false)}
        onSectorsUpdated={handleSectorsUpdated}
        existingReservations={existingReservations}
      />
    </>
  );
};
