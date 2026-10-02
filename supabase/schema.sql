-- ==============================================================================
-- BELLINATI PEREZ — SISTEMA DE GESTÃO E RESERVA DE SALAS (FORTALEZA)
-- SCRIPT CONSOLIDADO PARA O SQL EDITOR DO SUPABASE
-- Copie e cole todo este arquivo no SQL Editor do Supabase e clique em "RUN"
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA: SALAS
CREATE TABLE IF NOT EXISTS public.salas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    nome TEXT NOT NULL UNIQUE,
    filial TEXT NOT NULL DEFAULT 'Fortaleza - CE',
    capacidade INTEGER DEFAULT 20,
    recursos TEXT[] DEFAULT '{}',
    ativa BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ DEFAULT TIMEZONE('America/Fortaleza', NOW()) NOT NULL,
    atualizado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_salas_nome ON public.salas (nome);
CREATE INDEX IF NOT EXISTS idx_salas_ativa ON public.salas (ativa);
CREATE INDEX IF NOT EXISTS idx_salas_filial ON public.salas (filial);

-- 2. TABELA: SETORES
CREATE TABLE IF NOT EXISTS public.setores (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('America/Fortaleza', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_setores_nome ON public.setores (nome);
CREATE INDEX IF NOT EXISTS idx_setores_ativo ON public.setores (ativo);

-- 3. TABELA: RESERVAS
CREATE TABLE IF NOT EXISTS public.reservations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    dia DATE NOT NULL,
    sala TEXT NOT NULL,
    hora_inicial VARCHAR(5) NOT NULL,
    hora_final VARCHAR(5) NOT NULL,
    solicitante TEXT NOT NULL,
    setor TEXT NOT NULL,
    glpi TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('America/Fortaleza', NOW()) NOT NULL,
    criado_por TEXT,
    modificado_por TEXT,
    modificado_em TIMESTAMPTZ
);

ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS criado_por TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS modificado_por TEXT;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS modificado_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_reservations_dia ON public.reservations (dia);
CREATE INDEX IF NOT EXISTS idx_reservations_sala ON public.reservations (sala);
CREATE INDEX IF NOT EXISTS idx_reservations_glpi ON public.reservations (glpi);
CREATE INDEX IF NOT EXISTS idx_reservations_solicitante ON public.reservations (solicitante);
CREATE INDEX IF NOT EXISTS idx_reservations_setor ON public.reservations (setor);
CREATE INDEX IF NOT EXISTS idx_reservations_dia_horarios ON public.reservations (dia, hora_inicial, hora_final);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de salas" ON public.salas;
CREATE POLICY "Permitir leitura pública de salas" ON public.salas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir inserção de salas" ON public.salas;
CREATE POLICY "Permitir inserção de salas" ON public.salas FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualização de salas" ON public.salas;
CREATE POLICY "Permitir atualização de salas" ON public.salas FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir exclusão de salas" ON public.salas;
CREATE POLICY "Permitir exclusão de salas" ON public.salas FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de setores" ON public.setores;
CREATE POLICY "Permitir leitura pública de setores" ON public.setores FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir inserção de setores" ON public.setores;
CREATE POLICY "Permitir inserção de setores" ON public.setores FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualização de setores" ON public.setores;
CREATE POLICY "Permitir atualização de setores" ON public.setores FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir exclusão de setores" ON public.setores;
CREATE POLICY "Permitir exclusão de setores" ON public.setores FOR DELETE USING (true);

DROP POLICY IF EXISTS "Permitir leitura pública de reservas" ON public.reservations;
CREATE POLICY "Permitir leitura pública de reservas" ON public.reservations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir inserção pública de reservas" ON public.reservations;
CREATE POLICY "Permitir inserção pública de reservas" ON public.reservations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualização pública de reservas" ON public.reservations;
CREATE POLICY "Permitir atualização pública de reservas" ON public.reservations FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir exclusão pública de reservas" ON public.reservations;
CREATE POLICY "Permitir exclusão pública de reservas" ON public.reservations FOR DELETE USING (true);

-- 5. REALTIME
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reservations') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'salas') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.salas;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'setores') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.setores;
    END IF;
END $$;

-- 6. SEED: 5 SALAS OFICIAIS BELLINATI PEREZ
INSERT INTO public.salas (id, nome, filial, capacidade, recursos, ativa)
VALUES
    ('sala-215', 'Sala 215 - Auditório', 'Fortaleza - CE', 50, ARRAY['Projetor', 'Videoconferência', 'Ar-Condicionado', 'Microfones'], true),
    ('sala-216', 'Sala 216 - Executivos', 'Fortaleza - CE', 15, ARRAY['TV 65"', 'Videoconferência', 'Quadro Branco', 'Ar-Condicionado'], true),
    ('sala-212', 'Sala 212 - Contingencia', 'Fortaleza - CE', 20, ARRAY['TV 55"', 'Videoconferência', 'Ar-Condicionado'], true),
    ('sala-116', 'Sala 116 - Contingencia', 'Fortaleza - CE', 20, ARRAY['TV 55"', 'Ar-Condicionado'], true),
    ('sala-118', 'Sala 118 - Contingencia', 'Fortaleza - CE', 20, ARRAY['TV 55"', 'Ar-Condicionado'], true)
ON CONFLICT (nome) DO UPDATE SET
    filial = EXCLUDED.filial,
    capacidade = EXCLUDED.capacidade,
    recursos = EXCLUDED.recursos,
    ativa = EXCLUDED.ativa;

-- 7. SEED: SETORES OFICIAIS
INSERT INTO public.setores (id, nome, descricao, ativo)
VALUES
    ('setor-suporte', 'Suporte', 'Tecnologia da Informação e Suporte Técnico', true),
    ('setor-atracao', 'Atração de Talentos', 'Recrutamento e Recursos Humanos', true),
    ('setor-bv', 'BV', 'Operação Bancária BV', true),
    ('setor-controldesk', 'Controldesk', 'Controle Operacional e Tráfego', true),
    ('setor-desenv', 'Desenvolvimento Organizacional', 'T&D e Cultura', true),
    ('setor-facilities', 'Facilities', 'Gestão Predial e Manutenção', true),
    ('setor-bom-pagador', 'Bv - Bom Pagador', 'Operação BV Bom Pagador', true),
    ('setor-cobranca', 'Cobrança', 'Operações de Cobrança e Negociação', true),
    ('setor-juridico', 'Jurídico', 'Jurídico e Compliance', true),
    ('setor-diretoria', 'Diretoria', 'Diretoria Executiva', true)
ON CONFLICT (nome) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    ativo = EXCLUDED.ativo;

-- 8. SEED: RESERVAS INICIAIS
INSERT INTO public.reservations (id, dia, sala, hora_inicial, hora_final, solicitante, setor, glpi, observacoes, criado_por)
VALUES
    ('res-seed-1', CURRENT_DATE, 'Sala 215 - Auditório', '08:30', '10:00', 'Alyson Souza Barreto', 'Suporte', '104820', 'Alinhamento de infraestrutura e governança de TI', 'Alyson'),
    ('res-seed-2', CURRENT_DATE, 'Sala 216 - Executivos', '10:30', '12:00', 'Mariana Alencar', 'Atração de Talentos', '104829', 'Integração de novos colaboradores Bellinati Perez', 'Mariana'),
    ('res-seed-3', CURRENT_DATE, 'Sala 212 - Contingencia', '14:00', '16:00', 'Carlos Eduardo Lima', 'BV', '104835', 'Apresentação de metas mensais e orçamento', 'Carlos')
ON CONFLICT (id) DO NOTHING;
