import { AnalysisAgent } from "@gemini-mini-ide/analysis-agent";
import type { LLMConfig } from "../helpers.js";

/**
 * Manages AnalysisAgent singleton and InteractiveOrchestrator cache.
 * Single source of truth for agent/orchestrator lifecycle.
 *
 * BG-06: Cache lifecycle policy
 * - TTL: entries expire after ORCHESTRATOR_TTL_MS (default 30 minutes)
 * - Max size: cache holds at most ORCHESTRATOR_MAX_ENTRIES (default 50)
 * - Eviction: oldest entry (by lastAccessed) is evicted when max size is exceeded
 * - Cleanup: periodic sweep removes expired entries every CLEANUP_INTERVAL_MS (default 5 minutes)
 */

const DEFAULT_API_KEY = process.env["OPENAI_API_KEY"] ?? "";

// BG-05: Lazy singleton — avoids creating TCP/TLS connection at import time.
// Previously created eagerly (HU-MINI-IDE-PERF-001); now deferred to first getAgent() call.
let defaultAgentInstance: AnalysisAgent | null = null;

// Lazy-load InteractiveOrchestrator (depends on better-sqlite3 native)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let InteractiveOrchestratorClass: any = null;

/** BG-06: Cache lifecycle constants */
export const ORCHESTRATOR_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const ORCHESTRATOR_MAX_ENTRIES = 50;
export const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/** BG-06: Cache entry with lifecycle metadata */
interface CacheEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orchestrator: any;
  createdAt: number;
  lastAccessed: number;
}

const orchestrators = new Map<string, CacheEntry>();

/** BG-06: Periodic cleanup timer reference (for shutdown/testing) */
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function getDefaultApiKey(): string {
  return DEFAULT_API_KEY;
}

/**
 * Returns the singleton AnalysisAgent for the default key,
 * or creates a new instance for custom keys.
 *
 * BG-05: Default agent created lazily on first call instead of at import time.
 */
export function getAgent(apiKey: string): AnalysisAgent {
  if (apiKey === DEFAULT_API_KEY && DEFAULT_API_KEY) {
    if (!defaultAgentInstance) {
      defaultAgentInstance = new AnalysisAgent(DEFAULT_API_KEY);
    }
    return defaultAgentInstance;
  }
  return new AnalysisAgent(apiKey);
}

/**
 * Resets the default agent singleton.
 * Next call to getAgent() with the default key creates a fresh instance.
 * Primarily for testing.
 *
 * BG-05: Explicit lifecycle reset.
 */
export function resetDefaultAgent(): void {
  defaultAgentInstance = null;
}

/**
 * BG-06: Check if a cache entry has expired based on TTL.
 */
function isExpired(entry: CacheEntry, now: number): boolean {
  return now - entry.lastAccessed >= ORCHESTRATOR_TTL_MS;
}

/**
 * BG-06: Evict the oldest entry (by lastAccessed) from the cache.
 * Called when cache reaches ORCHESTRATOR_MAX_ENTRIES before inserting a new entry.
 */
function evictOldest(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;
  for (const [key, entry] of orchestrators) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed;
      oldestKey = key;
    }
  }
  if (oldestKey !== null) {
    orchestrators.delete(oldestKey);
  }
}

/**
 * BG-06: Remove all expired entries from the cache.
 * Called periodically by the cleanup timer and can be called manually.
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now();
  let removed = 0;
  for (const [key, entry] of orchestrators) {
    if (isExpired(entry, now)) {
      orchestrators.delete(key);
      removed++;
    }
  }
  return removed;
}

/**
 * BG-06: Start the periodic cleanup timer.
 * Safe to call multiple times — only one timer will be active.
 */
export function startCleanupTimer(): void {
  if (cleanupTimer !== null) return;
  cleanupTimer = setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);
  // Allow process to exit even if timer is active
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * BG-06: Stop the periodic cleanup timer.
 */
export function stopCleanupTimer(): void {
  if (cleanupTimer !== null) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

/**
 * BG-06: Get current cache size (for monitoring/testing).
 */
export function getCacheSize(): number {
  return orchestrators.size;
}

/**
 * BG-06: Clear entire cache (for testing/shutdown).
 */
export function clearCache(): void {
  orchestrators.clear();
}

/**
 * Returns a cached InteractiveOrchestrator for the given LLM config.
 * Lazy-loads the class on first call.
 *
 * BG-06: Entries are subject to TTL expiration and max-size eviction.
 * - Expired entries are replaced transparently on access.
 * - When cache is full, the oldest entry (by lastAccessed) is evicted.
 */
export async function getOrchestrator(config: LLMConfig) {
  if (!InteractiveOrchestratorClass) {
    const mod = await import("@gemini-mini-ide/analysis-agent");
    InteractiveOrchestratorClass = mod.InteractiveOrchestrator;
  }
  const cacheKey = `${config.apiKey}:${config.model || "default"}:${config.baseUrl || "default"}`;
  const now = Date.now();

  const existing = orchestrators.get(cacheKey);
  if (existing) {
    if (isExpired(existing, now)) {
      // TTL expired — remove and fall through to create new
      orchestrators.delete(cacheKey);
    } else {
      // Valid hit — update lastAccessed and return
      existing.lastAccessed = now;
      return existing.orchestrator;
    }
  }

  // Evict oldest if at capacity
  if (orchestrators.size >= ORCHESTRATOR_MAX_ENTRIES) {
    evictOldest();
  }

  const orchestrator = new InteractiveOrchestratorClass(config.apiKey, undefined, {
    model: config.model,
    baseUrl: config.baseUrl
  });

  orchestrators.set(cacheKey, {
    orchestrator,
    createdAt: now,
    lastAccessed: now,
  });

  // Start cleanup timer on first cache population
  startCleanupTimer();

  return orchestrator;
}
