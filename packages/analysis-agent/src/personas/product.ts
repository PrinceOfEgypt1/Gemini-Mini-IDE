import { BasePersona } from './base-persona.js';

export class ProductPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o PRODUCT STRATEGIST.\nObjetivo: Criar HUs.\nSaída: Lista de HUs.`;
  }

  async execute(analysisResult: unknown): Promise<unknown> {
    const content = typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
