#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

TEST_FILE="packages/analysis-agent/src/agent.test.ts"

log_info "Corrigindo valores de retorno do mock no agent.test.ts..."

cat > "$TEST_FILE" << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

// 1. Hoisting do spy
const mocks = vi.hoisted(() => {
  return {
    generateJSON: vi.fn(),
    generateText: vi.fn()
  };
});

// 2. Mock do LLMService
// O ProjectBuilder chama o LLMService. O LLMService retorna strings (JSONs ou Texto).
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
    // 1. Detect Intent -> Retorna JSON string
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ type: "QUESTION", reasoning: "User asked a question" }));
    // 2. Generate Text Response -> Retorna Texto direto
    mocks.generateText.mockResolvedValueOnce("O sistema funciona assim...");

    const result: any = await agent.analyze("Como isso funciona?", { files: [] });

    expect(result.summary).toBe("O sistema funciona assim...");
    expect(result.engine.files).toHaveLength(0);
    expect(result.fenix.notes).toContain("Chat Response");
  });

  it('deve orquestrar o pipeline completo para NOVOS PROJETOS', async () => {
    // A ordem das chamadas no ProjectBuilder é:
    // Intent -> Analysis -> Product -> Architecture -> Code (x1) -> HUs
    
    // 1. Detect Intent (Agent)
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ type: "NEW_PROJECT", reasoning: "Build req" }));
    
    // 2. Analysis (Builder)
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ summary: "App Teste", complexity: "Baixa", assumptions: [] }));
    
    // 3. Product (Builder)
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ epics: [{ title: "Epic 1", context: "Ctx", requirements: [] }] }));
    
    // 4. Architecture (Builder)
    // O TemplateEngine injeta base, então o Arquiteto pode retornar vazio ou complementar
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ stack: "Node", manifest: [{ path: "custom.ts", purpose: "Custom logic", criticality: "Core" }] }));
    
    // 5. Code Generation (Factory - Loop)
    // O mock será chamado para cada arquivo do manifesto combinado (Base + IA).
    // Vamos configurar um mock que sempre retorna sucesso para simplificar
    mocks.generateJSON.mockResolvedValue(JSON.stringify({ path: "file.ts", code: "console.log('Hello')", explanation: "ok" }));
    
    // Precisamos interceptar a chamada de HUs que ocorre APÓS o loop de código
    // Como mockResolvedValue define o padrão, precisamos de um 'Once' específico para as HUs se quisermos validar o conteúdo,
    // mas como o loop de arquivos é dinâmico (depende do TemplateEngine), é mais seguro deixar o mock genérico responder ao código
    // e sobrescrever apenas a chamada de HUs se conseguirmos prever o índice.
    // Alternativa: O teste de HUs verificará se o array não é nulo.

    // Para garantir que a última chamada (HUs) retorne o formato correto de HUs e não de código:
    // Vamos usar mockImplementation para retornar condicionalmente baseado no prompt (mais robusto)
    
    mocks.generateJSON.mockImplementation((sysPrompt: string) => {
        if (sysPrompt.includes("PO Técnico")) {
            return Promise.resolve(JSON.stringify({ userStories: [{ id: "HU-001", title: "Login", priority: "P1", role: "User", action: "Log", benefit: "Access", acceptanceCriteria: [], functionalRequirements: [], securityRequirements: [] }] }));
        }
        if (sysPrompt.includes("Analista")) { // Fallback para re-execuções
             return Promise.resolve(JSON.stringify({ summary: "App", complexity: "Baixa", assumptions: [] }));
        }
        // Default: Código
        return Promise.resolve(JSON.stringify({ path: "test.ts", code: "code", explanation: "ok" }));
    });

    // Resetamos os mocks específicos anteriores para usar a implementação robusta acima
    mocks.generateJSON.mockClear(); 
    // Re-aplicamos a sequência inicial fixa que é determinística
    mocks.generateJSON
        .mockResolvedValueOnce(JSON.stringify({ type: "NEW_PROJECT", reasoning: "Build req" })) // Intent
        .mockResolvedValueOnce(JSON.stringify({ summary: "App Teste", complexity: "Baixa", assumptions: [] })) // Analysis
        .mockResolvedValueOnce(JSON.stringify({ epics: [{ title: "Epic 1", context: "Ctx", requirements: [] }] })) // Product
        .mockResolvedValueOnce(JSON.stringify({ stack: "Node", manifest: [{ path: "custom.ts", purpose: "Custom", criticality: "Core" }] })); // Architecture

    const result: any = await agent.analyze("Crie um app", { files: [] });

    // Verificações
    // O TemplateEngine (Node/React) tem 8 arquivos base + 1 custom da IA = 9 arquivos
    expect(result.engine.files.length).toBeGreaterThanOrEqual(8);
    
    // Verifica se o manifesto foi respeitado (pelo menos um arquivo base deve estar lá)
    const pkgJson = result.engine.files.find((f: any) => f.path === "package.json");
    expect(pkgJson).toBeDefined();
    
    // Verifica HUs
    expect(result.product.userStories).toBeDefined();
    expect(result.product.userStories.length).toBeGreaterThan(0);
  });
});
EOF

log_ok "Testes corrigidos."

# Rodar testes
log_info "Validando..."
if pnpm --filter @mini-ide/analysis-agent test; then
    log_ok "SUCESSO: Testes do Agente passaram."
else
    echo "FALHA: Testes ainda com erro."
    exit 1
fi

# Pipeline Final
bash ./42_pipeline_checklist.sh
