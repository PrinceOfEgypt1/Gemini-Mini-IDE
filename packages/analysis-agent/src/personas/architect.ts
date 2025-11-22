import { BasePersona } from './base-persona.js';

/**
 * Persona 3: Solution Architect.
 * Define a stack tecnológica e a estrutura de arquivos.
 */
export class ArchitectPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o SOLUTION ARCHITECT.
Seu objetivo: Definir a arquitetura, stack e estrutura de pastas.
Saída esperada: Árvore de arquivos e lista de dependências.`;
  }

  async execute(productResult: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(productResult))).content;
  }
}
