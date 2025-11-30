// Exports principais
export { AnalysisAgent } from "./agent";
export { ConsolidatorService } from "./services/consolidator-service";
export { GeneratorService } from "./services/generator-service";

// Novos módulos (para testes e extensibilidade)
export { SmartParser } from "./modules/parser/smart-parser";
export { TemplateEngine } from "./modules/templates/template-engine";
export { LLMService } from "./services/llm/llm-service";
export * from "./core/definitions/schemas";
