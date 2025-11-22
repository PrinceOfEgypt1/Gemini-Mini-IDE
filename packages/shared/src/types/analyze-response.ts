/**
 * Representa a resposta estruturada retornada pelo endpoint de análise.
 */
export interface AnalyzeResponse {
  /**
   * Um resumo textual da análise gerada pelo agente.
   */
  summary: string;

  /**
   * O número de caracteres do texto de entrada.
   */
  inputLength: number;

  /**
   * O número de caracteres do resumo gerado.
   */
  outputLength: number;

  /**
   * Identificador único da requisição (UUID v4) para rastreabilidade.
   */
  requestId: string;

  /**
   * Data e hora da geração da resposta em formato ISO 8601.
   */
  timestamp: string;

  /**
   * Custo estimado da operação (se aplicável).
   */
  budgetUsed?: number;

  /**
   * Orçamento restante do usuário após a operação.
   */
  budgetRemaining?: number;
}
