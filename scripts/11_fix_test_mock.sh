#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 11_fix_test_mock.sh
# DESCRIÇÃO: Atualiza os mocks de teste para satisfazerem as novas regras de
#            validação rígida (Epics > 0, Manifest > 2).
# AUTOR: Mini-IDE Engine Team
# ==============================================================================

echo ">>> Ajustando Mocks de Teste para Compliance com Validação..."

cat > packages/analysis-agent/src/agent.test.ts << 'EOF'
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent.js';

// MOCK DA OPENAI
// Agora retorna dados válidos que passam nas regras:
// 1. Product: epics.length > 0
// 2. Architecture: manifest.length > 2
vi.mock('openai', () => {
  return {
    default: class {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  // Intent
                  type: "NEW_PROJECT",
                  reasoning: "Test",
                  // Analysis
                  summary: "Test Project",
                  complexity: "Média",
                  assumptions: ["A1"],
                  // Product (Validation: > 0)
                  epics: [
                    { title: "Epic 1", context: "Ctx", requirements: ["Req1"] }
                  ],
                  // Architecture (Validation: > 2 files)
                  stack: "TestStack",
                  diagram: "Flow",
                  manifest: [
                    { path: "README.md", purpose: "Doc", criticality: "Config" },
                    { path: "package.json", purpose: "Config", criticality: "Config" },
                    { path: "src/main.ts", purpose: "Core", criticality: "Core" }
                  ],
                  // Code Gen
                  path: "test.ts",
                  code: "console.log('test')",
                  explanation: "ok",
                  // User Stories
                  userStories: [
                    { 
                      id: "HU-1", title: "Story 1", priority: "P0", role: "User", 
                      action: "Test", benefit: "Value", 
                      acceptanceCriteria: ["AC1"], functionalRequirements: [], 
                      securityRequirements: [], businessContext: "Ctx"
                    }
                  ]
                })
              }
            }]
          })
        }
      }
    }
  }
});

describe('AnalysisAgent', () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    // Usa uma chave dummy
    agent = new AnalysisAgent('test-key');
  });

  it('deve instanciar corretamente', () => {
    expect(agent).toBeDefined();
  });

  it('deve executar o pipeline básico sem erro de validação', async () => {
    // O mock agora satisfaz as validações internas
    const result = await agent.analyze('Criar um projeto de teste');
    
    expect(result).toHaveProperty('analysis');
    expect(result.product.userStories).toHaveLength(1);
    expect(result.engine.files.length).toBeGreaterThan(0);
    // Verifica se a complexidade foi sanitizada corretamente
    expect(['Baixa', 'Média']).toContain(result.analysis.complexity);
  });
});
EOF

echo ">>> Validando Correção..."
pnpm --filter @mini-ide/analysis-agent test

echo "✅ Testes ajustados e passando com Validação Rígida ativa."
EOF
