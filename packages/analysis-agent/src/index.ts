/**
 * @fileoverview Public surface of `@gemini-mini-ide/analysis-agent`.
 *
 * This barrel is consumed by `@gemini-mini-ide/server` (and the CLI, via the
 * server) to obtain the analysis agent, the two orchestrators (transformative
 * and interactive), the session layer and the code-generation helpers. It is
 * the stable API boundary of the package — anything re-exported here is
 * expected to have JSDoc on the symbol itself, and consumers must NOT deep-
 * import from `./agents/*`, `./esaa/*`, etc.
 *
 * The ESAA subsystem has a deliberately *narrow* surface here (see the
 * P27/P27.1 block below): only the three symbols required by the live
 * server code path are exported, everything else is internal.
 *
 * @module analysis-agent
 */

import { AnalysisAgent } from "./agent.js";
import { TransformativeOrchestrator } from "./orchestrator.js";
import { InteractiveOrchestrator } from "./orchestrator-interactive.js";

// Exporta a classe principal (retrocompatível)
export { AnalysisAgent };

// Exporta o novo orquestrador transformador
export { TransformativeOrchestrator };
export type { TransformativeAgentResult } from "./orchestrator.js";

// Exporta o orquestrador interativo (chat stateful)
export { InteractiveOrchestrator };
export type { InteractionResult } from "./orchestrator-interactive.js";

// Exporta agentes da Camada Humana e Estratégica
export { UserProfilerAgent } from "./agents/user-profiler.js";
export { EmotionalIntelligenceAgent } from "./agents/emotional-intelligence.js";
export { AdaptiveInteractionAgent } from "./agents/adaptive-interaction.js";
export { AutonomousDecisionEngine } from "./agents/autonomous-decision-engine.js";
export { ExperienceDesignerAgent } from "./agents/experience-designer.js";

// Exporta agentes interativos
export { InteractiveUserProfilerAgent } from "./agents/interactive-user-profiler.js";
export { InteractiveEmotionalIntelligenceAgent } from "./agents/interactive-emotional-intelligence.js";
export { InteractiveAdaptiveInteractionAgent } from "./agents/interactive-adaptive-interaction.js";
export { InteractiveAutonomousDecisionAgent } from "./agents/interactive-autonomous-decision.js";
export { InteractiveExperienceDesignerAgent } from "./agents/interactive-experience-designer.js";

// Exporta interface de agentes interativos
export type { InteractiveAgent, ConversationContext, AgentMessage, AgentResponse } from "./agents/interactive-agent.js";

// Exporta sessão
export { SessionManager } from "./session/manager.js";
export { SessionDatabase } from "./session/database.js";
export type { ConversationSession, ConversationMessage, AgentPhase, AgentType } from "./session/types.js";
export { AGENT_PIPELINE } from "./session/types.js";

// Exporta contextos
export { TransformativeContext } from "./context/transformative-context.js";

// Exporta tipos essenciais para quem consome o pacote (CLI/Server)
export * from "./types/index.js";
export * from "./governance/index.js";

// ─── ESAA Hardened v2 (EXPERIMENTAL / CONTAINED — P27 + P27.1) ───────────────
//
// @experimental
//
// O subsistema ESAA é oficialmente classificado como experimental e contido
// (ver docs/ESAA_ARCHITECTURE.md § 0 — "Política de Contenção"). Antes do
// P27.1 este barrel re-exportava todo o módulo `./esaa/index.js` como parte
// da superfície pública de `@gemini-mini-ide/analysis-agent`, expondo
// EventStore, IntentionGateway, WorkspaceExecutor, PromotionController,
// RecoveryController, ProjectionEngine, PolicyEngine, InvariantEngine, etc.
// como se fossem API estável — sem nenhum consumidor real.
//
// O P27.1 reduz a superfície ao mínimo absoluto exigido pelos consumidores
// reais, hoje só o pacote `@gemini-mini-ide/server`:
//
//   - `getGlobalESAAOrchestrator` (valor) — usado por `server/src/index.ts`
//     dentro do gate `if (isESAAEnabled())` introduzido pelo P27.
//   - `ESAAOrchestrator` (tipo) — usado por `server/src/routes/esaa.routes.ts`
//     para tipar o orchestrator passado ao registrador de rotas.
//   - `ESAAEventType` (tipo) — usado pelo type guard `isESAAEventType` no
//     mesmo arquivo de rotas, para validar query strings.
//
// Tudo o mais permanece acessível via deep import dentro do próprio pacote
// `analysis-agent` (testes internos como `esaa.test.ts` continuam usando
// imports relativos diretos), mas NÃO compõe a superfície pública estável.
// Re-expandir este export é uma regressão de governança e exige reverter
// a contenção do ESAA segundo os 6 pré-requisitos listados em
// docs/ESAA_ARCHITECTURE.md § 0 ("Como reverter a contenção").
export { getGlobalESAAOrchestrator } from "./esaa/index.js";
export type { ESAAOrchestrator } from "./esaa/index.js";
export type { ESAAEventType } from "./esaa/index.js";

// Exporta o sistema de geração incremental
export * from "./generation/index.js";

// Exporta clientes LLM
export * from "./llm-clients/index.js";

// Exporta o sistema de execução (sandbox, VFS, todo)
export * from "./execution/index.js";

// ── Factory helpers ──────────────────────────────────────────────────────────
//
// Thin helpers that instantiate the three main entry points using the legacy
// `(apiKey: string)` constructor. They exist so external consumers don't need
// to import the classes themselves; prefer these when you only need a default
// configuration. Tests and advanced consumers should use the class constructors
// directly to inject custom options.

/** Builds an {@link AnalysisAgent} with default options from an API key. */
export const createAgent = (apiKey: string) => new AnalysisAgent(apiKey);

/** Builds a {@link TransformativeOrchestrator} from an API key. */
export const createTransformativeOrchestrator = (apiKey: string) => new TransformativeOrchestrator(apiKey);

/** Builds an {@link InteractiveOrchestrator} from an API key. */
export const createInteractiveOrchestrator = (apiKey: string) => new InteractiveOrchestrator(apiKey);
