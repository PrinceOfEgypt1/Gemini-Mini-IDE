import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent';

const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn().mockImplementation(async ({ messages }) => {
        const sys = messages[0].content || "";
        let content = "{}";
        if (sys.includes("Classifique")) content = JSON.stringify({ type: "NEW_PROJECT" });
        else if (sys.includes("Analista")) content = JSON.stringify({ summary: "Test", complexity: "Baixa", assumptions: [] });
        else if (sys.includes("PO")) content = JSON.stringify({ epics: [] });
        else if (sys.includes("Arquiteto")) content = JSON.stringify({ stack: "ts", manifest: [] });
        
        return { choices: [{ message: { content } }] };
      })
    }
  }
};

vi.mock('openai', () => ({ OpenAI: vi.fn(() => mockOpenAI) }));

describe('AnalysisAgent', () => {
  it('deve instanciar', () => {
    expect(new AnalysisAgent('k')).toBeDefined();
  });
  
  it('deve executar o pipeline básico', async () => {
    const agent = new AnalysisAgent('k');
    const result = await agent.analyze("Teste", {});
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('engine');
  });
});
