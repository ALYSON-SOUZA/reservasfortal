import React, { useState, useEffect } from 'react';
import { Filial, Sala, Reservation, AppUser } from '../types';
import { filialService } from '../services/filialService';
import { canEditOrDelete } from '../utils/rbac';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Search,
  Crown,
  Eye,
  EyeOff,
  Building,
  Users,
  ShieldAlert,
} from 'lucide-react';

interface BranchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFiliaisUpdated: (filiais: Filial[]) => void;
  existingSalas?: Sala[];
  existingReservations?: Reservation[];
  currentUser?: AppUser | null;
}

export const BranchManagerModal: React.FC<BranchManagerModalProps> = ({
  isOpen,
  onClose,
  onFiliaisUpdated,
  existingSalas = [],
  existingReservations = [],
  currentUser,
}) => {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Form State: Registro da Filial
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Campos do formulário (Todos obrigatórios, exceto observações)
  const [nome, setNome] = useState(''); // Campo Filial (Nome da Unidade) - Obrigatório
  const [cidade, setCidade] = useState(''); // Cidade - Obrigatório
  const [estado, setEstado] = useState('PR'); // Estado (UF) - Obrigatório
  const [endereco, setEndereco] = useState(''); // Endereço - Obrigatório
  const [responsavel, setResponsavel] = useState(''); // Responsável - Obrigatório
  const [observacoes, setObservacoes] = useState(''); // Observações - ÚNICO CAMPO OPCIONAL
  const [isMatriz, setIsMatriz] = useState(false);
  const [ativa, setAtiva] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Busca e filtro
  const [searchTerm, setSearchTerm] = useState('');

  const isMaster = canEditOrDelete(currentUser);

  useEffect(() => {
    if (isOpen) {
      loadFiliais();
    }
  }, [isOpen]);

  const loadFiliais = async () => {
    setIsLoading(true);
    try {
      const res = await filialService.getAll({ apenasAtivas: false });
      setFiliais(res.data);
      onFiliaisUpdated(res.data);
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'Não foi possível carregar a lista de filiais.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setNome('');
    setCidade('');
    setEstado('PR');
    setEndereco('');
    setResponsavel('');
    setObservacoes('');
    setIsMatriz(false);
    setAtiva(true);
    setFormError(null);
  };

  const handleStartEdit = (f: Filial) => {
    if (!isMaster) {
      setFeedbackMessage({
        type: 'error',
        text: 'Acesso Restrito: Apenas usuários autenticados com Senha Master podem editar filiais.',
      });
      return;
    }
    setIsEditing(true);
    setEditingId(f.id);
    setNome(f.nome);
    setCidade(f.cidade);
    setEstado(f.estado);
    setEndereco(f.endereco);
    setResponsavel(f.responsavel);
    setObservacoes(f.observacoes || '');
    setIsMatriz(f.isMatriz);
    setAtiva(f.ativa);
    setFormError(null);
  };

  const handleSaveFilial = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validação estrita: Todos os campos devem ser obrigatórios, exceto observações
    const trimmedNome = nome.trim();
    const trimmedCidade = cidade.trim();
    const trimmedEstado = estado.trim();
    const trimmedEndereco = endereco.trim();
    const trimmedResponsavel = responsavel.trim();

    if (!trimmedNome) {
      setFormError('Por favor, informe o campo Filial / Nome da Unidade (obrigatório).');
      return;
    }
    if (!trimmedCidade) {
      setFormError('Por favor, informe a Cidade da filial (campo obrigatório).');
      return;
    }
    if (!trimmedEstado) {
      setFormError('Por favor, informe a UF / Estado da filial (campo obrigatório).');
      return;
    }
    if (!trimmedEndereco) {
      setFormError('Por favor, informe o Endereço completo da filial (campo obrigatório).');
      return;
    }
    if (!trimmedResponsavel) {
      setFormError('Por favor, informe o Responsável da filial (campo obrigatório).');
      return;
    }

    if (isEditing && !isMaster) {
      setFormError('Permissão negada: apenas usuários Master podem alterar dados cadastrais de filiais.');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && editingId) {
        const res = await filialService.update(editingId, {
          nome: trimmedNome,
          cidade: trimmedCidade,
          estado: trimmedEstado,
          endereco: trimmedEndereco,
          responsavel: trimmedResponsavel,
          observacoes: observacoes.trim(), // Observações é opcional
          isMatriz,
          ativa,
          modificadoPor: currentUser?.primeiroNome || 'Operador',
        });

        if (res.error) {
          setFormError(res.error);
        } else if (res.data) {
          const updated = filiais.map((item) => (item.id === editingId ? res.data! : item));
          setFiliais(updated);
          onFiliaisUpdated(updated);
          setFeedbackMessage({
            type: 'success',
            text: `Filial "${trimmedNome}" atualizada com sucesso!`,
          });
          resetForm();
        }
      } else {
        const res = await filialService.create({
          nome: trimmedNome,
          cidade: trimmedCidade,
          estado: trimmedEstado,
          endereco: trimmedEndereco,
          responsavel: trimmedResponsavel,
          observacoes: observacoes.trim(), // Observações é opcional
          isMatriz,
          ativa,
          modificadoPor: currentUser?.primeiroNome || 'Operador',
        });

        if (res.error) {
          setFormError(res.error);
        } else if (res.data) {
          const updated = [...filiais, res.data];
          setFiliais(updated);
          onFiliaisUpdated(updated);
          setFeedbackMessage({
            type: 'success',
            text: `Filial "${trimmedNome}" cadastrada com sucesso!`,
          });
          resetForm();
        }
      }
    } catch {
      setFormError('Erro ao gravar dados da filial. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFilial = async (f: Filial) => {
    if (!isMaster) {
      setFeedbackMessage({
        type: 'error',
        text: 'Acesso Restrito: Apenas usuários autenticados com Senha Master podem excluir filiais.',
      });
      return;
    }

    if (f.isMatriz) {
      setFeedbackMessage({
        type: 'error',
        text: 'A Matriz Maringá não pode ser excluída do sistema corporativo.',
      });
      return;
    }

    const linkedRooms = existingSalas.filter(
      (s) => s.filial.toLowerCase().trim() === f.nome.toLowerCase().trim()
    );

    if (linkedRooms.length > 0) {
      alert(
        `A filial "${f.nome}" possui ${linkedRooms.length} sala(s) vinculada(s). Por favor, remova ou transfira as salas antes de excluir a filial.`
      );
      return;
    }

    const confirmDel = window.confirm(`Deseja realmente excluir a filial "${f.nome}"?`);
    if (!confirmDel) return;

    setIsLoading(true);
    try {
      const res = await filialService.delete(f.id);
      if (res.success) {
        const updated = filiais.filter((item) => item.id !== f.id);
        setFiliais(updated);
        onFiliaisUpdated(updated);
        setFeedbackMessage({
          type: 'success',
          text: `Filial "${f.nome}" excluída com sucesso!`,
        });
        if (editingId === f.id) resetForm();
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Erro ao excluir filial.' });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Erro ao excluir filial.' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFiliais = filiais.filter((f) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      f.nome.toLowerCase().includes(term) ||
      f.cidade.toLowerCase().includes(term) ||
      f.endereco.toLowerCase().includes(term) ||
      f.responsavel.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-dm">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal - Bordô #7D1416 */}
        <div className="shrink-0 bg-[#7D1416] text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b-2 border-[#AD2F3B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-bold shadow-md shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-raleway leading-tight text-white">
                  Gerenciamento e Registro de Filiais
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wide uppercase">
                  {filiais.length} Unidades
                </span>
              </div>
              <p className="text-xs text-[#EAEAEA]/80 font-medium">
                Cadastre e mantenha as unidades e filiais da Bellinati Perez
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : feedbackMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-b border-rose-200'
                : 'bg-blue-50 text-blue-800 border-b border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-xs font-bold hover:underline ml-2"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* FORMULÁRIO: REGISTRO DA FILIAL */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-[#7D1416] font-raleway flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Edit2 className="w-4 h-4 text-[#AD2F3B]" /> Editando Filial Selecionada
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-[#AD2F3B]" /> Registro de Nova Filial
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

            {/* Alerta de Obrigatoriedade */}
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium flex items-center gap-2">
              <span className="font-bold text-[#7D1416]">* Regra:</span>
              <span>Todos os campos são obrigatórios, exceto o campo de observações.</span>
            </div>

            {formError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveFilial} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                {/* CAMPO FILIAL (NOME DA UNIDADE) - OBRIGATÓRIO */}
                <div className="sm:col-span-6">
                  <label
                    htmlFor="filial-form-nome"
                    className="block text-xs font-bold text-slate-700 mb-1 font-raleway flex items-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#AD2F3B]" />
                    <span>Filial (Nome da Unidade) <span className="text-[#FF2E63] font-black">*</span></span>
                  </label>
                  <input
                    id="filial-form-nome"
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Curitiba Park & Business ou São Paulo / Faria Lima"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] text-slate-800 font-bold"
                  />
                </div>

                {/* CIDADE - OBRIGATÓRIO */}
                <div className="sm:col-span-4">
                  <label
                    htmlFor="filial-form-cidade"
                    className="block text-xs font-bold text-slate-700 mb-1 font-raleway flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#AD2F3B]" />
                    <span>Cidade <span className="text-[#FF2E63] font-black">*</span></span>
                  </label>
                  <input
                    id="filial-form-cidade"
                    type="text"
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: Maringá, Curitiba, Fortaleza"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] text-slate-800 font-semibold"
                  />
                </div>

                {/* ESTADO / UF - OBRIGATÓRIO */}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="filial-form-estado"
                    className="block text-xs font-bold text-slate-700 mb-1 font-raleway"
                  >
                    UF <span className="text-[#FF2E63] font-black">*</span>
                  </label>
                  <select
                    id="filial-form-estado"
                    required
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] text-slate-800 font-bold text-center"
                  >
                    <option value="PR">PR</option>
                    <option value="CE">CE</option>
                    <option value="SP">SP</option>
                    <option value="RJ">RJ</option>
                    <option value="SC">SC</option>
                    <option value="RS">RS</option>
                    <option value="MG">MG</option>
                    <option value="BA">BA</option>
                    <option value="GO">GO</option>
                    <option value="DF">DF</option>
                    <option value="PE">PE</option>
                  </select>
                </div>

                {/* ENDEREÇO COMPLETO - OBRIGATÓRIO */}
                <div className="sm:col-span-7">
                  <label
                    htmlFor="filial-form-endereco"
                    className="block text-xs font-bold text-slate-700 mb-1 font-raleway"
                  >
                    Endereço / Localização <span className="text-[#FF2E63] font-black">*</span>
                  </label>
                  <input
                    id="filial-form-endereco"
                    type="text"
                    required
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Ex: Av. Duque de Caxias, 882 - Zona 01"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] text-slate-800 font-medium"
                  />
                </div>

                {/* RESPONSÁVEL / FACILITIES - OBRIGATÓRIO */}
                <div className="sm:col-span-5">
                  <label
                    htmlFor="filial-form-responsavel"
                    className="block text-xs font-bold text-slate-700 mb-1 font-raleway flex items-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>Responsável / Contato <span className="text-[#FF2E63] font-black">*</span></span>
                  </label>
                  <input
                    id="filial-form-responsavel"
                    type="text"
                    required
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Ex: Facilities Matriz / Alyson Souza"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] text-slate-800 font-medium"
                  />
                </div>

                {/* OBSERVAÇÕES - ÚNICO CAMPO OPCIONAL */}
                <div className="sm:col-span-12">
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="filial-form-observacoes"
                      className="block text-xs font-bold text-slate-700 font-raleway"
                    >
                      Observações da Filial
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-md">
                      Único campo opcional
                    </span>
                  </div>
                  <textarea
                    id="filial-form-observacoes"
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Horário de funcionamento, regras de acesso predial, portaria, estacionamento conveniado..."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Opções e Salvar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ativa}
                      onChange={(e) => setAtiva(e.target.checked)}
                      className="w-4 h-4 text-[#7D1416] rounded border-slate-300 focus:ring-[#AD2F3B]"
                    />
                    <span>Filial ativa no sistema</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isMatriz}
                      onChange={(e) => setIsMatriz(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span className="flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span>Matriz Principal</span>
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7D1416] hover:bg-[#AD2F3B] text-white font-bold text-xs font-raleway shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-white" />
                  <span>{isEditing ? 'Atualizar Filial' : 'Salvar Filial'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* LISTAGEM DE FILIAIS */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-bold text-slate-800 font-raleway flex items-center gap-2">
                <span>Filiais Cadastradas</span>
                <span className="text-xs font-semibold text-slate-500">
                  ({filteredFiliais.length} encontradas)
                </span>
              </h3>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar filial por nome, cidade ou endereço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] text-slate-800 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFiliais.map((f) => {
                const roomCount = existingSalas.filter(
                  (s) => s.filial.toLowerCase().trim() === f.nome.toLowerCase().trim()
                ).length;

                return (
                  <div
                    key={f.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      f.id === editingId
                        ? 'border-[#AD2F3B] ring-2 ring-[#AD2F3B]/20 bg-rose-50/30'
                        : f.isMatriz
                        ? 'border-amber-300 bg-amber-50/40'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            f.isMatriz
                              ? 'bg-amber-400 text-[#252A34] shadow-xs'
                              : 'bg-[#7D1416]/10 text-[#7D1416]'
                          }`}
                        >
                          {f.isMatriz ? <Crown className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm font-raleway flex items-center gap-1.5">
                            <span>{f.nome}</span>
                            {f.isMatriz && (
                              <span className="px-1.5 py-0.2 bg-amber-400 text-[#252A34] rounded text-[9px] font-black uppercase tracking-wider">
                                Matriz
                              </span>
                            )}
                          </h4>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#AD2F3B]" />
                            {f.cidade} - {f.estado}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(f)}
                          title={isMaster ? 'Editar filial' : 'Apenas usuários Master podem editar'}
                          className={`p-1.5 rounded-lg border text-slate-600 transition cursor-pointer ${
                            isMaster
                              ? 'hover:bg-slate-100 hover:text-[#7D1416] border-slate-200'
                              : 'opacity-40 cursor-not-allowed border-slate-200'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!f.isMatriz && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFilial(f)}
                            title={isMaster ? 'Excluir filial' : 'Apenas usuários Master podem excluir'}
                            className={`p-1.5 rounded-lg border text-rose-600 transition cursor-pointer ${
                              isMaster
                                ? 'hover:bg-rose-50 border-rose-200'
                                : 'opacity-40 cursor-not-allowed border-slate-200'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1 mb-1">
                      <strong className="text-slate-700">Endereço:</strong> {f.endereco}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-1 mb-2">
                      <strong className="text-slate-700">Responsável:</strong> {f.responsavel}
                    </p>

                    {f.observacoes && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 mb-2 italic">
                        "{f.observacoes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="inline-flex items-center gap-1 text-slate-600 font-semibold text-[11px]">
                        <Building2 className="w-3 h-3 text-[#7D1416]" />
                        {roomCount} {roomCount === 1 ? 'sala cadastrada' : 'salas cadastradas'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          f.ativa
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {f.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#AD2F3B]" />
            Bellinati Perez Gestão de Unidades e Facilities
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
