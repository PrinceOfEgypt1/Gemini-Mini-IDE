import { OpenAI } from "openai";

export interface LLMConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
}

export class LLMService {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig) {
    this.client = new OpenAI({ 
      apiKey: config.apiKey, 
      baseURL: config.baseURL 
    });
    this.model = config.model || "gpt-4o";
  }

  /**
   * Gera uma resposta em formato JSON forçado.
   * @param systemPrompt O "cérebro" da operação (quem é você).
   * @param userPrompt A tarefa específica.
   * @param temperature Determinismo (0.0 = robô, 0.7 = criativo).
   */
  async generateJSON(systemPrompt: string, userPrompt: string, temperature: number = 0.2): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: temperature
      });

      return response.choices[0].message.content || "{}";
    } catch (error: any) {
      // Tratamento unificado de erros de API
      if (error.status === 401) throw new Error("LLM Authentication Failed: Check API Key");
      if (error.status === 429) throw new Error("LLM Rate Limit Exceeded");
      throw error;
    }
  }

  /**
   * Gera uma resposta de texto livre (Chat).
   */
  async generateText(systemPrompt: string, userPrompt: string, temperature: number = 0.7): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: temperature
    });

    return response.choices[0].message.content || "";
  }
}
