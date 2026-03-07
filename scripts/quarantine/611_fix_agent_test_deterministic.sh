#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

TEST_FILE="packages/analysis-agent/src/agent.test.ts"

log_info "Reescrevendo testes do Agente com Sequência Determinística..."

cat > "$TEST_FILE" << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

// 1. Hoisting
const mocks = vi.hoisted(() => {
  return {
    generateJSON: vi.fn(),
    generateText: vi.fn()
  };
});

// 2. Mock do Módulo
vi.mock('./services/llm/llm-service', () => {
  return {
    LLMService: vi.fn().mockImplementation(() => ({
      generateJSON: mocks.generateJSON,
      generateText: mocks.generateText
    }))
  };
});

describe('AnalysisAgent (Orchestration)', () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new AnalysisAgent('test-key');
  });

  it('deve detectar intenção de PERGUNTA e retornar resposta de chat', async () => {
    // Sequência Estrita:
    // 1. DetectIntent -> JSON
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ type: "QUESTION", reasoning: "Dúvida" }));
    
    // 2. GenerateText -> String
    mocks.generateText.mockResolvedValueOnce("Resposta do Chat");

    const result: any = await agent.analyze("Como funciona?", { files: [] });

    expect(result.summary).toBe("Resposta do Chat");
    expect(result.fenix.notes).toBe("Chat Response");
  });

  it('deve orquestrar o pipeline completo para NOVOS PROJETOS', async () => {
    // Sequência Estrita do Pipeline v8.0:
    // 1. Detect Intent
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ type: "NEW_PROJECT", reasoning: "Novo app" }));
    
    // 2. Analysis
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ 
        summary: "Resumo App", 
        complexity: "Baixa", 
        assumptions: ["A1"] 
    }));
    
    // 3. Product
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ 
        epics: [{ title: "Epic 1", context: "Ctx", requirements: ["Req 1"] }] 
    }));
    
    // 4. Architecture
    // Importante: Retornar manifesto vazio aqui para que o teste use APENAS os arquivos base do TemplateEngine
    // ou 1 arquivo customizado simples.
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ 
        stack: "Node", 
        manifest: [{ path: "custom.ts", purpose: "Logic", criticality: "Core" }] 
    }));
    
    // 5. Code Generation (Loop)
    // O TemplateEngine injeta 5 arquivos base + 1 customizado = 6 arquivos.
    // Precisamos de 6 respostas de código.
    const codeResponse = JSON.stringify({ path: "file.ts", code: "console.log()", explanation: "ok" });
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // 1
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // 2
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // 3
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // 4
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // 5
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // 6 (custom)

    // 6. HUs Detalhadas
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ 
        userStories: [{ 
            id: "HU-001", title: "Login", priority: "P1", role: "User", action: "Log", benefit: "Access", 
            acceptanceCriteria: [], functionalRequirements: [], securityRequirements: [] 
        }] 
    }));

    const result: any = await agent.analyze("Crie um app", { files: [] });

    // Validações
    expect(result.summary).toBe("Resumo App");
    // Esperamos pelo menos os 5 arquivos base + 1 customizado
    expect(result.engine.files.length).toBeGreaterThanOrEqual(6);
    expect(result.product.userStories[0].title).toBe("Login");
  });
});
EOF

log_ok "Testes reescritos com sequência estrita."

# Rodar teste
log_info "Validando..."
if pnpm --filter @mini-ide/analysis-agent test; then
    log_ok "SUCESSO FINAL: Testes passaram."
else
    echo "FALHA: Testes ainda com erro."
    exit 1
fi

# Pipeline Final
bash ./42_pipeline_checklist.sh
