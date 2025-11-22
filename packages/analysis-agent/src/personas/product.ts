import { BasePersona } from './base-persona.js';

/**
 * Persona 2: Product Strategist.
 * Traduz objetivos técnicos em valor de produto e Histórias de Usuário (HUs).
 */
export class ProductPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o PRODUCT STRATEGIST.
Seu objetivo: Criar Histórias de Usuário (HUs) seguindo o padrão GWT.
Saída esperada: Lista de HUs em Markdown ou JSON.`;
  }

  async execute(analysisResult: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(analysisResult))).content;
  }
}
