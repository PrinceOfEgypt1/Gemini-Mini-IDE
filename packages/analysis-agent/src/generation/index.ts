/**
 * @fileoverview Generation module exports
 *
 * Provides incremental code generation with governance for large codebases.
 */

export {
  ManifestBatcher,
  BatchValidator,
  ContextAccumulator,
  IncrementalGenerator,
  type GenerationBatch,
  type BatchResult,
  type BatchGeneratedFile,
  type GenerationContext,
  type IncrementalGenerationResult,
  type LLMClient,
} from "./incremental-generator.js";
