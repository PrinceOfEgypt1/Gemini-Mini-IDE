#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

TEST_FILE="packages/analysis-agent/src/agent.test.ts"

log_info "Atualizando testes do Agente para a nova arquitetura de serviços..."

cat > "$TEST_FILE" << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';
import { LLMService } from './services/llm/llm-service';

// Mock do LLMService
// Em vez de mockar a OpenAI (detalhe de implementação), mockamos o nosso serviço
vi.mock('./services/llm/llm-service', () => {
  return {
    LLMService: vi.fn().mockImplementation(() => ({
      generateJSON: vi.fn(),
      generateText: vi.fn()
    }))
  };
});

describe('AnalysisAgent (Orchestration)', () => {
  let agent: AnalysisAgent;
  let mockLLM: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Instancia o agente (que cria o LLMService mockado internamente)
    agent = new AnalysisAgent('test-key');
    // Acesso ao mock para configurar respostas
    mockLLM = (agent as any).llm; 
  });

  it('deve detectar intenção de PERGUNTA e retornar resposta de chat', async () => {
    // 1. Detect Intent
    mockLLM.generateJSON.mockResolvedValueOnce(JSON.stringify({ type: "QUESTION", reasoning: "User asked a question" }));
    // 2. Generate Text Response
    mockLLM.generateText.mockResolvedValueOnce("O sistema funciona assim...");

    const result: any = await agent.analyze("Como isso funciona?", { files: [] });

    expect(result.summary).toBe("O sistema funciona assim...");
    expect(result.engine.files).toHaveLength(0);
    expect(result.fenix.notes).toContain("Chat Response");
  });

  it('deve orquestrar o pipeline completo para NOVOS PROJETOS', async () => {
    // Configura a sequência exata de chamadas que o ProjectBuilder fará
    
    // 1. Detect Intent (Agent)
    mockLLM.generateJSON.mockResolvedValueOnce(JSON.stringify({ type: "NEW_PROJECT", reasoning: "Build req" }));
    
    // 2. Analysis (Builder)
    mockLLM.generateJSON.mockResolvedValueOnce(JSON.stringify({ summary: "App Teste", complexity: "Baixa", assumptions: [] }));
    
    // 3. Product (Builder)
    mockLLM.generateJSON.mockResolvedValueOnce(JSON.stringify({ epics: [{ title: "Epic 1", context: "Ctx", requirements: [] }] }));
    
    // 4. Architecture (Builder)
    mockLLM.generateJSON.mockResolvedValueOnce(JSON.stringify({ stack: "Node", manifest: [{ path: "index.ts", purpose: "Main", criticality: "Core" }] }));
    
    // 5. Code Generation (Factory - 1 arquivo)
    mockLLM.generateJSON.mockResolvedValueOnce(JSON.stringify({ path: "index.ts", code: "console.log('Hello')", explanation: "ok" }));
    
    // 6. HUs Detalhadas (Builder)
    mockLLM.generateJSON.mockResolvedValueOnce(JSON.stringify({ userStories: [] }));

    const result: any = await agent.analyze("Crie um app", { files: [] });

    // O manifesto pediu 1 arquivo (index.ts)
    // O TemplateEngine injetou 8 arquivos base (package.json, etc)
    // Total esperado: 9 arquivos
    expect(result.engine.files.length).toBeGreaterThanOrEqual(8);
    
    // Verifica se o arquivo da IA foi gerado
    const indexFile = result.engine.files.find((f: any) => f.path === "index.ts");
    expect(indexFile).toBeDefined();
    expect(indexFile.code).toContain("console.log");
    
    // Verifica se a base foi injetada
    const packageJson = result.engine.files.find((f: any) => f.path === "package.json");
    expect(packageJson).toBeDefined();
  });
});
EOF

log_ok "Testes atualizados para mocks de serviço."

# Rodar o teste específico
log_info "Validando correção..."
if pnpm --filter @mini-ide/analysis-agent test; then
    log_ok "Testes passaram!"
else
    echo "Testes ainda falhando."
    exit 1
fi

# Pipeline Final
log_info "Executando Pipeline Final..."
bash ./42_pipeline_checklist.sh
