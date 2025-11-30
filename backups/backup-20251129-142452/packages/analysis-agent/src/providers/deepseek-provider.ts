import axios from 'axios';
import { LLMProvider, LLMResponse } from './llm-provider.js';

/**
 * Implementação do provedor de LLM utilizando a API da DeepSeek.
 */
export class DeepSeekProvider implements LLMProvider {
  private apiKey: string;
  private apiUrl = 'https://api.deepseek.com/v1/chat/completions';

  /**
   * Cria uma instância do provedor DeepSeek.
   * @param apiKey - A chave de API para autenticação.
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Envia o prompt para a API da DeepSeek e retorna a resposta formatada.
   * @param prompt - O texto de entrada.
   * @returns Uma Promise com a resposta do modelo.
   * @throws Error se a chamada à API falhar.
   */
  async generate(prompt: string): Promise<LLMResponse> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are a specialized software engineering agent." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;
      return {
        content: data.choices[0].message.content,
        usage: {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens
        }
      };
    } catch (error: unknown) {
      // Tratamento de erro seguro (sem 'any')
      if (axios.isAxiosError(error)) {
         const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
         throw new Error(`DeepSeek API Error: ${msg}`);
      }
      throw new Error('Unknown error in DeepSeekProvider');
    }
  }
}
