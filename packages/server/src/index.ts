import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import dotenv from "dotenv";
import { z } from "zod";
import { AnalysisAgent, globalESAAOrchestrator } from "@gemini-mini-ide/analysis-agent";
import { exportController } from "./controllers/export.controller.js";

dotenv.config({ path: "../../.env" });

const PORT = process.env["PORT"] ? parseInt(process.env["PORT"]) : 3200;
const DEFAULT_API_KEY = process.env["OPENAI_API_KEY"] ?? "";

// HU-MINI-IDE-PERF-001: Instância Global para Singleton
// Evita recriar conexão TCP/TLS se a chave for a mesma
let defaultAgentInstance: AnalysisAgent | null = null;
if (DEFAULT_API_KEY) {
  defaultAgentInstance = new AnalysisAgent(DEFAULT_API_KEY);
}

// Schema de Requisição
const AnalyzeRequestSchema = z.object({
  text: z.string().min(1),
  maxLen: z.number().optional(),
  currentContext: z
    .object({
      files: z.array(
        z.object({
          path: z.string(),
          purpose: z.string().optional()
        })
      ),
      summary: z.string().optional()
    })
    .optional()
});

const app: FastifyInstance = Fastify({
  logger: {
    level: process.env["LOG_LEVEL"] ?? "info",
    transport: {
      target: "pino-pretty",
      options: { colorize: true }
    }
  }
});

// Error handler global
app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  reply.status(500).send({
    error: "Internal Server Error",
    details: error.message
  });
});

const start = async (): Promise<void> => {
  // Registra plugins
  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "X-LLM-Base-URL", "X-Dry-Run"]
  });

  // Rate limiting: 100 requests por minuto por IP
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: "Limite de requisições excedido. Tente novamente em 1 minuto."
    })
  });

  // Health check
  app.get("/healthz", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Endpoint principal de análise
  app.post("/analyze", async (request, reply) => {
    // Lógica de Dry Run para testes
    const dryRun = request.headers["x-dry-run"] === "true";

    // Validação
    const parseResult = AnalyzeRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Dados inválidos",
        details: parseResult.error.issues
      });
    }

    // Bypass para testes automatizados
    if (dryRun) {
      request.log.info("[DryRun] Skipping Agent execution");
      return reply.send({
        summary: "Dry Run Successful",
        requestId: "dry-run-id",
        timestamp: new Date().toISOString(),
        analysis: { summary: "Dry Run", complexity: "Baixa", assumptions: [] },
        product: { userStories: [] },
        architect: { stack: "Test", diagram: "" },
        engine: { files: [] },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Dry Run Mode" }
      });
    }

    const { text } = parseResult.data;

    // Extrai API key do header Authorization
    const authHeader = request.headers["authorization"];
    const apiKey =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : DEFAULT_API_KEY;

    if (!apiKey) {
      return reply.status(401).send({
        error: "API Key não configurada",
        message: "Configure a variável OPENAI_API_KEY ou envie via header Authorization"
      });
    }

    try {
      // HU-MINI-IDE-PERF-001: Lógica Singleton
      let agent: AnalysisAgent;

      if (apiKey === DEFAULT_API_KEY && defaultAgentInstance) {
        // Reusa instância global
        agent = defaultAgentInstance;
        request.log.info("Reusing Global AnalysisAgent Instance");
      } else {
        // Cria nova instância (chave customizada)
        agent = new AnalysisAgent(apiKey);
        request.log.info("Creating New AnalysisAgent Instance (Custom Key)");
      }

      const result = await agent.analyze(text);
      return reply.send(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha no Agente");
      return reply.status(502).send({
        error: "Falha no Agente",
        details: errorMessage
      });
    }
  });

  // Endpoint de exportação
  app.post("/export", exportController);

  // ── ESAA Hardened v2 Endpoints ─────────────────────────────────────────────

  // Health do sistema ESAA
  app.get("/esaa/health", async (_request, reply) => {
    return reply.send(globalESAAOrchestrator.healthStatus());
  });

  // Consulta de eventos
  app.get("/esaa/events", async (request, reply) => {
    const query = request.query as {
      streamId?: string;
      correlationId?: string;
      type?: string;
      sinceVersion?: string;
      limit?: string;
    };

    const events = globalESAAOrchestrator.queryEvents({
      streamId: query.streamId,
      correlationId: query.correlationId,
      type: query.type as Parameters<typeof globalESAAOrchestrator.queryEvents>[0]["type"],
      sinceVersion: query.sinceVersion ? parseInt(query.sinceVersion) : undefined,
      limit: query.limit ? parseInt(query.limit) : 100,
    });

    return reply.send({ events, total: events.length });
  });

  // Projeção operacional
  app.get("/esaa/projections/operational", async (_request, reply) => {
    const proj = globalESAAOrchestrator.getOperationalProjection();
    return reply.send({
      lastAppliedVersion: proj.lastAppliedVersion,
      updatedAt: proj.updatedAt,
      hash: proj.hash,
      activeAgents: Object.values(proj.agents).filter(a => a.status === "ACTIVE").length,
      quarantinedAgents: Object.values(proj.agents).filter(a => a.status === "QUARANTINED").length,
      activeIntentions: Object.keys(proj.activeIntentions).length,
      activeWorkspaces: Object.keys(proj.activeWorkspaces).length,
      activePromotions: Object.keys(proj.activePromotions).length,
      filesInProgress: Object.keys(proj.filesInProgress).length,
    });
  });

  // Audit trail por correlationId
  app.get("/esaa/projections/audit/:correlationId", async (request, reply) => {
    const { correlationId } = request.params as { correlationId: string };
    const audit = globalESAAOrchestrator.getAuditProjection();
    const intentionIds = audit.correlationIndex[correlationId] ?? [];
    const intentions = intentionIds
      .map(id => audit.intentions[id])
      .filter(Boolean)
      .map(i => ({
        intentionId: i.intentionId,
        type: i.type,
        agentId: i.agentId,
        riskLevel: i.riskLevel,
        proposedAt: i.proposedAt,
        outcome: i.outcome,
        filesGenerated: i.filesGenerated.length,
        durationMs: i.durationMs,
      }));

    const promotions = Object.values(audit.promotions)
      .filter(p => p.correlationId === correlationId)
      .map(p => ({
        batchId: p.batchId,
        requestedAt: p.requestedAt,
        outcome: p.outcome,
        gateResults: p.gateResults,
        promotedFiles: p.promotedFiles.length,
      }));

    return reply.send({ correlationId, intentions, promotions });
  });

  // Lista agentes
  app.get("/esaa/agents", async (_request, reply) => {
    const agents = globalESAAOrchestrator.store.listAgents() as Record<string, unknown>[];
    const total = agents.length;
    const active = agents.filter(a => a["status"] === "active").length;
    const quarantined = agents.filter(a => a["status"] === "quarantined").length;
    return reply.send({ agents, total, active, quarantined });
  });

  // Quarentenar agente
  app.post("/esaa/agents/:agentId/quarantine", async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    const body = request.body as { reason: string; operatorId: string; triggeringEventId?: string };
    const result = globalESAAOrchestrator.quarantineAgent(
      agentId,
      body.reason,
      body.triggeringEventId ?? "manual"
    );
    return reply.send(result);
  });

  // Reintegrar agente
  app.post("/esaa/agents/:agentId/reinstate", async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    const result = globalESAAOrchestrator.reinstateAgent(agentId);
    return reply.send(result);
  });

  // Criar snapshots
  app.post("/esaa/recovery/snapshot", async (_request, reply) => {
    const result = globalESAAOrchestrator.createSnapshots();
    return reply.send({ ...result, createdAt: new Date().toISOString() });
  });

  // Rollback para snapshot
  app.post("/esaa/recovery/rollback", async (request, reply) => {
    const body = request.body as {
      snapshotId?: string;
      correlationId?: string;
      operatorId: string;
    };

    if (body.snapshotId) {
      const result = globalESAAOrchestrator.rollbackToSnapshot(body.snapshotId);
      return reply.send(result);
    }

    if (body.correlationId) {
      const result = await globalESAAOrchestrator.recovery.rollbackLastPromotion(
        body.correlationId,
        body.operatorId ?? "API_OPERATOR"
      );
      return reply.send(result);
    }

    return reply.status(400).send({
      error: "Forneça snapshotId ou correlationId"
    });
  });

  // Replay de eventos
  app.post("/esaa/recovery/replay", async (request, reply) => {
    const body = request.body as {
      full?: boolean;
      fromVersion?: number;
      operatorId: string;
    };

    let result;
    if (body.full) {
      result = await globalESAAOrchestrator.fullReplay();
    } else if (body.fromVersion !== undefined) {
      result = await globalESAAOrchestrator.recovery.replayFromVersion(
        body.fromVersion,
        body.operatorId ?? "API_OPERATOR"
      );
    } else {
      return reply.status(400).send({
        error: "Forneça full:true ou fromVersion"
      });
    }

    return reply.send(result);
  });

  // Consulta de promoções
  app.get("/esaa/promotions/:batchId", async (request, reply) => {
    const { batchId } = request.params as { batchId: string };
    const batch = globalESAAOrchestrator.store.getPromotionBatch(batchId);

    if (!batch) {
      return reply.status(404).send({ error: `Lote ${batchId} não encontrado` });
    }

    return reply.send(batch);
  });

  // Rollback de promoção
  app.post("/esaa/promotions/:batchId/rollback", async (request, reply) => {
    const { batchId } = request.params as { batchId: string };
    const body = request.body as { reason: string; operatorId: string };

    try {
      await globalESAAOrchestrator.promotion.rollback(
        batchId,
        body.operatorId ?? "API_OPERATOR",
        batchId,
        body.reason
      );
      return reply.send({ success: true, batchId });
    } catch (err) {
      return reply.status(500).send({
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Inicia o servidor
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`🚀 Server running at http://localhost:${PORT}`);
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
