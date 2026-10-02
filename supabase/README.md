# 🚀 Guia de Integração e Migração Supabase — Bellinati Perez

Este repositório possui suporte nativo e em tempo real ao **Supabase (PostgreSQL + Realtime)** para sincronização de reservas de salas, catálogo de salas e setores corporativos.

---

## 📋 Tabelas Geradas

1. **`public.reservations`**: Agendamentos de salas com validação de conflitos, vínculo a chamados GLPI e trilha de auditoria (`criado_por`, `modificado_por`, `modificado_em`).
2. **`public.salas`**: Gestão das 5 salas oficiais da Bellinati Perez Fortaleza (`Sala 215 - Auditório`, `Sala 216 - Executivos`, `Sala 212 - Contingencia`, `Sala 116 - Contingencia`, `Sala 118 - Contingencia`), capacidade e recursos.
3. **`public.setores`**: Departamentos e áreas solicitantes (`Suporte`, `Atração de Talentos`, `BV`, `Controldesk`, `Facilities`, etc.).

---

## 🛠️ Como Executar a Migração no Supabase

1. Acesse o painel do seu projeto no [Supabase Dashboard](https://supabase.com/dashboard).
2. No menu lateral esquerdo, clique no ícone **SQL Editor** (ícone `>_`).
3. Clique em **+ New query**.
4. Abra o arquivo `supabase/schema.sql` (ou `supabase/migrations/20261002000000_complete_bellinati_schema.sql`) deste projeto.
5. Copie todo o conteúdo e cole no editor SQL do Supabase.
6. Clique no botão verde **Run** (Executar).
7. Aguarde a mensagem `Success. No rows returned`.

---

## ⚙️ Variáveis de Ambiente no Aplicativo

No arquivo `.env` (ou nas configurações de ambiente do AI Studio / Cloud Run), configure:

```env
VITE_SUPABASE_URL="https://SEU_PROJETO.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
```

---

## ⚡ Recursos Habilitados

- **Row Level Security (RLS)** configurado para operações seguras de leitura, cadastro, atualização e exclusão.
- **Supabase Realtime**: Atualizações instantâneas nas tabelas `reservations`, `salas` e `setores` sem necessidade de recarregar a página.
- **Modo Offline & Fallback Local**: Caso as variáveis não estejam preenchidas, o sistema opera de forma transparente com persistência em `localStorage`.
