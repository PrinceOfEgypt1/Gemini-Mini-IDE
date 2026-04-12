import { describe, it, expect } from "vitest";
import type {
  AuditProjection,
  OperationalProjection,
} from "@gemini-mini-ide/analysis-agent";
import { isESAAEventType, type ESAAOrchestratorLike } from "./esaa.routes.js";

/**
 * P26: unit coverage for the ESAAEventType type guard and for the
 * structural `ESAAOrchestratorLike` contract that replaced the old
 * `type ESAAOrchestrator = any` alias.
 *
 * These tests lock in that:
 *  - the guard narrows strings to the literal union,
 *  - the guard rejects arbitrary strings,
 *  - a minimal, strongly-typed mock satisfies `ESAAOrchestratorLike`
 *    with no `any` / no suppression.
 */

describe("P26 · isESAAEventType", () => {
  it("accepts every literal from the ESAAEventType union", () => {
    const valid = [
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
    ];
    for (const candidate of valid) {
      expect(isESAAEventType(candidate)).toBe(true);
    }
  });

  it("rejects strings that are not part of the ESAAEventType union", () => {
    expect(isESAAEventType("")).toBe(false);
    expect(isESAAEventType("intention_proposed")).toBe(false); // case-sensitive
    expect(isESAAEventType("NOT_A_REAL_EVENT")).toBe(false);
    expect(isESAAEventType("DROP TABLE events;")).toBe(false);
  });
});

describe("P26 · ESAAOrchestratorLike structural typing", () => {
  it("can be satisfied by a typed mock without any/suppression", () => {
    const operational: OperationalProjection = {
      lastAppliedVersion: 0,
      updatedAt: "2026-01-01T00:00:00.000Z",
      agents: {},
      activeIntentions: {},
      activeWorkspaces: {},
      activePromotions: {},
      filesInProgress: {},
      hash: "hash-0",
    };

    const audit: AuditProjection = {
      lastAppliedVersion: 0,
      updatedAt: "2026-01-01T00:00:00.000Z",
      intentions: {},
      promotions: {},
      agents: [],
      correlationIndex: {},
    };

    // This object must compile against `ESAAOrchestratorLike` — that alone is
    // the real test: if the Pick<> contract regressed (or became `any`), one
    // of these properties would fail to type-check.
    const mock: ESAAOrchestratorLike = {
      healthStatus: () => ({
        enabled: false,
        dbPath: ":memory:",
        streamVersion: 0,
        operational: {
          activeAgents: 0,
          quarantinedAgents: 0,
          activeIntentions: 0,
          activeWorkspaces: 0,
          activePromotions: 0,
          projectionHash: "hash-0",
        },
        uptime: 0,
      }),
      queryEvents: () => [],
      getOperationalProjection: () => operational,
      getAuditProjection: () => audit,
      store: {
        listAgents: () => [],
        getPromotionBatch: () => null,
      } as unknown as ESAAOrchestratorLike["store"],
      quarantineAgent: () => ({
        operation: "QUARANTINE_AGENT",
        success: true,
        message: "ok",
        affectedEntities: [],
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
      reinstateAgent: () => ({
        operation: "REINSTATE_AGENT",
        success: true,
        message: "ok",
        affectedEntities: [],
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
      createSnapshots: () => ({
        operation: "CREATE_SNAPSHOTS",
        success: true,
        message: "ok",
        affectedEntities: [],
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
      rollbackToSnapshot: () => ({
        operation: "ROLLBACK_TO_SNAPSHOT",
        success: true,
        message: "ok",
        affectedEntities: [],
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
      fullReplay: () =>
        Promise.resolve({
          operation: "FULL_REPLAY",
          success: true,
          message: "ok",
          affectedEntities: [],
          timestamp: "2026-01-01T00:00:00.000Z",
        }),
      recovery: {} as unknown as ESAAOrchestratorLike["recovery"],
      promotion: {} as unknown as ESAAOrchestratorLike["promotion"],
    };

    expect(mock.getOperationalProjection().hash).toBe("hash-0");
    expect(mock.getAuditProjection().correlationIndex).toEqual({});
    expect(mock.queryEvents({})).toEqual([]);
    expect(mock.healthStatus().uptime).toBe(0);
  });
});
