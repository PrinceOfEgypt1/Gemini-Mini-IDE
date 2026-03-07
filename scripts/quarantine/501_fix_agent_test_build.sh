#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

TEST_FILE="packages/analysis-agent/src/agent.test.ts"

log_info "Corrigindo tipagem no teste do Agente..."

# Reescreve o arquivo de teste passando o objeto de contexto correto
cat > "$TEST_FILE" << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

// Mock profundo da OpenAI
const mockCreate = vi.fn();
vi.mock('openai', () => {
  return {
    OpenAI: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } }
    }))
  };
});

describe('AnalysisAgent (Business Logic)', () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new AnalysisAgent('test-key');
  });

  it('deve detectar intenção de PERGUNTA e não gerar arquivos', async () => {
    // Simula resposta do Router de Intenção
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ type: "QUESTION", reasoning: "User asked a question" }) } }]
    });
    // Simula resposta do Gerador de Texto
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "O sistema funciona assim..." } }]
    });

    // FIX: Passando { files: [] } para satisfazer a interface ProjectContext
    const result: any = await agent.analyze("Como isso funciona?", { files: [] });

    expect(result.summary).toBe("O sistema funciona assim...");
    expect(result.engine.files).toHaveLength(0);
    expect(result.fenix.notes).toContain("Chat Response");
  });

  it('deve orquestrar o pipeline completo para NOVOS PROJETOS', async () => {
    // 1. Router -> NEW_PROJECT
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ type: "NEW_PROJECT", reasoning: "Build req" }) } }] });
    // 2. Analysis
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ summary: "App Teste", complexity: "Baixa", assumptions: [] }) } }] });
    // 3. Product
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ epics: [{ title: "Epic 1", context: "Ctx", requirements: [] }] }) } }] });
    // 4. Architecture (Manifesto com 1 arquivo)
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ stack: "Node", manifest: [{ path: "index.ts", purpose: "Main", criticality: "Core" }] }) } }] });
    // 5. Factory (Gera o arquivo)
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ path: "index.ts", code: "console.log()", explanation: "ok" }) } }] });
    // 6. HUs Detalhadas
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ userStories: [] }) } }] });

    // FIX: Passando { files: [] } para satisfazer a interface ProjectContext
    const result: any = await agent.analyze("Crie um app", { files: [] });

    expect(result.engine.files).toHaveLength(1);
    expect(result.engine.files[0].path).toBe("index.ts");
    expect(result.architect.stack).toBe("Node");
  });
});
EOF

log_ok "Teste corrigido."

# Validação Final: Reconstruir o pacote problemático
log_info "Verificando build do analysis-agent..."
cd packages/analysis-agent
if ../../node_modules/.bin/tsc -b; then
    log_ok "Build do Agent: SUCESSO"
else
    echo "Erro ainda persiste no build do Agent."
    exit 1
fi
cd ../..

log_info "Executando Pipeline Final..."
bash ./42_pipeline_checklist.sh
