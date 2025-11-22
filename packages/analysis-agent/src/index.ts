import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { LLMProvider } from './providers/llm-provider.js';
import { MockProvider } from './providers/mock-provider.js';
import { DeepSeekProvider } from './providers/deepseek-provider.js';
import { v4 as uuidv4 } from 'uuid';

// Re-exportar utilitários para consumidores
export { PromptOptimizer } from './utils/prompt-optimizer.js';

function getProvider(): LLMProvider {
  if (process.env.DEEPSEEK_API_KEY) {
    return new DeepSeekProvider(process.env.DEEPSEEK_API_KEY);
  }
  return new MockProvider();
}

export class AnalysisAgent {
  private provider: LLMProvider;

  constructor() {
    this.provider = getProvider();
  }

  async process(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const requestId = uuidv4();
    
    const prompt = `Contexto: ${request.text}\n\nInstrução: Gere um JSON com o plano de desenvolvimento.`;

    const llmResult = await this.provider.generate(prompt);
    
    let summary = llmResult.content;
    try {
        const parsed = JSON.parse(llmResult.content);
        summary = parsed.summary || JSON.stringify(parsed);
    } catch {
        // Ignora falha de parse
    }

    if (request.maxLen && summary.length > request.maxLen) {
        summary = summary.substring(0, request.maxLen) + '...';
    }

    const estimatedCost = (llmResult.usage.inputTokens + llmResult.usage.outputTokens) * 0.00001;

    return {
      requestId,
      summary,
      inputLength: request.text.length,
      outputLength: llmResult.content.length,
      timestamp: new Date().toISOString(),
      budgetUsed: estimatedCost,
      budgetRemaining: 100 
    };
  }
}
