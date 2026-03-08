#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

# Arquivos
TEST_FILE="packages/analysis-agent/src/index.test.ts"
MOCK_PROVIDER="packages/analysis-agent/src/providers/mock-provider.ts"

log_info "Atualizando Testes e Mocks para compatibilidade com Agent v5.0..."

# 1. Atualizar o Mock Provider para retornar JSONs válidos
# O novo agente espera JSON em todas as etapas. Se o mock retornar texto plano, o Zod falha.
cat > "$MOCK_PROVIDER" << 'EOF'
import { LLMProvider, LLMResponse } from './llm-provider.js';

export class MockProvider implements LLMProvider {
  async generate(prompt: string): Promise<LLMResponse> {
    let content = "{}";

    // Simula Router de Intenção
    if (prompt.includes("Classifique a intenção")) {
       if (prompt.includes("Como funciona") || prompt.includes("O que é")) {
         content = JSON.stringify({ type: "QUESTION", reasoning: "Pergunta do usuário" });
       } else {
         content = JSON.stringify({ type: "NEW_PROJECT", reasoning: "Novo projeto solicitado" });
       }
    }
    // Simula Passo 1: Análise
    else if (prompt.includes("Analista Sênior")) {
      content = JSON.stringify({
        summary: "App de Tarefas",
        complexity: "Média",
        assumptions: ["Usuário único", "Local storage"]
      });
    }
    // Simula Passo 2: Produto
    else if (prompt.includes("Product Owner")) {
      content = JSON.stringify({
        epics: [
          { title: "Gerenciamento de Tarefas", context: "CRUD básico", requirements: ["Criar", "Listar"] }
        ]
      });
    }
    // Simula Passo 3: Arquitetura
    else if (prompt.includes("Arquiteto Sênior")) {
      content = JSON.stringify({
        stack: "Node.js + React",
        manifest: [
          { path: "package.json", purpose: "Config", criticality: "Config" },
          { path: "src/index.ts", purpose: "Entry", criticality: "Core" }
        ]
      });
    }
    // Simula Passo 4: Fábrica de Código
    else if (prompt.includes("Dev Sênior")) {
      content = JSON.stringify({
        path: "src/index.ts",
        code: "console.log('Hello World');",
        explanation: "Ponto de entrada simples."
      });
    }
    // Simula Passo 5: HUs Detalhadas
    else if (prompt.includes("PO Técnico")) {
      content = JSON.stringify({
        userStories: [
          {
            id: "HU-001",
            title: "Criar Tarefa",
            priority: "P0",
            role: "Usuário",
            action: "criar tarefa",
            benefit: "organizar dia",
            acceptanceCriteria: ["Botão visível"],
            functionalRequirements: ["Persistir dados"],
            securityRequirements: ["Validar input"],
            businessContext: "Core feature"
          }
        ]
      });
    }
    // Resposta de Chat (Texto direto, mas o Router encapsula)
    else {
      // Fallback genérico para texto simples
      content = "Resposta do Chat simulada.";
    }

    return {
      content,
      usage: { inputTokens: 10, outputTokens: 20 }
    };
  }
}
EOF
log_ok "MockProvider atualizado com lógica JSON."

# 2. Atualizar o Teste Unitário (index.test.ts)
# Vamos usar o MockProvider real em vez de mockar o OpenAI diretamente aqui, 
# ou ajustar o mock do OpenAI para retornar o que o MockProvider retornaria.
# Para consistência com o script 430, vamos ajustar o mock do OpenAI no teste.

cat > "$TEST_FILE" << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

// Mock da OpenAI que simula o comportamento do MockProvider
const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockImplementation(async ({ messages }) => {
        const system = messages[0].content;
        const user = messages[1].content;
        
        let content = "{}";

        // Router
        if (system.includes("Classifique a intenção")) {
            if (user.includes("Como funciona")) {
                content = JSON.stringify({ type: "QUESTION", reasoning: "Query" });
            } else {
                content = JSON.stringify({ type: "NEW_PROJECT", reasoning: "New" });
            }
        }
        // Steps
        else if (system.includes("Analista")) content = JSON.stringify({ summary: "App Teste", complexity: "Baixa", assumptions: [] });
        else if (system.includes("Product Owner")) content = JSON.stringify({ epics: [{title: "Epic 1", context: "Ctx", requirements: []}] });
        else if (system.includes("Arquiteto")) content = JSON.stringify({ stack: "Test Stack", manifest: [{path: "test.ts", purpose: "Test", criticality: "Core"}] });
        else if (system.includes("Dev Sênior")) content = JSON.stringify({ path: "test.ts", code: "print('hi')", explanation: "test" });
        else if (system.includes("PO Técnico")) content = JSON.stringify({ userStories: [{id: "HU-1", title: "Story 1", priority: "P1", role: "User", action: "Do", benefit: "Value", acceptanceCriteria: [], functionalRequirements: [], securityRequirements: [], businessContext: ""}] });
        else if (system.includes("assistente de engenharia")) content = "Resposta do Chat";

        return {
          choices: [{ message: { content } }]
        };
      })
    }
  }
};

vi.mock('openai', () => ({ OpenAI: vi.fn(() => mockOpenAI) }));

describe('AnalysisAgent (Unit)', () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    agent = new AnalysisAgent('fake-key');
    vi.clearAllMocks();
  });

  it('deve instanciar corretamente', () => {
    expect(agent).toBeDefined();
  });

  it('deve processar uma pergunta simples (Chat Mode)', async () => {
    const result = await agent.analyze("Como funciona?", {});
    
    expect(result.summary).toBe("Resposta do Chat");
    expect(result.engine.files).toHaveLength(0); // Chat não gera arquivos
    expect(result.fenix.notes).toContain("Chat Response");
  });

  it('deve processar um pedido de projeto (Project Mode)', async () => {
    const result = await agent.analyze("Crie um app", {});
    
    expect(result.summary).toBe("App Teste");
    expect(result.engine.files).toHaveLength(1);
    expect(result.engine.files[0].path).toBe("test.ts");
    expect(result.product.userStories).toHaveLength(1);
  });
});
EOF
log_ok "Testes unitários atualizados."

# 3. Recompilar e Rodar Testes
log_info "Validando correções..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b
../../node_modules/.bin/vitest run

log_ok "Correção de QA aplicada."
