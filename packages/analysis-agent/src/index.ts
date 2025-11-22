import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { LLMProvider } from './providers/llm-provider.js';
import { MockProvider } from './providers/mock-provider.js';
import { DeepSeekProvider } from './providers/deepseek-provider.js';
import { v4 as uuidv4 } from 'uuid';

// Personas
import { AnalysisPersona } from './personas/analysis.js';
import { ProductPersona } from './personas/product.js';
import { ArchitectPersona } from './personas/architect.js';
import { EnginePersona } from './personas/engine.js';
// ... importar outras personas conforme necessário no fluxo completo

export { PromptOptimizer } from './utils/prompt-optimizer.js';

function getProvider(): LLMProvider {
  if (process.env.DEEPSEEK_API_KEY) {
    return new DeepSeekProvider(process.env.DEEPSEEK_API_KEY);
  }
  return new MockProvider();
}

/**
 * Orquestrador Principal (Chain of Thought).
 */
export class AnalysisAgent {
  private provider: LLMProvider;

  constructor() {
    this.provider = getProvider();
  }

  async process(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const requestId = uuidv4();
    
    // Instanciar personas
    const analysisPersona = new AnalysisPersona(this.provider);
    const productPersona = new ProductPersona(this.provider);
    const architectPersona = new ArchitectPersona(this.provider);
    const enginePersona = new EnginePersona(this.provider);
    // ... instanciar demais

    // Executar Pipeline (Chain)
    // Passo 1: Análise
    const analysisResult = await analysisPersona.execute(request.text);
    
    // Passo 2: Produto (usa resultado da análise)
    const productResult = await productPersona.execute(analysisResult);

    // Passo 3: Arquitetura
    const archResult = await architectPersona.execute(productResult);

    // Passo 4: Engenharia
    const codeResult = await enginePersona.execute(archResult);

    // Consolidar (Simplificado por enquanto)
    const finalSummary = `Análise: ${typeof analysisResult === 'string' ? analysisResult.slice(0, 50) : 'OK'}... | HUs Geradas | Código Gerado.`;

    // Estimativa de custo (Mock)
    const estimatedCost = 0.01;

    return {
      requestId,
      summary: finalSummary.slice(0, request.maxLen || 500),
      inputLength: request.text.length,
      outputLength: finalSummary.length,
      timestamp: new Date().toISOString(),
      budgetUsed: estimatedCost,
      budgetRemaining: 99.99 
    };
  }
}
