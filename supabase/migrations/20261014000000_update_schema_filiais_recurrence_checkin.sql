-- ==============================================================================
-- BELLINATI PEREZ — SISTEMA DE GESTÃO E RESERVA DE SALAS
-- MIGRATION: 20261014000000_update_schema_filiais_recurrence_checkin.sql
-- Adiciona suporte a filiais corporativas, check-in, liberação antecipada,
-- agendamento recorrente e tabela de logs de auditoria
-- ==============================================================================

-- 1. ATUALIZAÇÃO DA TABELA public.reservations COM NOVOS CAMPOS
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS filial TEXT DEFAULT 'Maringá (Matriz)';
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS criado_por_cpf VARCHAR(14);
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS modificado_por_cpf VARCHAR(14);
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'confirmada';
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS checkin_em TIMESTAMPTZ;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS liberada_em TIMESTAMPTZ;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS liberada_por TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS recorrencia_id TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS recorrencia_tag VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations (status);
CREATE INDEX IF NOT EXISTS idx_reservations_filial ON public.reservations (filial);
CREATE INDEX IF NOT EXISTS idx_reservations_recorrencia ON public.reservations (recorrencia_id);

-- 2. NOVA TABELA: FILIAIS CORPORATIVAS (public.filiais)
CREATE TABLE IF NOT EXISTS public.filiais (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    nome TEXT NOT NULL UNIQUE,
    cidade TEXT NOT NULL,
    estado VARCHAR(2) NOT NULL,
    endereco TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    observacoes TEXT,
    is_matriz BOOLEAN NOT NULL DEFAULT false,
    ativa BOOLEAN NOT NULL DEFAULT true,
    criada_em TIMESTAMPTZ DEFAULT TIMEZONE('America/Fortaleza', NOW()) NOT NULL,
    modificado_por TEXT
);

CREATE INDEX IF NOT EXISTS idx_filiais_nome ON public.filiais (nome);
CREATE INDEX IF NOT EXISTS idx_filiais_ativa ON public.filiais (ativa);
CREATE INDEX IF NOT EXISTS idx_filiais_cidade ON public.filiais (cidade);

-- RLS: public.filiais
ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de filiais" ON public.filiais;
CREATE POLICY "Permitir leitura pública de filiais" ON public.filiais FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de filiais" ON public.filiais;
CREATE POLICY "Permitir inserção de filiais" ON public.filiais FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de filiais" ON public.filiais;
CREATE POLICY "Permitir atualização de filiais" ON public.filiais FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusão de filiais" ON public.filiais;
CREATE POLICY "Permitir exclusão de filiais" ON public.filiais FOR DELETE USING (true);

-- SEED: 6 FILIAIS OFICIAIS BELLINATI PEREZ
INSERT INTO public.filiais (id, nome, cidade, estado, endereco, responsavel, observacoes, is_matriz, ativa)
VALUES
    ('filial-maringa', 'Maringá (Matriz)', 'Maringá', 'PR', 'Av. Duque de Caxias, 882 - Zona 01, Maringá - PR', 'Facilities Matriz / Alyson Souza', 'Sede Principal Corporativa Bellinati Perez com auditório principal e salas executivas.', true, true),
    ('filial-curitiba-park', 'Curitiba Park & Business', 'Curitiba', 'PR', 'Rua Prof. Pedro Viriato Parigot de Souza, 3901 - Mossunguê, Curitiba - PR', 'Coordenação Regional PR / Facilities', 'Edifício Park & Business - Unidade com salas para diretoria e conferências.', false, true),
    ('filial-curitiba-cebp', 'Curitiba/CEBP', 'Curitiba', 'PR', 'Centro Empresarial Bellinati Perez - CEBP, Curitiba - PR', 'Administração Predial CEBP', 'Complexo de operações e treinamentos corporativos.', false, true),
    ('filial-curitiba-marechal', 'Curitiba/Marechal', 'Curitiba', 'PR', 'Av. Marechal Floriano Peixoto, Curitiba - PR', 'Supervisão de Operações Marechal', 'Salas para atendimento operacional e reuniões de equipe.', false, true),
    ('filial-curitiba-toronto', 'Curitiba/Toronto', 'Curitiba', 'PR', 'Edifício Toronto Corporate, Curitiba - PR', 'Gestão de Espaços Corporativos', 'Salas executivas equipadas com videoconferência.', false, true),
    ('filial-fortaleza-planalto', 'Fortaleza/planalto', 'Fortaleza', 'CE', 'Av. Santos Dumont / Planalto Business, Fortaleza - CE', 'Facilities Regional Nordeste', 'Auditório 215, salas executivas e espaços de contingência.', false, true)
ON CONFLICT (nome) DO UPDATE SET
    cidade = EXCLUDED.cidade,
    estado = EXCLUDED.estado,
    endereco = EXCLUDED.endereco,
    responsavel = EXCLUDED.responsavel,
    observacoes = EXCLUDED.observacoes,
    is_matriz = EXCLUDED.is_matriz,
    ativa = EXCLUDED.ativa;

-- 3. NOVA TABELA: LOGS DE AUDITORIA & GOVERNANÇA (public.audit_logs)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    data_hora TIMESTAMPTZ DEFAULT TIMEZONE('America/Fortaleza', NOW()) NOT NULL,
    acao VARCHAR(30) NOT NULL,
    titulo TEXT NOT NULL,
    detalhes TEXT NOT NULL,
    usuario_nome TEXT NOT NULL,
    usuario_cpf VARCHAR(14),
    reserva_id TEXT,
    glpi TEXT,
    sala TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_data_hora ON public.audit_logs (data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_audit_acao ON public.audit_logs (acao);
CREATE INDEX IF NOT EXISTS idx_audit_glpi ON public.audit_logs (glpi);

-- RLS: public.audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de audit_logs" ON public.audit_logs;
CREATE POLICY "Permitir leitura pública de audit_logs" ON public.audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção de audit_logs" ON public.audit_logs;
CREATE POLICY "Permitir inserção de audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- 4. REALTIME: Adicionar filiais e audit_logs à publicação supabase_realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'filiais') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.filiais;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
    END IF;
END $$;
