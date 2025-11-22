import { LLMProvider, LLMResponse } from './llm-provider.js';

/**
 * Provedor simulado para desenvolvimento e testes.
 * Retorna respostas fixas sem consumir API externa.
 */
export class MockProvider implements LLMProvider {
  /**
   * Gera uma resposta simulada.
   * @param prompt - O texto de entrada (ignorado na lógica, usado apenas para log).
   */
  async generate(_prompt: string): Promise<LLMResponse> {
    // Simula latência
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      content: JSON.stringify({
        summary: "Análise Mockada das 8 Personas (Fase 8 Hardening)",
        personas: {
          product: { hus: ["HU-001: Exemplo"] },
          architect: { stack: "Node.js + React" },
          engine: { files: ["src/index.ts"] }
        }
      }, null, 2),
      usage: { inputTokens: 50, outputTokens: 120 }
    };
  }
}
