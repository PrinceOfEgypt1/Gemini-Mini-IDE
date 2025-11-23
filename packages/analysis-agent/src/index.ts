import { AnalyzeRequest, AnalyzeResponse } from '@mini-ide/shared';
import { LLMProvider } from './providers/llm-provider.js';
import { MockProvider } from './providers/mock-provider.js';
import { DeepSeekProvider } from './providers/deepseek-provider.js';
import { v4 as uuidv4 } from 'uuid';

import { DiscoveryService } from './services/discovery-service.js';
import { GeneratorService } from './services/generator-service.js';

// Personas
import { AnalysisPersona } from './personas/analysis.js';
import { ProductPersona } from './personas/product.js';
import { ArchitectPersona } from './personas/architect.js';
import { EnginePersona } from './personas/engine.js';

export { PromptOptimizer } from './utils/prompt-optimizer.js';
export { DiscoveryService } from './services/discovery-service.js';
export { GeneratorService } from './services/generator-service.js';

function getProvider(): LLMProvider {
  if (process.env.DEEPSEEK_API_KEY) {
    return new DeepSeekProvider(process.env.DEEPSEEK_API_KEY);
  }
  return new MockProvider();
}

export class AnalysisAgent {
  private provider: LLMProvider;
  public discovery: DiscoveryService;
  public generator: GeneratorService;

  constructor() {
    this.provider = getProvider();
    this.discovery = new DiscoveryService(this.provider);
    this.generator = new GeneratorService();
  }

  async process(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const requestId = uuidv4();
    
    const analysisPersona = new AnalysisPersona(this.provider);
    const productPersona = new ProductPersona(this.provider);
    const architectPersona = new ArchitectPersona(this.provider);
    const enginePersona = new EnginePersona(this.provider);

    // 1. Análise
    const analysisResult = await analysisPersona.execute(request.text);
    
    // 2. Produto
    const productResult = await productPersona.execute(analysisResult);

    // 3. Arquitetura
    const archResult = await architectPersona.execute(productResult);

    // 4. Engenharia
    await enginePersona.execute(archResult);

    const finalSummary = `Análise completa. HUs geradas e arquitetura definida.`;
    const estimatedCost = 0.02;

    // Tratamento do resultado LLM com catch preenchido
    const prompt = `Contexto: ${request.text}\n\nInstrução: Gere um plano.`;
    const llmResult = await this.provider.generate(prompt);
    
    let summary = llmResult.content;
    try {
        const parsed = JSON.parse(llmResult.content);
        summary = parsed.summary || JSON.stringify(parsed);
    } catch {
        // Caso o conteúdo não seja JSON, mantém o texto original
    }

    if (request.maxLen && summary.length > request.maxLen) {
        summary = summary.substring(0, request.maxLen) + '...';
    }

    return {
      requestId,
      summary,
      inputLength: request.text.length,
      outputLength: llmResult.content.length,
      timestamp: new Date().toISOString(),
      budgetUsed: estimatedCost,
      budgetRemaining: 99.98
    };
  }
}
export { ConsolidatorService } from './services/consolidator-service';
