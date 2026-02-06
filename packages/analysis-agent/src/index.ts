import { AnalysisAgent } from "./agent.js";
import { TransformativeOrchestrator } from "./orchestrator.js";

// Exporta a classe principal (retrocompatível)
export { AnalysisAgent };

// Exporta o novo orquestrador transformador
export { TransformativeOrchestrator };
export type { TransformativeAgentResult } from "./orchestrator.js";

// Exporta agentes da Camada Humana e Estratégica
export { UserProfilerAgent } from "./agents/user-profiler.js";
export { EmotionalIntelligenceAgent } from "./agents/emotional-intelligence.js";
export { AdaptiveInteractionAgent } from "./agents/adaptive-interaction.js";
export { AutonomousDecisionEngine } from "./agents/autonomous-decision-engine.js";
export { ExperienceDesignerAgent } from "./agents/experience-designer.js";

// Exporta contextos
export { TransformativeContext } from "./context/transformative-context.js";

// Exporta tipos essenciais para quem consome o pacote (CLI/Server)
export * from "./types/index.js";
export * from "./governance/index.js";

// Exporta helpers
export const createAgent = (apiKey: string) => new AnalysisAgent(apiKey);
export const createTransformativeOrchestrator = (apiKey: string) => new TransformativeOrchestrator(apiKey);
