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

// Exporta o sistema ESAA Hardened v2
export * from "./esaa/index.js";

// Exporta helpers
export const createAgent = (apiKey: string) => new AnalysisAgent(apiKey);
export const createTransformativeOrchestrator = (apiKey: string) => new TransformativeOrchestrator(apiKey);
export const createInteractiveOrchestrator = (apiKey: string) => new InteractiveOrchestrator(apiKey);
