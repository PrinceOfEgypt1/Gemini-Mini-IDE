#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_TEST_FILE="packages/analysis-agent/src/agent.test.ts"
AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Corrigindo testes do Agente e expandindo documentação..."

# 1. Corrigir o Teste Unitário (agent.test.ts)
# Adicionamos mocks para todas as chamadas e ajustamos a expectativa de arquivos
cat > "$AGENT_TEST_FILE" << 'EOF'
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
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify({ type: "QUESTION", reasoning: "User asked a question" }) } }]
    });
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "O sistema funciona assim..." } }]
    });

    const result: any = await agent.analyze("Como isso funciona?", { files: [] });

    expect(result.summary).toBe("O sistema funciona assim...");
    expect(result.engine.files).toHaveLength(0);
    expect(result.fenix.notes).toContain("Chat Response");
  });

  it('deve orquestrar o pipeline completo para NOVOS PROJETOS', async () => {
    // Sequência de Mocks para cada passo do pipeline:
    
    // 1. Router -> NEW_PROJECT
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ type: "NEW_PROJECT", reasoning: "Build req" }) } }] });
    
    // 2. Analysis
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ summary: "App Teste", complexity: "Baixa", assumptions: [] }) } }] });
    
    // 3. Product
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ epics: [{ title: "Epic 1", context: "Ctx", requirements: [] }] }) } }] });
    
    // 4. Architecture (Manifesto sem README para testar injeção)
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ stack: "Node", manifest: [{ path: "index.ts", purpose: "Main", criticality: "Core" }] }) } }] });
    
    // 5. Factory (Gera o arquivo index.ts)
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ path: "index.ts", code: "console.log()", explanation: "ok" }) } }] });
    
    // 6. Factory (Gera o arquivo README.md injetado)
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ path: "README.md", code: "# Docs", explanation: "ok" }) } }] });
    
    // 7. HUs Detalhadas (Esta chamada estava faltando no mock anterior e causava erro)
    mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ userStories: [] }) } }] });

    const result: any = await agent.analyze("Crie um app", { files: [] });

    // Agora esperamos 2 arquivos (index.ts + README.md injetado)
    expect(result.engine.files).toHaveLength(2);
    expect(result.engine.files.find((f: any) => f.path === "index.ts")).toBeDefined();
    expect(result.engine.files.find((f: any) => f.path === "README.md")).toBeDefined();
    expect(result.architect.stack).toBe("Node");
  });
});
EOF
log_ok "Teste unitário corrigido."

# 2. Melhorar Prompt do Arquiteto (Expandir Docs)
# Vamos instruir o Arquiteto a gerar uma pasta 'docs/' se o projeto for complexo
log_info "Aprimorando prompt de arquitetura no agent.ts..."

# Usamos sed para injetar a instrução de documentação expandida
# Localiza a linha "3. OBRIGATÓRIO: Incluir..." e substitui por regras mais amplas
sed -i 's/3. OBRIGATÓRIO: Incluir "README.md" com documentação detalhada./3. OBRIGATÓRIO: Incluir "README.md" e pasta "docs\/" com documentação técnica (API, Arquitetura)./g' "$AGENT_FILE"

# Atualiza também a lógica de injeção forçada para ser mais abrangente se necessário
# (Mantemos o README.md como fallback mínimo garantido, mas o prompt agora incentiva mais)

log_ok "Prompt de arquitetura atualizado para solicitar 'docs/'."

# 3. Recompilar e Rodar Testes
log_info "Validando correções..."
cd packages/analysis-agent
if ../../node_modules/.bin/tsc -b; then
    log_ok "Build OK"
else
    echo "Erro no Build"
    exit 1
fi

# Rodar apenas o teste corrigido para verificar
if ../../node_modules/.bin/vitest run src/agent.test.ts; then
    log_ok "Testes passaram!"
else
    echo "Testes falharam."
    exit 1
fi
cd ../..

# Pipeline Final
log_info "Executando Pipeline Completa..."
bash ./42_pipeline_checklist.sh
