#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_TEST_FILE="packages/analysis-agent/src/agent.test.ts"

log_info "Corrigindo Mock da OpenAI com vi.hoisted para evitar erros de construtor..."

cat > "$AGENT_TEST_FILE" << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

// 1. Hoisting: Garante que as funções de mock existam antes do vi.mock rodar
const mocks = vi.hoisted(() => {
  return {
    create: vi.fn(),
  };
});

// 2. Mock da OpenAI como uma Classe real
vi.mock('openai', () => {
  return {
    OpenAI: class {
      apiKey: string;
      baseURL?: string;
      chat: any;

      constructor(opts: { apiKey: string; baseURL?: string }) {
        this.apiKey = opts.apiKey;
        this.baseURL = opts.baseURL;
        this.chat = {
          completions: {
            create: mocks.create // Vincula ao spy içado
          }
        };
      }
    }
  };
});

describe('AnalysisAgent (Business Logic)', () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    // Limpa o histórico de chamadas antes de cada teste
    vi.clearAllMocks();
    agent = new AnalysisAgent('test-key');
  });

  it('deve detectar intenção de PERGUNTA e não gerar arquivos', async () => {
    // Configura as respostas em sequência para este teste
    mocks.create
      // 1. Router -> QUESTION
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ type: "QUESTION", reasoning: "User asked a question" }) } }]
      })
      // 2. Text Response (Chat)
      .mockResolvedValueOnce({
        choices: [{ message: { content: "O sistema funciona assim..." } }]
      });

    const result: any = await agent.analyze("Como isso funciona?", { files: [] });

    expect(result.summary).toBe("O sistema funciona assim...");
    expect(result.engine.files).toHaveLength(0);
    expect(result.fenix.notes).toContain("Chat Response");
  });

  it('deve orquestrar o pipeline completo para NOVOS PROJETOS', async () => {
    // Configura as respostas em sequência para o pipeline completo
    mocks.create
      // 1. Router -> NEW_PROJECT
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ type: "NEW_PROJECT", reasoning: "Build req" }) } }] })
      // 2. Analysis
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ summary: "App Teste", complexity: "Baixa", assumptions: [] }) } }] })
      // 3. Product
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ epics: [{ title: "Epic 1", context: "Ctx", requirements: [] }] }) } }] })
      // 4. Architecture (Manifesto sem README, testando a injeção)
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ stack: "Node", manifest: [{ path: "index.ts", purpose: "Main", criticality: "Core" }] }) } }] })
      // 5. Factory: index.ts
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ path: "index.ts", code: "console.log()", explanation: "ok" }) } }] })
      // 6. Factory: README.md (Injetado automaticamente)
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ path: "README.md", code: "# Docs", explanation: "ok" }) } }] })
      // 7. HUs Detalhadas
      .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ userStories: [] }) } }] });

    const result: any = await agent.analyze("Crie um app", { files: [] });

    // Verificações
    expect(result.engine.files).toHaveLength(2); // index.ts + README.md
    expect(result.engine.files.some((f: any) => f.path === "index.ts")).toBe(true);
    expect(result.engine.files.some((f: any) => f.path === "README.md")).toBe(true);
    expect(result.architect.stack).toBe("Node");
  });
});
EOF

log_ok "Teste agent.test.ts corrigido com vi.hoisted."

# Recompilar e testar imediatamente para validar o fix
log_info "Rodando testes do analysis-agent..."
if pnpm --filter @mini-ide/analysis-agent test; then
    log_ok "Testes do Agente PASSARAM!"
else
    echo "Erro: Testes ainda falhando."
    exit 1
fi

# Executar pipeline completo
log_info "Executando Pipeline Final (Checklist)..."
bash ./42_pipeline_checklist.sh
