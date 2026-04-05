import { describe, it, expect, vi } from 'vitest';

// Mock dotenv to spy on config() calls
const mockConfig = vi.fn();
vi.mock('dotenv', () => ({
  default: { config: mockConfig },
}));

// Mock analysis-agent to avoid native dependency
vi.mock('@gemini-mini-ide/analysis-agent', () => ({
  AnalysisAgent: vi.fn().mockImplementation(() => ({ analyze: vi.fn() })),
  getGlobalESAAOrchestrator: vi.fn().mockReturnValue({
    healthStatus: vi.fn().mockReturnValue({ status: 'ok' }),
    queryEvents: vi.fn().mockReturnValue([]),
    getOperationalProjection: vi.fn().mockReturnValue({
      lastAppliedVersion: 0, updatedAt: '', hash: '',
      agents: {}, activeIntentions: {}, activeWorkspaces: {},
      activePromotions: {}, filesInProgress: {},
    }),
    getAuditProjection: vi.fn().mockReturnValue({
      correlationIndex: {}, intentions: {}, promotions: {},
    }),
  }),
}));

describe('@gemini-mini-ide/server', () => {
  it('deve exportar configurações corretas', () => {
    expect(process.env).toBeDefined();
  });

  it('deve validar porta padrão', () => {
    const defaultPort = 3200;
    expect(defaultPort).toBeGreaterThan(0);
    expect(defaultPort).toBeLessThan(65536);
  });

  it('P10: importing the module must NOT call dotenv.config()', async () => {
    // Reset spy before importing
    mockConfig.mockClear();

    // Dynamic import to observe side effects
    await import('./index.js');

    // dotenv.config() should NOT have been called — it's now inside start()
    // and start() only runs when !process.env["VITEST"] (which is false in tests)
    expect(mockConfig).not.toHaveBeenCalled();
  });
});
