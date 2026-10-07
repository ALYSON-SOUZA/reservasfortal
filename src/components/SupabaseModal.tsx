import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Terminal,
  ShieldCheck,
  Layers,
  Building,
  CalendarCheck,
  Cloud,
  UploadCloud,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { reservationService } from '../services/reservationService';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => Promise<void>;
  isSupabaseLive: boolean;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  isSupabaseLive,
}) => {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ localCount: number; cloudCount: number; unsyncedCount: number } | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'reservations' | 'salas_setores'>('all');

  // Atualiza status de sincronização ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      reservationService.getSyncStatus().then(setSyncStatus);
    }
  }, [isOpen]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await reservationService.syncLocalToCloud();
      await onRefreshData();
      const newStatus = await reservationService.getSyncStatus();
      setSyncStatus(newStatus);
      if (res.error) {
        setSyncFeedback(`Aviso: ${res.error}`);
      } else if (res.syncedCount > 0) {
        setSyncFeedback(`Sucesso! ${res.syncedCount} reserva(s) deste computador foram enviadas para o Supabase e agora estão salvas na nuvem.`);
      } else {
        setSyncFeedback(`Tudo atualizado! Todas as ${res.total} reservas já estão 100% sincronizadas na nuvem e acessíveis de qualquer aparelho.`);
      }
    } catch (err: any) {
      setSyncFeedback(`Erro ao sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  const sqlFullMigration = `-- ==============================================================================
-- BELLINATI PEREZ — SISTEMA DE GESTÃO E RESERVA DE SALAS (FORTALEZA)
-- SCRIPT CONSOLIDADO DE MIGRAÇÃO SUPABASE
-- Cole no SQL Editor do Supabase e clique em "RUN"
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
CREATE INDEX IF NOT EXISTS idx_reservations_dia_horarios ON public.reservations (dia, hora_inicial, hora_final);

-- 4. SEGURANÇA (ROW LEVEL SECURITY)
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
DO $$ BEGIN
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

-- 6. DADOS INICIAIS (SEED BELLINATI PEREZ - SALAS ATUALIZADAS)
INSERT INTO public.salas (id, nome, filial, capacidade, recursos, ativa)
VALUES
    ('sala-fortaleza-2', 'Auditório 2', 'Fortaleza/planalto', 30, ARRAY['Projetor', 'Videoconferência', 'TV', 'Sistema de Áudio'], true),
    ('sala-toronto-14', 'Reunião 14', 'Curitiba/Toronto', 10, ARRAY['TV', 'Videoconferência', 'Quadro Branco'], true),
    ('sala-toronto-13', 'Reunião 13', 'Curitiba/Toronto', 10, ARRAY['TV', 'Videoconferência'], true),
    ('sala-toronto-12', 'Reunião 12', 'Curitiba/Toronto', 10, ARRAY['TV', 'Videoconferência', 'Quadro Branco'], true),
    ('sala-toronto-10', 'Reunião 10', 'Curitiba/Toronto', 10, ARRAY['TV', 'Videoconferência'], true),
    ('sala-toronto-8', 'Reunião 8', 'Curitiba/Toronto', 8, ARRAY['TV', 'Quadro Branco'], true),
    ('sala-toronto-7', 'Reunião 7', 'Curitiba/Toronto', 8, ARRAY['TV', 'Quadro Branco'], true),
    ('sala-maringa-11', 'Reunião 11', 'Maringá (Matriz)', 12, ARRAY['TV', 'Videoconferência', 'Quadro Branco'], true),
    ('sala-maringa-12', 'Reunião 12', 'Maringá (Matriz)', 12, ARRAY['TV', 'Videoconferência', 'Quadro Branco'], true),
    ('sala-park-aud-9', 'Auditório 9', 'Curitiba Park & Business', 28, ARRAY['Projetor', 'Videoconferência', 'TV', 'Sistema de Áudio'], true),
    ('sala-park-reu-9', 'Reunião 9', 'Curitiba Park & Business', 8, ARRAY['TV', 'Videoconferência', 'Quadro Branco'], true),
    ('sala-park-reu-11', 'Reunião 11', 'Curitiba Park & Business', 6, ARRAY['TV', 'Quadro Branco'], true),
    ('sala-park-aud-12', 'Auditório 12', 'Curitiba Park & Business', 30, ARRAY['Projetor', 'Videoconferência', 'TV', 'Sistema de Áudio'], true),
    ('sala-marechal-1', 'Reunião 1', 'Curitiba/Marechal', 10, ARRAY['TV', 'Videoconferência'], true),
    ('sala-marechal-4', 'Reunião 4', 'Curitiba/Marechal', 10, ARRAY['TV', 'Videoconferência'], true),
    ('sala-marechal-15', 'Reunião 15', 'Curitiba/Marechal', 10, ARRAY['TV', 'Videoconferência'], true),
    ('sala-marechal-16', 'Reunião 16', 'Curitiba/Marechal', 10, ARRAY['TV', 'Videoconferência'], true),
    ('sala-marechal-exec-19', 'Executiva 19', 'Curitiba/Marechal', 15, ARRAY['Videoconferência', 'TV', 'Quadro Branco', 'Climatizada'], true),
    ('sala-marechal-21', 'Reunião 21', 'Curitiba/Marechal', 10, ARRAY['TV', 'Videoconferência'], true),
    ('sala-marechal-22', 'Reunião 22', 'Curitiba/Marechal', 10, ARRAY['TV', 'Videoconferência'], true)
ON CONFLICT (nome) DO UPDATE SET
    filial = EXCLUDED.filial,
    capacidade = EXCLUDED.capacidade,
    recursos = EXCLUDED.recursos,
    ativa = EXCLUDED.ativa;

INSERT INTO public.setores (id, nome, descricao, ativo)
VALUES
    ('setor-suporte', 'Suporte', 'Tecnologia da Informação e Suporte Técnico', true),
    ('setor-atracao', 'Atração de Talentos', 'Recrutamento e Recursos Humanos', true),
    ('setor-bv', 'BV', 'Operação Bancária BV', true),
    ('setor-controldesk', 'Controldesk', 'Planejamento e Tráfego', true),
    ('setor-facilities', 'Facilities', 'Gestão Predial e Manutenção', true)
ON CONFLICT (nome) DO UPDATE SET
    descricao = EXCLUDED.descricao,
    ativo = EXCLUDED.ativo;

INSERT INTO public.reservations (id, dia, sala, hora_inicial, hora_final, solicitante, setor, glpi, observacoes, criado_por)
VALUES
    ('res-seed-1', CURRENT_DATE, 'Auditório 2', '08:30', '10:00', 'Alyson Souza Barreto', 'Suporte', '104820', 'Alinhamento de infraestrutura de TI', 'Alyson'),
    ('res-seed-2', CURRENT_DATE, 'Executiva 19', '10:30', '12:00', 'Mariana Alencar', 'Atração de Talentos', '104829', 'Integração de novos colaboradores', 'Mariana'),
    ('res-seed-3', CURRENT_DATE, 'Reunião 14', '14:00', '16:00', 'Carlos Eduardo Lima', 'BV', '104835', 'Apresentação de metas e orçamento', 'Carlos')
ON CONFLICT (id) DO NOTHING;`;

  const sqlReservationsOnly = `-- TABELA DE RESERVAS (public.reservations)
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

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura pública de reservas" ON public.reservations;
CREATE POLICY "Permitir leitura pública de reservas" ON public.reservations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir inserção pública de reservas" ON public.reservations;
CREATE POLICY "Permitir inserção pública de reservas" ON public.reservations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir atualização pública de reservas" ON public.reservations;
CREATE POLICY "Permitir atualização pública de reservas" ON public.reservations FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir exclusão pública de reservas" ON public.reservations;
CREATE POLICY "Permitir exclusão pública de reservas" ON public.reservations FOR DELETE USING (true);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reservations') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
    END IF;
END $$;`;

  const sqlSalasSetoresOnly = `-- TABELAS DE SALAS E SETORES
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
ALTER TABLE public.salas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de salas" ON public.salas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de salas" ON public.salas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de salas" ON public.salas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir exclusão de salas" ON public.salas FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.setores (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('America/Fortaleza', NOW()) NOT NULL
);
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de setores" ON public.setores FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de setores" ON public.setores FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de setores" ON public.setores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir exclusão de setores" ON public.setores FOR DELETE USING (true);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'salas') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.salas;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'setores') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.setores;
    END IF;
END $$;`;

  const displayedSql =
    activeTab === 'all'
      ? sqlFullMigration
      : activeTab === 'reservations'
      ? sqlReservationsOnly
      : sqlSalasSetoresOnly;

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(displayedSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleTestConnection = async () => {
    setIsChecking(true);
    await onRefreshData();
    setIsChecking(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#252A34]/70 backdrop-blur-xs flex items-center justify-center p-4 font-dm">
      <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#252A34]/20 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header com Bordô Bellinati Perez */}
        <div className="bg-[#7D1416] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#AD2F3B] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center font-bold shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-raleway leading-tight text-white">
                  Integração & Migrações Supabase
                </h2>
                {isSupabaseConfigured && isSupabaseLive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Modo Local / Fallback
                  </span>
                )}
              </div>
              <p className="text-xs text-white/80 font-dm font-normal">
                Sincronização em nuvem, scripts SQL de migração e suporte a Realtime
              </p>
            </div>
          </div>

          <button
            id="btn-fechar-modal-supabase"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#252A34]">
          
          {/* Status Box */}
          <div className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isSupabaseConfigured && isSupabaseLive
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-[#EAEAEA]/60 border-[#252A34]/20 text-[#252A34]'
          }`}>
            <div className="flex items-start gap-3">
              {isSupabaseConfigured && isSupabaseLive ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-bold font-raleway">
                  {isSupabaseConfigured && isSupabaseLive
                    ? 'Banco de Dados Supabase Conectado & Operacional'
                    : 'Modo Local Ativo (Persistência Offline & LocalStorage)'}
                </h4>
                <p className="text-xs text-[#252A34]/70 mt-0.5">
                  {isSupabaseConfigured && isSupabaseLive
                    ? 'Todas as reservas, salas e setores estão sincronizados em tempo real via PostgreSQL e Supabase Realtime.'
                    : 'Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env para conectar a sua instância.'}
                </p>
              </div>
            </div>

            <button
              id="btn-testar-conexao-supabase"
              onClick={handleTestConnection}
              disabled={isChecking}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#252A34] hover:bg-[#252A34]/90 text-white text-xs font-bold font-raleway transition shadow-sm self-stretch sm:self-auto justify-center disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Verificando...' : 'Testar Conexão'}</span>
            </button>
          </div>

          {/* Sincronização Multi-Dispositivos (PC / Celular / Outros Apps) */}
          <div className="p-4 rounded-2xl bg-[#7D1416]/5 border-2 border-[#7D1416]/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#7D1416] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-raleway text-[#7D1416] flex items-center gap-2">
                    <span>Sincronização em Nuvem Multi-Dispositivos</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#AD2F3B]/10 text-[#AD2F3B] border border-[#AD2F3B]/20">
                      <Laptop className="w-3 h-3" />
                      <span>PC</span>
                      <span>⇄</span>
                      <Smartphone className="w-3 h-3" />
                      <span>Celular / Web</span>
                    </span>
                  </h4>
                  <p className="text-xs text-[#252A34]/80 mt-0.5">
                    Permite que as reservas cadastradas neste computador fiquem visíveis imediatamente ao abrir pelo link{' '}
                    <code className="text-[#AD2F3B] bg-white px-1.5 py-0.5 rounded border border-[#AD2F3B]/30 font-mono text-[11px]">
                      reservasfortal.ai.studio
                    </code>{' '}
                    em qualquer outro dispositivo.
                  </p>
                </div>
              </div>

              <button
                id="btn-sincronizar-nuvem-manual"
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7D1416] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 self-stretch sm:self-auto justify-center"
              >
                <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Enviar Reservas para a Nuvem Agora'}</span>
              </button>
            </div>

            {/* Contadores e Indicadores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#7D1416]/10 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[#252A34]/60 text-[11px] block">Neste Navegador / PC:</span>
                <span className="font-bold text-[#252A34] text-sm">
                  {syncStatus ? `${syncStatus.localCount} reservas` : 'Carregando...'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[#252A34]/60 text-[11px] block">Na Nuvem Supabase:</span>
                <span className="font-bold text-[#7D1416] text-sm">
                  {syncStatus ? `${syncStatus.cloudCount} reservas` : 'Carregando...'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[#252A34]/60 text-[11px] block">Pendentes de Envio:</span>
                <span className={`font-bold text-sm ${syncStatus && syncStatus.unsyncedCount > 0 ? 'text-[#FF2E63]' : 'text-emerald-600'}`}>
                  {syncStatus
                    ? syncStatus.unsyncedCount > 0
                      ? `${syncStatus.unsyncedCount} pendente(s)`
                      : '0 (100% Sincronizado)'
                    : 'Checando...'}
                </span>
              </div>
            </div>

            {syncFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
            )}
          </div>

          {/* Guia Rápido de Configuração */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold font-raleway uppercase tracking-wider text-[#7D1416] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#AD2F3B]" />
              <span>Como aplicar a migração no Supabase (3 Passos)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-7 h-7 rounded-lg bg-[#252A34] text-white flex items-center justify-center font-bold text-xs font-dm mb-2">
                  1
                </div>
                <h5 className="font-bold text-xs text-[#252A34] font-raleway">Acesse o SQL Editor</h5>
                <p className="text-[11px] text-[#252A34]/70 mt-1 font-dm">
                  Entre no seu projeto no painel do Supabase e abra o menu <strong>SQL Editor</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-7 h-7 rounded-lg bg-[#AD2F3B] text-white flex items-center justify-center font-bold text-xs font-dm mb-2">
                  2
                </div>
                <h5 className="font-bold text-xs text-[#252A34] font-raleway">Execute a Migração</h5>
                <p className="text-[11px] text-[#252A34]/70 mt-1 font-dm">
                  Copie o código SQL abaixo, cole na aba do SQL Editor e clique no botão verde <strong>Run</strong>.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <div className="w-7 h-7 rounded-lg bg-[#7D1416] text-white flex items-center justify-center font-bold text-xs font-dm mb-2">
                  3
                </div>
                <h5 className="font-bold text-xs text-[#252A34] font-raleway">Preencha o .env</h5>
                <p className="text-[11px] text-[#252A34]/70 mt-1 font-dm">
                  Copie a <strong>Project URL</strong> e a <strong>anon public key</strong> em <strong>Project Settings → API</strong> para o seu <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">.env</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Abas e Script SQL */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              {/* Seletor de Script */}
              <div className="flex items-center gap-1.5 p-1 bg-[#EAEAEA] rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-white text-[#7D1416] shadow-xs'
                      : 'text-slate-600 hover:text-[#252A34]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Script Completo (Consolidado)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('reservations')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'reservations'
                      ? 'bg-white text-[#7D1416] shadow-xs'
                      : 'text-slate-600 hover:text-[#252A34]'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Apenas Reservas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('salas_setores')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'salas_setores'
                      ? 'bg-white text-[#7D1416] shadow-xs'
                      : 'text-slate-600 hover:text-[#252A34]'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Salas & Setores</span>
                </button>
              </div>

              {/* Botão Copiar */}
              <button
                id="btn-copiar-sql"
                type="button"
                onClick={handleCopySQL}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#AD2F3B]/10 hover:bg-[#AD2F3B]/20 text-[#AD2F3B] border border-[#AD2F3B]/30 text-xs font-bold transition active:scale-95 cursor-pointer self-start sm:self-auto"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#AD2F3B]" />
                    <span>Copiar Código SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden border-2 border-[#252A34]/20 bg-[#252A34]">
              <pre className="p-4 text-xs font-mono text-[#EAEAEA] overflow-x-auto max-h-72 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
                {displayedSql}
              </pre>
            </div>
          </div>

          {/* Variáveis de Ambiente Necessárias */}
          <div className="bg-[#EAEAEA]/40 p-4 rounded-2xl border border-[#252A34]/15">
            <h4 className="text-xs font-bold text-[#252A34] font-raleway mb-2">
              Credenciais Configuradas no Projeto (<code className="bg-white px-1.5 py-0.5 rounded border border-slate-300">.env</code>):
            </h4>
            <pre className="text-[11px] font-mono bg-white p-3 rounded-xl border border-slate-200 text-[#252A34] select-all">
{`VITE_SUPABASE_URL=https://tsumftsfuuvicmpnexrc.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_XlsvOTwwX4BN1oafoh2LnA_t1cDZiTy

NEXT_PUBLIC_SUPABASE_URL=https://tsumftsfuuvicmpnexrc.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_XlsvOTwwX4BN1oafoh2LnA_t1cDZiTy`}
            </pre>
            <p className="text-[10px] text-slate-500 mt-2 font-dm">
              * Nota: Os arquivos de migração completos também estão salvos no projeto em <code className="bg-white px-1 py-0.5 rounded">supabase/schema.sql</code> e <code className="bg-white px-1 py-0.5 rounded">supabase/migrations/20261002000000_complete_bellinati_schema.sql</code>.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0 font-dm">
          <a
            href="https://supabase.com/dashboard/project/tsumftsfuuvicmpnexrc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-white hover:bg-[#AD2F3B] font-bold bg-[#252A34] px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            <span>Abrir Painel do Projeto no Supabase</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            id="btn-fechar-modal-supabase-rodape"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#FF2E63] hover:bg-[#AD2F3B] text-white text-xs font-bold font-raleway tracking-wide transition shadow-md shadow-[#FF2E63]/30 cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
