/**
 * @fileoverview HTTP-layer helpers shared by all server route modules.
 *
 * Holds:
 * - {@link LLMConfig} and {@link extractLLMConfig}, the adapter between
 *   Fastify headers and the analysis-agent's LLM configuration shape;
 * - the Zod schemas used to validate request bodies at the HTTP boundary.
 *
 * The Zod schemas in this file are the *runtime* contract of the server —
 * they must stay in lock-step with the TypeScript interfaces declared in
 * `@gemini-mini-ide/shared` (notably {@link AnalyzeRequest}). When adding
 * or renaming a field, update both sides.
 *
 * @module server/helpers
 */

import { z } from "zod";

/**
 * Effective LLM configuration derived from a single HTTP request.
 *
 * - `apiKey` is either the Bearer token from the `Authorization` header or
 *   the server default (`OPENAI_API_KEY`) when no header is present. Empty
 *   string means "no key available" and MUST cause the route to reply 401.
 * - `model` / `baseUrl` come from the `X-LLM-Model` and `X-LLM-Base-URL`
 *   headers and are `undefined` when not sent, in which case the
 *   analysis-agent falls back to its own defaults.
 */
export interface LLMConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/**
 * Extracts {@link LLMConfig} from raw Fastify headers.
 *
 * Precedence for `apiKey`:
 * 1. Bearer token from `Authorization: Bearer <token>` (string form only).
 * 2. `defaultApiKey` fallback (the server-side env var).
 *
 * The function is total — it never throws and always returns a well-formed
 * {@link LLMConfig}. Callers are responsible for checking `apiKey` before
 * forwarding the config to downstream services.
 *
 * @param headers  Raw Fastify request headers (mixed case insensitive).
 * @param defaultApiKey Fallback key from the server environment.
 */
export function extractLLMConfig(
  headers: Record<string, string | string[] | undefined>,
  defaultApiKey: string
): LLMConfig {
  const authHeader = headers["authorization"];
  const apiKey =
    authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : defaultApiKey;

  const model = headers["x-llm-model"];
  const baseUrl = headers["x-llm-base-url"];

  return {
    apiKey,
    model: typeof model === "string" ? model : undefined,
    baseUrl: typeof baseUrl === "string" ? baseUrl : undefined,
  };
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────
//
// These schemas are the runtime contract for the server's HTTP boundary.
// They are validated via `.safeParse()` inside each route handler; failures
// translate into `400 Bad Request` with `details: issues[]`. The shapes
// mirror the TypeScript interfaces in `@gemini-mini-ide/shared` — any
// change to one side must be reflected in the other.

/**
 * Validates the body of `POST /analyze`. Mirrors `AnalyzeRequest` from
 * `@gemini-mini-ide/shared`: requires a non-empty `text` and accepts an
 * optional `currentContext` for refinement calls.
 */
export const AnalyzeRequestSchema = z.object({
  text: z.string().min(1),
  maxLen: z.number().optional(),
  currentContext: z
    .object({
      files: z.array(
        z.object({
          path: z.string(),
          purpose: z.string().optional(),
        })
      ),
      summary: z.string().optional(),
    })
    .optional(),
});

/**
 * Validates `POST /conversations/start`. Requires a non-empty `userId`
 * (used to scope sessions) and an initial `message` from the user.
 */
export const StartConversationSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
});

/**
 * Validates `POST /conversations/:sessionId/respond`. The user's next
 * message in an existing interactive conversation.
 */
export const RespondSchema = z.object({
  message: z.string().min(1),
});

/**
 * Validates `POST /impact-analysis`. `files` is the only required field;
 * `base` and `staged` are reserved for future integrations with
 * git-aware callers and are accepted but not currently used.
 */
export const ImpactAnalysisSchema = z.object({
  files: z.array(z.string()),
  base: z.string().optional(),
  staged: z.boolean().optional(),
});
