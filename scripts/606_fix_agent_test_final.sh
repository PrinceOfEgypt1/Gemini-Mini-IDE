#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

TEST_FILE="packages/analysis-agent/src/agent.test.ts"

log_info "Corrigindo mocks e lógica de teste do Agente..."

cat > "$TEST_FILE" << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

// 1. Hoisting dos Spies
const mocks = vi.hoisted(() => {
  return {
    generateJSON: vi.fn(),
    generateText: vi.fn()
  };
});

// 2. Mock do Módulo LLMService
// O segredo é que o construtor retorna um objeto que aponta para os spies içados
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
    // Sequência:
    // 1. DetectIntent (JSON)
    // 2. GenerateText (String)
    
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ 
        type: "QUESTION", 
        reasoning: "User asked a question" 
    }));
    
    mocks.generateText.mockResolvedValueOnce("O sistema funciona assim...");

    const result: any = await agent.analyze("Como isso funciona?", { files: [] });

    // Validar resultado
    expect(result.summary).toBe("O sistema funciona assim...");
    expect(result.engine.files).toHaveLength(0); // Chat não gera arquivos
    expect(result.fenix.notes).toBe("Chat Response"); // Nota específica do fluxo de chat
  });

  it('deve orquestrar o pipeline completo para NOVOS PROJETOS', async () => {
    // Sequência do ProjectBuilder:
    // 1. DetectIntent (Agent)
    // 2. Analysis (Builder)
    // 3. Product (Builder)
    // 4. Architecture (Builder)
    // 5. Code Generation (Factory - Loop)
    // 6. HUs (Builder)

    // 1. Intent
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ type: "NEW_PROJECT", reasoning: "Build req" }));
    
    // 2. Analysis
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ 
        summary: "App Teste", 
        complexity: "Baixa", 
        assumptions: ["Assumption 1"] 
    }));
    
    // 3. Product
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ 
        epics: [{ title: "Epic 1", context: "Ctx", requirements: ["Req 1"] }] 
    }));
    
    // 4. Architecture
    // Retornamos apenas 1 arquivo customizado. O TemplateEngine vai injetar os base.
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ 
        stack: "Node", 
        manifest: [{ path: "custom.ts", purpose: "Custom Logic", criticality: "Core" }] 
    }));
    
    // 5. Code Generation
    // O mock será chamado para cada arquivo.
    // Como não sabemos quantos arquivos base o TemplateEngine vai injetar exatamente no teste (depende da impl),
    // configuramos um mock default para qualquer chamada subsequente de código.
    mocks.generateJSON.mockResolvedValue(JSON.stringify({ 
        path: "any.ts", 
        code: "console.log('Generated')", 
        explanation: "ok" 
    }));

    // 6. HUs (A última chamada importante)
    // Para garantir que a chamada de HUs retorne HUs e não código, usamos mockImplementation
    // que inspeciona o prompt ou apenas confia na ordem se formos estritos.
    // Vamos forçar o mock a retornar HUs se o prompt parecer de HUs.
    mocks.generateJSON.mockImplementation(async (sysPrompt: string) => {
        if (sysPrompt.includes("PO Técnico")) {
             return JSON.stringify({ 
                 userStories: [{ 
                     id: "HU-001", 
                     title: "Login", 
                     priority: "P1", 
                     role: "User", 
                     action: "Log", 
                     benefit: "Access", 
                     acceptanceCriteria: [], 
                     functionalRequirements: [], 
                     securityRequirements: [] 
                 }] 
             });
        }
        // Fallback para código ou outros passos se o mockResolvedValue acabar
        return JSON.stringify({ path: "file.ts", code: "code", explanation: "ok" });
    });

    // Reinicializa a sequência específica para garantir a ordem correta
    mocks.generateJSON.mockClear();
    mocks.generateJSON
        .mockResolvedValueOnce(JSON.stringify({ type: "NEW_PROJECT", reasoning: "" })) // 1
        .mockResolvedValueOnce(JSON.stringify({ summary: "App", complexity: "Baixa", assumptions: [] })) // 2
        .mockResolvedValueOnce(JSON.stringify({ epics: [{ title: "Epic 1", context: "", requirements: [] }] })) // 3
        .mockResolvedValueOnce(JSON.stringify({ stack: "Node", manifest: [{ path: "custom.ts", purpose: "Custom", criticality: "Core" }] })); // 4
        // As próximas chamadas (código e HUs) cairão na implementação padrão ou mocks subsequentes

    const result: any = await agent.analyze("Crie um app", { files: [] });

    // Validações
    
    // 1. Arquivos: Deve ter os base (package.json) + o customizado
    expect(result.engine.files.length).toBeGreaterThan(1);
    const customFile = result.engine.files.find((f: any) => f.path === "custom.ts");
    expect(customFile).toBeDefined();
    
    // 2. HUs: Deve ter retornado a lista processada
    expect(result.product.userStories).toBeDefined();
    // Nota: Se o mock de HUs não foi chamado corretamente, isso pode falhar. 
    // Mas com a implementação acima, deve funcionar.
  });
});
EOF

log_ok "Testes do Agente reescritos."

# Executar teste
log_info "Rodando testes..."
if pnpm --filter @mini-ide/analysis-agent test; then
    log_ok "SUCESSO: Testes passaram."
else
    echo "FALHA: Testes ainda com erro."
    exit 1
fi

# Pipeline Final
log_info "Executando Pipeline de Checklist..."
bash ./42_pipeline_checklist.sh
