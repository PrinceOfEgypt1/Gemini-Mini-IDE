/**
 * @fileoverview Response contract for the `POST /analyze` endpoint.
 *
 * Defines the shape the server returns to the UI and CLI after running the
 * analysis agent. This is the canonical "frontend view" of an agent run —
 * the analysis agent's richer internal types (`RichAgentResult`, etc.) are
 * projected down to this shape at the HTTP boundary.
 *
 * @module shared/types/analyze-response
 * @version 4.0.0
 * @remarks Atualizado: 2025-11-29 (v4.0.0 - UTF-8 Fixed)
 */

/**
 * Project complexity label returned by the analysis phase, in Portuguese to
 * match the UI's localized vocabulary.
 */
export type Complexity = "Baixa" | "Média" | "Alta" | "Crítica";

/**
 * Priority level for a generated user story, following the standard
 * `P0..P3` scale (P0 = highest / blocker).
 */
export type Priority = "P0" | "P1" | "P2" | "P3";

/**
 * Flat, UI-friendly projection of a user story produced by the agent.
 *
 * This is NOT the same shape as the analysis-agent's internal `RichUserStory`
 * — the richer fields (technical notes, point estimates, dependencies) are
 * flattened or dropped so the frontend can render the story without knowing
 * about the agent's internal schemas. Field names prefixed `functionalReqs`,
 * `security` and `context` are explicit mappings from the internal
 * `functionalRequirements`, `securityRequirements` and `businessContext`
 * (see the `Mapeado de ...` doc-comment tags on each field below).
 */
export interface MappedUserStory {
  id: string;
  title: string;
  priority: Priority;
  role: string;
  action: string;
  benefit: string;
  acceptanceCriteria: string[];
  /** Mapeado de functionalRequirements */
  functionalReqs: string[];
  /** Mapeado de securityRequirements */
  security: string[];
  /** Mapeado de businessContext */
  context: string;
  nonFunctionalReqs: string[];
  description: string;
}

/**
 * File emitted by the code-generation phase.
 *
 * The `language` field is a free-form tag (e.g. `"typescript"`, `"markdown"`)
 * used by the UI for syntax highlighting; it is not a strict enum.
 */
export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

/**
 * Output of the analysis phase (summary + complexity + assumptions).
 */
export interface AnalysisResult {
  summary: string;
  complexity: Complexity;
  assumptions: string[];
}

/**
 * Output of the architecture phase — the chosen stack and, optionally, a
 * mermaid/plantuml diagram as a plain string.
 */
export interface ArchitectResult {
  diagram?: string;
  stack: string;
}

/**
 * Full response body of `POST /analyze`.
 *
 * Shape notes:
 * - Top-level `summary`, `requestId` and `timestamp` are kept at the root
 *   so the frontend can read them without descending into `analysis`.
 * - `inputLength`, `outputLength`, `budgetUsed`, `budgetRemaining` are
 *   legacy fields kept for backward compatibility with older UI builds;
 *   new consumers should not rely on them.
 * - `ux`, `quality`, `ops` are deliberately typed as `unknown[]` — they
 *   carry agent-specific payloads whose shapes are not stable enough to
 *   promote to this contract yet.
 * - `fenix.notes` is a free-form note channel used by the phoenix phase.
 */
export interface AnalyzeResponse {
  // Campos na raiz (acesso direto pelo Frontend)
  summary: string;
  requestId: string;
  timestamp: string;

  // Campos legados para compatibilidade
  inputLength?: number;
  outputLength?: number;
  budgetUsed?: number;
  budgetRemaining?: number;

  // Estrutura completa
  analysis: AnalysisResult;

  product: {
    userStories: MappedUserStory[];
  };

  architect: ArchitectResult;

  engine: {
    files: GeneratedFile[];
  };

  ux: { components: unknown[] };
  quality: { tests: unknown[] };
  ops: { scripts: unknown[] };
  fenix: { notes: string };
}
