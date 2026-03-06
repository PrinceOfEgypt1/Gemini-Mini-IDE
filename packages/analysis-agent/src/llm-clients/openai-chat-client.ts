import OpenAI from "openai";
import { ILLMClient } from "./llm-client.interface.js";

export class OpenAIChatClient implements ILLMClient {
  private openai: OpenAI;
  private defaultModel: string;

  constructor(apiKey: string, baseUrl?: string, defaultModel: string = "gpt-4o-mini") {
    const clientOptions: { apiKey: string; timeout: number; baseURL?: string } = {
      apiKey,
      timeout: 600000 // 10 minutes timeout (large prompts can take time)
    };

    if (baseUrl) {
      clientOptions.baseURL = baseUrl;
    }

    this.openai = new OpenAI(clientOptions);
    this.defaultModel = defaultModel;
  }

  async chatCompletion(
    messages: { role: "system" | "user" | "assistant"; content: string; }[],
    options?: {
      model?: string;
      temperature?: number;
      seed?: number;
      response_format?: { type: "json_object" | "text" };
    }
  ): Promise<{ content: string; }> {
    const response = await this.openai.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages,
      temperature: options?.temperature,
      seed: options?.seed,
      response_format: options?.response_format,
    });
    return { content: response.choices[0]?.message?.content || "" };
  }
}
