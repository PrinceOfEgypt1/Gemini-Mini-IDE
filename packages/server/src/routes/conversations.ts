/**
 * @fileoverview Rotas da API de conversas interativas.
 *
 * Endpoints:
 * - POST   /conversations/start          — Inicia nova conversa
 * - POST   /conversations/:sessionId/respond  — Responde ao agente atual
 * - GET    /conversations/:sessionId      — Retorna estado da sessão
 * - POST   /conversations/:sessionId/skip     — Pula agente atual
 * - POST   /conversations/:sessionId/finalize — Gera resultado final
 *
 * @module routes/conversations
 * @version 1.0.0
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import { InteractiveOrchestrator } from "@gemini-mini-ide/analysis-agent";

const DEFAULT_API_KEY = process.env["OPENAI_API_KEY"] ?? "";

// Cache de orquestradores por API key
const orchestrators = new Map<string, InteractiveOrchestrator>();

function getOrchestrator(apiKey: string): InteractiveOrchestrator {
  let orchestrator = orchestrators.get(apiKey);
  if (!orchestrator) {
    orchestrator = new InteractiveOrchestrator(apiKey);
    orchestrators.set(apiKey, orchestrator);
  }
  return orchestrator;
}

function extractApiKey(authHeader?: string): string {
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return DEFAULT_API_KEY;
}

// Schemas de validação
const StartConversationSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1)
});

const RespondSchema = z.object({
  message: z.string().min(1)
});

/**
 * Registra as rotas de conversação no Fastify.
 */
export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  // ─────────────────────────────────────────────────────────
  // POST /conversations/start — Inicia nova conversa
  // ─────────────────────────────────────────────────────────
  app.post("/conversations/start", async (request, reply) => {
    const apiKey = extractApiKey(request.headers["authorization"]);
    if (!apiKey) {
      return reply.status(401).send({
        error: "API Key não configurada",
        message: "Configure OPENAI_API_KEY ou envie via header Authorization"
      });
    }

    const parseResult = StartConversationSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Dados inválidos",
        details: parseResult.error.issues
      });
    }

    const { userId, message } = parseResult.data;

    try {
      const orchestrator = getOrchestrator(apiKey);
      const result = await orchestrator.startConversation(userId, message);
      return reply.send(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha ao iniciar conversa");
      return reply.status(502).send({
        error: "Falha ao iniciar conversa",
        details: errorMessage
      });
    }
  });

  // ─────────────────────────────────────────────────────────
  // POST /conversations/:sessionId/respond — Responde ao agente
  // ─────────────────────────────────────────────────────────
  app.post<{ Params: { sessionId: string } }>(
    "/conversations/:sessionId/respond",
    async (request, reply) => {
      const apiKey = extractApiKey(request.headers["authorization"]);
      if (!apiKey) {
        return reply.status(401).send({ error: "API Key não configurada" });
      }

      const parseResult = RespondSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: parseResult.error.issues
        });
      }

      const { sessionId } = request.params;
      const { message } = parseResult.data;

      try {
        const orchestrator = getOrchestrator(apiKey);
        const result = await orchestrator.respondToAgent(sessionId, message);
        return reply.send(result);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, "Falha ao processar resposta");
        return reply.status(502).send({
          error: "Falha ao processar resposta",
          details: errorMessage
        });
      }
    }
  );

  // ─────────────────────────────────────────────────────────
  // GET /conversations/:sessionId — Estado da sessão
  // ─────────────────────────────────────────────────────────
  app.get<{ Params: { sessionId: string } }>(
    "/conversations/:sessionId",
    async (request, reply) => {
      const apiKey = extractApiKey(request.headers["authorization"]);
      if (!apiKey) {
        return reply.status(401).send({ error: "API Key não configurada" });
      }

      const { sessionId } = request.params;

      try {
        const orchestrator = getOrchestrator(apiKey);
        const session = orchestrator.getSession(sessionId);
        if (!session) {
          return reply.status(404).send({ error: "Sessão não encontrada" });
        }
        return reply.send(session);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, "Falha ao buscar sessão");
        return reply.status(500).send({
          error: "Falha ao buscar sessão",
          details: errorMessage
        });
      }
    }
  );

  // ─────────────────────────────────────────────────────────
  // POST /conversations/:sessionId/skip — Pula agente atual
  // ─────────────────────────────────────────────────────────
  app.post<{ Params: { sessionId: string } }>(
    "/conversations/:sessionId/skip",
    async (request, reply) => {
      const apiKey = extractApiKey(request.headers["authorization"]);
      if (!apiKey) {
        return reply.status(401).send({ error: "API Key não configurada" });
      }

      const { sessionId } = request.params;

      try {
        const orchestrator = getOrchestrator(apiKey);
        const result = await orchestrator.skipCurrentAgent(sessionId);
        return reply.send(result);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, "Falha ao pular agente");
        return reply.status(502).send({
          error: "Falha ao pular agente",
          details: errorMessage
        });
      }
    }
  );

  // ─────────────────────────────────────────────────────────
  // POST /conversations/:sessionId/finalize — Gera resultado final
  // ─────────────────────────────────────────────────────────
  app.post<{ Params: { sessionId: string } }>(
    "/conversations/:sessionId/finalize",
    async (request, reply) => {
      const apiKey = extractApiKey(request.headers["authorization"]);
      if (!apiKey) {
        return reply.status(401).send({ error: "API Key não configurada" });
      }

      const { sessionId } = request.params;

      try {
        const orchestrator = getOrchestrator(apiKey);
        const result = await orchestrator.generateFinalResult(sessionId);
        return reply.send(result);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        request.log.error({ err }, "Falha ao gerar resultado final");
        return reply.status(502).send({
          error: "Falha ao gerar resultado",
          details: errorMessage
        });
      }
    }
  );
}
