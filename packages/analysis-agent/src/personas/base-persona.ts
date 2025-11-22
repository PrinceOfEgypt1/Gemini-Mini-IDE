import { LLMProvider } from '../providers/llm-provider.js';

/**
 * Classe base abstrata para todas as personas do sistema.
 * Define o contrato de interação com o LLM e o contexto compartilhado.
 */
export abstract class BasePersona {
  protected provider: LLMProvider;

  /**
   * @param provider - O provedor de LLM (DeepSeek ou Mock) injetado.
   */
  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  /**
   * Retorna o System Prompt específico desta persona.
   */
  protected abstract getRoleDescription(): string;

  /**
   * Executa a tarefa da persona.
   * @param input - O contexto de entrada.
   * @returns O resultado processado.
   */
  abstract execute(input: unknown): Promise<unknown>;

  /**
   * Helper para formatar o prompt final combinando System + User.
   */
  protected buildPrompt(userContent: string): string {
    return `${this.getRoleDescription()}\n\n---\n\nTASK:\n${userContent}`;
  }
}
