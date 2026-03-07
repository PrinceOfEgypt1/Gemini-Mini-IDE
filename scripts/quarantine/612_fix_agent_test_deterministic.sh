#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

TEST_FILE="packages/analysis-agent/src/agent.test.ts"

log_info "Corrigindo testes com sequência determinística completa..."

cat > "$TEST_FILE" << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

// 1. Hoisting dos Mocks
const mocks = vi.hoisted(() => {
  return {
    generateJSON: vi.fn(),
    generateText: vi.fn()
  };
});

// 2. Mock do Módulo LLM
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
    // 1. detectIntent() -> generateJSON
    mocks.generateJSON.mockResolvedValueOnce('{"type":"QUESTION","reasoning":"Dúvida técnica"}');
    
    // 2. handleChat() -> generateText
    mocks.generateText.mockResolvedValueOnce("Resposta do Chat");

    const result: any = await agent.analyze("Como funciona?", { files: [] });

    expect(result.summary).toBe("Resposta do Chat");
    expect(result.requestId).toContain("chat-");
    expect(result.engine.files).toEqual([]);
  });

  it('deve orquestrar o pipeline completo para NOVOS PROJETOS', async () => {
    // PIPELINE COMPLETO - 13 chamadas ao generateJSON:
    
    // 1. detectIntent()
    mocks.generateJSON.mockResolvedValueOnce('{"type":"NEW_PROJECT","reasoning":"Criar aplicação"}');
    
    // 2. stepAnalysis()
    mocks.generateJSON.mockResolvedValueOnce('{"summary":"App de Tarefas","complexity":"Média","assumptions":["API REST"]}');
    
    // 3. stepProduct()
    mocks.generateJSON.mockResolvedValueOnce('{"epics":[{"title":"Gestão de Tarefas","context":"CRUD","requirements":["Criar tarefa","Listar tarefas"]}]}');
    
    // 4. stepArchitecture()
    // Retorna 1 arquivo customizado. O TemplateEngine adiciona 5 base = 6 total
    mocks.generateJSON.mockResolvedValueOnce('{"stack":"Node.js + TypeScript","manifest":[{"path":"src/custom-logic.ts","purpose":"Business Logic","criticality":"Core"}],"diagram":"flowchart"}');
    
    // 5-10. stepCodeGeneration() - 6 arquivos (5 base + 1 custom)
    const codeResponse = '{"path":"file.ts","code":"console.log(\\"ok\\");","explanation":"Código gerado"}';
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // index.ts
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // package.json
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // tsconfig.json
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // .gitignore
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // README.md
    mocks.generateJSON.mockResolvedValueOnce(codeResponse); // custom-logic.ts
    
    // 11. stepUserStories()
    mocks.generateJSON.mockResolvedValueOnce('{"userStories":[{"id":"HU-001","title":"Criar Tarefa","priority":"P1","role":"Usuário","action":"criar uma tarefa","benefit":"organizar atividades","acceptanceCriteria":["Campo título obrigatório"],"functionalRequirements":["API POST /tasks"],"securityRequirements":["Autenticação JWT"],"businessContext":"Produtividade"}]}');

    const result: any = await agent.analyze("Crie um app de tarefas", { files: [] });

    // Validações
    expect(result.summary).toBe("App de Tarefas");
    expect(result.analysis.complexity).toBe("Média");
    expect(result.engine.files.length).toBe(6); // 5 base + 1 custom
    expect(result.product.userStories.length).toBe(1);
    expect(result.product.userStories[0].title).toBe("Criar Tarefa");
    expect(result.architect.stack).toBe("Node.js + TypeScript");
  });
});
EOF

log_ok "Testes reescritos com 13 mocks na sequência correta."

# Validação
log_info "Executando testes..."
if pnpm --filter @mini-ide/analysis-agent test; then
    log_ok "✅ SUCESSO: Testes passaram!"
else
    log_error "❌ Testes falharam. Verifique a sequência de mocks."
    exit 1
fi
