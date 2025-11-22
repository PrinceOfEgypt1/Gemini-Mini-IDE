import { BasePersona } from './base-persona.js';

export class EnginePersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o ENGINE SPECIALIST.\nObjetivo: Escrever código.\nSaída: Arquivos de código.`;
  }

  async execute(archResult: unknown): Promise<unknown> {
    const content = typeof archResult === 'string' ? archResult : JSON.stringify(archResult);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
