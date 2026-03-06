import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface ILLMClient {
  chatCompletion(
    messages: ChatCompletionMessageParam[],
    options?: {
      model?: string;
      temperature?: number;
      seed?: number;
      response_format?: { type: "json_object" | "text" };
    }
  ): Promise<any>;
}
