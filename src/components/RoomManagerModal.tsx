import React, { useState, useEffect } from 'react';
import { Sala, Reservation, Filial } from '../types';
import { salaService } from '../services/salaService';
import { filialService } from '../services/filialService';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Building,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Search,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react';

interface RoomManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomsUpdated: (rooms: Sala[]) => void;
  existingReservations?: Reservation[];
  currentSelectedRoom?: string;
}

export const RoomManagerModal: React.FC<RoomManagerModalProps> = ({
  isOpen,
  onClose,
  onRoomsUpdated,
  existingReservations = [],
  currentSelectedRoom,
}) => {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [registeredFiliais, setRegisteredFiliais] = useState<Filial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [filial, setFilial] = useState('Maringá (Matriz)');
  const [capacidade, setCapacidade] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [ativa, setAtiva] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Filter / Search in Modal
  const [searchTerm, setSearchTerm] = useState('');
  const [filialFilter, setFilialFilter] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  // Carrega todas as salas e filiais ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [resSalas, resFiliais] = await Promise.all([
        salaService.getAll({ apenasAtivas: false }),
        filialService.getAll({ apenasAtivas: true }),
      ]);
      setSalas(resSalas.data);
      onRoomsUpdated(resSalas.data);
      if (resFiliais.data && resFiliais.data.length > 0) {
        setRegisteredFiliais(resFiliais.data);
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Não foi possível carregar a lista de salas e filiais.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setNome('');
    setFilial('Maringá (Matriz)');
    setCapacidade('');
    setObservacoes('');
    setAtiva(true);
    setFormError(null);
  };

  const handleStartEdit = (sala: Sala) => {
    setIsEditing(true);
    setEditingId(sala.id);
    setNome(sala.nome);
    setFilial(sala.filial || 'Maringá (Matriz)');
    setCapacidade(sala.capacidade ? String(sala.capacidade) : '');
    setObservacoes('');
    setAtiva(sala.ativa);
    setFormError(null);
  };

  const handleSaveSala = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedNome = nome.trim();
    const trimmedFilial = filial.trim();

    if (!trimmedNome) {
      setFormError('Por favor, informe o nome da sala (campo obrigatório).');
      return;
    }
    if (!trimmedFilial) {
      setFormError('Por favor, inclua ou selecione a filial da sala (campo obrigatório).');
      return;
    }

    const parsedCapacidade = capacidade.trim() ? parseInt(capacidade, 10) : null;
    if (parsedCapacidade === null || isNaN(parsedCapacidade) || parsedCapacidade <= 0) {
      setFormError('Por favor, informe a capacidade de lugares da sala (campo obrigatório, valor maior que zero).');
      return;
    }

    const dup = salas.find(
      (s) => s.nome.toLowerCase() === trimmedNome.toLowerCase() && s.id !== editingId
    );
    if (dup) {
      setFormError(`Já existe uma sala cadastrada com o nome "${trimmedNome}".`);
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && editingId) {
        const res = await salaService.update(editingId, {
          nome: trimmedNome,
          filial: trimmedFilial,
          capacidade: parsedCapacidade,
          ativa,
        });

        if (res.data) {
          const updatedList = salas.map((s) => (s.id === editingId ? res.data! : s));
          setSalas(updatedList);
          onRoomsUpdated(updatedList);
          setFeedbackMessage({
            type: 'success',
            text: `Sala "${trimmedNome}" atualizada com sucesso!`,
          });
          resetForm();
        }
      } else {
        const res = await salaService.create({
          nome: trimmedNome,
          filial: trimmedFilial,
          capacidade: parsedCapacidade,
          ativa,
        });

        if (res.data) {
          const updatedList = [...salas, res.data];
          setSalas(updatedList);
          onRoomsUpdated(updatedList);
          setFeedbackMessage({
            type: 'success',
            text: `Sala "${trimmedNome}" criada com sucesso!`,
          });
          resetForm();
        }
      }
    } catch {
      setFormError('Erro ao gravar sala. Verifique a conexão com o Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSala = async (sala: Sala) => {
    const hasReservations = existingReservations.some(
      (r) => r.sala.trim().toLowerCase() === sala.nome.trim().toLowerCase()
    );

    if (hasReservations) {
      const confirmDeactivate = window.confirm(
        `A sala "${sala.nome}" possui reservas vinculadas no sistema.\n\nPor segurança e integridade de auditoria, deseja apenas DESATIVAR a sala em vez de excluí-la definitivamente?`
      );

      if (confirmDeactivate) {
        setIsLoading(true);
        const res = await salaService.update(sala.id, { ativa: false });
        if (res.data) {
          const updatedList = salas.map((s) => (s.id === sala.id ? res.data! : s));
          setSalas(updatedList);
          onRoomsUpdated(updatedList);
          setFeedbackMessage({
            type: 'info',
            text: `Sala "${sala.nome}" foi desativada e não aparecerá para novas reservas.`,
          });
        }
        setIsLoading(false);
      }
      return;
    }

    const confirmDelete = window.confirm(
      `Tem certeza que deseja excluir permanentemente a sala "${sala.nome}"? Esta ação não pode ser desfeita.`
    );

    if (!confirmDelete) return;

    setIsLoading(true);
    const res = await salaService.delete(sala.id);
    if (res.success) {
      const updatedList = salas.filter((s) => s.id !== sala.id);
      setSalas(updatedList);
      onRoomsUpdated(updatedList);
      setFeedbackMessage({
        type: 'success',
        text: `Sala "${sala.nome}" excluída com sucesso!`,
      });
      if (editingId === sala.id) {
        resetForm();
      }
    }
    setIsLoading(false);
  };

  const filteredSalas = salas.filter((s) => {
    if (showOnlyActive && !s.ativa) return false;
    if (filialFilter && s.filial !== filialFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNome = s.nome.toLowerCase().includes(term);
      const matchFilial = (s.filial || '').toLowerCase().includes(term);
      return matchNome || matchFilial;
    }
    return true;
  });

  const distinctFiliaisInSalas = Array.from(
    new Set([...salas.map((s) => s.filial), ...registeredFiliais.map((f) => f.nome)].filter(Boolean))
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-dm-sans animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
      >
        {/* Header do Modal em Bordô #7D1416 (Brandbook Bellinati Perez) */}
        <div className="bg-[#7D1416] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-[#AD2F3B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-raleway flex items-center gap-2">
                Gerenciar Salas de Reunião
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/30">
                  Supabase CRUD
                </span>
              </h2>
              <p className="text-xs text-[#EAEAEA]/80 font-dm-sans">
                Cadastre, edite ou desative salas disponíveis para agendamentos — Bellinati Perez
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
            title="Fechar gerenciador de salas"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : feedbackMessage.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Conteúdo com Scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5 font-dm-sans">
          {/* Formulário de Criação / Edição */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-[#7D1416] font-raleway flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Edit2 className="w-4 h-4 text-[#AD2F3B]" /> Editando Sala Selecionada
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-[#AD2F3B]" /> Cadastrar Nova Sala
                  </>
                )}
              </h3>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-slate-500 hover:text-[#7D1416] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Cancelar Edição
                </button>
              )}
            </div>

            {/* Alerta de Regra Cadastral */}
            <div className="mb-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#7D1416]">* Regra:</span>
                <span>Todos os campos são obrigatórios, exceto o campo para observações.</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                Filial Obrigatória
              </span>
            </div>

            {formError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSala} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Nome */}
                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-raleway">
                    Nome da Sala <span className="text-[#AD2F3B] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Sala 05 - Reunião VIP"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] text-slate-800 font-medium font-dm"
                    required
                  />
                </div>

                {/* Filial */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1 font-raleway flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#AD2F3B]" />
                    <span>Filial / Unidade <span className="text-[#AD2F3B] font-bold">*</span></span>
                  </label>
                  <select
                    value={filial}
                    required
                    onChange={(e) => setFilial(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] text-slate-800 font-semibold"
                  >
                    {registeredFiliais.length > 0 ? (
                      registeredFiliais.map((f) => (
                        <option key={f.id} value={f.nome}>
                          {f.isMatriz ? `⭐ ${f.nome}` : f.nome}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Maringá (Matriz)">⭐ Maringá (Matriz)</option>
                        <option value="Curitiba Park & Business">Curitiba Park & Business</option>
                        <option value="Curitiba/CEBP">Curitiba/CEBP</option>
                        <option value="Curitiba/Marechal">Curitiba/Marechal</option>
                        <option value="Curitiba/Toronto">Curitiba/Toronto</option>
                        <option value="Fortaleza/planalto">Fortaleza/planalto</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Capacidade */}
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1 font-raleway">
                    <Users className="w-3 h-3 text-slate-500" />
                    <span>Lugares <span className="text-[#AD2F3B] font-bold">*</span></span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={capacidade}
                    onChange={(e) => setCapacidade(e.target.value)}
                    placeholder="Ex: 12"
                    className="w-full px-2.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] text-slate-800 font-medium text-center"
                  />
                </div>

                {/* Observações da Sala - ÚNICO CAMPO OPCIONAL */}
                <div className="sm:col-span-12">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 font-raleway">
                      Observações da Sala
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                      Único campo opcional
                    </span>
                  </div>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Possui conectividade HDMI e ar-condicionado independente (opcional)"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Opções e Botão Salvar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ativa}
                    onChange={(e) => setAtiva(e.target.checked)}
                    className="w-4 h-4 text-[#7D1416] rounded border-slate-300 focus:ring-[#AD2F3B]"
                  />
                  <span>Sala ativa para agendamentos</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7D1416] hover:bg-[#AD2F3B] text-white font-bold text-xs font-raleway shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-white" />
                    <span>{isEditing ? 'Atualizar Sala' : 'Cadastrar Sala'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Filtros e Busca da Lista */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar sala ou filial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 text-slate-800 font-dm-sans"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {distinctFiliaisInSalas.length > 0 && (
                <select
                  value={filialFilter}
                  onChange={(e) => setFilialFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-medium"
                >
                  <option value="">Todas as Filiais</option>
                  {distinctFiliaisInSalas.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => setShowOnlyActive(!showOnlyActive)}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  showOnlyActive
                    ? 'bg-[#AD2F3B]/10 text-[#7D1416] border-[#AD2F3B]/30'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {showOnlyActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span>{showOnlyActive ? 'Apenas Ativas' : 'Todas'}</span>
              </button>
            </div>
          </div>

          {/* Tabela / Lista de Salas */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-[#7D1416] text-white px-4 py-2.5 text-xs font-bold font-raleway grid grid-cols-12 gap-2 items-center">
              <span className="col-span-5 sm:col-span-6">SALA / IDENTIFICAÇÃO</span>
              <span className="col-span-3 sm:col-span-3">FILIAL & CAPACIDADE</span>
              <span className="col-span-4 sm:col-span-3 text-right">AÇÕES</span>
            </div>

            <div className="divide-y divide-slate-100 bg-white font-dm-sans">
              {filteredSalas.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-medium">
                  Nenhuma sala encontrada com os filtros aplicados.
                </div>
              ) : (
                filteredSalas.map((s) => {
                  const isCurrent = currentSelectedRoom === s.nome;
                  return (
                    <div
                      key={s.id}
                      className={`px-4 py-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50 transition ${
                        !s.ativa ? 'bg-slate-50/70 opacity-75' : ''
                      } ${isCurrent ? 'bg-rose-50/50 border-l-4 border-l-[#AD2F3B]' : ''}`}
                    >
                      {/* Nome e Badge */}
                      <div className="col-span-5 sm:col-span-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#7D1416] font-raleway text-xs sm:text-sm">
                            {s.nome}
                          </span>
                          {!s.ativa && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
                              Desativada
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#AD2F3B]/10 text-[#7D1416]">
                              Em uso no form
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Filial e Lugares */}
                      <div className="col-span-3 sm:col-span-3 text-slate-600">
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3 h-3 text-[#AD2F3B]" /> {s.filial}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Users className="w-2.5 h-2.5 text-slate-400" />
                            {s.capacidade ? `${s.capacidade} lugares` : 'Capac. livre'}
                          </span>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="col-span-4 sm:col-span-3 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#7D1416] hover:bg-slate-200 transition cursor-pointer"
                          title="Editar dados da sala"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSala(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#AD2F3B] hover:bg-[#AD2F3B]/10 transition cursor-pointer"
                          title="Excluir ou desativar sala"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs font-dm-sans">
          <span className="text-slate-500">
            Total de {salas.length} salas cadastradas ({salas.filter((s) => s.ativa).length} ativas)
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#252A34] text-white hover:bg-black font-bold font-raleway transition cursor-pointer"
          >
            Concluir & Voltar à Reserva
          </button>
        </div>
      </div>
    </div>
  );
};
