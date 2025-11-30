export interface FileContext {
  path: string;
  purpose?: string;
}

export interface AnalyzeRequest {
  text: string;
  maxLen?: number;
  /** 
   * Contexto do projeto atual para refinamentos.
   * Envia apenas nomes de arquivos e propósitos para economizar tokens.
   */
  currentContext?: {
    files: FileContext[];
    summary?: string;
  };
}
