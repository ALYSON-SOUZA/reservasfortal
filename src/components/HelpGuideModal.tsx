import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  BookOpen,
  Sparkles,
  HelpCircle,
  Search,
  Send,
  Plus,
  Filter,
  Building,
  Layers,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Bot,
  User,
  ChevronRight,
  Lightbulb,
  ShieldCheck,
  ArrowRight,
  Bell,
} from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewModal?: () => void;
  onOpenFilterModal?: () => void;
  onOpenRoomManagerModal?: () => void;
  onOpenSectorManagerModal?: () => void;
  onOpenReportModal?: () => void;
  onOpenAiModal?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const FAQ_SUGGESTIONS = [
  'Como criar uma nova reserva de sala?',
  'Como funcionam os avisos automáticos 15 minutos antes?',
  'Como funciona o botão ❌ para limpar filtros?',
  'O que acontece se duas pessoas tentarem reservar a mesma sala no mesmo horário?',
  'Como cadastrar uma nova sala ou alterar a capacidade?',
  'Como exportar o relatório em PDF ou Excel/CSV?',
  'Como usar o Assistente IA para ler e-mails ou fotos?',
];

const TUTORIAL_STEPS = [
  {
    id: 'step-1',
    stepNumber: '01',
    title: 'Acesso e Auditoria Segura',
    icon: ShieldCheck,
    color: 'from-cyan-500 to-teal-600',
    borderColor: 'border-cyan-500/40',
    summary: 'Identificação rápida com Nome e CPF para controle de acessos.',
    details: [
      'Ao entrar no sistema, informe seu **Nome** e **CPF**.',
      'O sistema registrará seu **primeiro nome** e a **data/hora exata** em todas as operações (criação, edição e exclusão).',
      'Seu perfil fica visível no topo, ao lado do título da aplicação, garantindo transparência.',
    ],
    tip: 'Para trocar de usuário ou sair, clique no ícone de saída ao lado do seu nome.',
  },
  {
    id: 'step-2',
    stepNumber: '02',
    title: 'Cadastrando uma Nova Reserva',
    icon: Plus,
    color: 'from-[#FF2E63] to-rose-600',
    borderColor: 'border-[#FF2E63]/40',
    summary: 'Agendamento simplificado com validação automática de choques de horário.',
    details: [
      'Clique no botão vermelho **+ NOVA RESERVA** no topo direito.',
      'Selecione a **Sala** desejada e defina a **Data** da reunião.',
      'Insira os **Horários Inicial e Final** (ex: 09:00 às 10:30).',
      'Informe o **Solicitante**, o **Setor** e o número do chamado **GLPI**.',
      'Clique em **Salvar Reserva**.',
    ],
    tip: 'O sistema bloqueia conflitos na mesma sala e avisa imediatamente caso o horário já esteja ocupado!',
  },
  {
    id: 'step-3',
    stepNumber: '03',
    title: 'Filtros Avançados e Limpeza com ❌',
    icon: Filter,
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/40',
    summary: 'Encontre reuniões rapidamente e limpe filtros com um único clique.',
    details: [
      'Clique em **Filtros** no cabeçalho para filtrar por **Período (Data Inicial e Final)**, **Solicitante**, **GLPI**, **Sala** ou **Setor**.',
      'Você também pode marcar para **Exibir Reuniões Encerradas**.',
      'Sempre que houver qualquer filtro ativo, um botão com o emoji **❌** surgirá no topo e na faixa de filtros.',
      'Clique no **❌** para limpar todos os filtros instantaneamente e voltar à visão completa.',
    ],
    tip: 'Você também pode clicar no "x" de um filtro individual para remover apenas aquele critério.',
  },
  {
    id: 'step-4',
    stepNumber: '04',
    title: 'Edição, Cópia e Cancelamento',
    icon: Calendar,
    color: 'from-purple-500 to-indigo-600',
    borderColor: 'border-purple-500/40',
    summary: 'Gerenciamento completo das reservas existentes na lista.',
    details: [
      '**Editar**: Clique no ícone de **Lápis** na linha da reserva para alterar horário, sala ou responsável.',
      '**Copiar Dados**: Clique no botão de **Copiar** para gerar o resumo formatado pronto para envio no WhatsApp ou e-mail.',
      '**Excluir**: Clique no ícone de **Lixeira** e confirme a exclusão com segurança.',
    ],
    tip: 'O histórico de quem realizou a última alteração é atualizado automaticamente.',
  },
  {
    id: 'step-5',
    stepNumber: '05',
    title: 'Gestão de Salas e Filiais',
    icon: Building,
    color: 'from-emerald-500 to-teal-700',
    borderColor: 'border-emerald-500/40',
    summary: 'Cadastre novos espaços, configure capacidade e filiais.',
    details: [
      'Clique no botão **Salas** na barra superior.',
      'Veja todas as salas ativas, capacidades e localizações.',
      'Clique em **+ Nova Sala** para adicionar um novo espaço, informando a **Filial** e a **Capacidade de Pessoas**.',
    ],
    tip: 'Você pode desativar temporariamente uma sala em manutenção sem perder o histórico.',
  },
  {
    id: 'step-6',
    stepNumber: '06',
    title: 'Relatórios & Exportação (PDF / CSV)',
    icon: Printer,
    color: 'from-blue-500 to-indigo-700',
    borderColor: 'border-blue-500/40',
    summary: 'Gere relatórios gerenciais e comprovantes com 1 clique.',
    details: [
      'Clique no botão **Relatório** no menu superior.',
      'Filtre por período (Hoje, Esta Semana, Este Mês ou Datas Livres).',
      'Visualize o total de horas e reuniões por sala.',
      'Clique em **Imprimir / PDF** ou **Exportar CSV** para salvar.',
    ],
    tip: 'Os relatórios contêm cabeçalho oficial pronto para impressão em papel A4.',
  },
  {
    id: 'step-7',
    stepNumber: '07',
    title: 'Assistente Inteligente por IA',
    icon: Sparkles,
    color: 'from-pink-500 to-rose-600',
    borderColor: 'border-pink-500/40',
    summary: 'Agende reuniões colando mensagens, e-mails ou anexando prints.',
    details: [
      'Clique no botão **IA** com ícone de brilho no cabeçalho.',
      'Cole o texto de uma solicitação de reunião (mesmo informal) ou anexe uma foto/print de chamado GLPI.',
      'A Inteligência Artificial reconhece datas, múltiplos dias, salas e horários sem duplicidades.',
      'Confira a prévia e clique em **Confirmar** para agendar tudo de uma vez.',
    ],
    tip: 'A IA é capaz de extrair reuniões recorrentes e separar em agendamentos individuais.',
  },
  {
    id: 'step-8',
    stepNumber: '08',
    title: 'Notificações Agendadas no Navegador (15 min)',
    icon: Bell,
    color: 'from-amber-500 to-orange-600',
    borderColor: 'border-amber-500/40',
    summary: 'Avisos automáticos na tela e som de alerta 15 minutos antes de cada reserva.',
    details: [
      'Clique no botão **Avisos 15m** no cabeçalho ou no banner principal.',
      'Autorize o navegador a exibir notificações na área de trabalho.',
      'Exatamente **15 minutos antes** de cada reunião começar, o sistema dispara um alerta sonoro e um pop-up nativo com a Sala, Horário, Solicitante e Chamado GLPI.',
      'Ao clicar na notificação, a janela do sistema é trazida para frente e o detalhamento completo do chamado GLPI é aberto instantaneamente.',
      'Você também pode testar a qualquer momento pelo botão **Testar Notificação Agora**.',
    ],
    tip: 'Caso o navegador esteja com notificações bloqueadas, o sistema continuará emitindo chime sonoro e alerta visual em tempo real.',
  },
];

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenNewModal,
  onOpenFilterModal,
  onOpenRoomManagerModal,
  onOpenSectorManagerModal,
  onOpenReportModal,
  onOpenAiModal,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'ai-qa'>('guide');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedStepId, setSelectedStepId] = useState<string>('step-1');

  // AI Q&A State
  const [questionInput, setQuestionInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Olá! Sou o Assistente de Dúvidas do **Sistema de Reserva de Salas da Bellinati Perez**. 🤖\n\nComo posso ajudar você hoje? Você pode digitar qualquer pergunta sobre como agendar, filtrar, resolver conflitos ou usar os recursos do sistema!',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'ai-qa' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab, isLoadingAi]);

  if (!isOpen) return null;

  const handleAskQuestion = async (textToAsk?: string) => {
    const query = (textToAsk || questionInput).trim();
    if (!query || isLoadingAi) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setQuestionInput('');
    setIsLoadingAi(true);

    try {
      const response = await fetch('/api/ai/ask-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          history: chatMessages.map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.answer || 'Dúvida processada com sucesso.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: data.error || 'Não consegui processar a resposta no momento. Por favor, tente novamente.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'Erro ao conectar ao assistente inteligente. Verifique sua conexão e tente novamente.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoadingAi(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const filteredSteps = TUTORIAL_STEPS.filter(
    (step) =>
      step.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      step.summary.toLowerCase().includes(searchFilter.toLowerCase()) ||
      step.details.some((d) => d.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const currentStep = TUTORIAL_STEPS.find((s) => s.id === selectedStepId) || TUTORIAL_STEPS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#16181F]/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#252A34] text-white w-full max-w-5xl rounded-2xl sm:rounded-3xl border-2 border-[#AD2F3B]/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all">
        {/* Header com Abas e Fechar */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#252A34] via-[#1E222B] to-[#252A34]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#7D1416] border border-[#AD2F3B] flex items-center justify-center text-white shadow-lg shrink-0 font-black">
              <BookOpen className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-raleway tracking-tight text-white leading-tight">
                  Central de Ajuda & Como Usar
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#AD2F3B]/30 text-white border border-[#AD2F3B]/50 font-raleway uppercase">
                  Bellinati Perez
                </span>
              </div>
              <p className="text-xs text-[#EAEAEA]/80 font-dm mt-0.5">
                Aprenda o passo a passo completo ou tire suas dúvidas diretamente com a Inteligência Artificial.
              </p>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-1 rounded-xl flex items-center border border-white/15">
              <button
                type="button"
                id="tab-guia-passo-a-passo"
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-raleway flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-[#7D1416] text-white shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Passo a Passo</span>
              </button>

              <button
                type="button"
                id="tab-tira-duvidas-ia"
                onClick={() => {
                  setActiveTab('ai-qa');
                  setTimeout(() => inputRef.current?.focus(), 150);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-raleway flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'ai-qa'
                    ? 'bg-[#AD2F3B] text-white shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Tira-Dúvidas com IA</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-fechar-help-modal"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TAB 1: PASSO A PASSO (GUIA VISUAL) */}
        {activeTab === 'guide' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Campo de Pesquisa no Guia */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#AD2F3B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar tópico do passo a passo..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#16181F] border border-white/20 text-white placeholder:text-white/40 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-hidden focus:border-[#AD2F3B]"
                />
                {searchFilter && (
                  <button
                    onClick={() => setSearchFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Clique em qualquer etapa abaixo para ver instruções detalhadas.</span>
              </div>
            </div>

            {/* Grid de Passos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Menu Lateral de Etapas */}
              <div className="md:col-span-1 space-y-2 max-h-[52vh] overflow-y-auto pr-1">
                {filteredSteps.map((step) => {
                  const Icon = step.icon;
                  const isSelected = selectedStepId === step.id;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setSelectedStepId(step.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? `bg-white/15 ${step.borderColor} border-2 shadow-lg shadow-[#AD2F3B]/10`
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs`}
                      >
                        {step.stepNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-white font-raleway flex items-center justify-between">
                          <span className="truncate">{step.title}</span>
                          <ChevronRight className={`w-3.5 h-3.5 text-white/50 transition-transform ${isSelected ? 'translate-x-1 text-[#AD2F3B]' : ''}`} />
                        </div>
                        <p className="text-[11px] text-white/70 line-clamp-2 mt-0.5 leading-snug font-dm">
                          {step.summary}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detalhes da Etapa Selecionada */}
              <div className="md:col-span-2 bg-[#1E222B] rounded-2xl border border-white/15 p-5 flex flex-col justify-between shadow-inner">
                <div>
                  <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${currentStep.color} flex items-center justify-center text-white shadow-lg`}>
                      <currentStep.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold text-[#AD2F3B] tracking-wider uppercase font-raleway">
                        Passo {currentStep.stepNumber} de {TUTORIAL_STEPS.length}
                      </span>
                      <h3 className="text-lg font-bold font-raleway text-white">
                        {currentStep.title}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3 font-dm">
                    <p className="text-xs font-semibold text-white bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                      🎯 {currentStep.summary}
                    </p>

                    <div className="space-y-2 pt-2">
                      {currentStep.details.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-[#EAEAEA] leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 text-[#AD2F3B] shrink-0 mt-0.5" />
                          <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </div>
                      ))}
                    </div>

                    {currentStep.tip && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mt-4 text-xs text-amber-200 flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>Dica Pro:</strong> {currentStep.tip}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações Rápidas de Atalho */}
                <div className="pt-5 border-t border-white/10 mt-5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-white/50">Deseja experimentar agora?</span>
                  <div className="flex items-center gap-2">
                    {currentStep.id === 'step-2' && onOpenNewModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenNewModal();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Abrir Nova Reserva</span>
                      </button>
                    )}

                    {currentStep.id === 'step-3' && onOpenFilterModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenFilterModal();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#AD2F3B] hover:bg-[#7D1416] text-white text-xs font-bold font-raleway flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>Abrir Filtros</span>
                      </button>
                    )}

                    {currentStep.id === 'step-5' && onOpenRoomManagerModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenRoomManagerModal();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold font-raleway flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Building className="w-3.5 h-3.5" />
                        <span>Gerenciar Salas</span>
                      </button>
                    )}

                    {currentStep.id === 'step-6' && onOpenReportModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenReportModal();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold font-raleway flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Abrir Relatórios</span>
                      </button>
                    )}

                    {currentStep.id === 'step-7' && onOpenAiModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAiModal();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#7D1416] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Assistente IA</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('ai-qa');
                        setQuestionInput(`Como funciona o ${currentStep.title}?`);
                        setTimeout(() => inputRef.current?.focus(), 150);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#AD2F3B]/20 hover:bg-[#AD2F3B]/30 text-white border border-[#AD2F3B]/40 text-xs font-bold font-raleway flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Tirar Dúvida com IA</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TIRA-DÚVIDAS COM IA (CHAT INTERATIVO) */}
        {activeTab === 'ai-qa' && (
          <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6 bg-[#1A1D24] font-dm">
            {/* Sugestões Rápidas de Perguntas */}
            <div className="mb-3">
              <span className="text-[11px] font-bold text-white/70 font-raleway flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Perguntas Frequentes (Clique para enviar à IA):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {FAQ_SUGGESTIONS.map((faq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAskQuestion(faq)}
                    disabled={isLoadingAi}
                    className="text-[11px] font-medium bg-white/10 hover:bg-[#AD2F3B]/20 text-[#EAEAEA] hover:text-white border border-white/15 hover:border-[#AD2F3B]/40 px-2.5 py-1 rounded-full transition-all text-left active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    💬 {faq}
                  </button>
                ))}
              </div>
            </div>

            {/* Janela de Mensagens */}
            <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-[#13151A] rounded-2xl border border-white/10 max-h-[46vh]">
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-[#7D1416] border border-[#AD2F3B]/50 flex items-center justify-center text-white shrink-0 font-bold shadow-md">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs leading-relaxed relative group ${
                        isUser
                          ? 'bg-[#AD2F3B] text-white font-medium rounded-br-none shadow-md shadow-[#AD2F3B]/20'
                          : 'bg-[#252A34] text-[#EAEAEA] border border-white/15 rounded-bl-none shadow-md'
                      }`}
                    >
                      {/* Renderização com Formatação */}
                      <div className="whitespace-pre-wrap space-y-1">
                        {msg.text.split('\n').map((line, lIdx) => {
                          if (line.startsWith('### ')) {
                            return (
                              <h4 key={lIdx} className="font-bold text-[#AD2F3B] text-sm font-raleway mt-1">
                                {line.replace('### ', '')}
                              </h4>
                            );
                          }
                          if (line.startsWith('- ') || line.startsWith('• ')) {
                            return (
                              <div key={lIdx} className="flex items-start gap-1.5 ml-1">
                                <span className="text-[#AD2F3B] font-bold">•</span>
                                <span dangerouslySetInnerHTML={{ __html: line.replace(/^[-•]\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                              </div>
                            );
                          }
                          if (/^\d+\.\s/.test(line)) {
                            return (
                              <div key={lIdx} className="flex items-start gap-1.5 ml-1">
                                <span className="text-amber-400 font-bold">{line.match(/^\d+\./)?.[0]}</span>
                                <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                              </div>
                            );
                          }
                          return (
                            <p
                              key={lIdx}
                              dangerouslySetInnerHTML={{
                                __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                              }}
                            />
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-white/10 text-[10px] text-white/50">
                        <span>{msg.timestamp}</span>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.id, msg.text)}
                            title="Copiar resposta"
                            className="opacity-70 hover:opacity-100 hover:text-white transition flex items-center gap-1 cursor-pointer"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {isUser && (
                      <div className="w-7 h-7 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 font-bold">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoadingAi && (
                <div className="flex items-start gap-2.5 justify-start animate-pulse">
                  <div className="w-7 h-7 rounded-xl bg-[#7D1416] border border-[#AD2F3B]/50 flex items-center justify-center text-white shrink-0 font-bold">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-[#252A34] text-[#EAEAEA] border border-white/15 rounded-2xl rounded-bl-none p-3.5 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>O Assistente IA está analisando sua dúvida...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input para Perguntar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="mt-3 flex items-center gap-2 bg-[#252A34] p-2 rounded-2xl border border-white/20 focus-within:border-[#AD2F3B] shadow-lg"
            >
              <input
                ref={inputRef}
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Escreva sua dúvida aqui... (Ex: Como cadastrar uma nova sala?)"
                disabled={isLoadingAi}
                className="flex-1 bg-transparent text-white placeholder:text-white/40 text-xs px-3 py-1.5 focus:outline-hidden disabled:opacity-50 font-dm"
              />

              <button
                type="submit"
                id="btn-enviar-duvida-ia"
                disabled={!questionInput.trim() || isLoadingAi}
                className="px-4 py-2 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] disabled:opacity-40 text-white font-bold font-raleway text-xs flex items-center gap-1.5 shadow-md shadow-[#FF2E63]/30 transition active:scale-95 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Perguntar</span>
              </button>
            </form>
          </div>
        )}

        {/* Rodapé do Modal */}
        <div className="px-4 py-3 bg-[#1E222B] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-raleway text-white/70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sistema com suporte a IA Gemini & Validação em tempo real</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setChatMessages([
                  {
                    id: 'welcome',
                    sender: 'ai',
                    text: 'Conversa reiniciada. Em que posso ajudar você agora?',
                    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                  },
                ]);
              }}
              className="text-white/60 hover:text-white text-[11px] flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar conversa</span>
            </button>
            <span className="text-white/20">•</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
