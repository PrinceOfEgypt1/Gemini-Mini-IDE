import type { FastifyInstance } from "fastify";
import type { ESAAOrchestrator, ESAAEventType } from "@gemini-mini-ide/analysis-agent";

/**
 * Conjunto fechado dos tipos de evento ESAA aceitos pela API /esaa/events.
 *
 * Mantido em sincronia com {@link ESAAEventType}. Usado pelo type guard
 * `isESAAEventType` para validar o parâmetro `?type=` da query string.
 */
const ESAA_EVENT_TYPES = new Set<ESAAEventType>([
  "INTENTION_PROPOSED",
  "INTENTION_APPROVED",
  "INTENTION_REJECTED",
  "EXECUTION_STARTED",
  "EXECUTION_SUCCEEDED",
  "EXECUTION_FAILED",
  "PROMOTION_REQUESTED",
  "PROMOTION_GATE_PASSED",
  "PROMOTION_GATE_FAILED",
  "PROMOTION_APPROVED",
  "PROMOTION_REJECTED",
  "PROMOTION_ROLLED_BACK",
  "ROLLBACK_REQUESTED",
  "ROLLBACK_COMPLETED",
  "SNAPSHOT_CREATED",
  "AGENT_QUARANTINED",
  "AGENT_REINSTATED",
  "WORKSPACE_CREATED",
  "WORKSPACE_DESTROYED",
  "INVARIANT_VIOLATED",
  "CONCURRENCY_CONFLICT",
]);

/**
 * Type guard para {@link ESAAEventType}. Permite estreitar uma `string`
 * recebida de query-string para o literal union sem recorrer a `as`.
 */
export function isESAAEventType(value: string): value is ESAAEventType {
  return ESAA_EVENT_TYPES.has(value as ESAAEventType);
}

/**
 * Minimal structural contract used by routes that only need to reach into
 * orchestrator.store / orchestrator.recovery / orchestrator.promotion.
 *
 * We accept the concrete ESAAOrchestrator OR any object that exposes the
 * same public surface, which keeps tests able to pass in lightweight mocks
 * without resorting to `any`.
 */
export type ESAAOrchestratorLike = Pick<
  ESAAOrchestrator,
  | "healthStatus"
  | "queryEvents"
  | "getOperationalProjection"
  | "getAuditProjection"
  | "store"
  | "quarantineAgent"
  | "reinstateAgent"
  | "createSnapshots"
  | "rollbackToSnapshot"
  | "fullReplay"
  | "recovery"
  | "promotion"
>;

/**
 * ESAA Hardened v2 Routes — Event-Sourced Agent Architecture
 *
 * All ESAA management endpoints live here.
 * Previously inlined in index.ts; extracted in Round 16.
 *
 * @experimental
 *
 * P27 — CONTAINMENT POLICY:
 * The ESAA subsystem is officially classified as EXPERIMENTAL and CONTAINED.
 * These routes are NOT part of the stable HTTP API surface and are NOT
 * registered with the Fastify app unless `ESAA_ENABLED=true` is set in the
 * environment. With the default configuration the `/esaa/*` namespace
 * returns 404. There is no production consumer of these endpoints in the
 * UI, CLI, server orchestrators, or analysis-agent pipelines. There is no
 * promotion roadmap toward stabilization. See `docs/ESAA_ARCHITECTURE.md`
 * § 0 ("Política de contenção") for the full classification rationale.
 */

export async function registerESAARoutes(
  app: FastifyInstance,
  orchestrator: ESAAOrchestratorLike
): Promise<void> {
  // Health
  app.get("/esaa/health", async (_request, reply) => {
    return reply.send(orchestrator.healthStatus());
  });

  // Events query
  app.get("/esaa/events", async (request, reply) => {
    const query = request.query as {
      streamId?: string;
      correlationId?: string;
      type?: string;
      sinceVersion?: string;
      limit?: string;
    };

    let typeFilter: ESAAEventType | undefined;
    if (query.type !== undefined) {
      if (!isESAAEventType(query.type)) {
        return reply.status(400).send({
          error: `Tipo de evento inválido: ${query.type}`,
        });
      }
      typeFilter = query.type;
    }

    const events = orchestrator.queryEvents({
      streamId: query.streamId,
      correlationId: query.correlationId,
      type: typeFilter,
      sinceVersion: query.sinceVersion ? parseInt(query.sinceVersion) : undefined,
      limit: query.limit ? parseInt(query.limit) : 100,
    });

    return reply.send({ events, total: events.length });
  });

  // Operational projection
  app.get("/esaa/projections/operational", async (_request, reply) => {
    const proj = orchestrator.getOperationalProjection();
    const agents = Object.values(proj.agents);
    return reply.send({
      lastAppliedVersion: proj.lastAppliedVersion,
      updatedAt: proj.updatedAt,
      hash: proj.hash,
      activeAgents: agents.filter(a => a.status === "ACTIVE").length,
      quarantinedAgents: agents.filter(a => a.status === "QUARANTINED").length,
      activeIntentions: Object.keys(proj.activeIntentions).length,
      activeWorkspaces: Object.keys(proj.activeWorkspaces).length,
      activePromotions: Object.keys(proj.activePromotions).length,
      filesInProgress: Object.keys(proj.filesInProgress).length,
    });
  });

  // Audit trail by correlationId
  app.get("/esaa/projections/audit/:correlationId", async (request, reply) => {
    const { correlationId } = request.params as { correlationId: string };
    const audit = orchestrator.getAuditProjection();
    const intentionIds = audit.correlationIndex[correlationId] ?? [];
    const intentions = intentionIds
      .map((id) => audit.intentions[id])
      .filter(
        (entry): entry is NonNullable<typeof entry> => entry !== undefined
      )
      .map((i) => ({
        intentionId: i.intentionId,
        type: i.type,
        agentId: i.agentId,
        riskLevel: i.riskLevel,
        proposedAt: i.proposedAt,
        outcome: i.outcome,
        filesGenerated: i.filesGenerated.length,
        durationMs: i.durationMs,
      }));

    const allPromotions = Object.values(audit.promotions);
    const promotions = allPromotions
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

  // List agents
  app.get("/esaa/agents", async (_request, reply) => {
    const agents = orchestrator.store.listAgents();
    const total = agents.length;
    const active = agents.filter(a => a["status"] === "active").length;
    const quarantined = agents.filter(a => a["status"] === "quarantined").length;
    return reply.send({ agents, total, active, quarantined });
  });

  // Quarantine agent
  app.post("/esaa/agents/:agentId/quarantine", async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    const body = request.body as { reason: string; operatorId: string; triggeringEventId?: string };
    const result = orchestrator.quarantineAgent(
      agentId,
      body.reason,
      body.triggeringEventId ?? "manual"
    );
    return reply.send(result);
  });

  // Reinstate agent
  app.post("/esaa/agents/:agentId/reinstate", async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    const result = orchestrator.reinstateAgent(agentId);
    return reply.send(result);
  });

  // Create snapshots
  app.post("/esaa/recovery/snapshot", async (_request, reply) => {
    const result = orchestrator.createSnapshots();
    return reply.send({ ...result, createdAt: new Date().toISOString() });
  });

  // Rollback to snapshot
  app.post("/esaa/recovery/rollback", async (request, reply) => {
    const body = request.body as {
      snapshotId?: string;
      correlationId?: string;
      operatorId: string;
    };

    if (body.snapshotId) {
      const result = orchestrator.rollbackToSnapshot(body.snapshotId);
      return reply.send(result);
    }

    if (body.correlationId) {
      const result = await orchestrator.recovery.rollbackLastPromotion(
        body.correlationId,
        body.operatorId ?? "API_OPERATOR"
      );
      return reply.send(result);
    }

    return reply.status(400).send({
      error: "Forneça snapshotId ou correlationId"
    });
  });

  // Replay events
  app.post("/esaa/recovery/replay", async (request, reply) => {
    const body = request.body as {
      full?: boolean;
      fromVersion?: number;
      operatorId: string;
    };

    let result;
    if (body.full) {
      result = await orchestrator.fullReplay();
    } else if (body.fromVersion !== undefined) {
      result = await orchestrator.recovery.replayFromVersion(
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

  // Query promotions
  app.get("/esaa/promotions/:batchId", async (request, reply) => {
    const { batchId } = request.params as { batchId: string };
    const batch = orchestrator.store.getPromotionBatch(batchId);

    if (!batch) {
      return reply.status(404).send({ error: `Lote ${batchId} não encontrado` });
    }

    return reply.send(batch);
  });

  // Rollback promotion
  app.post("/esaa/promotions/:batchId/rollback", async (request, reply) => {
    const { batchId } = request.params as { batchId: string };
    const body = request.body as { reason: string; operatorId: string };

    try {
      await orchestrator.promotion.rollback(
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
}
