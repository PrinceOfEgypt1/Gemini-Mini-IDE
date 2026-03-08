#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

TEST_FILE="packages/analysis-agent/src/agent.test.ts"

log_info "Blindando mocks do teste do Agente..."

cat > "$TEST_FILE" << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

// 1. Hoisting dos Spies
const mocks = vi.hoisted(() => {
  const generateJSON = vi.fn();
  // Configuração padrão para evitar undefined
  generateJSON.mockResolvedValue("{}"); 
  
  const generateText = vi.fn();
  generateText.mockResolvedValue("");

  return { generateJSON, generateText };
});

// 2. Mock do Módulo LLMService
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
    // Reseta para o comportamento padrão seguro
    mocks.generateJSON.mockResolvedValue("{}");
    mocks.generateText.mockResolvedValue("");
    agent = new AnalysisAgent('test-key');
  });

  it('deve detectar intenção de PERGUNTA e retornar resposta de chat', async () => {
    // 1. Detect Intent
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ 
        type: "QUESTION", 
        reasoning: "User asked a question" 
    }));
    // 2. Generate Text
    mocks.generateText.mockResolvedValueOnce("O sistema funciona assim...");

    const result: any = await agent.analyze("Como isso funciona?", { files: [] });

    expect(result.summary).toBe("O sistema funciona assim...");
    expect(result.engine.files).toHaveLength(0);
    expect(result.fenix.notes).toBe("Chat Response");
  });

  it('deve orquestrar o pipeline completo para NOVOS PROJETOS', async () => {
    // Configuração da sequência de respostas (Happy Path)
    
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
    // Retorna 1 arquivo customizado. O TemplateEngine vai injetar 5 base = 6 arquivos no total.
    // Isso significa que teremos 6 chamadas de geração de código subsequentes.
    mocks.generateJSON.mockResolvedValueOnce(JSON.stringify({ 
        stack: "Node", 
        manifest: [{ path: "custom.ts", purpose: "Custom Logic", criticality: "Core" }] 
    }));
    
    // 5. Code Generation (Para N arquivos)
    // Usamos mockReturnValue (não Once) para cobrir todas as chamadas de arquivo
    // Mas precisamos diferenciar a chamada de HUs (a última).
    
    // Estratégia: Mock Implementation inteligente
    mocks.generateJSON.mockImplementation(async (sysPrompt: string) => {
        // Se o prompt pede HUs
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
        
        // Se o prompt é de análise/arquitetura (já configurados via Once, mas por segurança)
        if (sysPrompt.includes("Analista")) return JSON.stringify({ summary: "Fallback App", complexity: "Baixa", assumptions: [] });
        if (sysPrompt.includes("Arquiteto")) return JSON.stringify({ stack: "Node", manifest: [] });
        
        // Default: Código (Dev Sênior)
        return JSON.stringify({ 
            path: "file.ts", 
            code: "console.log('Generated')", 
            explanation: "ok" 
        });
    });

    // Re-aplicar os Onces críticos iniciais que sobrescrevem a Implementation
    mocks.generateJSON
        .mockResolvedValueOnce(JSON.stringify({ type: "NEW_PROJECT", reasoning: "Build req" })) // 1. Intent
        .mockResolvedValueOnce(JSON.stringify({ summary: "App Teste", complexity: "Baixa", assumptions: [] })) // 2. Analysis
        .mockResolvedValueOnce(JSON.stringify({ epics: [{ title: "Epic 1", context: "Ctx", requirements: ["Req 1"] }] })) // 3. Product
        .mockResolvedValueOnce(JSON.stringify({ stack: "Node", manifest: [{ path: "custom.ts", purpose: "Custom Logic", criticality: "Core" }] })); // 4. Architecture

    const result: any = await agent.analyze("Crie um app", { files: [] });

    // Validações
    
    // Deve ter arquivos (Base + Custom)
    expect(result.engine.files.length).toBeGreaterThan(0);
    
    // Verifica se o manifesto customizado foi processado
    const customFile = result.engine.files.find((f: any) => f.path === "custom.ts");
    expect(customFile).toBeDefined();
    expect(customFile.code).toBe("console.log('Generated')");
    
    // Verifica HUs
    expect(result.product.userStories).toBeDefined();
    expect(result.product.userStories[0].title).toBe("Login");
  });
});
EOF

log_ok "Teste blindado."

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
