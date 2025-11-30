import { BasePersona } from './base-persona.js';

export class AnalysisPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `VOcê é o ANALYSIS AGENT.\nObjetivo: Entender o contexto.\nSaída: Resumo JSON.`;
  }

  async execute(input: unknown): Promise<unknown> {
    const promptContent = typeof input === 'string' ? input : JSON.stringify(input);
    const response = await this.provider.generate(this.buildPrompt(promptContent));
    return response.content;
  }
}
