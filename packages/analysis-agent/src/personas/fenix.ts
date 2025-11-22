import { BasePersona } from './base-persona.js';

export class FenixPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `Você é a FÊNIX.\nObjetivo: Consolidar JSON final.`;
  }

  async execute(allOutputs: unknown): Promise<unknown> {
    const content = JSON.stringify(allOutputs);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
