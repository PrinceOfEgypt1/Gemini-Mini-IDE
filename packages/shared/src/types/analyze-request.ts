/**
 * @fileoverview Request contract for the `POST /analyze` endpoint.
 *
 * This module defines the shape accepted by the server's analysis pipeline
 * and validated at runtime by `AnalyzeRequestSchema` in
 * `packages/server/src/helpers.ts`. The TypeScript interfaces here and the
 * Zod schema there must stay in lock-step; any field added or renamed in
 * one MUST be added or renamed in the other.
 *
 * @module shared/types/analyze-request
 */

/**
 * Minimal descriptor of a project file attached as context to a refinement.
 *
 * Only `path` and an optional `purpose` are sent over the wire — file
 * contents are intentionally omitted to keep token usage bounded when the
 * server forwards the context to the LLM.
 */
export interface FileContext {
  /** Repo-relative path (POSIX separators). */
  path: string;
  /** Short human-readable description of the file's role, if known. */
  purpose?: string;
}

/**
 * Body of `POST /analyze`.
 *
 * Invariants enforced by the server-side Zod schema:
 * - `text` is non-empty;
 * - `maxLen`, when provided, is a positive integer;
 * - `currentContext.files` is a (possibly empty) array of {@link FileContext};
 * - the request is rejected with HTTP 400 when these invariants are broken.
 *
 * `currentContext` is the "refinement context" channel: when present, the
 * agent treats the call as a refinement of an existing project rather than
 * a cold-start analysis, and prioritizes consistency with the listed files.
 */
export interface AnalyzeRequest {
  /** User prompt or document to analyze. Must be non-empty. */
  text: string;
  /**
   * Optional soft cap on the summary length (in characters/tokens). The
   * agent treats this as a hint, not a hard limit.
   */
  maxLen?: number;
  /**
   * Current project context used for refinements. Only file names and
   * purposes are sent (not contents) to keep token usage bounded.
   */
  currentContext?: {
    /** List of files describing the current project shape. */
    files: FileContext[];
    /** Optional short summary of the project, for extra LLM context. */
    summary?: string;
  };
}
