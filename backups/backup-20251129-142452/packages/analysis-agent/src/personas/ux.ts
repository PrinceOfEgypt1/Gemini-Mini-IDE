import { BasePersona } from './base-persona.js';

export class UXPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o UX/UI GUARDIAN.\nObjetivo: Garantir usabilidade.`;
  }

  async execute(engineResult: unknown): Promise<unknown> {
    const content = typeof engineResult === 'string' ? engineResult : JSON.stringify(engineResult);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
