/**
 * Utilitário para otimização de prompts antes do envio ao LLM.
 * Reduz custos removendo espaços desnecessários e truncando inputs gigantes.
 */
export class PromptOptimizer {
  /**
   * Compacta e normaliza o texto.
   * 1. Remove espaços extras no início/fim.
   * 2. Substitui múltiplos espaços/quebras de linha por um único espaço.
   * 3. Trunca se exceder o limite de segurança.
   * 
   * @param text - O texto original.
   * @param limit - O limite máximo de caracteres (padrão: 10000).
   * @returns O texto otimizado.
   */
  static optimize(text: string, limit: number = 10000): string {
    if (!text) return '';

    // Normalização básica
    let optimized = text.trim().replace(/\s+/g, ' ');

    // Truncamento de segurança
    if (optimized.length > limit) {
      optimized = optimized.substring(0, limit);
      // console.warn removido para passar no lint estrito, em prod usaríamos logger
    }

    return optimized;
  }
}
