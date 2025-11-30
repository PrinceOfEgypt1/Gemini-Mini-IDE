import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

const mocks = vi.hoisted(() => ({
  generateJSON: vi.fn(),
  generateText: vi.fn()
}));

// [QA Fix] Mock Inteligente da OpenAI (Routing JSON vs Text)
vi.mock('openai', () => {
  const MockClient = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async (params) => {
          // Detecta se o Agente pediu JSON ou Texto
          const isJson = params?.response_format?.type === 'json_object';
          
          // Roteia para a fila de mocks correta
          const result = isJson 
            ? await mocks.generateJSON() 
            : await mocks.generateText();
          
          // Retorna fallback seguro se a fila estiver vazia para evitar crash
          const content = result !== undefined ? result : (isJson ? '{}' : '');

          return {
            choices: [{ message: { content: content } }]
          };
        })
      }
    }
  }));

  return {
    OpenAI: MockClient,
    default: MockClient,
  };
});

// [QA Fix] Mock da OpenAI (Named Export + Default Export)


// [QA Fix] Mockando a biblioteca OpenAI diretamente para evitar chamadas de rede (Erro 401)


vi.mock('./services/llm/llm-service', () => ({
  LLMService: vi.fn().mockImplementation(() => ({
    generateJSON: mocks.generateJSON,
    generateText: mocks.generateText
  }))
}));

describe('AnalysisAgent (Orchestration)', () => {
  // [QA Fix] Aumenta timeout para suportar delays de batching do Agent v4.3
  vi.setConfig({ testTimeout: 30000 });
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
        complexity: "Média", 
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
    expect(result.analysis.complexity).toBe("Média");
    expect(result.engine.files.length).toBe(8);
    expect(result.product.userStories[0].title).toBe("Criar Tarefa");
    expect(result.architect.stack).toBe("Node.js + TypeScript");
  });
});
