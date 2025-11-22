import { BasePersona } from './base-persona.js';

export class QualityPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o QUALITY GUARDIAN.\nObjetivo: Criar testes.`;
  }

  async execute(engineResult: unknown): Promise<unknown> {
    const content = typeof engineResult === 'string' ? engineResult : JSON.stringify(engineResult);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
