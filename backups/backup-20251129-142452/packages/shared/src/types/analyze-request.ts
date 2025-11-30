export interface AnalyzeRequest {
  text: string;
  maxLen?: number;
  /** 
   * Contexto do projeto atual para refinamentos.
   * Envia apenas nomes de arquivos e propósitos para economizar tokens.
   */
  currentContext?: {
    files: Array<{ path: string; purpose?: string }>;
    summary?: string;
  };
}
