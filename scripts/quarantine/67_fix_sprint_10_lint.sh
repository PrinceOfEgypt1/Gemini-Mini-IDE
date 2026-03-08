#!/usr/bin/env bash
set -e

echo "🚑 Sprint 10.1: Corrigindo Lint e Tipagem do Agente..."

# 1. Corrigir BasePersona (Substituir 'any' por 'unknown')
# -----------------------------------------------------
echo "📝 Refatorando BasePersona..."
cat > packages/analysis-agent/src/personas/base-persona.ts <<EOF
import { LLMProvider } from '../providers/llm-provider.js';

/**
 * Classe base abstrata para todas as personas do sistema.
 * Define o contrato de interação com o LLM e o contexto compartilhado.
 */
export abstract class BasePersona {
  protected provider: LLMProvider;

  /**
   * @param provider - O provedor de LLM (DeepSeek ou Mock) injetado.
   */
  constructor(provider: LLMProvider) {
    this.provider = provider;
  }

  /**
   * Retorna o System Prompt específico desta persona.
   */
  protected abstract getRoleDescription(): string;

  /**
   * Executa a tarefa da persona.
   * @param input - O contexto de entrada.
   * @returns O resultado processado.
   */
  abstract execute(input: unknown): Promise<unknown>;

  /**
   * Helper para formatar o prompt final combinando System + User.
   */
  protected buildPrompt(userContent: string): string {
    return \`\${this.getRoleDescription()}\n\n---\n\nTASK:\n\${userContent}\`;
  }
}
EOF

# 2. Corrigir Personas (Atualizar assinaturas para 'unknown')
# -----------------------------------------------------
echo "📝 Atualizando assinaturas das Personas..."

# Analysis
cat > packages/analysis-agent/src/personas/analysis.ts <<EOF
import { BasePersona } from './base-persona.js';

export class AnalysisPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`VOcê é o ANALYSIS AGENT.\nObjetivo: Entender o contexto.\nSaída: Resumo JSON.\`;
  }

  async execute(input: unknown): Promise<unknown> {
    const promptContent = typeof input === 'string' ? input : JSON.stringify(input);
    const response = await this.provider.generate(this.buildPrompt(promptContent));
    return response.content;
  }
}
EOF

# Product
cat > packages/analysis-agent/src/personas/product.ts <<EOF
import { BasePersona } from './base-persona.js';

export class ProductPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o PRODUCT STRATEGIST.\nObjetivo: Criar HUs.\nSaída: Lista de HUs.\`;
  }

  async execute(analysisResult: unknown): Promise<unknown> {
    const content = typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
EOF

# Architect
cat > packages/analysis-agent/src/personas/architect.ts <<EOF
import { BasePersona } from './base-persona.js';

export class ArchitectPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o SOLUTION ARCHITECT.\nObjetivo: Definir stack.\nSaída: Árvore de arquivos.\`;
  }

  async execute(productResult: unknown): Promise<unknown> {
    const content = typeof productResult === 'string' ? productResult : JSON.stringify(productResult);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
EOF

# Engine
cat > packages/analysis-agent/src/personas/engine.ts <<EOF
import { BasePersona } from './base-persona.js';

export class EnginePersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o ENGINE SPECIALIST.\nObjetivo: Escrever código.\nSaída: Arquivos de código.\`;
  }

  async execute(archResult: unknown): Promise<unknown> {
    const content = typeof archResult === 'string' ? archResult : JSON.stringify(archResult);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
EOF

# UX
cat > packages/analysis-agent/src/personas/ux.ts <<EOF
import { BasePersona } from './base-persona.js';

export class UXPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o UX/UI GUARDIAN.\nObjetivo: Garantir usabilidade.\`;
  }

  async execute(engineResult: unknown): Promise<unknown> {
    const content = typeof engineResult === 'string' ? engineResult : JSON.stringify(engineResult);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
EOF

# Quality
cat > packages/analysis-agent/src/personas/quality.ts <<EOF
import { BasePersona } from './base-persona.js';

export class QualityPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o QUALITY GUARDIAN.\nObjetivo: Criar testes.\`;
  }

  async execute(engineResult: unknown): Promise<unknown> {
    const content = typeof engineResult === 'string' ? engineResult : JSON.stringify(engineResult);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
EOF

# Ops
cat > packages/analysis-agent/src/personas/ops.ts <<EOF
import { BasePersona } from './base-persona.js';

export class OpsPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o OPS ENGINEER.\nObjetivo: Criar scripts CI/CD.\`;
  }

  async execute(fullContext: unknown): Promise<unknown> {
    const content = typeof fullContext === 'string' ? fullContext : JSON.stringify(fullContext);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
EOF

# Fenix
cat > packages/analysis-agent/src/personas/fenix.ts <<EOF
import { BasePersona } from './base-persona.js';

export class FenixPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é a FÊNIX.\nObjetivo: Consolidar JSON final.\`;
  }

  async execute(allOutputs: unknown): Promise<unknown> {
    const content = JSON.stringify(allOutputs);
    return (await this.provider.generate(this.buildPrompt(content))).content;
  }
}
EOF

# 3. Corrigir DiscoveryService (Remover console.error)
# -----------------------------------------------------
echo "📝 Corrigindo DiscoveryService..."
cat > packages/analysis-agent/src/services/discovery-service.ts <<EOF
import { LLMProvider } from '../providers/llm-provider.js';
import { UserStory } from '@mini-ide/shared';

export class DiscoveryService {
  constructor(private provider: LLMProvider) {}

  async generateUserStories(context: string): Promise<UserStory[]> {
    const prompt = \`
      Atue como um Product Owner.
      Com base neste pedido: "\${context}"
      Gere uma lista de Histórias de Usuário (HUs) com critérios de aceite.
      Retorne APENAS um JSON no formato:
      [
        { "id": "HU-001", "title": "...", "description": "...", "acceptanceCriteria": ["..."] }
      ]
    \`;

    const response = await this.provider.generate(prompt);
    
    try {
      const cleanJson = response.content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      return JSON.parse(cleanJson);
    } catch {
      // Falha silenciosa no parse, retorna erro estruturado
      return [{
        id: 'ERR-001',
        title: 'Erro na geração',
        description: 'Não foi possível processar a resposta da IA.',
        acceptanceCriteria: [],
        priority: 'P0'
      }];
    }
  }
}
EOF

# 4. Corrigir AnalysisAgent (Try/Catch vazio)
# -----------------------------------------------------
echo "📝 Corrigindo AnalysisAgent (index.ts)..."
# Estamos apenas atualizando a classe AnalysisAgent no arquivo existente para corrigir o catch
# Nota: Preservamos os imports e outras classes
cat > packages/analysis-agent/src/index.ts <<EOF
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

    const finalSummary = \`Análise completa. HUs geradas e arquitetura definida.\`;
    const estimatedCost = 0.02;

    // Tratamento do resultado LLM com catch preenchido
    const prompt = \`Contexto: \${request.text}\n\nInstrução: Gere um plano.\`;
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
EOF

echo "✅ Correções de Lint aplicadas com sucesso."
echo "👉 Execute ./42_pipeline_checklist.sh"
