import { BasePersona } from './base-persona.js';

/**
 * Persona 6: Quality Guardian.
 * Escreve testes e valida critérios de aceite.
 */
export class QualityPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o QUALITY GUARDIAN.
Seu objetivo: Criar testes unitários (Vitest/Jest) para o código gerado.
Saída esperada: Arquivos .test.ts ou .spec.ts.`;
  }

  async execute(engineResult: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(engineResult))).content;
  }
}
