import { BasePersona } from './base-persona.js';

export class ArchitectPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o SOLUTION ARCHITECT.\nObjetivo: Definir stack.\nSaída: Árvore de arquivos.`;
  }

  async execute(productResult: unknown): Promise<unknown> {
    const content = typeof productResult === 'string' ? productResult : JSON.stringify(productResult);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
