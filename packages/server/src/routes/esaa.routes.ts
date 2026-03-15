import type { FastifyInstance } from "fastify";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ESAAOrchestrator = any;

/**
 * ESAA Hardened v2 Routes — Event-Sourced Agent Architecture
 *
 * All ESAA management endpoints live here.
 * Previously inlined in index.ts; extracted in Round 16.
 */

export async function registerESAARoutes(
  app: FastifyInstance,
  orchestrator: ESAAOrchestrator
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

    const events = orchestrator.queryEvents({
      streamId: query.streamId,
      correlationId: query.correlationId,
      type: query.type,
      sinceVersion: query.sinceVersion ? parseInt(query.sinceVersion) : undefined,
      limit: query.limit ? parseInt(query.limit) : 100,
    });

    return reply.send({ events, total: events.length });
  });

  // Operational projection
  app.get("/esaa/projections/operational", async (_request, reply) => {
    const proj = orchestrator.getOperationalProjection();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agents = Object.values(proj.agents) as any[];
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
      .map((id: string) => audit.intentions[id])
      .filter(Boolean)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((i: any) => ({
        intentionId: i.intentionId,
        type: i.type,
        agentId: i.agentId,
        riskLevel: i.riskLevel,
        proposedAt: i.proposedAt,
        outcome: i.outcome,
        filesGenerated: i.filesGenerated.length,
        durationMs: i.durationMs,
      }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPromotions = Object.values(audit.promotions) as any[];
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
    const agents = orchestrator.store.listAgents() as Record<string, unknown>[];
    const total = agents.length;
    const active = agents.filter((a: Record<string, unknown>) => a["status"] === "active").length;
    const quarantined = agents.filter((a: Record<string, unknown>) => a["status"] === "quarantined").length;
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
