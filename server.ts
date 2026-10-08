import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Support JSON and urlencoded bodies up to 25MB for image uploads
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Helper to extract clean client IP
  const getClientIp = (req: express.Request): string => {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded) {
      return forwarded.split(",")[0].trim();
    }
    return req.ip || req.socket.remoteAddress || "127.0.0.1";
  };

  // ==========================================
  // RATE LIMITING & BRUTE FORCE PROTECTION (LGPD ART. 46)
  // ==========================================

  // 1. Login Attempts by IP (Proteção de Autenticação contra Força Bruta)
  interface IpLoginTracker {
    attempts: number;
    firstAttemptAt: number;
    lastAttemptAt: number;
    blockedUntil: number | null;
  }

  const loginAttemptsByIp = new Map<string, IpLoginTracker>();
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
  const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutos de bloqueio

  // Limpeza periódica de IPs expirados da memória
  setInterval(() => {
    const now = Date.now();
    for (const [ip, tracker] of loginAttemptsByIp.entries()) {
      if (tracker.blockedUntil && tracker.blockedUntil < now && now - tracker.lastAttemptAt > LOGIN_WINDOW_MS) {
        loginAttemptsByIp.delete(ip);
      } else if (!tracker.blockedUntil && now - tracker.firstAttemptAt > LOGIN_WINDOW_MS) {
        loginAttemptsByIp.delete(ip);
      }
    }
  }, 60000);

  // Status de Rate Limit por IP (Consulta da tela de login)
  app.get("/api/auth/rate-limit-status", (req, res) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const tracker = loginAttemptsByIp.get(ip);

    if (tracker && tracker.blockedUntil && tracker.blockedUntil > now) {
      const lockoutSeconds = Math.ceil((tracker.blockedUntil - now) / 1000);
      return res.status(429).json({
        clientIp: ip,
        isBlocked: true,
        lockoutSeconds,
        remainingAttempts: 0,
        maxAttempts: MAX_LOGIN_ATTEMPTS,
        attempts: tracker.attempts,
        message: `Bloqueio de Segurança LGPD ativo. Limite de 5 tentativas atingido neste IP. Aguarde ${lockoutSeconds}s.`,
      });
    }

    if (tracker && tracker.blockedUntil && tracker.blockedUntil <= now) {
      // Bloqueio expirou
      loginAttemptsByIp.delete(ip);
    }

    const currentAttempts = tracker?.attempts || 0;
    const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - currentAttempts);

    return res.json({
      clientIp: ip,
      isBlocked: false,
      lockoutSeconds: 0,
      remainingAttempts: remaining,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      attempts: currentAttempts,
    });
  });

  // Registrar tentativa de autenticação por IP (falha ou sucesso)
  app.post("/api/auth/record-attempt", (req, res) => {
    const ip = getClientIp(req);
    const { success } = req.body;
    const now = Date.now();
    let tracker = loginAttemptsByIp.get(ip);

    // Se a autenticação foi bem-sucedida, limpa o contador do IP
    if (success) {
      loginAttemptsByIp.delete(ip);
      return res.json({
        clientIp: ip,
        isBlocked: false,
        lockoutSeconds: 0,
        remainingAttempts: MAX_LOGIN_ATTEMPTS,
        maxAttempts: MAX_LOGIN_ATTEMPTS,
        attempts: 0,
        message: "Autenticação autorizada. Contador resetado.",
      });
    }

    // Se o IP já estiver bloqueado
    if (tracker && tracker.blockedUntil && tracker.blockedUntil > now) {
      const lockoutSeconds = Math.ceil((tracker.blockedUntil - now) / 1000);
      return res.status(429).json({
        clientIp: ip,
        isBlocked: true,
        lockoutSeconds,
        remainingAttempts: 0,
        maxAttempts: MAX_LOGIN_ATTEMPTS,
        attempts: tracker.attempts,
        message: `Acesso bloqueado por segurança (LGPD). Restam ${lockoutSeconds}s para desbloqueio.`,
      });
    }

    if (!tracker || (now - tracker.firstAttemptAt > LOGIN_WINDOW_MS && (!tracker.blockedUntil || tracker.blockedUntil <= now))) {
      tracker = {
        attempts: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
        blockedUntil: null,
      };
    } else {
      tracker.attempts += 1;
      tracker.lastAttemptAt = now;
    }

    // Se atingiu o limite máximo de tentativas por IP
    if (tracker.attempts >= MAX_LOGIN_ATTEMPTS) {
      tracker.blockedUntil = now + LOGIN_LOCKOUT_MS;
      loginAttemptsByIp.set(ip, tracker);
      const lockoutSeconds = Math.ceil(LOGIN_LOCKOUT_MS / 1000);
      return res.status(429).json({
        clientIp: ip,
        isBlocked: true,
        lockoutSeconds,
        remainingAttempts: 0,
        maxAttempts: MAX_LOGIN_ATTEMPTS,
        attempts: tracker.attempts,
        message: `Limite de 5 tentativas incorretas atingido. IP bloqueado por 15 minutos em conformidade com a LGPD.`,
      });
    }

    loginAttemptsByIp.set(ip, tracker);
    const remaining = MAX_LOGIN_ATTEMPTS - tracker.attempts;

    return res.json({
      clientIp: ip,
      isBlocked: false,
      lockoutSeconds: 0,
      remainingAttempts: remaining,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      attempts: tracker.attempts,
      message: `Credencial incorreta. Restam ${remaining} tentativa(s) antes do bloqueio temporário deste IP.`,
    });
  });

  // Limpar tentativas (Reset explícito pós-login)
  app.post("/api/auth/reset-rate-limit", (req, res) => {
    const ip = getClientIp(req);
    loginAttemptsByIp.delete(ip);
    return res.json({ success: true, clientIp: ip });
  });

  // 2. Rate Limiting de Requisições de API (Anti-Scraping / DoS / Proteção Supabase)
  interface ApiRateTracker {
    count: number;
    windowStart: number;
  }
  const apiRequestsByIp = new Map<string, ApiRateTracker>();
  const API_LIMIT_PER_MINUTE = 100;
  const API_WINDOW_MS = 60 * 1000;

  const apiRateLimitMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path === "/api/health" || req.path.startsWith("/api/auth/")) {
      return next();
    }
    const ip = getClientIp(req);
    const now = Date.now();
    let entry = apiRequestsByIp.get(ip);

    if (!entry || now - entry.windowStart > API_WINDOW_MS) {
      entry = { count: 1, windowStart: now };
      apiRequestsByIp.set(ip, entry);
    } else {
      entry.count += 1;
      if (entry.count > API_LIMIT_PER_MINUTE) {
        const retryAfter = Math.ceil((entry.windowStart + API_WINDOW_MS - now) / 1000);
        res.setHeader("Retry-After", retryAfter);
        res.setHeader("X-RateLimit-Limit", API_LIMIT_PER_MINUTE);
        res.setHeader("X-RateLimit-Remaining", 0);
        return res.status(429).json({
          success: false,
          error: "Taxa máxima de requisições excedida. Para proteção contra ataques e conformidade com a LGPD, aguarde alguns instantes.",
          retryAfter,
        });
      }
    }

    res.setHeader("X-RateLimit-Limit", API_LIMIT_PER_MINUTE);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, API_LIMIT_PER_MINUTE - entry.count));
    next();
  };

  app.use("/api", apiRateLimitMiddleware);
  app.use("/salas", apiRateLimitMiddleware);

  // Health check route
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Helper Supabase client for Server-Side Routes
  const getServerSupabase = () => {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key || !url.startsWith("http") || url.includes("your-project")) {
      return null;
    }
    return createClient(url, key);
  };

  // ==========================================
  // SALAS (ROOMS) API ENDPOINTS
  // ==========================================

  // 1. GET /salas & /api/salas - Listar salas ativas (com filtro opcional de filial e status)
  const handleGetSalas = async (req: express.Request, res: express.Response) => {
    try {
      const { filial, todas } = req.query;
      const supabaseClient = getServerSupabase();

      if (!supabaseClient) {
        return res.json({
          success: true,
          source: "mock_fallback",
          data: [
            { id: "1", nome: "Sala 01 - Reunião Diretoria (Aldeota)", filial: "Fortaleza - CE", capacidade: 12, ativa: true },
            { id: "2", nome: "Sala 02 - Treinamento & Inovação (Meireles)", filial: "Fortaleza - CE", capacidade: 25, ativa: true },
            { id: "3", nome: "Sala 03 - Videoconferência (Iracema)", filial: "Fortaleza - CE", capacidade: 8, ativa: true },
            { id: "4", nome: "Sala 04 - Reunião Ágil (Beira-Mar)", filial: "Fortaleza - CE", capacidade: 10, ativa: true },
            { id: "5", nome: "Auditório Principal - Dragão do Mar (Fortaleza)", filial: "Fortaleza - CE", capacidade: 60, ativa: true },
            { id: "6", nome: "Sala de Brainstorming (Cocó)", filial: "Curitiba - Matriz (PR)", capacidade: 10, ativa: true },
            { id: "7", nome: "Laboratório de Projetos (Papicu)", filial: "Curitiba - Matriz (PR)", capacidade: 14, ativa: true },
          ],
        });
      }

      let query = supabaseClient.from("salas").select("*").order("nome", { ascending: true });

      // Por padrão retorna apenas ativas a menos que 'todas=true' seja passado
      if (todas !== "true") {
        query = query.eq("ativa", true);
      }

      if (filial && typeof filial === "string" && filial.trim() !== "") {
        query = query.eq("filial", filial.trim());
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, data: data || [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  app.get("/salas", handleGetSalas);
  app.get("/api/salas", handleGetSalas);

  // 2. POST /salas & /api/salas - Criar nova sala com validação
  const handleCreateSala = async (req: express.Request, res: express.Response) => {
    try {
      const { nome, filial, capacidade, ativa } = req.body;

      if (!nome || typeof nome !== "string" || !nome.trim()) {
        return res.status(400).json({ success: false, error: "O campo 'nome' é obrigatório." });
      }

      if (!filial || typeof filial !== "string" || !filial.trim()) {
        return res.status(400).json({ success: false, error: "O campo 'filial' é obrigatório." });
      }

      const supabaseClient = getServerSupabase();
      if (!supabaseClient) {
        return res.json({
          success: true,
          data: {
            id: `sala-${Date.now()}`,
            nome: nome.trim(),
            filial: filial.trim(),
            capacidade: capacidade ? Number(capacidade) : null,
            ativa: ativa !== undefined ? Boolean(ativa) : true,
            criado_em: new Date().toISOString(),
          },
        });
      }

      // Checar duplicidade de nome
      const { data: existing } = await supabaseClient
        .from("salas")
        .select("id, nome")
        .ilike("nome", nome.trim())
        .maybeSingle();

      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Já existe uma sala cadastrada com o nome "${nome.trim()}".`,
        });
      }

      const { data, error } = await supabaseClient
        .from("salas")
        .insert([
          {
            nome: nome.trim(),
            filial: filial.trim(),
            capacidade: capacidade ? Number(capacidade) : null,
            ativa: ativa !== undefined ? Boolean(ativa) : true,
          },
        ])
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.status(201).json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  app.post("/salas", handleCreateSala);
  app.post("/api/salas", handleCreateSala);

  // 3. PUT /salas/:id & /api/salas/:id - Editar sala existente
  const handleUpdateSala = async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { nome, filial, capacidade, ativa } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, error: "ID da sala não fornecido." });
      }

      const supabaseClient = getServerSupabase();
      if (!supabaseClient) {
        return res.json({
          success: true,
          data: { id, nome, filial, capacidade, ativa, atualizado_em: new Date().toISOString() },
        });
      }

      // Se alterar o nome, verificar duplicidade com outros IDs
      if (nome && typeof nome === "string") {
        const { data: duplicate } = await supabaseClient
          .from("salas")
          .select("id")
          .ilike("nome", nome.trim())
          .neq("id", id)
          .maybeSingle();

        if (duplicate) {
          return res.status(409).json({
            success: false,
            error: `Já existe outra sala com o nome "${nome.trim()}".`,
          });
        }
      }

      const updatePayload: Record<string, any> = {};
      if (nome !== undefined) updatePayload.nome = nome.trim();
      if (filial !== undefined) updatePayload.filial = filial.trim();
      if (capacidade !== undefined) updatePayload.capacidade = capacidade ? Number(capacidade) : null;
      if (ativa !== undefined) updatePayload.ativa = Boolean(ativa);
      updatePayload.atualizado_em = new Date().toISOString();

      const { data, error } = await supabaseClient
        .from("salas")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ success: false, error: error.message });
      }

      return res.json({ success: true, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  app.put("/salas/:id", handleUpdateSala);
  app.put("/api/salas/:id", handleUpdateSala);

  // 4. DELETE /salas/:id & /api/salas/:id - Excluir sala (com Soft-Delete se houver reservas associadas)
  const handleDeleteSala = async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { forcarExclusao } = req.query;

      if (!id) {
        return res.status(400).json({ success: false, error: "ID da sala não fornecido." });
      }

      const supabaseClient = getServerSupabase();
      if (!supabaseClient) {
        return res.json({
          success: true,
          message: "Sala desativada/removida com sucesso (ambiente local).",
        });
      }

      // Buscar a sala atual para obter o nome
      const { data: salaAtual } = await supabaseClient
        .from("salas")
        .select("id, nome")
        .eq("id", id)
        .maybeSingle();

      if (!salaAtual) {
        return res.status(404).json({ success: false, error: "Sala não encontrada." });
      }

      // Verificar se há reservas vinculadas a esta sala
      const { count } = await supabaseClient
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("sala", salaAtual.nome);

      const hasReservations = (count || 0) > 0;

      if (hasReservations && forcarExclusao !== "true") {
        // Soft Delete: desativa para preservar integridade referencial histórica
        const { error: updateError } = await supabaseClient
          .from("salas")
          .update({ ativa: false, atualizado_em: new Date().toISOString() })
          .eq("id", id);

        if (updateError) {
          return res.status(500).json({ success: false, error: updateError.message });
        }

        return res.json({
          success: true,
          softDeleted: true,
          message: `A sala "${salaAtual.nome}" possui ${count} reserva(s) no histórico e foi DESATIVADA com segurança (não será exibida em novas reservas).`,
        });
      }

      // Hard Delete se não houver reservas
      const { error: deleteError } = await supabaseClient.from("salas").delete().eq("id", id);

      if (deleteError) {
        // Fallback para soft-delete caso ocorra restrição de FK
        await supabaseClient.from("salas").update({ ativa: false }).eq("id", id);
        return res.json({
          success: true,
          softDeleted: true,
          message: `Sala "${salaAtual.nome}" desativada com segurança.`,
        });
      }

      return res.json({
        success: true,
        softDeleted: false,
        message: `Sala "${salaAtual.nome}" excluída permanentemente.`,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  app.delete("/salas/:id", handleDeleteSala);
  app.delete("/api/salas/:id", handleDeleteSala);

  // AI Parse Reservation Endpoint (Text & Image multimodal)
  app.post("/api/ai/parse-reservation", async (req, res) => {
    try {
      const { text, imageBase64, mimeType } = req.body;

      if (!text && !imageBase64) {
        return res.status(400).json({
          error: "Informe um texto ou envie uma imagem com as informações da reserva.",
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        // Fallback local heuristic parser when no API key is provided
        const parsedFallback = parseFallbackText(text || "");
        return res.json({
          success: true,
          reservations: parsedFallback,
          source: "fallback",
          message: "Preenchimento processado via motor heurístico local (adicione GEMINI_API_KEY para IA multimodal avançada).",
        });
      }

      // Initialize Gemini SDK with User-Agent
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `Você é o Assistente Especialista em Gestão de Reservas de Salas de Fortaleza.
Data de referência atual: 2026-08-15.
Sua missão é ler o texto e/ou a imagem fornecida (como print de chamado GLPI, mensagem de WhatsApp, e-mail, foto de agenda, solicitação manuscrita ou texto informal) e extrair com precisão as reservas de salas SEM DUPLICIDADES.

REGRAS OBRIGATÓRIAS:
1. DIAS E FAIXAS DE HORÁRIO: Caso o pedido mencione múltiplos dias distintos (ex: "dias 15, 16 e 17/08", "de 20/08 a 22/08"), gere EXATAMENTE UMA reserva para CADA DIA ÚNICO.
   Exemplo: Se o pedido solicita 15 e 16 de agosto das 11:00 às 14:00, gere EXATAMENTE 2 itens: um para 2026-08-15 e outro para 2026-08-16.
2. REGRA DE NÃO DUPLICAÇÃO (CRÍTICA): NUNCA crie mais de uma reserva para o mesmo dia na mesma sala e mesmo horário. Se o documento/print repetir a mesma data em cabeçalhos, histórico, campos de formulário ou tabelas, gere apenas UMA reserva para essa data. Não gere duplicatas.
3. FORMATO DE DIA: YYYY-MM-DD (ex: "2026-08-15"). Sempre use o ano de 2026 quando o ano não for explícito.
4. FORMATO DE HORÁRIO: HH:MM (ex: "08:00", "11:00", "14:30").
5. SALAS: Mapeie preferencialmente para uma das 5 salas padrão de Fortaleza:
   - "Sala 215 - Auditório"
   - "Sala 216 - Executivos"
   - "Sala 212 - Contingencia"
   - "Sala 116 - Contingencia"
   - "Sala 118 - Contingencia"
   Se for outro nome específico não listado, use o nome mencionado.
6. SETORES: Mapeie preferencialmente para um dos 10 setores oficiais:
   - "Atração de Talentos"
   - "BV"
   - "Bv - Bom Pagador"
   - "Controldesk"
   - "Desenvolvimento Organizacional"
   - "Dpto. Pessoal"
   - "Facilities"
   - "Limpeza e Conservação"
   - "Medicina e Saúde do Trabalho"
   - "Suporte"
   Se for outro setor específico, informe o nome adequado.
7. GLPI: Apenas os dígitos do número do chamado (ex: "104928" ou se não tiver coloque "000000" ou número sugerido).
8. SOLICITANTE: Nome completo da pessoa responsável ou solicitante.
9. OBSERVAÇÕES: Resumo do objetivo da reunião, equipamentos necessários ou notas adicionais.`;

      const parts: Array<any> = [];

      if (imageBase64) {
        // Remove data URL prefix if present
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: mimeType || "image/png",
            data: cleanBase64,
          },
        });
      }

      if (text) {
        parts.push({
          text: `Texto da solicitação de reserva: \n${text}`,
        });
      } else {
        parts.push({
          text: `Por favor, analise a imagem e extraia todas as reservas de salas indicadas.`,
        });
      }

      // Candidate models for resilience and automatic fallback
      const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-3.7-flash"];
      let response: any = null;
      let lastError: any = null;
      let usedModel = "gemini-2.5-flash";

      for (const modelName of candidateModels) {
        try {
          console.log(`🤖 Processando solicitação com IA (${modelName})...`);
          response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  summary: {
                    type: Type.STRING,
                    description: "Breve resumo amigável do que foi detectado.",
                  },
                  reservations: {
                    type: Type.ARRAY,
                    description: "Lista de reservas individuais geradas (uma por dia/horário).",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        dia: {
                          type: Type.STRING,
                          description: "Data da reserva no formato YYYY-MM-DD",
                        },
                        sala: {
                          type: Type.STRING,
                          description: "Nome da sala selecionada ou identificada",
                        },
                        horaInicial: {
                          type: Type.STRING,
                          description: "Horário inicial no formato HH:MM",
                        },
                        horaFinal: {
                          type: Type.STRING,
                          description: "Horário final no formato HH:MM",
                        },
                        solicitante: {
                          type: Type.STRING,
                          description: "Nome do solicitante",
                        },
                        setor: {
                          type: Type.STRING,
                          description: "Setor ou departamento do solicitante",
                        },
                        glpi: {
                          type: Type.STRING,
                          description: "Número do chamado GLPI (apenas dígitos)",
                        },
                        observacoes: {
                          type: Type.STRING,
                          description: "Observações ou pauta da reunião",
                        },
                      },
                      required: ["dia", "sala", "horaInicial", "horaFinal", "solicitante", "setor", "glpi"],
                    },
                  },
                },
                required: ["reservations"],
              },
            },
          });

          if (response && response.text) {
            usedModel = modelName;
            break; // Succeeded!
          }
        } catch (modelErr: any) {
          console.warn(`Aviso: falha temporária no modelo ${modelName}:`, modelErr?.message || modelErr);
          lastError = modelErr;
          // Continue to next model in candidateModels list
        }
      }

      // If all Gemini models failed (e.g. temporary 503 spike across all or quota limit)
      if (!response || !response.text) {
        if (text) {
          console.warn("Utilizando motor heurístico local após indisponibilidade dos modelos remotos.");
          const fallbackResults = parseFallbackText(text);
          return res.json({
            success: true,
            summary: `Processamento de contingência concluído (${fallbackResults.length} reserva(s) identificadas).`,
            reservations: fallbackResults,
            source: "fallback",
            message: "Os servidores de IA estavam momentaneamente sobrecarregados (503). O sistema processou sua solicitação via motor de contingência inteligente.",
          });
        }

        const rawMsg = lastError?.message || "O serviço de IA está temporariamente indisponível. Por favor, tente novamente em instantes.";
        let cleanMsg = rawMsg;
        try {
          // If error message is a JSON string from Google API
          if (rawMsg.startsWith("{") && rawMsg.endsWith("}")) {
            const parsed = JSON.parse(rawMsg);
            if (parsed.error && parsed.error.message) {
              cleanMsg = parsed.error.message;
            }
          }
        } catch (_) {}

        return res.status(503).json({
          error: cleanMsg,
        });
      }

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText);
      const rawReservations = parsedData.reservations || [];
      const uniqueReservations = deduplicateReservationArray(rawReservations);

      return res.json({
        success: true,
        summary: parsedData.summary || `Foram identificadas ${uniqueReservations.length} reserva(s) sem duplicidades.`,
        reservations: uniqueReservations,
        source: "gemini",
        model: usedModel,
      });
    } catch (error: any) {
      console.error("Erro na API Gemini:", error);
      let errorMsg = error.message || "Erro ao processar reserva com IA.";
      try {
        if (typeof errorMsg === "string" && errorMsg.startsWith("{") && errorMsg.endsWith("}")) {
          const parsed = JSON.parse(errorMsg);
          if (parsed.error && parsed.error.message) {
            errorMsg = parsed.error.message;
          }
        }
      } catch (_) {}

      return res.status(500).json({
        error: errorMsg,
      });
    }
  });

  // ==========================================
  // AI HELP & TIRA-DÚVIDAS ENDPOINT
  // ==========================================
  app.post("/api/ai/ask-help", async (req, res) => {
    try {
      const { question, history } = req.body;

      if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({ error: "Por favor, digite sua dúvida." });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      const systemInstruction = `Você é o Assistente Virtual Oficial e Instrutor do Sistema de Reserva de Salas da Bellinati Perez.
Seu objetivo é tirar dúvidas dos usuários e operadores de forma rápida, didática e resolutiva, explicando passo a passo como realizar qualquer operação no sistema.

CONTEXTO COMPLETO DO SISTEMA:
1. **Login e Auditoria**:
   - Cada operador entra com Nome e CPF.
   - Qualquer inclusão, alteração ou exclusão de reserva registra automaticamente o primeiro nome do operador e a data/hora exata da modificação para auditoria transparente.
2. **Criar Nova Reserva**:
   - Clique no botão vermelho '+ NOVA RESERVA' no topo direito.
   - Preencha: Sala, Data (no formato dia/mês/ano), Horário Inicial e Final, Solicitante, Setor e GLPI.
   - O sistema valida conflitos de horário em tempo real: não permite agendamentos sobrepostos na mesma sala.
3. **Filtros e Limpeza Rápida com ❌**:
   - Clique no botão 'Filtros' na barra superior para filtrar por Período (Data Inicial e Final), Solicitante, GLPI, Sala ou Setor, além de poder incluir reservas já encerradas.
   - Sempre que houver qualquer filtro ativo, um botão com o emoji ❌ ('❌ Limpar') aparece na barra superior e na faixa de filtros. Clicar no ❌ remove todos os filtros e restaura a lista completa instantaneamente.
4. **Editar ou Excluir Reservas**:
   - Na lista de reservas, cada linha possui o botão de Lápis (Editar) e Lixeira (Excluir com confirmação segura).
   - Ao editar, o sistema também revalida conflitos e atualiza a auditoria com o nome de quem editou.
5. **Gestão de Salas e Filiais**:
   - No botão 'Salas' na barra superior, os operadores podem cadastrar novas salas, definir capacidade em assentos, indicar filial e ativar/desativar salas.
6. **Gestão de Setores**:
   - No botão 'Setores' na barra superior, é possível cadastrar novos departamentos (ex: RH, TI, Jurídico, Operação).
7. **Relatórios e Exportação**:
   - No botão 'Relatório' na barra superior, é possível gerar relatórios gerenciais por período, visualizar horas totais reservadas e exportar para PDF ou CSV.
8. **Métricas & Ocupação**:
   - No botão 'Métricas', há gráficos de taxa de ocupação, ranking de salas mais utilizadas e distribuição por departamento.
9. **Assistente IA de Agendamento**:
   - No botão 'IA' no topo, o usuário pode colar e-mails, conversas do WhatsApp ou anexar fotos/prints de chamados GLPI; a IA extrai as datas, horários e solicitantes e cadastra automaticamente sem duplicidades.

FORMATO DE RESPOSTA:
- Responda em Português do Brasil.
- Use formatação clara em Markdown (tópicos com marcadores, números e negrito para nomes de botões).
- Seja objetivo, simpático e forneça o caminho exato (passo a passo) para resolver a dúvida.`;

      if (!apiKey) {
        // Intelligent Local Knowledge Base Fallback
        const q = question.toLowerCase();
        let fallbackAnswer = "";

        if (q.includes("como criar") || q.includes("nova reserva") || q.includes("agendar") || q.includes("cadastrar")) {
          fallbackAnswer = `### 📅 Como Criar uma Nova Reserva:\n\n1. **Clique no botão vermelho '+ NOVA RESERVA'** no canto superior direito.\n2. **Selecione a Sala** desejada.\n3. **Escolha a Data** e os **Horários Inicial e Final** da reunião.\n4. **Informe o Solicitante**, o **Setor** e o número do chamado **GLPI**.\n5. Clique em **'Salvar Reserva'**.\n\n💡 *O sistema verifica conflitos de horário automaticamente e avisa caso a sala já esteja ocupada no período escolhido.*`;
        } else if (q.includes("filtro") || q.includes("limpar") || q.includes("❌") || q.includes("buscar") || q.includes("pesquisar")) {
          fallbackAnswer = `### 🔍 Como Usar Filtros e o Botão de Limpeza ❌:\n\n1. **Aplicar Filtros**: Clique no botão **'Filtros'** na barra superior para filtrar por período de datas, solicitante, número GLPI, sala ou setor.\n2. **Limpar Filtros (❌)**: Sempre que houver um filtro ativo, um botão com o emoji **❌** aparecerá na barra superior e na faixa de filtros.\n3. **Basta clicar no botão ❌** para remover todas as filtragens instantaneamente e ver a lista completa de reservas.`;
        } else if (q.includes("conflito") || q.includes("choque") || q.includes("mesmo horario") || q.includes("duplicad")) {
          fallbackAnswer = `### ⚠️ Como o Sistema Trata Conflitos de Horário:\n\n- O sistema possui **validação inteligente em tempo real**.\n- Se você tentar agendar um horário que coincide total ou parcialmente com outra reserva na mesma sala e dia, o sistema exibirá um aviso em vermelho e bloqueará o salvamento.\n- Para resolver, basta alterar a sala ou ajustar o horário de início/fim.`;
        } else if (q.includes("editar") || q.includes("alterar") || q.includes("excluir") || q.includes("cancelar") || q.includes("remover")) {
          fallbackAnswer = `### ✏️ Como Editar ou Excluir uma Reserva:\n\n1. Localize a reserva na tabela ou lista principal.\n2. **Para Editar**: Clique no ícone de **Lápis (Editar)** no canto direito da reserva, ajuste os dados e salve.\n3. **Para Excluir**: Clique no ícone de **Lixeira (Excluir)** e confirme a remoção.\n\n🔒 *Todas as edições e exclusões gravam seu primeiro nome e a data/hora para controle e auditoria.*`;
        } else if (q.includes("relatorio") || q.includes("pdf") || q.includes("csv") || q.includes("imprimir") || q.includes("exportar")) {
          fallbackAnswer = `### 🖨️ Como Gerar Relatórios e Exportar PDF/CSV:\n\n1. Clique no botão **'Relatório'** na barra superior.\n2. Selecione o **Período** desejado (ex: Esta Semana, Este Mês ou Datas Personalizadas).\n3. Visualize as estatísticas de horas reservadas.\n4. Clique em **'Imprimir / PDF'** para salvar em formato impresso ou em **'Exportar CSV'** para abrir no Excel.`;
        } else if (q.includes("sala") || q.includes("adicionar sala") || q.includes("capacidade")) {
          fallbackAnswer = `### 🏢 Como Cadastrar ou Gerenciar Salas:\n\n1. Clique no botão **'Salas'** na barra superior.\n2. Clique em **'+ Nova Sala'**.\n3. Informe o Nome da sala, a Filial (ex: Fortaleza ou Curitiba) e a Capacidade máxima de pessoas.\n4. Clique em Salvar para disponibilizar a sala imediatamente para reservas.`;
        } else if (q.includes("ia") || q.includes("inteligencia") || q.includes("foto") || q.includes("print") || q.includes("email") || q.includes("whatsapp")) {
          fallbackAnswer = `### ✨ Como Usar o Assistente de Agendamento por IA:\n\n1. Clique no botão **'IA'** com efeito de brilho na barra superior.\n2. Cole o texto de um e-mail, chamado GLPI ou mensagem de solicitação, OU anexe um print/foto.\n3. A IA lerá as informações, identificará datas, salas, horários e solicitantes.\n4. Revise os dados na prévia e clique em **'Confirmar e Cadastrar'** para agendar todas as reuniões de uma vez!`;
        } else {
          fallbackAnswer = `### 💡 Guia Rápido do Sistema de Reserva de Salas:\n\n- **Nova Reserva**: Botão **'+ NOVA RESERVA'** no topo para agendar reuniões com validação de conflitos.\n- **Filtros e Busca**: Botão **'Filtros'** para filtrar por período, GLPI, solicitante ou sala; use o botão **❌** para limpar.\n- **Relatórios**: Botão **'Relatório'** para exportar ocupação em PDF ou CSV.\n- **Salas & Setores**: Botões **'Salas'** e **'Setores'** para cadastrar novos espaços e departamentos.\n- **Assistente IA**: Botão **'IA'** para agendar reservas a partir de prints e e-mails.\n\n*Se tiver uma dúvida específica, pergunte detalhadamente como realizar a ação!*`;
        }

        return res.json({
          success: true,
          answer: fallbackAnswer,
          source: "knowledge_base",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const candidateModels = ["gemini-3.7-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
      let answerText = "";

      for (const model of candidateModels) {
        try {
          const contents: any[] = [];
          if (Array.isArray(history) && history.length > 0) {
            for (const msg of history.slice(-6)) {
              contents.push({
                role: msg.sender === "user" ? "user" : "model",
                parts: [{ text: msg.text }],
              });
            }
          }
          contents.push({
            role: "user",
            parts: [{ text: question }],
          });

          const result = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: 0.3,
            },
          });

          answerText = result.text || "";
          if (answerText.trim()) break;
        } catch (mErr: any) {
          console.warn(`Tentativa com ${model} falhou:`, mErr.message);
        }
      }

      if (!answerText.trim()) {
        answerText = `Para resolver sua dúvida sobre **"${question}"**:\n\n1. **Nova Reserva**: Use o botão vermelho **+ NOVA RESERVA** para cadastrar um agendamento.\n2. **Filtros & Busca**: Clique em **Filtros** para localizar reservas e use o botão **❌** para limpar todos os filtros.\n3. **Salas & Setores**: Use os botões no menu superior para gerenciar os espaços da sua unidade.\n4. **Relatórios**: Clique em **Relatório** para exportar a listagem em PDF ou Excel.`;
      }

      return res.json({
        success: true,
        answer: answerText,
        source: "gemini",
      });
    } catch (err: any) {
      console.error("Erro no tira-dúvidas com IA:", err);
      return res.status(500).json({
        error: err.message || "Não foi possível consultar a IA no momento.",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

// Remove duplicated dates/rooms/hours from AI or fallback results
function deduplicateReservationArray(list: any[]) {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const uniqueList: any[] = [];

  for (const item of list) {
    if (!item || !item.dia) continue;
    const diaClean = String(item.dia).trim();
    const salaClean = String(item.sala || "").trim().toLowerCase();
    const hInitClean = String(item.horaInicial || "").trim();
    const hEndClean = String(item.horaFinal || "").trim();
    
    // Unique key: Day + Room + Hours
    const key = `${diaClean}|${salaClean}|${hInitClean}|${hEndClean}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueList.push(item);
    }
  }
  return uniqueList;
}

// Heuristic fallback text parser for offline/no-API-key testing
function parseFallbackText(text: string) {
  const lines = text.toLowerCase();
  
  // Detect GLPI
  const glpiMatch = text.match(/#?(\d{4,8})/);
  const glpi = glpiMatch ? glpiMatch[1] : "105500";

  // Detect Requester
  let solicitante = "Solicitante Informado";
  const nameMatch = text.match(/(?:para|por|solicitante|responsável|com)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i);
  if (nameMatch) {
    solicitante = nameMatch[1].trim();
  }

  // Detect Times
  let horaInicial = "11:00";
  let horaFinal = "14:00";
  const timeRangeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:as|às|a|-|ate|até)\s*(\d{1,2})(?::(\d{2}))?\s*(?:h|hs|hrs|horas)?/i);
  if (timeRangeMatch) {
    const h1 = timeRangeMatch[1].padStart(2, "0");
    const m1 = (timeRangeMatch[2] || "00").padStart(2, "0");
    const h2 = timeRangeMatch[3].padStart(2, "0");
    const m2 = (timeRangeMatch[4] || "00").padStart(2, "0");
    horaInicial = `${h1}:${m1}`;
    horaFinal = `${h2}:${m2}`;
  }

  // Detect Room
  let sala = "Sala 215 - Auditório";
  if (lines.includes("215") || lines.includes("auditório") || lines.includes("auditorio")) {
    sala = "Sala 215 - Auditório";
  } else if (lines.includes("216") || lines.includes("executivo") || lines.includes("executivos")) {
    sala = "Sala 216 - Executivos";
  } else if (lines.includes("212")) {
    sala = "Sala 212 - Contingencia";
  } else if (lines.includes("116")) {
    sala = "Sala 116 - Contingencia";
  } else if (lines.includes("118")) {
    sala = "Sala 118 - Contingencia";
  }

  // Detect Sector
  let setor = "Suporte";
  if (lines.includes("atração") || lines.includes("atracao") || lines.includes("talento") || lines.includes("recrutamento")) {
    setor = "Atração de Talentos";
  } else if (lines.includes("bom pagador")) {
    setor = "Bv - Bom Pagador";
  } else if (lines.includes("bv") || lines.includes("banco")) {
    setor = "BV";
  } else if (lines.includes("controldesk") || lines.includes("control desk")) {
    setor = "Controldesk";
  } else if (lines.includes("desenvolvimento") || lines.includes("treinamento") || lines.includes("organizacional")) {
    setor = "Desenvolvimento Organizacional";
  } else if (lines.includes("pessoal") || lines.includes("dp") || lines.includes("folha")) {
    setor = "Dpto. Pessoal";
  } else if (lines.includes("facilities") || lines.includes("predial") || lines.includes("manutenção")) {
    setor = "Facilities";
  } else if (lines.includes("limpeza") || lines.includes("conservação") || lines.includes("conservacao")) {
    setor = "Limpeza e Conservação";
  } else if (lines.includes("medicina") || lines.includes("saúde") || lines.includes("saude") || lines.includes("trabalho") || lines.includes("ambulatorio")) {
    setor = "Medicina e Saúde do Trabalho";
  } else if (lines.includes("suporte") || lines.includes("ti") || lines.includes("helpdesk") || lines.includes("tecnologia") || lines.includes("rede")) {
    setor = "Suporte";
  }

  // Detect Multiple Days (deduplicated)
  const rawDays: string[] = [];
  
  // Check for day list like "15, 16 e 17/08" or "15, 16, 17"
  const multiDayMatch = text.match(/(?:dias?|datas?)\s*(\d{1,2}(?:\s*,\s*\d{1,2})*(?:\s+e\s+\d{1,2})?)(?:\/(\d{1,2}))?/i);
  if (multiDayMatch) {
    const rawDaysStr = multiDayMatch[1];
    const month = multiDayMatch[2] ? multiDayMatch[2].padStart(2, "0") : "08";
    const dayNumbers = Array.from(new Set(rawDaysStr.split(/[,e\s]+/).filter(Boolean).map(d => parseInt(d, 10)).filter(n => !isNaN(n) && n >= 1 && n <= 31)));
    
    dayNumbers.forEach(dNum => {
      rawDays.push(`2026-${month}-${String(dNum).padStart(2, "0")}`);
    });
  }

  if (rawDays.length === 0) {
    // Check for single date DD/MM/YYYY or DD/MM
    const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dateMatch) {
      const d = dateMatch[1].padStart(2, "0");
      const m = dateMatch[2].padStart(2, "0");
      const y = dateMatch[3] ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : "2026";
      rawDays.push(`${y}-${m}-${d}`);
    } else {
      rawDays.push("2026-08-15");
    }
  }

  const uniqueDays = Array.from(new Set(rawDays));

  const list = uniqueDays.map(dia => ({
    dia,
    sala,
    horaInicial,
    horaFinal,
    solicitante,
    setor,
    glpi,
    observacoes: text.slice(0, 150),
  }));

  return deduplicateReservationArray(list);
}

startServer();
