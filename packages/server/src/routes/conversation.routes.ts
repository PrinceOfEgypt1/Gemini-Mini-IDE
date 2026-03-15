import type { FastifyInstance } from "fastify";
import { extractLLMConfig, StartConversationSchema, RespondSchema } from "../helpers.js";
import { getOrchestrator } from "../services/agent-manager.js";

/**
 * CONVERSATION ROUTES — Single Source of Truth
 *
 * All interactive conversation endpoints live here.
 * Previously inlined in index.ts; consolidated in Round 16.
 * The removed routes/conversations.ts (Round 15) was dead code that duplicated
 * this logic — this module is the only living implementation.
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

  // SSE endpoint for generation progress streaming
  app.get<{ Params: { sessionId: string } }>("/generation/progress/:sessionId", async (request, reply) => {
    const { sessionId } = request.params;

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(": heartbeat\n\n");
    }, 15000);

    reply.raw.write(`data: ${JSON.stringify({ type: "connected", sessionId })}\n\n`);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
    });
  });
}
