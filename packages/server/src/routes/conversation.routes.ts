import type { FastifyInstance } from "fastify";
import { extractLLMConfig, StartConversationSchema, RespondSchema } from "../helpers.js";
import { getOrchestrator } from "../services/agent-manager.js";

/**
 * @fileoverview CONVERSATION ROUTES — Single Source of Truth.
 *
 * All interactive conversation endpoints live here. Previously inlined in
 * `index.ts`; consolidated in Round 16. The removed `routes/conversations.ts`
 * (Round 15) was dead code that duplicated this logic — this module is the
 * only living implementation.
 *
 * Endpoint inventory (all are `InteractiveOrchestrator`-backed):
 * - `POST /conversations/start` — create a new session
 *   ({@link StartConversationSchema}).
 * - `POST /conversations/:sessionId/respond` — send the user's next message
 *   ({@link RespondSchema}).
 * - `GET  /conversations/:sessionId` — fetch current session state.
 * - `POST /conversations/:sessionId/skip` — skip the current agent in the
 *   pipeline and advance to the next one.
 * - `POST /conversations/:sessionId/plan` — produce the plan for user review.
 * - `POST /conversations/:sessionId/generate` — generate code from the
 *   approved plan (one-shot).
 * - `POST /conversations/:sessionId/generate-incremental` — incremental
 *   code generation with batch governance callbacks.
 * - `POST /conversations/:sessionId/finalize` — legacy one-shot finalization.
 * - `GET  /generation/progress/:sessionId` — EXPERIMENTAL SSE endpoint;
 *   see the JSDoc block on the handler below for the full containment
 *   contract (P23).
 *
 * Every endpoint authenticates via {@link extractLLMConfig}: missing or
 * malformed API keys produce `401 API Key não configurada`. Body validation
 * errors produce `400 Dados inválidos` with the Zod issue list. Downstream
 * orchestrator errors are wrapped as `502` with `details: errorMessage`.
 *
 * @module server/routes/conversation
 */

/**
 * Registers every interactive conversation endpoint on a Fastify instance.
 *
 * @param app Fastify instance to register the routes on.
 * @param defaultApiKey Server-level fallback API key used when the request
 *                      does not carry an `Authorization: Bearer` header.
 */
export async function registerConversationRoutes(
  app: FastifyInstance,
  defaultApiKey: string
): Promise<void> {
  // POST /conversations/start — Start new conversation
  app.post("/conversations/start", async (request, reply) => {
    const llmConfig = extractLLMConfig(request.headers as Record<string, string | string[] | undefined>, defaultApiKey);
    if (!llmConfig.apiKey) {
      return reply.status(401).send({
        error: "API Key não configurada",
        message: "Configure OPENAI_API_KEY ou envie via header Authorization"
      });
    }
    const parseResult = StartConversationSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Dados inválidos", details: parseResult.error.issues });
    }
    const { userId, message } = parseResult.data;
    try {
      const orchestrator = await getOrchestrator(llmConfig);
      const result = await orchestrator.startConversation(userId, message);
      return reply.send(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha ao iniciar conversa");
      return reply.status(502).send({ error: "Falha ao iniciar conversa", details: errorMessage });
    }
  });

  // POST /conversations/:sessionId/respond — Respond to agent
  app.post<{ Params: { sessionId: string } }>("/conversations/:sessionId/respond", async (request, reply) => {
    const llmConfig = extractLLMConfig(request.headers as Record<string, string | string[] | undefined>, defaultApiKey);
    if (!llmConfig.apiKey) {
      return reply.status(401).send({ error: "API Key não configurada" });
    }
    const parseResult = RespondSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: "Dados inválidos", details: parseResult.error.issues });
    }
    const { sessionId } = request.params;
    const { message } = parseResult.data;
    try {
      const orchestrator = await getOrchestrator(llmConfig);
      const result = await orchestrator.respondToAgent(sessionId, message);
      return reply.send(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha ao processar resposta");
      return reply.status(502).send({ error: "Falha ao processar resposta", details: errorMessage });
    }
  });

  // GET /conversations/:sessionId — Session state
  app.get<{ Params: { sessionId: string } }>("/conversations/:sessionId", async (request, reply) => {
    const llmConfig = extractLLMConfig(request.headers as Record<string, string | string[] | undefined>, defaultApiKey);
    if (!llmConfig.apiKey) {
      return reply.status(401).send({ error: "API Key não configurada" });
    }
    const { sessionId } = request.params;
    try {
      const orchestrator = await getOrchestrator(llmConfig);
      const session = orchestrator.getSession(sessionId);
      if (!session) {
        return reply.status(404).send({ error: "Sessão não encontrada" });
      }
      return reply.send(session);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha ao buscar sessão");
      return reply.status(500).send({ error: "Falha ao buscar sessão", details: errorMessage });
    }
  });

  // POST /conversations/:sessionId/skip — Skip current agent
  app.post<{ Params: { sessionId: string } }>("/conversations/:sessionId/skip", async (request, reply) => {
    const llmConfig = extractLLMConfig(request.headers as Record<string, string | string[] | undefined>, defaultApiKey);
    if (!llmConfig.apiKey) {
      return reply.status(401).send({ error: "API Key não configurada" });
    }
    const { sessionId } = request.params;
    try {
      const orchestrator = await getOrchestrator(llmConfig);
      const result = await orchestrator.skipCurrentAgent(sessionId);
      return reply.send(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha ao pular agente");
      return reply.status(502).send({ error: "Falha ao pular agente", details: errorMessage });
    }
  });

  // POST /conversations/:sessionId/plan — Generate plan for review
  app.post<{ Params: { sessionId: string } }>("/conversations/:sessionId/plan", async (request, reply) => {
    const llmConfig = extractLLMConfig(request.headers as Record<string, string | string[] | undefined>, defaultApiKey);
    if (!llmConfig.apiKey) {
      return reply.status(401).send({ error: "API Key não configurada" });
    }
    const { sessionId } = request.params;
    try {
      const orchestrator = await getOrchestrator(llmConfig);
      const plan = await orchestrator.generatePlan(sessionId);
      return reply.send(plan);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha ao gerar plano");
      return reply.status(502).send({ error: "Falha ao gerar plano", details: errorMessage });
    }
  });

  // POST /conversations/:sessionId/generate — Generate code from approved plan
  app.post<{ Params: { sessionId: string } }>("/conversations/:sessionId/generate", async (request, reply) => {
    const llmConfig = extractLLMConfig(request.headers as Record<string, string | string[] | undefined>, defaultApiKey);
    if (!llmConfig.apiKey) {
      return reply.status(401).send({ error: "API Key não configurada" });
    }
    const { sessionId } = request.params;
    try {
      const orchestrator = await getOrchestrator(llmConfig);
      const result = await orchestrator.generateCodeFromPlan(sessionId);
      return reply.send(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha ao gerar código");
      return reply.status(502).send({ error: "Falha ao gerar código", details: errorMessage });
    }
  });

  // POST /conversations/:sessionId/generate-incremental — Incremental code generation with governance
  app.post<{ Params: { sessionId: string } }>("/conversations/:sessionId/generate-incremental", async (request, reply) => {
    const llmConfig = extractLLMConfig(request.headers as Record<string, string | string[] | undefined>, defaultApiKey);
    if (!llmConfig.apiKey) {
      return reply.status(401).send({ error: "API Key não configurada" });
    }
    const { sessionId } = request.params;
    try {
      const orchestrator = await getOrchestrator(llmConfig);
      const result = await orchestrator.generateCodeFromPlanIncremental(
        sessionId,
        (batchName: string, progress: number) => {
          request.log.info({ batchName, progress }, "Incremental generation progress");
        }
      );
      return reply.send(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha na geração incremental");
      return reply.status(502).send({ error: "Falha na geração incremental", details: errorMessage });
    }
  });

  // POST /conversations/:sessionId/finalize — Generate final result (legacy)
  app.post<{ Params: { sessionId: string } }>("/conversations/:sessionId/finalize", async (request, reply) => {
    const llmConfig = extractLLMConfig(request.headers as Record<string, string | string[] | undefined>, defaultApiKey);
    if (!llmConfig.apiKey) {
      return reply.status(401).send({ error: "API Key não configurada" });
    }
    const { sessionId } = request.params;
    try {
      const orchestrator = await getOrchestrator(llmConfig);
      const result = await orchestrator.generateFinalResult(sessionId);
      return reply.send(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha ao gerar resultado final");
      return reply.status(502).send({ error: "Falha ao gerar resultado", details: errorMessage });
    }
  });

  /**
   * SSE endpoint for generation progress streaming.
   *
   * @experimental NOT PART OF THE STABLE API SURFACE.
   *
   * This endpoint is classified as EXPERIMENTAL (P23). It establishes a valid
   * SSE connection with heartbeat keep-alive but does NOT stream real progress
   * data. No pub/sub bridge exists between generate-incremental progress
   * callbacks and this SSE stream. No client-side consumer exists in the UI.
   *
   * It must NOT be treated as a stable, contractual feature. It may be removed,
   * redesigned, or left indefinitely in this state without notice.
   *
   * WHAT IT DOES:
   * - Requires authentication (same API key check as all conversation endpoints)
   * - Validates sessionId format (1-100 alphanumeric/hyphen/underscore characters)
   * - Validates that sessionId corresponds to an existing session
   * - Sends a "connected" event with { provisional: true }
   * - Sends heartbeat comments every 15 seconds
   * - Enforces a 5-minute connection timeout
   * - Cleans up all resources (timers, listeners) on close, timeout, or error
   *
   * WHAT IT DOES NOT DO:
   * - Stream actual generation progress events
   * - Bridge with generate-incremental progress callbacks
   * - Deliver any real-time information about code generation state
   *
   * BOUNDARY CONTRACT:
   * - Requires valid API key via Authorization header or server default
   * - Missing/invalid API key → 401 { error }
   * - sessionId must match /^[a-zA-Z0-9_-]{1,100}$/
   * - Invalid sessionId → 400 { error, details }
   * - sessionId > 100 chars → Fastify's maxParamLength (100) intercepts with 404
   * - Non-existent session → 404 { error }
   * - Connected event includes provisional: true to signal no real progress
   */
  const SSE_SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{1,100}$/;
  const SSE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  app.get<{ Params: { sessionId: string } }>("/generation/progress/:sessionId", async (request, reply) => {
    // P11: Authentication — same pattern as all other conversation endpoints
    const llmConfig = extractLLMConfig(request.headers as Record<string, string | string[] | undefined>, defaultApiKey);
    if (!llmConfig.apiKey) {
      return reply.status(401).send({ error: "API Key não configurada" });
    }

    const { sessionId } = request.params;

    if (!SSE_SESSION_ID_PATTERN.test(sessionId)) {
      return reply.status(400).send({
        error: "sessionId inválido",
        details: "sessionId deve conter 1-100 caracteres alfanuméricos, hífens ou underscores"
      });
    }

    // P11: Session existence validation — verify session exists before opening SSE
    try {
      const orchestrator = await getOrchestrator(llmConfig);
      const session = orchestrator.getSession(sessionId);
      if (!session) {
        return reply.status(404).send({ error: "Sessão não encontrada" });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha ao validar sessão para SSE");
      return reply.status(500).send({ error: "Falha ao validar sessão", details: errorMessage });
    }

    reply.hijack();

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    let cleaned = false;

    const cleanup = (): void => {
      if (cleaned) return;
      cleaned = true;
      clearInterval(heartbeat);
      clearTimeout(timeout);
      if (!reply.raw.writableEnded) {
        reply.raw.end();
      }
    };

    const heartbeat = setInterval(() => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(": heartbeat\n\n");
      }
    }, 15000);

    const timeout = setTimeout(() => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(`data: ${JSON.stringify({ type: "timeout", reason: "Connection timeout after 5 minutes" })}\n\n`);
      }
      cleanup();
    }, SSE_TIMEOUT_MS);

    reply.raw.write(`data: ${JSON.stringify({ type: "connected", sessionId, provisional: true })}\n\n`);

    request.raw.on("close", cleanup);
    reply.raw.on("error", cleanup);
  });
}
