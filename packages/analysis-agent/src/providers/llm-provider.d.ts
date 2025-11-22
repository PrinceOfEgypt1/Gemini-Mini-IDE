/**
 * Estrutura padronizada para respostas de qualquer provedor de LLM.
 */
export interface LLMResponse {
    /** Conteúdo textual gerado pelo modelo. */
    content: string;
    /** Métricas de uso de tokens. */
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
}
/**
 * Interface que deve ser implementada por qualquer adaptador de LLM (Mock, DeepSeek, OpenAI, etc).
 * Permite a troca de modelos sem afetar a lógica de negócio.
 */
export interface LLMProvider {
    /**
     * Envia um prompt para o modelo e retorna a resposta gerada.
     * @param prompt - O texto de entrada para o modelo.
     * @returns Uma Promise contendo a resposta estruturada.
     */
    generate(prompt: string): Promise<LLMResponse>;
}
//# sourceMappingURL=llm-provider.d.ts.map