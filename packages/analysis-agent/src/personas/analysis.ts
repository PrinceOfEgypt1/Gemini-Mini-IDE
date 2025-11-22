import { BasePersona } from './base-persona.js';

/**
 * Persona 1: Analysis Agent.
 * Responsável por entender o pedido, identificar ambiguidades e resumir objetivos.
 */
export class AnalysisPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `VOcê é o ANALYSIS AGENT.
Seu objetivo: Entender profundamente o contexto e o pedido do usuário.
Saída esperada: Um resumo JSON contendo { "summary": string, "goals": string[], "risks": string[] }.`;
  }

  async execute(input: string): Promise<any> {
    const response = await this.provider.generate(this.buildPrompt(input));
    // Em produção, aqui haveria um parser de JSON robusto (Zod)
    return response.content;
  }
}
