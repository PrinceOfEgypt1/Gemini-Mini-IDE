/**
 * @fileoverview Pluggable LLM client contracts.
 *
 * Two narrow interfaces decouple the analysis-agent pipelines from any
 * specific vendor SDK: {@link ILLMClient} for single-shot chat completions
 * and {@link IIncrementalLLMClient} for streaming/incremental generation.
 * The OpenAI-backed implementations (`OpenAIChatClient`, `OpenAILLMClient`)
 * are the reference implementations; tests and alternative backends may
 * provide their own as long as they satisfy these shapes.
 *
 * Consumers (e.g. `AnalysisAgent`, `CodeGenerationService`) must depend on
 * these interfaces rather than the concrete classes so the agent can be
 * instantiated with in-memory fakes in unit tests.
 *
 * @module llm-clients/llm-client.interface
 */

/**
 * Contract for a single-shot chat completion client.
 *
 * Implementations receive a conversation (system + user + assistant turns)
 * and return the assistant's next message. Options follow the OpenAI-style
 * naming so existing prompts port over without renaming.
 *
 * Notes for implementers:
 * - `messages` is always non-empty and passed in chronological order.
 * - `response_format.type === "json_object"` means the caller requires a
 *   parseable JSON string in `content`; the client should enable the
 *   backend's JSON mode when available.
 * - Implementations must not mutate the `messages` array.
 */
export interface ILLMClient {
  chatCompletion(
    messages: { role: "system" | "user" | "assistant"; content: string; }[],
    options?: {
      model?: string;
      temperature?: number;
      seed?: number;
      response_format?: { type: "json_object" | "text" };
    }
  ): Promise<{ content: string; }>;
}

/**
 * Contract for an incremental/streaming LLM client.
 *
 * Used by the incremental code-generation pipeline, which needs to consume
 * the model output batch-by-batch instead of waiting for the full response.
 * The returned async iterable yields partial chunks; each chunk's `content`
 * is additive — consumers are expected to concatenate them in order.
 *
 * Notes for implementers:
 * - The iterable is single-use; consumers iterate it exactly once.
 * - Throwing from the iterator aborts the current generation; consumers
 *   propagate the error up.
 * - `response_format` has the same semantics as in {@link ILLMClient}.
 */
export interface IIncrementalLLMClient {
  incrementalCompletion(
    messages: { role: "system" | "user" | "assistant"; content: string; }[],
    options?: {
      model?: string;
      temperature?: number;
      seed?: number;
      response_format?: { type: "json_object" | "text" };
    }
  ): AsyncIterable<{ content: string; }>;
}
