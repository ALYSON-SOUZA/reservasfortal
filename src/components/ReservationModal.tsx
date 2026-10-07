import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Reservation, Sala, Setor, AppUser } from '../types';
import { DEFAULT_SALAS, DEFAULT_SETORES } from '../utils/mockData';
import { getTodayString, hasTimeConflict, formatDateBR, formatDateTimeBR, parseGlpiNumber } from '../utils/dateUtils';
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
  Star,
  MapPin,
  Building2,
} from 'lucide-react';
import { salaService } from '../services/salaService';
import { setorService } from '../services/setorService';
import { filialService } from '../services/filialService';
import { RoomManagerModal } from './RoomManagerModal';
import { SectorManagerModal } from './SectorManagerModal';
import { BranchManagerModal } from './BranchManagerModal';

export const FILIAIS_OFICIAIS = [
  'Maringá (Matriz)',
  'Curitiba Park & Business',
  'Curitiba/CEBP',
  'Curitiba/Marechal',
  'Curitiba/Toronto',
  'Fortaleza/planalto',
] as const;

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
  
  // Campo Filial (Unidade) - Obrigatório
  const [filial, setFilial] = useState<string>('Maringá (Matriz)');
  const [customFilial, setCustomFilial] = useState('');
  const [isCustomFilial, setIsCustomFilial] = useState(false);
  const [availableFiliais, setAvailableFiliais] = useState<string[]>([...FILIAIS_OFICIAIS]);
  const [isBranchManagerOpen, setIsBranchManagerOpen] = useState(false);

  // Sala - Obrigatório
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

  // Horários - Obrigatórios
  const [horaInicial, setHoraInicial] = useState('08:00');
  const [horaFinal, setHoraFinal] = useState('09:00');

  // Solicitante e Setor - Obrigatórios
  const [solicitante, setSolicitante] = useState('');
  const [setor, setSetor] = useState('');
  const [customSetor, setCustomSetor] = useState('');
  const [isCustomSetor, setIsCustomSetor] = useState(false);

  // GLPI - Obrigatório
  const [glpi, setGlpi] = useState('');

  // Observações - ÚNICO CAMPO OPCIONAL
  const [observacoes, setObservacoes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Carregar salas, setores e filiais
  const loadSalasAndSetores = async () => {
    try {
      const [resSalas, resSetores, resFiliais] = await Promise.all([
        salaService.getAll({ apenasAtivas: true }),
        setorService.getAll({ apenasAtivos: true }),
        filialService.getAll({ apenasAtivas: true }),
      ]);
      if (resSalas.data && resSalas.data.length > 0) {
        setAvailableSalas(resSalas.data);
      }
      if (resSetores.data && resSetores.data.length > 0) {
        setAvailableSetores(resSetores.data);
      }
      if (resFiliais.data && resFiliais.data.length > 0) {
        const names = Array.from(new Set([...FILIAIS_OFICIAIS, ...resFiliais.data.map((f) => f.nome)]));
        setAvailableFiliais(names);
      }
    } catch (err) {
      console.error('Erro ao carregar salas/setores/filiais:', err);
    }
  };

  const handleFiliaisUpdated = (updatedFiliais: any[]) => {
    if (updatedFiliais && updatedFiliais.length > 0) {
      const names = Array.from(new Set([...FILIAIS_OFICIAIS, ...updatedFiliais.map((f) => f.nome)]));
      setAvailableFiliais(names);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSalasAndSetores();
    }
  }, [isOpen]);

  // Inicialização ao abrir (edição ou nova reserva)
  useEffect(() => {
    if (editingReservation) {
      setDia(editingReservation.dia);

      // Filial
      const resFilial = editingReservation.filial || '';
      if (resFilial) {
        if (FILIAIS_OFICIAIS.includes(resFilial as any)) {
          setFilial(resFilial);
          setIsCustomFilial(false);
          setCustomFilial('');
        } else {
          setFilial('OUTRA');
          setIsCustomFilial(true);
          setCustomFilial(resFilial);
        }
      } else {
        const matchRoom = availableSalas.find((s) => s.nome.toLowerCase() === editingReservation.sala.toLowerCase());
        const inferred = matchRoom?.filial || 'Maringá (Matriz)';
        setFilial(inferred);
        setIsCustomFilial(false);
        setCustomFilial('');
      }

      // Sala
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
      // Default nova reserva
      setDia(initialValues?.dia || getTodayString());

      const matchInitialRoom = availableSalas.find((s) => s.nome === initialValues?.sala);
      const defaultFilial = matchInitialRoom?.filial || 'Maringá (Matriz)';
      setFilial(defaultFilial);
      setIsCustomFilial(false);
      setCustomFilial('');

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

  // Filial ativa atual
  const currentActiveFilial = isCustomFilial ? customFilial.trim() : filial.trim();

  // Salas filtradas por filial para facilitar a seleção
  const availableSalasForFilial = useMemo(() => {
    if (!currentActiveFilial) return availableSalas;
    const target = currentActiveFilial.toLowerCase().trim();
    const filtered = availableSalas.filter((s) => {
      if (!s.filial) return false;
      const sFilial = s.filial.toLowerCase().trim();
      if (sFilial === target) return true;
      if (target.includes('maringá') && sFilial.includes('maringá')) return true;
      if (target.includes('curitiba') && target.includes('toronto') && sFilial.includes('toronto')) return true;
      if (target.includes('marechal') && sFilial.includes('marechal')) return true;
      if (target.includes('park') && sFilial.includes('park')) return true;
      if (target.includes('fortaleza') && sFilial.includes('fortaleza')) return true;
      return false;
    });
    return filtered.length > 0 ? filtered : availableSalas;
  }, [availableSalas, currentActiveFilial]);

  // Lista de nomes de salas
  const roomNamesList = useMemo(() => {
    if (availableSalasForFilial.length > 0) {
      return availableSalasForFilial.map((s) => s.nome);
    }
    return DEFAULT_SALAS;
  }, [availableSalasForFilial]);

  // Objeto da Sala selecionada
  const selectedSalaObj = useMemo(() => {
    const currentName = isCustomSala ? customSala : sala;
    return availableSalas.find((s) => s.nome.toLowerCase() === currentName.toLowerCase());
  }, [availableSalas, sala, customSala, isCustomSala]);

  // Detector de Conflitos em Tempo Real
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
      const room = updatedRooms.find((r) => r.nome === selectedRoomName);
      if (room && room.filial) {
        if (FILIAIS_OFICIAIS.includes(room.filial as any)) {
          setFilial(room.filial);
          setIsCustomFilial(false);
        }
      }
    }
  };

  const handleSectorsUpdated = (updatedSectors: Setor[]) => {
    setAvailableSetores(updatedSectors.filter((s) => s.ativo));
  };

  const sectorNamesList = availableSetores.length > 0 ? availableSetores.map((s) => s.nome) : DEFAULT_SETORES;

  // Ao alterar filial, sincroniza e atualiza salas compatíveis
  const handleFilialSelectChange = (newFilialVal: string) => {
    if (newFilialVal === 'OUTRA') {
      setIsCustomFilial(true);
      setFilial('OUTRA');
    } else {
      setIsCustomFilial(false);
      setFilial(newFilialVal);
      // Auto-seleciona a primeira sala da nova filial caso a sala atual não pertença a ela
      const roomsInFilial = availableSalas.filter(
        (s) => s.filial && s.filial.toLowerCase().trim() === newFilialVal.toLowerCase().trim()
      );
      if (roomsInFilial.length > 0 && !roomsInFilial.some((r) => r.nome === sala)) {
        setSala(roomsInFilial[0].nome);
        setIsCustomSala(false);
        setCustomSala('');
      }
    }
  };

  // Ao alterar sala, sincroniza a filial automaticamente caso a sala possua filial vinculada
  const handleSalaSelectChange = (newSalaVal: string) => {
    if (newSalaVal === 'OUTRA') {
      setIsCustomSala(true);
    } else {
      setIsCustomSala(false);
      setSala(newSalaVal);
      const roomObj = availableSalas.find((s) => s.nome === newSalaVal);
      if (roomObj && roomObj.filial) {
        if (FILIAIS_OFICIAIS.includes(roomObj.filial as any)) {
          setFilial(roomObj.filial);
          setIsCustomFilial(false);
          setCustomFilial('');
        } else {
          setFilial('OUTRA');
          setIsCustomFilial(true);
          setCustomFilial(roomObj.filial);
        }
      }
    }
  };

  // Submissão com validação obrigatória estrita em todos os campos, exceto observações
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalFilial = isCustomFilial ? customFilial.trim() : filial.trim();
    const finalSala = isCustomSala ? customSala.trim() : sala.trim();
    const finalSetor = isCustomSetor ? customSetor.trim() : setor.trim();

    // Validação Rigorosa: Todos os campos são obrigatórios, exceto observações
    if (!dia) {
      setError('Por favor, informe a data da reserva (campo obrigatório).');
      return;
    }
    if (!finalFilial) {
      setError('Por favor, selecione ou informe a filial da reserva (campo obrigatório).');
      return;
    }
    if (!finalSala) {
      setError('Por favor, selecione ou informe o nome da sala (campo obrigatório).');
      return;
    }
    if (!glpi.trim()) {
      setError('Por favor, informe o número do chamado GLPI (campo obrigatório).');
      return;
    }
    if (!horaInicial || !horaFinal) {
      setError('Por favor, defina o horário de início e término da reunião (campos obrigatórios).');
      return;
    }
    if (horaInicial >= horaFinal) {
      setError('O horário de término deve ser estritamente posterior ao horário de início.');
      return;
    }
    if (!solicitante.trim()) {
      setError('Por favor, informe o nome do solicitante responsável (campo obrigatório).');
      return;
    }
    if (!finalSetor) {
      setError('Por favor, selecione ou informe o setor responsável (campo obrigatório).');
      return;
    }

    if (realTimeConflict && !allowConflict) {
      setAllowConflict(true);
    }

    onSave({
      id: editingReservation ? editingReservation.id : undefined,
      dia,
      filial: finalFilial,
      sala: finalSala,
      horaInicial,
      horaFinal,
      solicitante: solicitante.trim(),
      setor: finalSetor,
      glpi: glpi.replace('#', '').trim(),
      observacoes: observacoes.trim(), // Único campo opcional
      criadoPor: editingReservation?.criadoPor || currentUser?.primeiroNome || 'Operador',
      criadoPorCpf: editingReservation?.criadoPorCpf || currentUser?.cpf || '',
      modificadoPor: currentUser?.primeiroNome || 'Operador',
      modificadoPorCpf: currentUser?.cpf || '',
      modificadoEm: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-dm-sans">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header em Bordô #7D1416 (Brandbook Bellinati Perez) */}
          <div className="shrink-0 bg-[#7D1416] text-white px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between border-b-2 border-[#AD2F3B]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold shadow-md shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-raleway leading-tight text-white">
                  {editingReservation ? 'Editar Reserva de Sala' : 'Nova Reserva de Sala — Bellinati Perez'}
                </h2>
                <p className="text-[11px] sm:text-xs text-[#EAEAEA]/80 font-dm-sans font-medium">
                  Preencha os campos obrigatórios (*) e vincule o chamado GLPI
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
          <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-dm-sans">
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

            {/* Live Conflict Warning Banner com Regra de Antiguidade GLPI */}
            {realTimeConflict && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold font-raleway text-sm text-amber-900">
                      ⚠️ Conflito de Horário Detectado!
                    </p>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                      Regra: Menor GLPI Prioritário
                    </span>
                  </div>
                  <p className="mt-0.5 leading-relaxed font-semibold">
                    A sala <strong>{isCustomSala ? customSala : sala}</strong> já está agendada para{' '}
                    <strong>{realTimeConflict.solicitante}</strong> ({realTimeConflict.setor}) das{' '}
                    <strong>{realTimeConflict.horaInicial} às {realTimeConflict.horaFinal}</strong> (GLPI #{realTimeConflict.glpi}).
                  </p>

                  {/* Análise de Precedência GLPI em Tempo Real */}
                  {glpi.trim() && parseGlpiNumber(glpi) !== Number.MAX_SAFE_INTEGER && (
                    <div className="mt-2">
                      {parseGlpiNumber(glpi) < parseGlpiNumber(realTimeConflict.glpi) ? (
                        <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-950 font-semibold flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-emerald-700 fill-emerald-500 shrink-0" />
                          <span>
                            ⭐ <strong>Prioridade por Antiguidade:</strong> O chamado digitado (#{glpi.trim()}) é mais antigo que o chamado concorrente (#{realTimeConflict.glpi}), recebendo prioridade no sistema.
                          </span>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-950 font-semibold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>
                            ⚠️ <strong>Precedência Concorrente:</strong> O chamado existente (#{realTimeConflict.glpi} - {realTimeConflict.solicitante}) é mais antigo e manterá a prioridade da sala.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <label className="mt-2.5 flex items-center gap-2 p-2 bg-amber-100/80 border border-amber-300 rounded-xl cursor-pointer hover:bg-amber-200/70 transition">
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
                  <p className="font-medium font-dm-sans">{error}</p>
                </div>
              </div>
            )}

            {/* Banner Informativo de Regra Cadastral */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#7D1416]">* Regra Cadastral:</span>
                <span>Todos os campos são obrigatórios, exceto o campo para observações.</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                Filial Obrigatória
              </span>
            </div>

            {/* LINHA 1: DIA E FILIAL (CAMPOS OBRIGATÓRIOS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* DIA */}
              <div>
                <label
                  htmlFor="form-dia"
                  className="block text-xs font-bold text-[#252A34] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#AD2F3B]" />
                  <span>DIA (Data da Reserva) <span className="text-[#FF2E63] font-black">*</span></span>
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

              {/* FILIAL (CAMPO OBRIGATÓRIO) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="form-filial"
                    className="text-xs font-bold text-[#252A34] uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#AD2F3B]" />
                    <span>FILIAL (Unidade) <span className="text-[#FF2E63] font-black">*</span></span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsBranchManagerOpen(true)}
                    title="Cadastrar nova filial ou gerenciar unidades"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#252A34] hover:bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 transition cursor-pointer"
                  >
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>Gerenciar Filiais</span>
                  </button>
                </div>
                <select
                  id="form-filial"
                  required
                  value={isCustomFilial ? 'OUTRA' : filial}
                  onChange={(e) => handleFilialSelectChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#EAEAEA]/40 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] font-bold"
                >
                  {availableFiliais.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                  <option value="OUTRA">+ Outra Filial (Digitar manualmente)</option>
                </select>

                {isCustomFilial && (
                  <input
                    id="form-custom-filial"
                    type="text"
                    required
                    placeholder="Informe o nome da filial personalizada"
                    value={customFilial}
                    onChange={(e) => setCustomFilial(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 text-sm bg-white border-2 border-[#AD2F3B] rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34] font-semibold"
                  />
                )}
              </div>
            </div>

            {/* LINHA 2: SALA E GLPI (CAMPOS OBRIGATÓRIOS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SALA COM GESTÃO INTEGRADA */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="form-sala"
                    className="text-xs font-bold text-[#252A34] uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Building className="w-3.5 h-3.5 text-[#252A34]" />
                    <span>SALA (Espaço) <span className="text-[#FF2E63] font-black">*</span></span>
                  </label>
                  <button
                    type="button"
                    id="btn-gerenciar-salas-inline"
                    onClick={() => setIsRoomManagerOpen(true)}
                    title="Gerenciar lista de salas"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#252A34] hover:bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 transition cursor-pointer"
                  >
                    <Settings className="w-3 h-3 text-slate-400" />
                    <span>Gerenciar Salas</span>
                  </button>
                </div>

                <select
                  id="form-sala"
                  required
                  value={isCustomSala ? 'OUTRA' : sala}
                  onChange={(e) => handleSalaSelectChange(e.target.value)}
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
                    required
                    placeholder="Informe o nome da sala personalizada"
                    value={customSala}
                    onChange={(e) => setCustomSala(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 text-sm bg-white border-2 border-[#AD2F3B] rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34] font-semibold"
                  />
                )}
              </div>

              {/* GLPI */}
              <div>
                <label
                  htmlFor="form-glpi"
                  className="block text-xs font-bold text-[#252A34] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <Ticket className="w-3.5 h-3.5 text-[#AD2F3B]" />
                  <span>Nº CHAMADO GLPI <span className="text-[#FF2E63] font-black">*</span></span>
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

            {/* LINHA 3: HORÁRIOS INICIAL E FINAL (CAMPOS OBRIGATÓRIOS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="form-hora-inicial"
                  className="block text-xs font-bold text-[#252A34] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-[#AD2F3B]" />
                  <span>Hora Inicial (Início) <span className="text-[#FF2E63] font-black">*</span></span>
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
                  <span>Hora Final (Término) <span className="text-[#FF2E63] font-black">*</span></span>
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

            {/* LINHA 4: SOLICITANTE E SETOR (CAMPOS OBRIGATÓRIOS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="form-solicitante"
                  className="block text-xs font-bold text-[#252A34] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-[#252A34]" />
                  <span>SOLICITANTE (Responsável) <span className="text-[#FF2E63] font-black">*</span></span>
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
                    <span>SETOR (Departamento) <span className="text-[#FF2E63] font-black">*</span></span>
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
                  required
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
                    required
                    placeholder="Informe o departamento personalizado"
                    value={customSetor}
                    onChange={(e) => setCustomSetor(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 text-sm bg-white border-2 border-[#AD2F3B] rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34]"
                  />
                )}
              </div>
            </div>

            {/* LINHA 5: OBSERVAÇÕES / PAUTA DA REUNIÃO (OPCIONAL - ÚNICO CAMPO NÃO OBRIGATÓRIO) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="form-observacoes"
                  className="block text-xs font-bold text-[#252A34] uppercase tracking-wider"
                >
                  Observações / Pauta da Reunião
                </label>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Opcional
                </span>
              </div>
              <textarea
                id="form-observacoes"
                rows={2}
                placeholder="Ex: Necessário projetor HDMI, videoconferência ativa e 8 lugares..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#EAEAEA]/40 border-2 border-[#252A34]/15 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34] font-medium"
              />
            </div>

            {/* Footer Buttons: Fixo na parte inferior */}
            <div className="shrink-0 pt-3 pb-1 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-xs z-10">
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
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold font-raleway tracking-wide transition shadow-lg active:scale-95 bg-[#FF2E63] hover:bg-[#AD2F3B] shadow-[#FF2E63]/30 cursor-pointer"
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

      {/* Gerenciador de Filiais Integrado */}
      <BranchManagerModal
        isOpen={isBranchManagerOpen}
        onClose={() => setIsBranchManagerOpen(false)}
        onFiliaisUpdated={handleFiliaisUpdated}
        existingSalas={availableSalas}
        existingReservations={existingReservations}
        currentUser={currentUser}
      />
    </>
  );
};
