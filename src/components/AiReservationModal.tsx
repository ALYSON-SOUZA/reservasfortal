import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Reservation } from '../types';
import { parseReservationWithAi, ParsedAiReservation } from '../services/aiService';
import { formatDateBR, hasTimeConflict } from '../utils/dateUtils';
import {
  X,
  Sparkles,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  Building,
  User,
  Ticket,
  Layers,
  Trash2,
  Edit2,
  HelpCircle,
  Loader2,
  RefreshCw,
  PlusCircle,
  ClipboardPaste,
  Copy
} from 'lucide-react';

interface AiReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReservations: (reservations: Array<Omit<Reservation, 'id' | 'criadoEm'>>) => void;
  existingReservations: Reservation[];
  initialImageFile?: File | null;
}

export const AiReservationModal: React.FC<AiReservationModalProps> = ({
  isOpen,
  onClose,
  onConfirmReservations,
  existingReservations,
  initialImageFile,
}) => {
  const [activeMode, setActiveMode] = useState<'text' | 'image'>('text');
  const [textPrompt, setTextPrompt] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [imageAdditionalText, setImageAdditionalText] = useState('');
  const [pastedNotification, setPastedNotification] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Generated results from AI
  const [generatedReservations, setGeneratedReservations] = useState<ParsedAiReservation[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedInitialFileRef = useRef<File | null>(null);

  // Função utilitária de desduplicação rigorosa (por dia + sala + horários)
  const deduplicateReservations = useCallback((list: ParsedAiReservation[]): ParsedAiReservation[] => {
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const unique: ParsedAiReservation[] = [];

    for (const item of list) {
      if (!item || !item.dia) continue;
      const diaNorm = String(item.dia).trim();
      const salaNorm = String(item.sala || '').trim().toLowerCase();
      const hInitNorm = String(item.horaInicial || '').trim();
      const hEndNorm = String(item.horaFinal || '').trim();
      
      // Chave única de unicidade de faixa
      const key = `${diaNorm}|${salaNorm}|${hInitNorm}|${hEndNorm}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }
    return unique;
  }, []);

  const processWithAi = useCallback(
    async (params: {
      text?: string;
      imageBase64?: string;
      mimeType?: string;
    }) => {
      setError(null);
      setAiSummary(null);
      setIsLoading(true);

      try {
        const response = await parseReservationWithAi(params);

        if (!response.success || !response.reservations || response.reservations.length === 0) {
          setError(
            response.error || 'A IA não conseguiu identificar reservas válidas no conteúdo fornecido.'
          );
        } else {
          const rawCount = response.reservations.length;
          const cleanList = deduplicateReservations(response.reservations);
          setGeneratedReservations(cleanList);
          
          const dupsRemoved = rawCount - cleanList.length;
          if (dupsRemoved > 0) {
            setPastedNotification(`Atenção: ${dupsRemoved} data(s) repetida(s) no documento foram unificadas.`);
          }

          setAiSummary(
            response.summary || `Foram identificadas ${cleanList.length} data(s)/faixa(s) de reserva únicas.`
          );
        }
      } catch (err: any) {
        setError(err.message || 'Falha ao processar com IA.');
      } finally {
        setIsLoading(false);
      }
    },
    [deduplicateReservations]
  );

  const handleFileSelect = useCallback(
    (file: File, autoAnalyze = false) => {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione ou cole um arquivo de imagem válido (PNG, JPG, WEBP).');
        return;
      }
      setError(null);
      setImageFileName(file.name || 'print_colado.png');
      setImageMimeType(file.type || 'image/png');

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const base64Str = e.target.result as string;
          setImageBase64(base64Str);
          setActiveMode('image');
          setPastedNotification('Imagem colada com sucesso! Analisando e gerando faixas únicas...');

          if (autoAnalyze) {
            processWithAi({
              imageBase64: base64Str,
              mimeType: file.type || 'image/png',
              text: imageAdditionalText,
            });
          }
        }
      };
      reader.readAsDataURL(file);
    },
    [imageAdditionalText, processWithAi]
  );

  // Carregar imagem inicial recebida por prop (apenas uma vez por arquivo)
  useEffect(() => {
    if (isOpen && initialImageFile && processedInitialFileRef.current !== initialImageFile) {
      processedInitialFileRef.current = initialImageFile;
      handleFileSelect(initialImageFile, true);
    }
  }, [isOpen, initialImageFile, handleFileSelect]);

  // Escuta global de colagem de imagem (Ctrl+V / Cmd+V)
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // Verificar se há imagem na área de transferência
      const items = clipboardData.items;
      let foundImage = false;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            foundImage = true;
            handleFileSelect(file, true);
            break;
          }
        }
      }

      if (!foundImage && activeMode === 'image' && clipboardData.getData('text')) {
        // Se estiver na aba de imagem e colar texto, repassa para o campo de instrução adicional
        const pastedText = clipboardData.getData('text');
        setImageAdditionalText((prev) => (prev ? `${prev} ${pastedText}` : pastedText));
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [isOpen, activeMode, handleFileSelect]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0], true);
    }
  };

  const handleProcessAiManual = () => {
    if (activeMode === 'text' && !textPrompt.trim()) {
      setError('Por favor, digite ou cole o texto com os detalhes da reserva.');
      return;
    }

    if (activeMode === 'image' && !imageBase64) {
      setError('Por favor, envie ou cole uma imagem com o print ou documento da reserva.');
      return;
    }

    processWithAi({
      text: activeMode === 'text' ? textPrompt : imageAdditionalText,
      imageBase64: activeMode === 'image' && imageBase64 ? imageBase64 : undefined,
      mimeType: imageMimeType,
    });
  };

  const handleRemoveReservation = (index: number) => {
    setGeneratedReservations((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleUpdateReservationField = (index: number, field: keyof ParsedAiReservation, value: string) => {
    setGeneratedReservations((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleConfirmAll = () => {
    if (generatedReservations.length === 0) return;

    const cleanList = generatedReservations.map((item) => ({
      dia: item.dia,
      sala: item.sala,
      horaInicial: item.horaInicial,
      horaFinal: item.horaFinal,
      solicitante: item.solicitante,
      setor: item.setor,
      glpi: (item.glpi || '').replace('#', '').trim(),
      observacoes: item.observacoes || '',
    }));

    onConfirmReservations(cleanList);
    onClose();
  };

  const applyExamplePrompt = (prompt: string) => {
    setActiveMode('text');
    setTextPrompt(prompt);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#252A34]/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-dm">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#7D1416]/20 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header do Modal com Bordô Oficial Bellinati Perez */}
        <div className="bg-[#7D1416] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#AD2F3B] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-raleway leading-tight text-white">
                  Assistente Inteligente de Reservas (IA)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#AD2F3B] text-white uppercase tracking-wider">
                  Gemini Flash
                </span>
              </div>
              <p className="text-xs text-white/80 font-dm">
                Cole texto ou envie uma imagem: reservas para múltiplos dias serão geradas individualmente
              </p>
            </div>
          </div>
          <button
            id="btn-fechar-modal-ia"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Banner de atalho de colar imagem */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#EAEAEA]/70 border border-slate-300 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-[#252A34] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                📋
              </div>
              <p className="text-xs text-[#252A34] font-semibold">
                <strong>Super Prático:</strong> Pressione <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded-md font-mono text-[11px] font-bold shadow-xs">Ctrl + V</kbd> (ou Cmd + V) em qualquer lugar para colar prints de tela do GLPI ou WhatsApp!
              </p>
            </div>

            {/* Botão de colar via API clipboard se disponível */}
            <button
              type="button"
              id="btn-colar-clipboard-ia"
              onClick={async () => {
                try {
                  if (navigator.clipboard && navigator.clipboard.read) {
                    const clipboardItems = await navigator.clipboard.read();
                    for (const item of clipboardItems) {
                      const imageType = item.types.find((type) => type.startsWith('image/'));
                      if (imageType) {
                        const blob = await item.getType(imageType);
                        const file = new File([blob], 'print_colado.png', { type: imageType });
                        handleFileSelect(file, true);
                        return;
                      }
                    }
                  }
                  // Fallback to text if no image
                  if (navigator.clipboard && navigator.clipboard.readText) {
                    const text = await navigator.clipboard.readText();
                    if (text) {
                      setActiveMode('text');
                      setTextPrompt(text);
                      setPastedNotification('Texto colado da área de transferência com sucesso!');
                    }
                  }
                } catch (e) {
                  setError('Clique na tela e pressione Ctrl+V no teclado para colar o print.');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-[#252A34] transition shadow-xs cursor-pointer active:scale-95 shrink-0"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-[#AD2F3B]" />
              <span>Colar do Clipboard</span>
            </button>
          </div>

          {pastedNotification && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {pastedNotification}
              </span>
              <button
                type="button"
                onClick={() => setPastedNotification(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* Modo de Entrada: Texto ou Imagem */}
          <div className="flex items-center gap-3 bg-[#EAEAEA]/40 p-1.5 rounded-2xl border border-slate-200">
            <button
              id="btn-modo-ia-texto"
              onClick={() => setActiveMode('text')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                activeMode === 'text'
                  ? 'bg-[#252A34] text-white shadow-md'
                  : 'text-[#252A34]/70 hover:text-[#252A34] hover:bg-white/60'
              }`}
            >
              <FileText className="w-4 h-4 text-[#AD2F3B]" />
              <span>Entrada por Texto / Mensagem</span>
            </button>

            <button
              id="btn-modo-ia-imagem"
              onClick={() => setActiveMode('image')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
                activeMode === 'image'
                  ? 'bg-[#252A34] text-white shadow-md'
                  : 'text-[#252A34]/70 hover:text-[#252A34] hover:bg-white/60'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-[#AD2F3B]" />
              <span>Entrada por Imagem / Print (Ctrl+V)</span>
            </button>
          </div>

          {/* Seção de Texto */}
          {activeMode === 'text' && (
            <div className="space-y-3">
              <label htmlFor="input-ia-texto" className="block text-xs font-bold text-[#252A34] uppercase tracking-wider flex items-center justify-between">
                <span>Descreva ou cole a solicitação de reserva:</span>
                <span className="text-[11px] font-medium text-slate-500 lowercase">suporta múltiplos dias e faixas</span>
              </label>
              <textarea
                id="input-ia-texto"
                rows={4}
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="Ex: Reservar o Auditório Principal nos dias 15, 16 e 17/08 das 11:00 às 14:00 para Alyson Souza, TI, GLPI #108920, treinamento anual..."
                className="w-full p-3.5 text-sm bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#AD2F3B] focus:border-[#AD2F3B] text-[#252A34] font-medium placeholder:text-slate-400 leading-relaxed resize-y"
              />

              {/* Exemplos Rápidos de 1 Clique */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-[#AD2F3B]" />
                  <span>Exemplos para testar com 1 clique:</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      applyExamplePrompt(
                        'Reservar o Auditório Principal para os dias 15, 16 e 17/08 de 11 as 14hs para Alyson Souza, setor TI, chamado GLPI #104999. Pauta: Treinamento de Novos Sistemas.'
                      )
                    }
                    className="text-xs bg-slate-100 hover:bg-[#AD2F3B]/10 hover:border-[#AD2F3B] text-[#252A34] border border-slate-300 px-3 py-1.5 rounded-xl transition text-left font-medium"
                  >
                    💡 <strong>Múltiplos Dias:</strong> 15, 16 e 17/08 de 11 às 14h (Auditório)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyExamplePrompt(
                        'Solicito a Sala 02 - Treinamento (Meireles) para os dias 18/08 a 20/08 das 08:30 às 11:30 para Mariana Silveira (Recursos Humanos), chamado 105120. Pauta: Integração de Colaboradores.'
                      )
                    }
                    className="text-xs bg-slate-100 hover:bg-[#FF2E63]/15 hover:border-[#FF2E63] text-[#252A34] border border-slate-300 px-3 py-1.5 rounded-xl transition text-left font-medium"
                  >
                    💡 <strong>Faixa de Datas:</strong> 18 a 20/08 (Sala 02 - RH)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyExamplePrompt(
                        'Reserva para Sala 01 - Aldeota hoje das 14:00 às 16:30 para Carlos Barreto da Diretoria Executiva, GLPI #104928. Alinhamento de metas.'
                      )
                    }
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-[#252A34] border border-slate-300 px-3 py-1.5 rounded-xl transition text-left font-medium"
                  >
                    💡 <strong>Dia Único:</strong> Hoje 14h às 16h30 (Sala 01)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Seção de Imagem */}
          {activeMode === 'image' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/jpg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0], true);
                  }
                }}
              />

              {!imageBase64 ? (
                <div
                  id="dropzone-ia-imagem"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#AD2F3B] hover:border-[#7D1416] bg-[#AD2F3B]/5 hover:bg-[#7D1416]/5 rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group relative"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-[#AD2F3B] group-hover:scale-110 transition">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#252A34]">
                      Pressione <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded-md font-mono text-xs font-bold text-[#AD2F3B]">Ctrl + V</kbd> para colar o print diretamente
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      ou arraste uma imagem aqui / <span className="text-[#AD2F3B] font-bold underline">clique para selecionar do computador</span>
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 border border-slate-200 rounded-full text-[11px] font-semibold text-slate-600 shadow-xs">
                    <span>✨ Análise e preenchimento automáticos ao colar</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-32 h-24 sm:w-40 sm:h-28 rounded-xl overflow-hidden border border-slate-300 shrink-0 bg-black/5">
                    <img
                      src={imageBase64}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#252A34] truncate max-w-xs">{imageFileName}</p>
                        <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Imagem interpretada com sucesso
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageBase64(null)}
                        className="text-xs text-[#AD2F3B] hover:bg-[#AD2F3B]/10 px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Trocar Print
                      </button>
                    </div>

                    <input
                      type="text"
                      value={imageAdditionalText}
                      onChange={(e) => setImageAdditionalText(e.target.value)}
                      placeholder="Instrução adicional opcional (ex: Priorizar Auditório, GLPI #105999)..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#AD2F3B] text-[#252A34]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botão de Execução da IA */}
          <div className="flex items-center justify-between pt-2">
            <button
              id="btn-processar-ia"
              onClick={handleProcessAiManual}
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-2xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-white font-bold font-raleway text-sm tracking-wide shadow-lg shadow-[#FF2E63]/30 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Analisando e Gerando Faixas de Reserva...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-white" />
                  <span>Gerar / Reprocessar Faixas com IA</span>
                </>
              )}
            </button>
          </div>

          {/* Mensagens de Erro */}
          {error && (
            <div className="p-4 rounded-2xl bg-[#7D1416]/10 border-2 border-[#AD2F3B]/30 text-[#7D1416] text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#AD2F3B] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold font-raleway">Ops! Ocorreu um problema:</p>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Resumo da IA */}
          {aiSummary && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{aiSummary}</span>
            </div>
          )}

          {/* LISTA DE RESERVAS GERADAS (UMA PARA CADA DIA/HORA) */}
          {generatedReservations.length > 0 && (() => {
            const conflictCount = generatedReservations.filter((item) =>
              hasTimeConflict(existingReservations, {
                dia: item.dia,
                sala: item.sala,
                horaInicial: item.horaInicial,
                horaFinal: item.horaFinal,
              }).hasConflict
            ).length;

            return (
            <div className="space-y-4 pt-2 border-t-2 border-slate-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-bold font-raleway text-[#252A34] flex items-center gap-2 flex-wrap">
                    <span>Faixas de Reservas Detectadas ({generatedReservations.length})</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#7D1416]/10 text-[#7D1416] border border-[#AD2F3B]/30 font-dm">
                      ✓ Sem duplicidades ({new Set(generatedReservations.map(r => r.dia)).size} dia(s) únicos)
                    </span>
                    {conflictCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 font-dm">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        {conflictCount} com sobreposição de horário
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 font-dm">
                    Revise cada item abaixo antes de confirmar o cadastro no sistema.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const clean = deduplicateReservations(generatedReservations);
                      setGeneratedReservations(clean);
                      setPastedNotification('Lista verificada: todas as duplicidades de datas foram removidas!');
                    }}
                    title="Garantir que não há datas repetidas"
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-[#252A34] font-bold px-3 py-1.5 rounded-xl border border-slate-300 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#AD2F3B]" />
                    <span>Verificar Duplicadas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sample = generatedReservations[0];
                      if (sample) {
                        setGeneratedReservations((prev) => [
                          ...prev,
                          { ...sample, dia: '2026-08-18' },
                        ]);
                      }
                    }}
                    className="text-xs bg-[#7D1416] text-white hover:bg-[#AD2F3B] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-white" />
                    <span>+ Adicionar Faixa</span>
                  </button>
                </div>
              </div>

              {/* Aviso global de conflito nos horários detectados */}
              {conflictCount > 0 && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-300/80 rounded-2xl text-amber-900 text-xs flex items-start gap-3 animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold font-raleway text-sm text-amber-950">
                      Sobreposição de Horários Detectada ({conflictCount} agendamento{conflictCount > 1 ? 's' : ''})
                    </p>
                    <p className="font-medium mt-0.5 leading-relaxed font-dm">
                      A IA aceitará e realizará o cadastro normalmente conforme solicitado. Os agendamentos conflitantes serão gravados e receberão <strong>marcações visuais de conflito</strong> nas tabelas, linha do tempo e relatórios para fácil identificação da equipe de Facilities.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3 font-dm">
                {generatedReservations.map((item, idx) => {
                  const conflict = hasTimeConflict(existingReservations, {
                    dia: item.dia,
                    sala: item.sala,
                    horaInicial: item.horaInicial,
                    horaFinal: item.horaFinal,
                  });

                  const isEditing = editingIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        conflict.hasConflict
                          ? 'border-amber-400 bg-amber-50/40 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-[#AD2F3B]/50 shadow-xs'
                      }`}
                    >
                      {/* Linha Superior: Dia, Horário e Ações */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-6 h-6 rounded-full bg-[#252A34] text-white text-xs font-bold font-mono flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div className="flex items-center gap-1.5 bg-[#7D1416]/10 text-[#7D1416] px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                            <Calendar className="w-3.5 h-3.5 text-[#AD2F3B]" />
                            <span>{formatDateBR(item.dia)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#AD2F3B]/10 text-[#7D1416] px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                            <Clock className="w-3.5 h-3.5 text-[#AD2F3B]" />
                            <span>
                              {item.horaInicial} às {item.horaFinal}
                            </span>
                          </div>
                          <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                            GLPI #{item.glpi}
                          </div>

                          {/* Badge de Conflito ou Livre */}
                          {conflict.hasConflict ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-200 text-amber-900 border border-amber-400 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              CONFLITO DE HORÁRIO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Horário Livre
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#252A34] hover:bg-slate-100 transition"
                            title="Editar esta faixa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveReservation(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#FF2E63] hover:bg-[#FF2E63]/10 transition"
                            title="Remover esta faixa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Alerta Detalhado de Conflito se houver */}
                      {conflict.hasConflict && conflict.conflictingWith && (
                        <div className="mt-2.5 p-3 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-xs font-medium space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-900">
                            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>Sobreposição detectada com reserva existente:</span>
                          </div>
                          <p className="pl-5 text-amber-900">
                            <strong>{conflict.conflictingWith.sala}</strong> ocupada por{' '}
                            <strong>{conflict.conflictingWith.solicitante}</strong> ({conflict.conflictingWith.setor}) das{' '}
                            <strong>{conflict.conflictingWith.horaInicial} às {conflict.conflictingWith.horaFinal}</strong> (GLPI #{conflict.conflictingWith.glpi}).
                          </p>
                          <p className="pl-5 text-[11px] text-amber-800 font-semibold italic">
                            ✓ O cadastro será concluído normalmente com o marcador de conflito sinalizado no painel.
                          </p>
                        </div>
                      )}

                      {/* Conteúdo Normal ou Modo de Edição */}
                      {!isEditing ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
                          <div>
                            <span className="text-slate-400 font-medium block">Sala:</span>
                            <span className="font-bold text-[#252A34]">{item.sala}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">Solicitante:</span>
                            <span className="font-semibold text-[#252A34]">{item.solicitante}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium block">Setor:</span>
                            <span className="font-semibold text-[#252A34]">{item.setor}</span>
                          </div>
                          {item.observacoes && (
                            <div className="sm:col-span-3 mt-1 text-slate-600 bg-slate-50 p-2 rounded-lg text-[11px]">
                              <strong>Obs:</strong> {item.observacoes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-200">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dia</label>
                            <input
                              type="date"
                              value={item.dia}
                              onChange={(e) => handleUpdateReservationField(idx, 'dia', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border rounded-lg font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hora Início</label>
                            <input
                              type="time"
                              value={item.horaInicial}
                              onChange={(e) => handleUpdateReservationField(idx, 'horaInicial', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border rounded-lg font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hora Fim</label>
                            <input
                              type="time"
                              value={item.horaFinal}
                              onChange={(e) => handleUpdateReservationField(idx, 'horaFinal', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border rounded-lg font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sala</label>
                            <input
                              type="text"
                              value={item.sala}
                              onChange={(e) => handleUpdateReservationField(idx, 'sala', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border rounded-lg font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Solicitante</label>
                            <input
                              type="text"
                              value={item.solicitante}
                              onChange={(e) => handleUpdateReservationField(idx, 'solicitante', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border rounded-lg font-medium"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GLPI</label>
                            <input
                              type="text"
                              value={item.glpi}
                              onChange={(e) => handleUpdateReservationField(idx, 'glpi', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border rounded-lg font-mono font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            id="btn-cancelar-ia-modal"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200 text-xs font-bold transition"
          >
            Cancelar
          </button>

          {generatedReservations.length > 0 && (
            <button
              id="btn-confirmar-todas-ia"
              type="button"
              onClick={handleConfirmAll}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-white text-sm font-bold font-raleway shadow-lg shadow-[#FF2E63]/30 transition active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Confirmar e Cadastrar {generatedReservations.length} Reserva{generatedReservations.length > 1 ? 's' : ''}
              </span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
