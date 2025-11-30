import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockImplementation(async ({ messages }) => {
        const sys = messages[0]?.content ?? "";
        let content = "{}";
        
        if (sys.includes("Classifique")) {
          content = JSON.stringify({ type: "NEW_PROJECT" });
        } else if (sys.includes("Analista")) {
          content = JSON.stringify({ summary: "Test", complexity: "Baixa", assumptions: [] });
        } else if (sys.includes("Product Owner") || sys.includes("PO")) {
          content = JSON.stringify({ epics: [] });
        } else if (sys.includes("Arquiteto")) {
          content = JSON.stringify({ stack: "TypeScript", manifest: [] });
        } else if (sys.includes("PO Técnico")) {
          content = JSON.stringify({ userStories: [] });
        }
        
        return { choices: [{ message: { content } }] };
      })
    }
  }
};

vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI)
}));

describe('AnalysisAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve instanciar corretamente', () => {
    const agent = new AnalysisAgent('test-key');
    expect(agent).toBeDefined();
  });
  
  it('deve executar o pipeline básico', async () => {
    const agent = new AnalysisAgent('test-key');
    const result = await agent.analyze("Crie um app de teste", {});
    
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('engine');
    expect(result).toHaveProperty('requestId');
    expect(result.analysis.complexity).toBe('Baixa');
  });

  it('deve retornar estrutura completa', async () => {
    const agent = new AnalysisAgent('test-key');
    const result = await agent.analyze("Teste", {});
    
    expect(result.product.userStories).toBeInstanceOf(Array);
    expect(result.engine.files).toBeInstanceOf(Array);
    expect(result.architect).toHaveProperty('stack');
  });
});
