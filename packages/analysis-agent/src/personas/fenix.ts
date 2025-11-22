import { BasePersona } from './base-persona.js';

/**
 * Persona 8: Fênix (Consolidação).
 * Une todos os artefatos em um JSON final coerente.
 */
export class FenixPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é a FÊNIX.
Seu objetivo: Consolidar o trabalho de todas as outras personas em um JSON final válido.
Saída esperada: JSON estrito contendo HUs, Código, Testes e Docs.`;
  }

  async execute(allOutputs: any): Promise<any> {
    // Aqui combinaríamos os inputs anteriores para formar o prompt final
    const prompt = `Consolide os seguintes artefatos:\n${JSON.stringify(allOutputs)}`;
    return (await this.provider.generate(this.buildPrompt(prompt))).content;
  }
}
