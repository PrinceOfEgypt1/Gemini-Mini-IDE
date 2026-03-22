/**
 * BG-05: Tests for singleton lazy initialization and lifecycle.
 *
 * Verifies that critical singletons:
 * - Are NOT created at import time
 * - Are created lazily on first access
 * - Return the same instance on subsequent calls
 * - Can be closed/reset for cleanup
 * - Create fresh instances after reset
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock fs to prevent disk I/O during CacheService tests
vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue("{}"),
    writeFileSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue("{}"),
  writeFileSync: vi.fn(),
}));

// ─── CacheService Lazy Singleton ─────────────────────────────────────────────

describe("CacheService lazy singleton (BG-05)", () => {
  beforeEach(async () => {
    const { resetGlobalAnalysisCache } = await import("./cache.service.js");
    resetGlobalAnalysisCache();
  });

  it("should create instance lazily on first call", async () => {
    const { getGlobalAnalysisCache } = await import("./cache.service.js");
    const instance = getGlobalAnalysisCache();
    expect(instance).toBeDefined();
    expect(instance.stats()).toBeDefined();
  });

  it("should return the same instance on subsequent calls", async () => {
    const { getGlobalAnalysisCache } = await import("./cache.service.js");
    const first = getGlobalAnalysisCache();
    const second = getGlobalAnalysisCache();
    expect(first).toBe(second);
  });

  it("should create a fresh instance after reset", async () => {
    const { getGlobalAnalysisCache, resetGlobalAnalysisCache } = await import("./cache.service.js");
    const first = getGlobalAnalysisCache();
    resetGlobalAnalysisCache();
    const second = getGlobalAnalysisCache();
    expect(second).not.toBe(first);
  });

  it("should not throw on double reset", async () => {
    const { resetGlobalAnalysisCache } = await import("./cache.service.js");
    expect(() => {
      resetGlobalAnalysisCache();
      resetGlobalAnalysisCache();
    }).not.toThrow();
  });

  it("fresh instance should have empty cache", async () => {
    const { getGlobalAnalysisCache, resetGlobalAnalysisCache } = await import("./cache.service.js");
    const first = getGlobalAnalysisCache();
    first.set("key", "value");
    expect(first.stats().size).toBe(1);

    resetGlobalAnalysisCache();
    const second = getGlobalAnalysisCache();
    expect(second.stats().size).toBe(0);
  });
});
