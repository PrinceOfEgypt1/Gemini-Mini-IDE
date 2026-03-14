import { z } from "zod";

export interface LLMConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/**
 * Extracts LLM configuration from request headers.
 * Supports Bearer token auth and custom model/base-url headers.
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

export const StartConversationSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1),
});

export const RespondSchema = z.object({
  message: z.string().min(1),
});

export const ImpactAnalysisSchema = z.object({
  files: z.array(z.string()),
  base: z.string().optional(),
  staged: z.boolean().optional(),
});
