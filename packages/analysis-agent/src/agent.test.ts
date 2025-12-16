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
    expect(result.userStories).toHaveLength(1);
    expect(result.engine.files.length).toBeGreaterThan(0);
    // Verifica se a complexidade foi sanitizada corretamente
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.analysis.complexity.level);
  });

  it('deve fazer retry quando User Stories Planner detecta quantidade insuficiente', async () => {
    // Mock que simula retry: primeira chamada retorna poucas HUs, segunda retorna mais
    let callCount = 0;
    const mockCreate = vi.fn().mockImplementation(() => {
      callCount++;

      // Primeira tentativa: retornar poucas histórias (2)
      if (callCount <= 2) {
        return Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                // Analysis fields
                complexity: { level: "HIGH", score: 8, justification: "Complex" },
                coreEntities: ["Entity1", "Entity2"],
                implicitRequirements: ["Req1"],
                assumptions: ["A1"],
                productVision: "Vision",
                epics: [
                  {
                    id: "EPIC-001",
                    title: "Epic 1",
                    category: "CORE",
                    context: "Ctx",
                    requirements: ["Req1", "Req2", "Req3", "Req4", "Req5"],
                    acceptanceCriteria: ["AC1"],
                    priority: "P0",
                    estimatedComplexity: "HIGH"
                  }
                ],
                outOfScope: [],
                risks: [],
                architectureStyle: "Modular",
                stack: {
                  runtime: "Node", language: "TS", framework: "React",
                  testing: "Vitest", documentation: "README",
                  orm: "Prisma", database: "PostgreSQL", cache: "Redis", queue: "BullMQ"
                },
                diagram: "Flow",
                manifest: [
                  { path: "src/index.ts", purpose: "Entry", criticality: "HIGH", category: "APPLICATION" },
                  { path: "src/app.ts", purpose: "App", criticality: "HIGH", category: "APPLICATION" },
                  { path: "README.md", purpose: "Doc", criticality: "LOW", category: "DOCS" }
                ],
                keyDecisions: [],
                securityConsiderations: [],
                scalabilityPath: [],
                // Primeira tentativa: apenas 2 histórias (insuficiente)
                epicId: "EPIC-001",
                epicTitle: "Epic 1",
                userStories: [
                  {
                    id: "US-001",
                    title: "Story 1",
                    description: "Desc",
                    acceptanceCriteria: [{ id: "AC1", scenario: "S1", given: "G", when: "W", then: "T" }],
                    technicalNotes: [],
                    dependencies: [],
                    estimatedPoints: 3,
                    priority: "P0"
                  },
                  {
                    id: "US-002",
                    title: "Story 2",
                    description: "Desc",
                    acceptanceCriteria: [{ id: "AC2", scenario: "S2", given: "G", when: "W", then: "T" }],
                    technicalNotes: [],
                    dependencies: [],
                    estimatedPoints: 5,
                    priority: "P1"
                  }
                ],
                summary: { totalStories: 2, totalPoints: 8, p0Count: 1, p1Count: 1, p2Count: 0 },
                code: "export const test = 'test';",
                path: "test.ts"
              })
            }
          }]
        });
      }

      // Segunda tentativa em diante: retornar mais histórias (8)
      return Promise.resolve({
        choices: [{
          message: {
            content: JSON.stringify({
              // Analysis fields
              complexity: { level: "HIGH", score: 8, justification: "Complex" },
              coreEntities: ["Entity1", "Entity2"],
              implicitRequirements: ["Req1"],
              assumptions: ["A1"],
              productVision: "Vision",
              epics: [
                {
                  id: "EPIC-001",
                  title: "Epic 1",
                  category: "CORE",
                  context: "Ctx",
                  requirements: ["Req1", "Req2", "Req3", "Req4", "Req5"],
                  acceptanceCriteria: ["AC1"],
                  priority: "P0",
                  estimatedComplexity: "HIGH"
                }
              ],
              outOfScope: [],
              risks: [],
              architectureStyle: "Modular",
              stack: {
                runtime: "Node", language: "TS", framework: "React",
                testing: "Vitest", documentation: "README",
                orm: "Prisma", database: "PostgreSQL", cache: "Redis", queue: "BullMQ"
              },
              diagram: "Flow",
              manifest: [
                { path: "src/index.ts", purpose: "Entry", criticality: "HIGH", category: "APPLICATION" },
                { path: "src/app.ts", purpose: "App", criticality: "HIGH", category: "APPLICATION" },
                { path: "README.md", purpose: "Doc", criticality: "LOW", category: "DOCS" }
              ],
              keyDecisions: [],
              securityConsiderations: [],
              scalabilityPath: [],
              // Segunda tentativa: 8 histórias (suficiente)
              epicId: "EPIC-001",
              epicTitle: "Epic 1",
              userStories: Array.from({ length: 8 }, (_, i) => ({
                id: `US-${String(i+1).padStart(3, '0')}`,
                title: `Story ${i+1}`,
                description: "Description",
                acceptanceCriteria: [{
                  id: `AC${i+1}`,
                  scenario: `Scenario ${i+1}`,
                  given: "Given",
                  when: "When",
                  then: "Then"
                }],
                technicalNotes: [],
                dependencies: [],
                estimatedPoints: 3,
                priority: "P1"
              })),
              summary: { totalStories: 8, totalPoints: 24, p0Count: 0, p1Count: 8, p2Count: 0 },
              code: "export const test = 'test';",
              path: "test.ts"
            })
          }
        }]
      });
    });

    // Substituir o mock temporariamente
    const originalCreate = (agent as any).client.chat.completions.create;
    (agent as any).client.chat.completions.create = mockCreate;

    const result = await agent.analyze('Sistema complexo com múltiplos requisitos');

    // Restaurar mock original
    (agent as any).client.chat.completions.create = originalCreate;

    // Validações:
    // 1. Deve ter feito retry (callCount > 2 por causa de múltiplas chamadas)
    expect(callCount).toBeGreaterThan(2);

    // 2. Resultado final deve ter 8 histórias (quantidade adequada)
    expect(result.userStories.length).toBe(8);

    // 3. Deve ter passado pela validação do planner
    expect(result).toHaveProperty('userStories');
    expect(result.userStories.length).toBeGreaterThanOrEqual(3); // Mínimo baseado em heurística
  }, 30000); // Timeout maior para permitir retries
});
