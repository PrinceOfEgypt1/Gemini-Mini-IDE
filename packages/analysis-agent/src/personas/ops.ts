import { BasePersona } from './base-persona.js';

/**
 * Persona 7: Observability & Ops.
 * Prepara scripts de deploy, CI/CD e ambiente.
 */
export class OpsPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o OPS ENGINEER.
Seu objetivo: Criar scripts de automação (Bash) e configurações de CI.
Saída esperada: Scripts .sh e configs de docker/pipeline.`;
  }

  async execute(fullContext: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(fullContext))).content;
  }
}
