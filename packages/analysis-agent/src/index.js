import { MockProvider } from './providers/mock-provider.js';
import { DeepSeekProvider } from './providers/deepseek-provider.js';
import { v4 as uuidv4 } from 'uuid';
// Factory para escolher o provider
function getProvider() {
    if (process.env.DEEPSEEK_API_KEY) {
        console.log('🔌 Usando Provider: DeepSeek (Real)');
        return new DeepSeekProvider(process.env.DEEPSEEK_API_KEY);
    }
    console.log('🔌 Usando Provider: Mock (Simulado)');
    return new MockProvider();
}
export class AnalysisAgent {
    provider;
    constructor() {
        this.provider = getProvider();
    }
    async process(request) {
        const requestId = uuidv4();
        const startTime = Date.now();
        // Aqui montariamos o prompt complexo com as 8 personas
        // Por enquanto, passamos direto
        const prompt = `Contexto: ${request.text}\n\nInstrução: Gere um JSON com o plano de desenvolvimento.`;
        const llmResult = await this.provider.generate(prompt);
        // Tenta parsear o resultado (se for JSON) ou usa texto cru
        let summary = llmResult.content;
        try {
            const parsed = JSON.parse(llmResult.content);
            summary = parsed.summary || JSON.stringify(parsed);
        }
        catch (e) {
            // Conteúdo não era JSON, usa como string
        }
        // Truncar se necessário
        if (request.maxLen && summary.length > request.maxLen) {
            summary = summary.substring(0, request.maxLen) + '...';
        }
        return {
            requestId,
            summary,
            inputLength: request.text.length,
            outputLength: llmResult.content.length,
            timestamp: new Date().toISOString(),
            budgetUsed: (llmResult.usage.inputTokens + llmResult.usage.outputTokens) * 0.00001, // Custo estimado fictício
            budgetRemaining: 100 // Placeholder
        };
    }
}
//# sourceMappingURL=index.js.map