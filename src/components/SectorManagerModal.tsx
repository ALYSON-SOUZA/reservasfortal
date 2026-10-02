import React, { useState, useEffect } from 'react';
import { Setor, Reservation } from '../types';
import { setorService } from '../services/setorService';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react';

interface SectorManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSectorsUpdated: (sectors: Setor[]) => void;
  existingReservations?: Reservation[];
}

export const SectorManagerModal: React.FC<SectorManagerModalProps> = ({
  isOpen,
  onClose,
  onSectorsUpdated,
  existingReservations = [],
}) => {
  const [sectors, setSectors] = useState<Setor[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSectors();
      resetForm();
    }
  }, [isOpen]);

  const loadSectors = async () => {
    const res = await setorService.getAll({ apenasAtivos: false });
    setSectors(res.data);
    onSectorsUpdated(res.data);
  };

  const resetForm = () => {
    setNome('');
    setDescricao('');
    setAtivo(true);
    setEditingId(null);
    setFormError(null);
  };

  const handleStartEdit = (sec: Setor) => {
    setEditingId(sec.id);
    setNome(sec.nome);
    setDescricao(sec.descricao || '');
    setAtivo(sec.ativo);
    setFormError(null);
    setActionSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setActionSuccess(null);

    const trimmedNome = nome.trim();
    if (!trimmedNome) {
      setFormError('Por favor, informe o nome do setor.');
      return;
    }

    const dup = sectors.find(
      (s) => s.nome.toLowerCase() === trimmedNome.toLowerCase() && s.id !== editingId
    );
    if (dup) {
      setFormError(`O setor "${trimmedNome}" já está cadastrado.`);
      return;
    }

    if (editingId) {
      const res = await setorService.update(editingId, {
        nome: trimmedNome,
        descricao: descricao.trim() || undefined,
        ativo,
      });
      if (res.data) {
        setActionSuccess(`Setor "${trimmedNome}" atualizado com sucesso!`);
        await loadSectors();
        resetForm();
      } else {
        setFormError('Falha ao atualizar setor no Supabase.');
      }
    } else {
      const res = await setorService.create({
        nome: trimmedNome,
        descricao: descricao.trim() || undefined,
        ativo,
      });
      if (res.data) {
        setActionSuccess(`Setor "${trimmedNome}" adicionado com sucesso!`);
        await loadSectors();
        resetForm();
      } else {
        setFormError('Falha ao criar novo setor no Supabase.');
      }
    }
  };

  const handleDelete = async (sec: Setor) => {
    const isUsed = existingReservations.some(
      (r) => r.setor.toLowerCase() === sec.nome.toLowerCase()
    );

    if (isUsed) {
      const deactivate = window.confirm(
        `O setor "${sec.nome}" possui reservas registradas. Deseja apenas desativá-lo para que não apareça em novas reservas?`
      );
      if (deactivate) {
        await setorService.update(sec.id, { ativo: false });
        setActionSuccess(`Setor "${sec.nome}" desativado com sucesso.`);
        await loadSectors();
      }
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir permanentemente o setor "${sec.nome}"?`)) {
      const res = await setorService.delete(sec.id);
      if (res.success) {
        setActionSuccess(`Setor "${sec.nome}" removido.`);
        if (editingId === sec.id) resetForm();
        await loadSectors();
      }
    }
  };

  const filteredSectors = sectors.filter((s) =>
    s.nome.toLowerCase().includes(search.toLowerCase()) ||
    (s.descricao && s.descricao.toLowerCase().includes(search.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-dm-sans animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header Modal em Bordô #7D1416 (Brandbook Bellinati Perez) */}
        <div className="bg-[#7D1416] text-white p-5 flex items-center justify-between border-b-2 border-[#AD2F3B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-raleway text-white">Gerenciador de Setores & Departamentos</h2>
              <p className="text-xs text-[#EAEAEA]/80 font-dm-sans">
                Cadastre e personalize os setores da Bellinati Perez
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 font-dm-sans">
          {/* Alerts */}
          {actionSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-[#AD2F3B] shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#7D1416] font-raleway flex items-center gap-1.5">
                {editingId ? <Edit2 className="w-3.5 h-3.5 text-[#AD2F3B]" /> : <Plus className="w-3.5 h-3.5 text-[#AD2F3B]" />}
                {editingId ? 'Editar Setor' : 'Adicionar Novo Setor'}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-500 hover:text-[#7D1416] underline cursor-pointer"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-raleway">Nome do Setor *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Controladoria, Recursos Humanos"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] outline-hidden font-dm-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-raleway">Descrição / Finalidade</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Gestão e Operações"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B]/20 focus:border-[#AD2F3B] outline-hidden font-dm-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="w-4 h-4 text-[#7D1416] rounded-md focus:ring-[#AD2F3B] cursor-pointer"
                />
                <span>Setor Ativo (visível nos formulários)</span>
              </label>

              <button
                type="submit"
                className="px-4 py-2 bg-[#7D1416] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway rounded-xl transition shadow-xs cursor-pointer"
              >
                {editingId ? 'Salvar Alterações' : 'Cadastrar Setor'}
              </button>
            </div>
          </form>

          {/* List Search & Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-[#7D1416] uppercase tracking-wider font-raleway">
                Setores Cadastrados ({filteredSectors.length})
              </h4>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar setor..."
                  className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-hidden font-dm-sans"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-56 overflow-y-auto font-dm-sans">
              {filteredSectors.map((sec) => (
                <div key={sec.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${sec.ativo ? 'bg-emerald-500' : 'bg-slate-300'}`}
                      title={sec.ativo ? 'Ativo' : 'Desativado'}
                    />
                    <div>
                      <div className="text-xs font-bold text-[#252A34]">{sec.nome}</div>
                      {sec.descricao && <div className="text-[11px] text-slate-500">{sec.descricao}</div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(sec)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#7D1416] hover:bg-slate-100 transition cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sec)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#AD2F3B] hover:bg-[#AD2F3B]/10 transition cursor-pointer"
                      title="Excluir / Desativar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end font-dm-sans">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-[#252A34] text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
