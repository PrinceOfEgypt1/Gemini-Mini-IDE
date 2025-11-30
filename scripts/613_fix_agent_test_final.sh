#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

TEST_FILE="packages/analysis-agent/src/agent.test.ts"

log_info "Corrigindo mocks com contagem exata de arquivos..."

cat > "$TEST_FILE" << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

const mocks = vi.hoisted(() => ({
  generateJSON: vi.fn(),
  generateText: vi.fn()
}));

vi.mock('./services/llm/llm-service', () => ({
  LLMService: vi.fn().mockImplementation(() => ({
    generateJSON: mocks.generateJSON,
    generateText: mocks.generateText
  }))
}));

describe('AnalysisAgent (Orchestration)', () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new AnalysisAgent('test-key');
  });

  it('deve detectar intenção de PERGUNTA e retornar resposta de chat', async () => {
    // Mock 1: detectIntent
    mocks.generateJSON.mockResolvedValueOnce(
      JSON.stringify({ type: "QUESTION", reasoning: "Pergunta tecnica" })
    );
    
    // Mock 2: handleChat usa generateText
    mocks.generateText.mockResolvedValueOnce("Resposta do Chat");

    const result = await agent.analyze("Como funciona?", { files: [] });

    expect(result.summary).toBe("Resposta do Chat");
    expect(result.requestId).toContain("chat-");
    expect(result.engine.files).toEqual([]);
  });

  it('deve orquestrar o pipeline completo para NOVOS PROJETOS', async () => {
    // TOTAL: 13 chamadas ao generateJSON
    
    // Mock 1: detectIntent
    mocks.generateJSON.mockResolvedValueOnce(
      JSON.stringify({ type: "NEW_PROJECT", reasoning: "Novo projeto" })
    );
    
    // Mock 2: stepAnalysis
    mocks.generateJSON.mockResolvedValueOnce(
      JSON.stringify({ 
        summary: "App de Tarefas", 
        complexity: "Media", 
        assumptions: ["REST API"] 
      })
    );
    
    // Mock 3: stepProduct
    mocks.generateJSON.mockResolvedValueOnce(
      JSON.stringify({ 
        epics: [{
          title: "Gestao de Tarefas",
          context: "CRUD completo",
          requirements: ["Criar", "Listar"]
        }]
      })
    );
    
    // Mock 4: stepArchitecture
    // TemplateEngine node-react tem 8 arquivos base
    // Retornamos manifest vazio para usar só os base = 8 arquivos total
    mocks.generateJSON.mockResolvedValueOnce(
      JSON.stringify({ 
        stack: "Node.js + TypeScript",
        manifest: [],
        diagram: "flowchart"
      })
    );
    
    // Mocks 5-12: stepCodeGeneration (8 arquivos base do template)
    const codeJSON = JSON.stringify({
      path: "file.ts",
      code: "export default {}",
      explanation: "OK"
    });
    
    for (let i = 0; i < 8; i++) {
      mocks.generateJSON.mockResolvedValueOnce(codeJSON);
    }
    
    // Mock 13: stepUserStories
    mocks.generateJSON.mockResolvedValueOnce(
      JSON.stringify({
        userStories: [{
          id: "HU-001",
          title: "Criar Tarefa",
          priority: "P1",
          role: "Usuario",
          action: "criar tarefa",
          benefit: "organizar",
          acceptanceCriteria: ["Campo obrigatorio"],
          functionalRequirements: ["API POST"],
          securityRequirements: ["JWT"],
          businessContext: "Produtividade"
        }]
      })
    );

    const result = await agent.analyze("Crie app de tarefas", { files: [] });

    // Validações
    expect(result.summary).toBe("App de Tarefas");
    expect(result.analysis.complexity).toBe("Media");
    expect(result.engine.files.length).toBe(8);
    expect(result.product.userStories[0].title).toBe("Criar Tarefa");
    expect(result.architect.stack).toBe("Node.js + TypeScript");
  });
});
EOF

log_ok "Testes reescritos: 13 mocks totais (1+1+1+1+8+1)."

log_info "Executando testes..."
if pnpm --filter @mini-ide/analysis-agent test; then
    log_ok "✅ SUCESSO TOTAL!"
else
    log_error "❌ Falha. Verificando SmartParser..."
    
    # Diagnóstico extra
    log_info "Verificando se SmartParser precisa de proteção contra undefined..."
    
    cat > packages/analysis-agent/src/modules/parser/smart-parser.ts << 'PARSER_EOF'
import { z } from 'zod';

export class SmartParser {
  static cleanJson(input: string): string {
    // PROTEÇÃO: Se input for undefined/null, retorna objeto vazio
    if (!input) return "{}";
    
    let clean = input.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    if (clean.match(/"[^"]*$/)) clean += '"';

    const openBraces = (clean.match(/{/g) || []).length;
    const closeBraces = (clean.match(/}/g) || []).length;
    const openBrackets = (clean.match(/\[/g) || []).length;
    const closeBrackets = (clean.match(/\]/g) || []).length;

    if (openBraces > closeBraces) clean += '}'.repeat(openBraces - closeBraces);
    if (openBrackets > closeBrackets) clean += ']'.repeat(openBrackets - closeBrackets);

    return clean;
  }

  static parse<T>(content: string, schema: z.ZodType<T>, fallback: T, contextName: string = "Parser"): T {
    try {
      const cleaned = this.cleanJson(content);
      const json = JSON.parse(cleaned);
      return schema.parse(json);
    } catch (error) {
      console.warn(`⚠️ [${contextName}] Falha no parse. Usando fallback.`, error);
      return fallback;
    }
  }
}
PARSER_EOF
    
    log_ok "SmartParser atualizado com proteção contra undefined."
    
    log_info "Rodando testes novamente..."
    pnpm --filter @mini-ide/analysis-agent test
fi
