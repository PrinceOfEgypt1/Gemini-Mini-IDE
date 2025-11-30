import { BasePersona } from './base-persona.js';

export class OpsPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é o OPS ENGINEER.\nObjetivo: Criar scripts CI/CD.`;
  }

  async execute(fullContext: unknown): Promise<unknown> {
    const content = typeof fullContext === 'string' ? fullContext : JSON.stringify(fullContext);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
