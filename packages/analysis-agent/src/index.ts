import { AnalysisAgent } from "./agent.js";

// Exporta a classe principal
export { AnalysisAgent };

// Exporta tipos essenciais para quem consome o pacote (CLI/Server)
export * from "./types/index.js";
export * from "./governance/index.js";

// Exporta helpers se necessário
export const createAgent = (apiKey: string) => new AnalysisAgent(apiKey);
