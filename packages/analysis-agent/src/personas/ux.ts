import { BasePersona } from './base-persona.js';

/**
 * Persona 5: UX/UI Guardian.
 * Garante usabilidade e acessibilidade.
 */
export class UXPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o UX/UI GUARDIAN.
Seu objetivo: Garantir acessibilidade (WCAG) e boa experiência.
Saída esperada: Ajustes de CSS, HTML semântico e feedbacks visuais.`;
  }

  async execute(engineResult: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(engineResult))).content;
  }
}
