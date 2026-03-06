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
