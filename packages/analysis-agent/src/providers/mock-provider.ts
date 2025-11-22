import { LLMProvider, LLMResponse } from './llm-provider.js';

/**
 * Provedor simulado.
 * Retorna respostas fixas baseadas em palavras-chave do prompt para simular personas.
 */
export class MockProvider implements LLMProvider {
  /**
   * Gera uma resposta simulada dependendo da "Persona" detectada no prompt.
   */
  async generate(prompt: string): Promise<LLMResponse> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Latência menor para testes

    let content = "";

    if (prompt.includes("ANALYSIS AGENT")) {
      content = JSON.stringify({ summary: "Análise concluída", goals: ["Goal 1"] });
    } else if (prompt.includes("PRODUCT STRATEGIST")) {
      content = "HU-001: Como usuário...";
    } else if (prompt.includes("ENGINE SPECIALIST")) {
      content = "console.log('Hello World');";
    } else {
      content = "Processamento genérico realizado.";
    }

    return {
      content,
      usage: { inputTokens: 10, outputTokens: 20 }
    };
  }
}
