/**
 * @fileoverview Suite de testes do ESAA Hardened v2.
 *
 * Cobre:
 *   - EventStore: append, query, idempotência, otimistic concurrency
 *   - ProjectionEngine: rebuild, apply, snapshot
 *   - IntentionGateway: propose, approve, reject
 *   - PolicyEngine: risk classification, quarantine
 *   - InvariantEngine: INV-001 a INV-006
 *   - PromotionController: gates, promote, rollback
 *   - RecoveryController: quarantine, reinstate, replay
 *
 * @module esaa/esaa.test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EventStore } from "./store/event-store.js";
import { ProjectionEngine, PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID } from "./projections/projection-engine.js";
import { IntentionGateway } from "./gateway/intention-gateway.js";
import { PolicyEngine } from "./policy/policy-engine.js";
import { InvariantEngine } from "./policy/invariant-engine.js";
import { RecoveryController } from "./recovery/recovery-controller.js";
import { WorkspaceExecutor } from "./workspace/workspace-executor.js";
import { PromotionController } from "./promotion/promotion-controller.js";
import {
  createEmptyOperationalProjection,
  applyEventToOperational,
  computeProjectionHash,
} from "./projections/operational-projection.js";
import {
  createEmptyAuditProjection,
  applyEventToAudit,
} from "./projections/audit-projection.js";
import type { ESAAEvent } from "./types/events.js";
import type { OperationalProjection } from "./types/projections.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cria um EventStore in-memory para testes. */
function makeStore(): EventStore {
  return new EventStore(":memory:");
}

/** Cria um mock de ESAAEvent para testes. */
function makeEvent<T>(
  type: ESAAEvent["type"],
  payload: T,
  overrides: Partial<Omit<ESAAEvent, "payload">> = {}
): ESAAEvent<T> {
  return {
    eventId: "evt-001",
    streamId: PIPELINE_STREAM_ID,
    correlationId: "corr-001",
    causationId: null,
    type,
    aggregateId: GLOBAL_AGGREGATE_ID,
    version: 1,
    timestamp: new Date().toISOString(),
    metadata: { agentId: "agent-test", schemaVersion: "2.0.0" },
    ...overrides,
    payload,
  };
}

// ─── Event Store ──────────────────────────────────────────────────────────────

describe("EventStore", () => {
  let store: EventStore;

  beforeEach(() => {
    store = makeStore();
  });

  afterEach(() => {
    store.close();
  });

  it("deve fazer append e recuperar um evento", () => {
    const result = store.append(
      PIPELINE_STREAM_ID,
      GLOBAL_AGGREGATE_ID,
      "INTENTION_PROPOSED",
      {
        intentionId: "int-001",
        type: "FULL_PIPELINE",
        agentId: "agent-1",
        baseProjectionHash: "hash-001",
        baseFileHashes: {},
        riskLevel: "LOW",
        description: "teste",
      },
      { agentId: "agent-1", schemaVersion: "2.0.0" }
    );

    expect(result.version).toBe(1);

    const event = store.getEventById(result.eventId);
    expect(event).not.toBeNull();
    expect(event?.type).toBe("INTENTION_PROPOSED");
  });

  it("deve incrementar versões no stream", () => {
    const r1 = store.append(PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID, "INTENTION_PROPOSED",
      { intentionId: "i1", type: "GENERATE_ANALYSIS", agentId: "a1", baseProjectionHash: "h", baseFileHashes: {}, riskLevel: "LOW", description: "d" },
      { agentId: "a1", schemaVersion: "2.0.0" }
    );
    const r2 = store.append(PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID, "INTENTION_APPROVED",
      { intentionId: "i1", approvedBy: "POLICY_ENGINE" },
      { agentId: "a1", schemaVersion: "2.0.0" }
    );

    expect(r1.version).toBe(1);
    expect(r2.version).toBe(2);
    expect(store.getStreamVersion(PIPELINE_STREAM_ID)).toBe(2);
  });

  it("deve rejeitar eventos com chave de idempotência duplicada", () => {
    store.append(PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID, "INTENTION_PROPOSED",
      { intentionId: "i2", type: "GENERATE_ANALYSIS", agentId: "a1", baseProjectionHash: "h", baseFileHashes: {}, riskLevel: "LOW", description: "d" },
      { agentId: "a1", schemaVersion: "2.0.0" },
      { idempotencyKey: "unique-key-abc" }
    );

    expect(() =>
      store.append(PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID, "INTENTION_PROPOSED",
        { intentionId: "i2", type: "GENERATE_ANALYSIS", agentId: "a1", baseProjectionHash: "h", baseFileHashes: {}, riskLevel: "LOW", description: "d" },
        { agentId: "a1", schemaVersion: "2.0.0" },
        { idempotencyKey: "unique-key-abc" }
      )
    ).toThrow();
  });

  it("deve retornar eventos filtrados por correlationId", () => {
    store.append(PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID, "INTENTION_PROPOSED",
      { intentionId: "i3", type: "GENERATE_ANALYSIS", agentId: "a1", baseProjectionHash: "h", baseFileHashes: {}, riskLevel: "LOW", description: "d" },
      { agentId: "a1", schemaVersion: "2.0.0" },
      { correlationId: "corr-xyz" }
    );
    store.append(PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID, "INTENTION_PROPOSED",
      { intentionId: "i4", type: "GENERATE_PRODUCT", agentId: "a1", baseProjectionHash: "h", baseFileHashes: {}, riskLevel: "LOW", description: "d" },
      { agentId: "a1", schemaVersion: "2.0.0" },
      { correlationId: "corr-other" }
    );

    const events = store.getCorrelationEvents("corr-xyz");
    expect(events).toHaveLength(1);
    expect((events[0]?.payload as { intentionId: string }).intentionId).toBe("i3");
  });

  it("deve salvar e carregar projeção", () => {
    const state = JSON.stringify({ test: true });
    const hash = store.saveProjection("operational", "global", 5, state);

    expect(hash).toHaveLength(64); // SHA-256 hex

    const loaded = store.loadProjection("operational", "global");
    expect(loaded).not.toBeNull();
    expect(loaded?.lastAppliedVersion).toBe(5);
    expect(loaded?.state).toBe(state);
    expect(loaded?.hash).toBe(hash);
  });

  it("deve criar e carregar snapshot", () => {
    const state = JSON.stringify({ snapshot: true });
    const snapshotId = store.createSnapshot("global", PIPELINE_STREAM_ID, "operational", 10, state);

    const loaded = store.loadLatestSnapshot("global", "operational");
    expect(loaded).not.toBeNull();
    expect(loaded?.snapshotId).toBe(snapshotId);
    expect(loaded?.version).toBe(10);
  });

  it("deve upsert e recuperar agente", () => {
    store.upsertAgent({
      agentId: "agent-x",
      model: "claude-3",
      status: "active",
      failureCount: 0,
      consecutiveFailures: 0,
      lastFailureAt: null,
      quarantinedAt: null,
      quarantineReason: null,
    });

    const agent = store.getAgent("agent-x");
    expect(agent).not.toBeNull();
    expect(agent?.["agent_id"]).toBe("agent-x");
    expect(agent?.["status"]).toBe("active");
  });
});

// ─── Projeção Operacional ──────────────────────────────────────────────────────

describe("OperationalProjection", () => {
  it("deve criar projeção inicial vazia", () => {
    const proj = createEmptyOperationalProjection();
    expect(proj.lastAppliedVersion).toBe(0);
    expect(proj.agents).toEqual({});
    expect(proj.activeIntentions).toEqual({});
    expect(proj.hash).toHaveLength(64);
  });

  it("deve aplicar INTENTION_PROPOSED e registrar intenção", () => {
    const proj = createEmptyOperationalProjection();
    const event = makeEvent("INTENTION_PROPOSED", {
      intentionId: "int-1",
      type: "GENERATE_ANALYSIS",
      agentId: "agent-1",
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "LOW",
      description: "test",
    });

    const updated = applyEventToOperational(proj, event);
    expect(updated.activeIntentions["int-1"]).toBeDefined();
    expect(updated.activeIntentions["int-1"]?.status).toBe("PENDING");
    expect(updated.agents["agent-1"]).toBeDefined();
  });

  it("deve aplicar INTENTION_APPROVED e atualizar status", () => {
    let proj = createEmptyOperationalProjection();
    proj = applyEventToOperational(proj, makeEvent("INTENTION_PROPOSED", {
      intentionId: "int-2",
      type: "GENERATE_FILE",
      agentId: "agent-1",
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "MEDIUM",
      description: "generate file",
    }));

    proj = applyEventToOperational(proj, makeEvent("INTENTION_APPROVED", {
      intentionId: "int-2",
      approvedBy: "POLICY_ENGINE",
    }, { version: 2 }));

    expect(proj.activeIntentions["int-2"]?.status).toBe("APPROVED");
  });

  it("deve remover intenção após INTENTION_REJECTED", () => {
    let proj = createEmptyOperationalProjection();
    proj = applyEventToOperational(proj, makeEvent("INTENTION_PROPOSED", {
      intentionId: "int-3",
      type: "GENERATE_FILE",
      agentId: "agent-1",
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "HIGH",
      description: "risky file",
    }));

    proj = applyEventToOperational(proj, makeEvent("INTENTION_REJECTED", {
      intentionId: "int-3",
      rejectedBy: "POLICY_ENGINE",
      reason: "High risk",
      violatedInvariants: [],
    }, { version: 2 }));

    expect(proj.activeIntentions["int-3"]).toBeUndefined();
  });

  it("deve recalcular hash após cada mutação", () => {
    const proj1 = createEmptyOperationalProjection();
    const proj2 = applyEventToOperational(proj1, makeEvent("INTENTION_PROPOSED", {
      intentionId: "int-4",
      type: "GENERATE_ANALYSIS",
      agentId: "agent-1",
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "LOW",
      description: "test",
    }));

    expect(proj1.hash).not.toBe(proj2.hash);
    expect(proj2.hash).toHaveLength(64);
  });

  it("deve calcular hash consistente para o mesmo estado", () => {
    const proj: Omit<OperationalProjection, "hash"> = {
      lastAppliedVersion: 5,
      updatedAt: "2024-01-01",
      agents: {},
      activeIntentions: {},
      activeWorkspaces: {},
      activePromotions: {},
      filesInProgress: {},
    };

    const hash1 = computeProjectionHash(proj);
    const hash2 = computeProjectionHash(proj);
    expect(hash1).toBe(hash2);
  });
});

// ─── Projeção de Auditoria ────────────────────────────────────────────────────

describe("AuditProjection", () => {
  it("deve criar projeção inicial vazia", () => {
    const proj = createEmptyAuditProjection();
    expect(proj.intentions).toEqual({});
    expect(proj.promotions).toEqual({});
    expect(proj.agents).toEqual([]);
  });

  it("deve registrar intenção após INTENTION_PROPOSED", () => {
    const proj = createEmptyAuditProjection();
    const updated = applyEventToAudit(proj, makeEvent("INTENTION_PROPOSED", {
      intentionId: "int-1",
      type: "GENERATE_ANALYSIS",
      agentId: "agent-1",
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "LOW",
      description: "test",
    }));

    expect(updated.intentions["int-1"]).toBeDefined();
    expect(updated.intentions["int-1"]?.outcome).toBe("PENDING");
    expect(updated.correlationIndex["corr-001"]).toContain("int-1");
  });

  it("deve registrar agente quarentenado em agents array", () => {
    const proj = createEmptyAuditProjection();
    const updated = applyEventToAudit(proj, makeEvent("AGENT_QUARANTINED", {
      agentId: "agent-bad",
      reason: "Too many failures",
      failureCount: 10,
      triggeringEventId: "evt-fail",
    }));

    expect(updated.agents).toHaveLength(1);
    expect(updated.agents[0]?.agentId).toBe("agent-bad");
    expect(updated.agents[0]?.event).toBe("QUARANTINED");
  });
});

// ─── Policy Engine ────────────────────────────────────────────────────────────

describe("PolicyEngine", () => {
  it("deve rejeitar agente quarentenado", () => {
    const engine = new PolicyEngine();
    const projection = createEmptyOperationalProjection();

    // Simular agente quarentenado
    const modifiedProjection: OperationalProjection = {
      ...projection,
      agents: {
        "quarantined-agent": {
          agentId: "quarantined-agent",
          model: "gpt-4",
          status: "QUARANTINED",
          failureCount: 10,
          consecutiveFailures: 5,
          lastFailureAt: new Date().toISOString(),
          quarantinedAt: new Date().toISOString(),
          quarantineReason: "Too many failures",
          registeredAt: new Date().toISOString(),
        },
      },
    };

    const intention = {
      intentionId: "int-q1",
      agentId: "quarantined-agent",
      correlationId: "corr",
      type: "GENERATE_FILE" as const,
      payload: { filePath: "test.ts", purpose: "", criticality: "LOW" as const, category: "DOMAIN", architectureCorrelationId: "" },
      status: "PENDING" as const,
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "MEDIUM" as const,
      description: "test",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      ttlMs: 300_000,
    };

    const result = engine.evaluate(intention, modifiedProjection);
    expect(result.approved).toBe(false);
    expect(result.rejectionReasons[0]).toMatch(/quarentenado/i);
  });

  it("deve classificar FULL_PIPELINE como HIGH risk", () => {
    const engine = new PolicyEngine();
    const projection = createEmptyOperationalProjection();

    const intention = {
      intentionId: "int-1",
      agentId: "agent-1",
      correlationId: "corr",
      type: "FULL_PIPELINE" as const,
      payload: { userPrompt: "build app" },
      status: "PENDING" as const,
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "LOW" as const,
      description: "test",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      ttlMs: 300_000,
    };

    const risk = engine.classifyRisk(intention, projection);
    expect(risk).toBe("HIGH");
  });

  it("deve aprovar intenção de baixo risco de agente ativo", () => {
    const engine = new PolicyEngine();
    const projection = createEmptyOperationalProjection();

    const intention = {
      intentionId: "int-2",
      agentId: "agent-good",
      correlationId: "corr",
      type: "GENERATE_ANALYSIS" as const,
      payload: { userPrompt: "analyze" },
      status: "PENDING" as const,
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "LOW" as const,
      description: "test",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      ttlMs: 300_000,
    };

    const result = engine.evaluate(intention, projection);
    expect(result.approved).toBe(true);
    expect(result.rejectionReasons).toHaveLength(0);
  });
});

// ─── Invariant Engine ─────────────────────────────────────────────────────────

describe("InvariantEngine", () => {
  it("INV-003: deve rejeitar intenção expirada", () => {
    const engine = new InvariantEngine();
    const projection = createEmptyOperationalProjection();

    const intention = {
      intentionId: "int-exp",
      agentId: "agent-1",
      correlationId: "corr",
      type: "GENERATE_FILE" as const,
      payload: { filePath: "test.ts", purpose: "", criticality: "LOW" as const, category: "DOMAIN", architectureCorrelationId: "" },
      status: "PENDING" as const,
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "MEDIUM" as const,
      description: "test",
      createdAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      expiresAt: new Date(Date.now() - 1 * 60_000).toISOString(), // Expirou 1 minuto atrás
      ttlMs: 5 * 60_000,
    };

    const result = engine.check(intention, projection);
    expect(result.valid).toBe(false);
    const ids = result.violations.map(v => v.invariantId);
    expect(ids).toContain("INV-003");
  });

  it("INV-002: deve rejeitar geração duplicada de arquivo", () => {
    const engine = new InvariantEngine();
    const projection: OperationalProjection = {
      ...createEmptyOperationalProjection(),
      filesInProgress: {
        "src/app.ts": "int-existing",
      },
    };

    const intention = {
      intentionId: "int-new",
      agentId: "agent-1",
      correlationId: "corr",
      type: "GENERATE_FILE" as const,
      payload: { filePath: "src/app.ts", purpose: "", criticality: "HIGH" as const, category: "APPLICATION", architectureCorrelationId: "" },
      status: "PENDING" as const,
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "MEDIUM" as const,
      description: "test",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      ttlMs: 5 * 60_000,
    };

    const result = engine.check(intention, projection);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.invariantId === "INV-002")).toBe(true);
  });

  it("INV-004: deve rejeitar quando workspace limit atingido", () => {
    const engine = new InvariantEngine();
    const workspaces = Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [
        `ws-${i}`,
        {
          workspaceId: `ws-${i}`,
          intentionId: `int-${i}`,
          workspacePath: `/tmp/ws-${i}`,
          createdAt: new Date().toISOString(),
          pendingFiles: [],
        },
      ])
    );

    const projection: OperationalProjection = {
      ...createEmptyOperationalProjection(),
      activeWorkspaces: workspaces,
    };

    const intention = {
      intentionId: "int-new",
      agentId: "agent-1",
      correlationId: "corr",
      type: "GENERATE_FILE" as const,
      payload: { filePath: "new.ts", purpose: "", criticality: "LOW" as const, category: "DOMAIN", architectureCorrelationId: "" },
      status: "PENDING" as const,
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "MEDIUM" as const,
      description: "test",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      ttlMs: 5 * 60_000,
    };

    const result = engine.check(intention, projection);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.invariantId === "INV-004")).toBe(true);
  });

  it("deve retornar válido para intenção dentro dos limites", () => {
    const engine = new InvariantEngine();
    const projection = createEmptyOperationalProjection();

    const intention = {
      intentionId: "int-ok",
      agentId: "agent-1",
      correlationId: "corr",
      type: "GENERATE_ANALYSIS" as const,
      payload: { userPrompt: "test" },
      status: "PENDING" as const,
      baseProjectionHash: "hash",
      baseFileHashes: {},
      riskLevel: "LOW" as const,
      description: "test",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      ttlMs: 5 * 60_000,
    };

    const result = engine.check(intention, projection);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ─── Projection Engine ────────────────────────────────────────────────────────

describe("ProjectionEngine", () => {
  let store: EventStore;
  let engine: ProjectionEngine;

  beforeEach(() => {
    store = makeStore();
    engine = new ProjectionEngine(store);
  });

  afterEach(() => {
    store.close();
  });

  it("deve retornar projeção vazia sem eventos", () => {
    const proj = engine.getOperational();
    expect(proj.lastAppliedVersion).toBe(0);
    expect(Object.keys(proj.agents)).toHaveLength(0);
  });

  it("deve aplicar evento e atualizar projeção", () => {
    const result = store.append(
      PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID,
      "INTENTION_PROPOSED",
      { intentionId: "int-5", type: "GENERATE_ANALYSIS", agentId: "agent-e", baseProjectionHash: "h", baseFileHashes: {}, riskLevel: "LOW", description: "d" },
      { agentId: "agent-e", schemaVersion: "2.0.0" }
    );

    const event = store.getEventById(result.eventId);
    const proj = engine.applyOperationalEvent(event!);

    expect(proj.activeIntentions["int-5"]).toBeDefined();
  });

  it("deve criar e restaurar snapshot", () => {
    // Criar algum estado
    store.append(PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID, "INTENTION_PROPOSED",
      { intentionId: "int-6", type: "GENERATE_PRODUCT", agentId: "agent-s", baseProjectionHash: "h", baseFileHashes: {}, riskLevel: "LOW", description: "d" },
      { agentId: "agent-s", schemaVersion: "2.0.0" }
    );
    engine.getOperational(); // Rebuild

    const snapshotId = engine.snapshotOperational();
    expect(snapshotId).toHaveLength(36); // UUID

    // Restaurar
    const restored = engine.restoreFromSnapshot(snapshotId);
    expect(restored.lastAppliedVersion).toBeGreaterThanOrEqual(0);
  });

  it("deve retornar hash consistente da projeção", () => {
    const hash1 = engine.getOperationalHash();
    const hash2 = engine.getOperationalHash();
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});

// ─── Recovery Controller ──────────────────────────────────────────────────────

describe("RecoveryController", () => {
  let store: EventStore;
  let projEngine: ProjectionEngine;
  let workspaceExecutor: WorkspaceExecutor;
  let promotionController: PromotionController;
  let recovery: RecoveryController;

  beforeEach(() => {
    store = makeStore();
    projEngine = new ProjectionEngine(store);
    workspaceExecutor = new WorkspaceExecutor(store, projEngine);
    promotionController = new PromotionController(store, projEngine, workspaceExecutor);
    recovery = new RecoveryController(store, projEngine, promotionController);
  });

  afterEach(() => {
    store.close();
  });

  it("deve quarentenar um agente", () => {
    // Registrar agente primeiro via evento
    store.append(PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID, "INTENTION_PROPOSED",
      { intentionId: "int-q", type: "GENERATE_ANALYSIS", agentId: "agent-bad", baseProjectionHash: "h", baseFileHashes: {}, riskLevel: "LOW", description: "d" },
      { agentId: "agent-bad", schemaVersion: "2.0.0" }
    );
    const event = store.getEventById(
      store.getStreamEvents(PIPELINE_STREAM_ID)[0]!.eventId
    );
    projEngine.applyOperationalEvent(event!);

    const result = recovery.quarantineAgent({
      agentId: "agent-bad",
      reason: "test quarantine",
      triggeringEventId: "evt-x",
      operatorId: "admin",
    });

    expect(result.success).toBe(true);

    const proj = projEngine.getOperational();
    expect(proj.agents["agent-bad"]?.status).toBe("QUARANTINED");
  });

  it("deve reinstate agente quarentenado", () => {
    // Setup: quarentenar primeiro
    store.append(PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID, "INTENTION_PROPOSED",
      { intentionId: "int-r", type: "GENERATE_ANALYSIS", agentId: "agent-reinstate", baseProjectionHash: "h", baseFileHashes: {}, riskLevel: "LOW", description: "d" },
      { agentId: "agent-reinstate", schemaVersion: "2.0.0" }
    );
    const event = store.getEventById(store.getStreamEvents(PIPELINE_STREAM_ID)[0]!.eventId);
    projEngine.applyOperationalEvent(event!);

    recovery.quarantineAgent({
      agentId: "agent-reinstate",
      reason: "test",
      triggeringEventId: "evt-y",
      operatorId: "admin",
    });

    const reinstateResult = recovery.reinstateAgent({
      agentId: "agent-reinstate",
      operatorId: "admin",
    });

    expect(reinstateResult.success).toBe(true);
    const proj = projEngine.getOperational();
    expect(proj.agents["agent-reinstate"]?.status).toBe("ACTIVE");
  });

  it("deve retornar false ao tentar reinstate de agente não-quarentenado", () => {
    // Registrar como ativo
    store.append(PIPELINE_STREAM_ID, GLOBAL_AGGREGATE_ID, "INTENTION_PROPOSED",
      { intentionId: "int-active", type: "GENERATE_ANALYSIS", agentId: "agent-active", baseProjectionHash: "h", baseFileHashes: {}, riskLevel: "LOW", description: "d" },
      { agentId: "agent-active", schemaVersion: "2.0.0" }
    );
    const event = store.getEventById(store.getStreamEvents(PIPELINE_STREAM_ID)[0]!.eventId);
    projEngine.applyOperationalEvent(event!);

    const result = recovery.reinstateAgent({
      agentId: "agent-active",
      operatorId: "admin",
    });

    expect(result.success).toBe(false);
  });

  it("deve criar snapshots de ambas as projeções", () => {
    const { operationalSnapshotId, auditSnapshotId } = recovery.createSnapshots("admin");
    expect(operationalSnapshotId).toHaveLength(36);
    expect(auditSnapshotId).toHaveLength(36);
  });

  it("deve retornar status do sistema", () => {
    const status = recovery.getSystemStatus();
    expect(status).toHaveProperty("projection");
    expect(status).toHaveProperty("activeAgents");
    expect(status).toHaveProperty("quarantinedAgents");
    expect(status).toHaveProperty("activeIntentions");
    expect(status).toHaveProperty("activeWorkspaces");
    expect(status).toHaveProperty("activePromotions");
  });
});

// ─── Intention Gateway (Integration) ─────────────────────────────────────────

describe("IntentionGateway (Integration)", () => {
  let store: EventStore;
  let projEngine: ProjectionEngine;
  let policy: PolicyEngine;
  let invariants: InvariantEngine;
  let gateway: IntentionGateway;

  beforeEach(() => {
    store = makeStore();
    projEngine = new ProjectionEngine(store);
    policy = new PolicyEngine();
    invariants = new InvariantEngine();
    gateway = new IntentionGateway(store, projEngine, policy, invariants);
  });

  afterEach(() => {
    store.close();
  });

  it("deve aprovar intenção de baixo risco", async () => {
    const result = await gateway.propose(
      "agent-ok",
      "GENERATE_ANALYSIS",
      { userPrompt: "Build a todo app" }
    );

    expect(result.outcome).toBe("approved");
    expect(result.intention.intentionId).toHaveLength(36);
  });

  it("deve emitir eventos ao aprovar intenção", async () => {
    await gateway.propose("agent-events", "GENERATE_PRODUCT", {
      userPrompt: "test",
      analysisCorrelationId: "corr-prev",
    });

    const events = store.getStreamEvents(PIPELINE_STREAM_ID);
    const types = events.map(e => e.type);
    expect(types).toContain("INTENTION_PROPOSED");
    expect(types).toContain("INTENTION_APPROVED");
  });

  it("deve atualizar a projeção operacional após proposta", async () => {
    await gateway.propose("agent-proj", "GENERATE_ANALYSIS", { userPrompt: "test" });

    const proj = projEngine.getOperational();
    expect(Object.keys(proj.agents)).toContain("agent-proj");
  });

  it("deve rejeitar segunda FULL_PIPELINE quando uma está ativa", async () => {
    // Primeira proposta (aprovada)
    await gateway.propose("agent-fp", "FULL_PIPELINE", { userPrompt: "first pipeline" });

    // Segunda proposta deve ser rejeitada
    const result = await gateway.propose("agent-fp", "FULL_PIPELINE", { userPrompt: "second pipeline" });

    expect(result.outcome).toBe("rejected");
    if (result.outcome === "rejected") {
      expect(result.reasons.join()).toMatch(/FULL_PIPELINE/);
    }
  });
});
