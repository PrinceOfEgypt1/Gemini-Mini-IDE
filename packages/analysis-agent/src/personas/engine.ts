import { BasePersona } from './base-persona.js';

/**
 * Persona 4: Engine Specialist.
 * Escreve o código-fonte real.
 */
export class EnginePersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o ENGINE SPECIALIST.
Seu objetivo: Escrever código limpo, tipado e funcional (SOLID/Clean Code).
Saída esperada: O conteúdo dos arquivos de código.`;
  }

  async execute(archResult: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(archResult))).content;
  }
}
