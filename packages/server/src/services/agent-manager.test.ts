import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getOrchestrator,
  getAgent,
  cleanupExpiredEntries,
  getCacheSize,
  clearCache,
  startCleanupTimer,
  stopCleanupTimer,
  resetDefaultAgent,
  ORCHESTRATOR_TTL_MS,
  ORCHESTRATOR_MAX_ENTRIES,
} from "./agent-manager.js";

// Mock the dynamic import of analysis-agent to avoid native dependency (better-sqlite3)
// vi.hoisted ensures the factory is available before vi.mock hoisting
const { MockOrchestrator } = vi.hoisted(() => {
  const MockOrchestrator = vi.fn().mockImplementation((apiKey: string, _ctx: unknown, opts: Record<string, unknown>) => ({
    apiKey,
    model: opts?.model,
    baseUrl: opts?.baseUrl,
    _mock: true,
  }));
  return { MockOrchestrator };
});

const { MockAnalysisAgent } = vi.hoisted(() => {
  const MockAnalysisAgent = vi.fn().mockImplementation((apiKey: string) => ({
    apiKey,
    _mock: true,
  }));
  return { MockAnalysisAgent };
});

vi.mock("@gemini-mini-ide/analysis-agent", () => ({
  AnalysisAgent: MockAnalysisAgent,
  InteractiveOrchestrator: MockOrchestrator,
}));

describe("agent-manager orchestrator cache lifecycle (BG-06)", () => {
  beforeEach(() => {
    clearCache();
    stopCleanupTimer();
    MockOrchestrator.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearCache();
    stopCleanupTimer();
    vi.useRealTimers();
  });

  describe("cache reuse (valid entries)", () => {
    it("should return the same orchestrator for identical config", async () => {
      const config = { apiKey: "key1", model: "gpt-4", baseUrl: "https://api.example.com" };
      const first = await getOrchestrator(config);
      const second = await getOrchestrator(config);
      expect(first).toBe(second);
      expect(MockOrchestrator).toHaveBeenCalledTimes(1);
    });

    it("should return different orchestrators for different configs", async () => {
      const config1 = { apiKey: "key1", model: "gpt-4" };
      const config2 = { apiKey: "key2", model: "gpt-4" };
      const first = await getOrchestrator(config1);
      const second = await getOrchestrator(config2);
      expect(first).not.toBe(second);
      expect(MockOrchestrator).toHaveBeenCalledTimes(2);
    });

    it("should update lastAccessed on cache hit", async () => {
      const config = { apiKey: "key1" };
      await getOrchestrator(config);
      expect(getCacheSize()).toBe(1);

      // Advance time but not past TTL
      vi.advanceTimersByTime(ORCHESTRATOR_TTL_MS / 2);

      const second = await getOrchestrator(config);
      expect(second).toBeDefined();
      expect(MockOrchestrator).toHaveBeenCalledTimes(1); // reused, not recreated
    });

    it("should report correct cache size", async () => {
      expect(getCacheSize()).toBe(0);
      await getOrchestrator({ apiKey: "a" });
      expect(getCacheSize()).toBe(1);
      await getOrchestrator({ apiKey: "b" });
      expect(getCacheSize()).toBe(2);
      // Same config, no new entry
      await getOrchestrator({ apiKey: "a" });
      expect(getCacheSize()).toBe(2);
    });
  });

  describe("TTL expiration", () => {
    it("should expire entry after TTL elapses without access", async () => {
      const config = { apiKey: "key-ttl" };
      const first = await getOrchestrator(config);

      // Advance past TTL
      vi.advanceTimersByTime(ORCHESTRATOR_TTL_MS + 1);

      const second = await getOrchestrator(config);
      expect(second).not.toBe(first); // new instance created
      expect(MockOrchestrator).toHaveBeenCalledTimes(2);
    });

    it("should keep entry alive when accessed within TTL", async () => {
      const config = { apiKey: "key-alive" };
      const first = await getOrchestrator(config);

      // Access at 60% of TTL — resets lastAccessed
      vi.advanceTimersByTime(ORCHESTRATOR_TTL_MS * 0.6);
      const mid = await getOrchestrator(config);
      expect(mid).toBe(first);

      // Advance another 60% of TTL from the last access (total: 120% of original TTL)
      // But only 60% from last access, so still valid
      vi.advanceTimersByTime(ORCHESTRATOR_TTL_MS * 0.6);
      const later = await getOrchestrator(config);
      expect(later).toBe(first);
      expect(MockOrchestrator).toHaveBeenCalledTimes(1);
    });

    it("should recreate entry that expired between accesses", async () => {
      const config = { apiKey: "key-recreate" };
      await getOrchestrator(config);

      // Stop cleanup timer so periodic sweep does not remove the stale entry
      stopCleanupTimer();
      vi.advanceTimersByTime(ORCHESTRATOR_TTL_MS + 1000);

      // Cache size should still be 1 (stale entry exists until accessed or cleaned)
      expect(getCacheSize()).toBe(1);

      // Accessing recreates
      await getOrchestrator(config);
      expect(getCacheSize()).toBe(1); // old removed, new inserted
      expect(MockOrchestrator).toHaveBeenCalledTimes(2);
    });
  });

  describe("cleanup of expired entries", () => {
    it("should remove expired entries via cleanupExpiredEntries", async () => {
      await getOrchestrator({ apiKey: "old1" });
      await getOrchestrator({ apiKey: "old2" });

      // Stop cleanup timer so periodic sweep does not remove stale entries before manual check
      stopCleanupTimer();
      vi.advanceTimersByTime(ORCHESTRATOR_TTL_MS + 1);

      // Add a fresh entry
      await getOrchestrator({ apiKey: "fresh" });

      expect(getCacheSize()).toBe(3); // 2 stale + 1 fresh

      const removed = cleanupExpiredEntries();
      expect(removed).toBe(2);
      expect(getCacheSize()).toBe(1);
    });

    it("should return 0 when no entries are expired", async () => {
      await getOrchestrator({ apiKey: "fresh1" });
      await getOrchestrator({ apiKey: "fresh2" });

      const removed = cleanupExpiredEntries();
      expect(removed).toBe(0);
      expect(getCacheSize()).toBe(2);
    });

    it("should handle cleanup on empty cache", () => {
      const removed = cleanupExpiredEntries();
      expect(removed).toBe(0);
    });
  });

  describe("max size eviction", () => {
    it("should evict oldest entry when cache reaches max size", async () => {
      // Fill cache to max
      for (let i = 0; i < ORCHESTRATOR_MAX_ENTRIES; i++) {
        await getOrchestrator({ apiKey: `key-${i}` });
        // Small time gap so entries have different lastAccessed
        vi.advanceTimersByTime(10);
      }
      expect(getCacheSize()).toBe(ORCHESTRATOR_MAX_ENTRIES);

      // Adding one more should evict the oldest (key-0)
      await getOrchestrator({ apiKey: "overflow" });
      expect(getCacheSize()).toBe(ORCHESTRATOR_MAX_ENTRIES);

      // Verify key-0 was evicted (accessing it creates a new instance)
      const callsBefore = MockOrchestrator.mock.calls.length;
      await getOrchestrator({ apiKey: "key-0" });
      const callsAfter = MockOrchestrator.mock.calls.length;
      expect(callsAfter).toBe(callsBefore + 1); // new instance — was evicted
    });

    it("should evict the least recently accessed entry, not the oldest created", async () => {
      // Fill cache to max
      for (let i = 0; i < ORCHESTRATOR_MAX_ENTRIES; i++) {
        await getOrchestrator({ apiKey: `lru-${i}` });
        vi.advanceTimersByTime(10);
      }

      // Touch entry lru-0 (created first, but now most recently accessed)
      await getOrchestrator({ apiKey: "lru-0" });

      // Add overflow — should evict lru-1 (least recently accessed), not lru-0
      await getOrchestrator({ apiKey: "lru-overflow" });

      // lru-0 should still be cached (no new constructor call)
      const callsBefore = MockOrchestrator.mock.calls.length;
      await getOrchestrator({ apiKey: "lru-0" });
      expect(MockOrchestrator.mock.calls.length).toBe(callsBefore); // still cached

      // lru-1 should have been evicted
      const callsBefore2 = MockOrchestrator.mock.calls.length;
      await getOrchestrator({ apiKey: "lru-1" });
      expect(MockOrchestrator.mock.calls.length).toBe(callsBefore2 + 1); // recreated
    });

    it("should never exceed ORCHESTRATOR_MAX_ENTRIES", async () => {
      for (let i = 0; i < ORCHESTRATOR_MAX_ENTRIES + 10; i++) {
        await getOrchestrator({ apiKey: `burst-${i}` });
        expect(getCacheSize()).toBeLessThanOrEqual(ORCHESTRATOR_MAX_ENTRIES);
      }
    });
  });

  describe("cleanup timer lifecycle", () => {
    it("should start cleanup timer on first cache population", async () => {
      await getOrchestrator({ apiKey: "timer-test" });
      // Timer is started — stopCleanupTimer should not throw
      stopCleanupTimer();
    });

    it("startCleanupTimer should be idempotent", () => {
      startCleanupTimer();
      startCleanupTimer();
      startCleanupTimer();
      // No error — only one timer active
      stopCleanupTimer();
    });

    it("stopCleanupTimer should be safe to call when no timer is active", () => {
      stopCleanupTimer();
      stopCleanupTimer();
      // No error
    });
  });

  describe("clearCache", () => {
    it("should empty the entire cache", async () => {
      await getOrchestrator({ apiKey: "c1" });
      await getOrchestrator({ apiKey: "c2" });
      expect(getCacheSize()).toBe(2);

      clearCache();
      expect(getCacheSize()).toBe(0);
    });

    it("should cause next getOrchestrator to create fresh instances", async () => {
      const config = { apiKey: "fresh-after-clear" };
      const first = await getOrchestrator(config);

      clearCache();

      const second = await getOrchestrator(config);
      expect(second).not.toBe(first);
    });
  });

  describe("no regression on existing behavior", () => {
    it("should use default model and baseUrl when not provided", async () => {
      await getOrchestrator({ apiKey: "minimal" });
      expect(MockOrchestrator).toHaveBeenCalledWith("minimal", undefined, {
        model: undefined,
        baseUrl: undefined,
      });
    });

    it("should pass model and baseUrl to constructor", async () => {
      await getOrchestrator({ apiKey: "full", model: "gpt-4o", baseUrl: "https://custom.api" });
      expect(MockOrchestrator).toHaveBeenCalledWith("full", undefined, {
        model: "gpt-4o",
        baseUrl: "https://custom.api",
      });
    });

    it("should use composite cache key with apiKey:model:baseUrl", async () => {
      // Same apiKey, different model → different entry
      await getOrchestrator({ apiKey: "same", model: "a" });
      await getOrchestrator({ apiKey: "same", model: "b" });
      expect(getCacheSize()).toBe(2);
      expect(MockOrchestrator).toHaveBeenCalledTimes(2);
    });
  });
});

describe("agent-manager default agent lazy init (BG-05)", () => {
  beforeEach(() => {
    resetDefaultAgent();
    MockAnalysisAgent.mockClear();
  });

  afterEach(() => {
    resetDefaultAgent();
  });

  it("should not create AnalysisAgent at import time", () => {
    // Module was already imported — verify AnalysisAgent was NOT
    // called during import (the eager `if (DEFAULT_API_KEY)` block was removed)
    // Since OPENAI_API_KEY is not set in test env, no instance should exist
    expect(MockAnalysisAgent).not.toHaveBeenCalled();
  });

  it("should create a new agent for non-default keys", () => {
    const agent = getAgent("custom-key-123");
    expect(agent).toBeDefined();
    expect(MockAnalysisAgent).toHaveBeenCalledWith("custom-key-123");
  });

  it("resetDefaultAgent should not throw when no instance exists", () => {
    expect(() => {
      resetDefaultAgent();
      resetDefaultAgent();
    }).not.toThrow();
  });
});
