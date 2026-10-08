/**
 * Utilitários de Privacidade, Segurança da Informação e Conformidade com a LGPD
 * Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)
 * Bellinati Perez Facilities & TI
 */

/**
 * Aplica mascaramento de segurança a CPFs (ex: 123.456.789-01 -> ***.***.789-**)
 * Protege contra vazamento de PII (Personally Identifiable Information) em telas abertas e totens.
 */
export function maskCPF(cpf: string): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length < 11) {
    return '***.***.***-**';
  }
  // Exibe apenas 3 dígitos centrais e suprime os demais
  const p1 = '***';
  const p2 = digits.slice(3, 6);
  const p3 = '***';
  const p4 = '**';
  return `${p1}.${p2}.${p3}-${p4}`;
}

/**
 * Sanitiza texto de entrada contra tentativas de XSS (Cross-Site Scripting)
 * e injeção de fórmulas (=, +, -, @) em exportações CSV/Excel.
 */
export function sanitizeInput(text: string): string {
  if (!text) return '';
  // Remove tags HTML suspeitas
  let sanitized = text
    .replace(/<[^>]*>?/gm, '')
    .replace(/[<>'"&]/g, (match) => {
      switch (match) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        case '&': return '&amp;';
        default: return match;
      }
    });

  // Previne formula injection em planilhas se começar com caracteres de execução
  if (/^[=+\-@\t\r]/.test(sanitized)) {
    sanitized = `'${sanitized}`;
  }

  return sanitized.trim();
}

/**
 * Diretrizes Oficiais de Tratamento de Dados sob a LGPD
 */
export interface LgpdSecurityItem {
  id: string;
  categoria: 'Vulnerabilidade do Link' | 'Conformidade LGPD' | 'Recomendação Técnica';
  titulo: string;
  descricao: string;
  status: 'implementado' | 'recomendado' | 'em_analise';
  nivelRisco: 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
  artigoLgpd?: string;
  acaoRecomendada: string;
}

export const LGPD_SECURITY_AUDIT: LgpdSecurityItem[] = [
  {
    id: 'link-acesso-publico',
    categoria: 'Vulnerabilidade do Link',
    titulo: 'Restrição de Acesso por Rede (VPN / Intranet Bellinati)',
    descricao: 'Como o link de produção pode ser acessado diretamente de qualquer navegador na internet, qualquer pessoa com a URL consegue carregar o frontend da aplicação.',
    status: 'recomendado',
    nivelRisco: 'Alto',
    artigoLgpd: 'Art. 46 (Segurança da Informação e Acesso Restrito)',
    acaoRecomendada: 'Configurar restrição por IP corporativo, Cloudflare Access ou VPN interna para garantir que apenas estações e dispositivos autorizados da Bellinati Perez acessem a ferramenta.',
  },
  {
    id: 'mascaramento-cpf',
    categoria: 'Conformidade LGPD',
    titulo: 'Mascaramento de CPF em Telas Públicas e Cabeçalho',
    descricao: 'Exibição de CPF completo de operadores e solicitantes viola o princípio de minimização e segurança contra olhares de terceiros (shoulder surfing).',
    status: 'implementado',
    nivelRisco: 'Médio',
    artigoLgpd: 'Art. 6º, III (Minimização) e Art. 13 (Pseudonimização)',
    acaoRecomendada: 'O sistema agora conta com mascaramento automático de CPF (***.456.***-**) com controle de visibilidade restrito ao próprio usuário.',
  },
  {
    id: 'rls-supabase',
    categoria: 'Vulnerabilidade do Link',
    titulo: 'Row Level Security (RLS) no Banco de Dados em Nuvem',
    descricao: 'A chave anon do Supabase (VITE_SUPABASE_ANON_KEY) fica compilada no client-side. Sem RLS ativo nas tabelas, qualquer usuário experiente pode usar a API REST do Supabase diretamente.',
    status: 'recomendado',
    nivelRisco: 'Crítico',
    artigoLgpd: 'Art. 46 (Medidas Técnicas de Proteção aos Dados)',
    acaoRecomendada: 'Garantir no painel do Supabase que a opção "Enable Row Level Security (RLS)" esteja ATIVADA nas tabelas "reservas", "salas", "setores" e "filiais", impedindo exclusões/alterações sem autenticação master.',
  },
  {
    id: 'expiracao-inatividade',
    categoria: 'Vulnerabilidade do Link',
    titulo: 'Expiração de Sessão por Inatividade (Auto-Lock)',
    descricao: 'Sessões salvas no localStorage sem timeout podem ser exploradas caso um colaborador deixe sua estação de trabalho desbloqueada na filial.',
    status: 'implementado',
    nivelRisco: 'Médio',
    artigoLgpd: 'Art. 46 e Art. 47 (Dever de Segurança)',
    acaoRecomendada: 'Implementado monitoramento de inatividade com travamento de tela após 30 minutos sem interação do usuário.',
  },
  {
    id: 'base-legal-lgpd',
    categoria: 'Conformidade LGPD',
    titulo: 'Base Legal e Finalidade Específica do Tratamento',
    descricao: 'O tratamento de dados pessoais (Nome, CPF, Setor, Chamado GLPI) no sistema de salas de reunião deve possuir finalidade legítima e transparente.',
    status: 'implementado',
    nivelRisco: 'Baixo',
    artigoLgpd: 'Art. 7º, V (Execução de Procedimentos Corporativos) e IX (Legítimo Interesse)',
    acaoRecomendada: 'Finalidade estrita: organização de agendas, alocação de recursos prediais da empresa e prevenção de fraudes/conflitos. Dados não são compartilhados com empresas terceiras.',
  },
  {
    id: 'politica-retencao-descarte',
    categoria: 'Conformidade LGPD',
    titulo: 'Política de Retenção e Descarte de Agendamentos',
    descricao: 'Armazenar históricos de reuniões de anos anteriores indefinidamente contraria o princípio da necessidade da LGPD.',
    status: 'recomendado',
    nivelRisco: 'Baixo',
    artigoLgpd: 'Art. 15 e Art. 16 (Término do Tratamento e Eliminação dos Dados)',
    acaoRecomendada: 'Estabelecer rotina de expurgo ou anonimização de reservas com mais de 12 meses de encerramento.',
  },
  {
    id: 'indexacao-motores-busca',
    categoria: 'Vulnerabilidade do Link',
    titulo: 'Bloqueio de Indexação por Motores de Busca (Google/Bing)',
    descricao: 'Caso o link seja indexado por robôs de busca, relatórios e páginas de reserva poderiam aparecer em pesquisas públicas.',
    status: 'implementado',
    nivelRisco: 'Médio',
    artigoLgpd: 'Art. 46 (Prevenção)',
    acaoRecomendada: 'Inserção de meta tags "noindex, nofollow, noarchive" no cabeçalho HTML da aplicação para barrar indexação externa.',
  },
  {
    id: 'direitos-titular',
    categoria: 'Conformidade LGPD',
    titulo: 'Canal de Atendimento aos Direitos do Titular (DPO)',
    descricao: 'Colaboradores têm direito de confirmar a existência de tratamento, solicitar correção de dados incorretos e esclarecimentos sobre o uso dos dados.',
    status: 'implementado',
    nivelRisco: 'Baixo',
    artigoLgpd: 'Art. 18 (Direitos do Titular)',
    acaoRecomendada: 'Disponibilizar no painel as informações do Encarregado de Dados (DPO) e do setor de Facilities da Bellinati Perez para solicitações formais.',
  },
];
