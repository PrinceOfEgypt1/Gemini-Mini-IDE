/**
 * @fileoverview Generation module exports
 *
 * Provides incremental code generation with governance for large codebases.
 */

// Classes de geração
export { IncrementalGenerator } from "./incremental-generator.js";
export { ManifestBatcher } from "./manifest-batcher.js";
export { BatchValidator } from "./batch-validator.js";
export { ContextAccumulator } from "./context-accumulator.js";

// Tipos de geração (definidos em types/generation-types.ts)
export type {
  BatchFile,
  BatchResult,
  BatchGeneratedFile,
  LLMGeneratedFile,
  LLMCodeGenerationResult,
} from "../types/generation-types.js";
