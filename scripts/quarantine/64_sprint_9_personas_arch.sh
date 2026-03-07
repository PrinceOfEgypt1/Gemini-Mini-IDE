#!/usr/bin/env bash
set -e

echo "🧠 Iniciando Fase 9: Arquitetura de Personas e Orquestração..."

# 1. Criar diretório de personas
mkdir -p packages/analysis-agent/src/personas

# ------------------------------------------------------------------------------
# 2. Base Persona (Classe Abstrata)
# ------------------------------------------------------------------------------
echo "⚙️ Criando BasePersona..."
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
   * Define a "personalidade", regras e formato de saída esperado.
   */
  protected abstract getRoleDescription(): string;

  /**
   * Executa a tarefa da persona.
   * @param input - O contexto de entrada (pode ser o prompt do usuário ou output de outra persona).
   * @returns O resultado processado (geralmente uma string ou objeto JSON).
   */
  abstract execute(input: any): Promise<any>;

  /**
   * Helper para formatar o prompt final combinando System + User.
   */
  protected buildPrompt(userContent: string): string {
    return \`\${this.getRoleDescription()}\n\n---\n\nTASK:\n\${userContent}\`;
  }
}
EOF

# ------------------------------------------------------------------------------
# 3. Implementar as 8 Personas (Estrutura e Prompts)
# ------------------------------------------------------------------------------
echo "🎭 Criando as 8 Personas..."

# 3.1 Analysis
cat > packages/analysis-agent/src/personas/analysis.ts <<EOF
import { BasePersona } from './base-persona.js';

/**
 * Persona 1: Analysis Agent.
 * Responsável por entender o pedido, identificar ambiguidades e resumir objetivos.
 */
export class AnalysisPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`VOcê é o ANALYSIS AGENT.
Seu objetivo: Entender profundamente o contexto e o pedido do usuário.
Saída esperada: Um resumo JSON contendo { "summary": string, "goals": string[], "risks": string[] }.\`;
  }

  async execute(input: string): Promise<any> {
    const response = await this.provider.generate(this.buildPrompt(input));
    // Em produção, aqui haveria um parser de JSON robusto (Zod)
    return response.content;
  }
}
EOF

# 3.2 Product
cat > packages/analysis-agent/src/personas/product.ts <<EOF
import { BasePersona } from './base-persona.js';

/**
 * Persona 2: Product Strategist.
 * Traduz objetivos técnicos em valor de produto e Histórias de Usuário (HUs).
 */
export class ProductPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o PRODUCT STRATEGIST.
Seu objetivo: Criar Histórias de Usuário (HUs) seguindo o padrão GWT.
Saída esperada: Lista de HUs em Markdown ou JSON.\`;
  }

  async execute(analysisResult: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(analysisResult))).content;
  }
}
EOF

# 3.3 Architect
cat > packages/analysis-agent/src/personas/architect.ts <<EOF
import { BasePersona } from './base-persona.js';

/**
 * Persona 3: Solution Architect.
 * Define a stack tecnológica e a estrutura de arquivos.
 */
export class ArchitectPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o SOLUTION ARCHITECT.
Seu objetivo: Definir a arquitetura, stack e estrutura de pastas.
Saída esperada: Árvore de arquivos e lista de dependências.\`;
  }

  async execute(productResult: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(productResult))).content;
  }
}
EOF

# 3.4 Engine
cat > packages/analysis-agent/src/personas/engine.ts <<EOF
import { BasePersona } from './base-persona.js';

/**
 * Persona 4: Engine Specialist.
 * Escreve o código-fonte real.
 */
export class EnginePersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o ENGINE SPECIALIST.
Seu objetivo: Escrever código limpo, tipado e funcional (SOLID/Clean Code).
Saída esperada: O conteúdo dos arquivos de código.\`;
  }

  async execute(archResult: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(archResult))).content;
  }
}
EOF

# 3.5 UX
cat > packages/analysis-agent/src/personas/ux.ts <<EOF
import { BasePersona } from './base-persona.js';

/**
 * Persona 5: UX/UI Guardian.
 * Garante usabilidade e acessibilidade.
 */
export class UXPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o UX/UI GUARDIAN.
Seu objetivo: Garantir acessibilidade (WCAG) e boa experiência.
Saída esperada: Ajustes de CSS, HTML semântico e feedbacks visuais.\`;
  }

  async execute(engineResult: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(engineResult))).content;
  }
}
EOF

# 3.6 Quality
cat > packages/analysis-agent/src/personas/quality.ts <<EOF
import { BasePersona } from './base-persona.js';

/**
 * Persona 6: Quality Guardian.
 * Escreve testes e valida critérios de aceite.
 */
export class QualityPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o QUALITY GUARDIAN.
Seu objetivo: Criar testes unitários (Vitest/Jest) para o código gerado.
Saída esperada: Arquivos .test.ts ou .spec.ts.\`;
  }

  async execute(engineResult: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(engineResult))).content;
  }
}
EOF

# 3.7 Ops
cat > packages/analysis-agent/src/personas/ops.ts <<EOF
import { BasePersona } from './base-persona.js';

/**
 * Persona 7: Observability & Ops.
 * Prepara scripts de deploy, CI/CD e ambiente.
 */
export class OpsPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é o OPS ENGINEER.
Seu objetivo: Criar scripts de automação (Bash) e configurações de CI.
Saída esperada: Scripts .sh e configs de docker/pipeline.\`;
  }

  async execute(fullContext: string): Promise<any> {
    return (await this.provider.generate(this.buildPrompt(fullContext))).content;
  }
}
EOF

# 3.8 Fenix
cat > packages/analysis-agent/src/personas/fenix.ts <<EOF
import { BasePersona } from './base-persona.js';

/**
 * Persona 8: Fênix (Consolidação).
 * Une todos os artefatos em um JSON final coerente.
 */
export class FenixPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`Você é a FÊNIX.
Seu objetivo: Consolidar o trabalho de todas as outras personas em um JSON final válido.
Saída esperada: JSON estrito contendo HUs, Código, Testes e Docs.\`;
  }

  async execute(allOutputs: any): Promise<any> {
    // Aqui combinaríamos os inputs anteriores para formar o prompt final
    const prompt = \`Consolide os seguintes artefatos:\n\${JSON.stringify(allOutputs)}\`;
    return (await this.provider.generate(this.buildPrompt(prompt))).content;
  }
}
EOF

# ------------------------------------------------------------------------------
# 4. Atualizar o Orquestrador (AnalysisAgent)
# ------------------------------------------------------------------------------
echo "🎼 Atualizando o Orquestrador para usar as Personas..."

cat > packages/analysis-agent/src/index.ts <<EOF
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
    const finalSummary = \`Análise: \${typeof analysisResult === 'string' ? analysisResult.slice(0, 50) : 'OK'}... | HUs Geradas | Código Gerado.\`;

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
EOF

# 5. TSDoc para os novos arquivos
# (O script já criou com TSDoc, mas vamos garantir o mock provider atualizado)
# ------------------------------------------------------------------------------
echo "📝 Atualizando MockProvider para suportar prompts complexos..."
cat > packages/analysis-agent/src/providers/mock-provider.ts <<EOF
import { LLMProvider, LLMResponse } from './llm-provider.js';

/**
 * Provedor simulado.
 * Retorna respostas fixas baseadas em palavras-chave do prompt para simular personas.
 */
export class MockProvider implements LLMProvider {
  /**
   * Gera uma resposta simulada dependendo da "Persona" detectada no prompt.
   */
  async generate(prompt: string): Promise<LLMResponse> {
    await new Promise(resolve => setTimeout(resolve, 300)); // Latência menor para testes

    let content = "";

    if (prompt.includes("ANALYSIS AGENT")) {
      content = JSON.stringify({ summary: "Análise concluída", goals: ["Goal 1"] });
    } else if (prompt.includes("PRODUCT STRATEGIST")) {
      content = "HU-001: Como usuário...";
    } else if (prompt.includes("ENGINE SPECIALIST")) {
      content = "console.log('Hello World');";
    } else {
      content = "Processamento genérico realizado.";
    }

    return {
      content,
      usage: { inputTokens: 10, outputTokens: 20 }
    };
  }
}
EOF

echo "✅ Fase 9.1 (Arquitetura de Personas) implementada."
echo "👉 Execute ./42_pipeline_checklist.sh para verificar a integração."
