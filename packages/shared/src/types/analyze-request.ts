/**
 * Representa o corpo da requisição enviada ao endpoint de análise.
 */
export interface AnalyzeRequest {
  /**
   * O texto ou código fonte que será analisado pelo agente.
   * @example "Quero criar um sistema de login em React."
   */
  text: string;

  /**
   * O tamanho máximo permitido para o resumo da resposta (em caracteres).
   * @defaultValue 100
   */
  maxLen?: number;
}
