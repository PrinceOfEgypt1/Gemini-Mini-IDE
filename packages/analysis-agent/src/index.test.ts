import { describe, it, expect } from 'vitest';

describe('@gemini-mini-ide/analysis-agent exports', () => {
  it('deve exportar AnalysisAgent', async () => {
    const module = await import('./index');
    expect(module.AnalysisAgent).toBeDefined();
  });
});
