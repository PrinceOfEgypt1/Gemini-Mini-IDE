import { AnalysisAgent } from "@gemini-mini-ide/analysis-agent";
import type { LLMConfig } from "../helpers.js";

/**
 * Manages AnalysisAgent singleton and InteractiveOrchestrator cache.
 * Single source of truth for agent/orchestrator lifecycle.
 */

const DEFAULT_API_KEY = process.env["OPENAI_API_KEY"] ?? "";

// HU-MINI-IDE-PERF-001: Global singleton — avoids recreating TCP/TLS connection
let defaultAgentInstance: AnalysisAgent | null = null;
if (DEFAULT_API_KEY) {
  defaultAgentInstance = new AnalysisAgent(DEFAULT_API_KEY);
}

// Lazy-load InteractiveOrchestrator (depends on better-sqlite3 native)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let InteractiveOrchestratorClass: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orchestrators = new Map<string, any>();

export function getDefaultApiKey(): string {
  return DEFAULT_API_KEY;
}

/**
 * Returns the singleton AnalysisAgent for the default key,
 * or creates a new instance for custom keys.
 */
export function getAgent(apiKey: string): AnalysisAgent {
  if (apiKey === DEFAULT_API_KEY && defaultAgentInstance) {
    return defaultAgentInstance;
  }
  return new AnalysisAgent(apiKey);
}

/**
 * Returns a cached InteractiveOrchestrator for the given LLM config.
 * Lazy-loads the class on first call.
 */
export async function getOrchestrator(config: LLMConfig) {
  if (!InteractiveOrchestratorClass) {
    const mod = await import("@gemini-mini-ide/analysis-agent");
    InteractiveOrchestratorClass = mod.InteractiveOrchestrator;
  }
  const cacheKey = `${config.apiKey}:${config.model || "default"}:${config.baseUrl || "default"}`;
  let orchestrator = orchestrators.get(cacheKey);
  if (!orchestrator) {
    orchestrator = new InteractiveOrchestratorClass(config.apiKey, undefined, {
      model: config.model,
      baseUrl: config.baseUrl
    });
    orchestrators.set(cacheKey, orchestrator);
  }
  return orchestrator;
}
