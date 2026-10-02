-- ==============================================================================
-- Migration: Criação da Tabela de Reservas de Salas (Fortaleza)
-- Data: 2026-08-15
-- ==============================================================================

-- 1. Criação da extensão para geração de UUIDs se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Criação da tabela principal de reservas
CREATE TABLE IF NOT EXISTS public.reservations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    dia DATE NOT NULL,
    sala TEXT NOT NULL,
    hora_inicial VARCHAR(5) NOT NULL, -- Formato 'HH:mm'
    hora_final VARCHAR(5) NOT NULL,   -- Formato 'HH:mm'
    solicitante TEXT NOT NULL,
    setor TEXT NOT NULL,
    glpi TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('America/Fortaleza', NOW()) NOT NULL
);

-- 3. Comentários na tabela e colunas
COMMENT ON TABLE public.reservations IS 'Tabela de reservas e agendamentos de salas de reunião de Fortaleza';
COMMENT ON COLUMN public.reservations.id IS 'Identificador único da reserva';
COMMENT ON COLUMN public.reservations.dia IS 'Data agendada para a reunião (AAAA-MM-DD)';
COMMENT ON COLUMN public.reservations.sala IS 'Nome ou identificação da sala reservada';
COMMENT ON COLUMN public.reservations.hora_inicial IS 'Horário de início da reunião (HH:mm)';
COMMENT ON COLUMN public.reservations.hora_final IS 'Horário de término da reunião (HH:mm)';
COMMENT ON COLUMN public.reservations.solicitante IS 'Nome do solicitante/responsável pela reunião';
COMMENT ON COLUMN public.reservations.setor IS 'Departamento/setor do solicitante';
COMMENT ON COLUMN public.reservations.glpi IS 'Número do chamado GLPI correspondente';
COMMENT ON COLUMN public.reservations.observacoes IS 'Observações ou pauta da reunião';
COMMENT ON COLUMN public.reservations.created_at IS 'Data e hora do registro da reserva';

-- 4. Criação de índices para otimização de busca e filtragem
CREATE INDEX IF NOT EXISTS idx_reservations_dia ON public.reservations (dia);
CREATE INDEX IF NOT EXISTS idx_reservations_sala ON public.reservations (sala);
CREATE INDEX IF NOT EXISTS idx_reservations_glpi ON public.reservations (glpi);
CREATE INDEX IF NOT EXISTS idx_reservations_solicitante ON public.reservations (solicitante);
CREATE INDEX IF NOT EXISTS idx_reservations_setor ON public.reservations (setor);
CREATE INDEX IF NOT EXISTS idx_reservations_dia_horarios ON public.reservations (dia, hora_inicial, hora_final);

-- 5. Habilitar Segurança por Linha (Row Level Security - RLS)
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso RLS (Permite leitura, inserção, atualização e exclusão)
CREATE POLICY "Permitir leitura pública de reservas"
    ON public.reservations
    FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserção pública de reservas"
    ON public.reservations
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de reservas"
    ON public.reservations
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir exclusão pública de reservas"
    ON public.reservations
    FOR DELETE
    USING (true);

-- 7. Habilitar suporte a Realtime no Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

-- 8. Inserção de Dados Iniciais de Demonstração (Seed)
INSERT INTO public.reservations (id, dia, sala, hora_inicial, hora_final, solicitante, setor, glpi, observacoes)
VALUES
    ('res-seed-1', CURRENT_DATE, 'Sala de Reunião 01', '08:30', '10:00', 'Alyson Souza Barreto', 'TI / Suporte', '104820', 'Alinhamento de sprint e infraestrutura de rede'),
    ('res-seed-2', CURRENT_DATE, 'Auditório Principal', '10:30', '12:00', 'Mariana Alencar', 'Recursos Humanos', '104829', 'Treinamento de integração de novos colaboradores'),
    ('res-seed-3', CURRENT_DATE, 'Sala de Treinamento', '14:00', '16:00', 'Carlos Eduardo Lima', 'Financeiro / Controladoria', '104835', 'Apresentação de fechamento de metas e orçamentos'),
    ('res-seed-4', CURRENT_DATE + INTERVAL '1 day', 'Sala de Reunião 02', '09:00', '11:00', 'Beatriz Montenegro', 'Jurídico', '104901', 'Reunião de compliance e análise contratual'),
    ('res-seed-5', CURRENT_DATE + INTERVAL '2 days', 'Espaço Inovação', '14:30', '17:00', 'Diego Fernandes', 'Projetos / Operações', '104944', 'Workshop de design de processos e melhoria contínua')
ON CONFLICT (id) DO NOTHING;
