import axios from 'axios';
import { LLMProvider, LLMResponse } from './llm-provider.js';

export class DeepSeekProvider implements LLMProvider {
  private apiKey: string;
  private apiUrl = 'https://api.deepseek.com/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

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
    } catch (error: any) {
      console.error('Erro na chamada DeepSeek:', error.response?.data || error.message);
      throw new Error('Falha na geração do LLM');
    }
  }
}
