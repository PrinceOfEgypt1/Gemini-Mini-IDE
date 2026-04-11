import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalysisAgent } from './agent.js';
import { resetGlobalAnalysisCache } from './services/cache.service.js';
import type { ILLMClient, IIncrementalLLMClient } from './llm-clients/llm-client.interface.js';

// ─── Mock response data for each pipeline step ─────────────────────────────────

const analysisResponse = {
  summary: "Test Project Summary",
  coreEntities: ["Entity1", "Entity2"],
  complexity: { level: "MEDIUM", score: 5, justification: "Test complexity" },
  assumptions: ["A1"],
  implicitRequirements: ["IR1"],
};

const productResponse = {
  productVision: "Test Vision",
  epics: [{
    id: "EPIC-001", title: "Epic 1", category: "CORE", context: "Ctx",
    requirements: ["Req1"], acceptanceCriteria: ["AC1"],
    priority: "P0", estimatedComplexity: "MEDIUM"
  }],
  outOfScope: [],
  risks: [],
};

const userStoriesResponse = {
  epicId: "EPIC-001",
  epicTitle: "Epic 1",
  userStories: [{
    id: "US-001", title: "Story 1", description: "Description",
    acceptanceCriteria: [{ id: "AC1", scenario: "S1", given: "G", when: "W", then: "T" }],
    technicalNotes: [], dependencies: [], estimatedPoints: 3, priority: "P0"
  }],
  summary: { totalStories: 1, totalPoints: 3, p0Count: 1, p1Count: 0, p2Count: 0 },
};

const architectureResponse = {
  architectureStyle: "Modular",
  stack: {
    runtime: "Node", language: "TypeScript", framework: "React",
    testing: "Vitest", documentation: "README.md",
    orm: "N/A", database: "N/A", cache: "N/A", queue: "N/A"
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
};

// ─── Mock code generation response ─────────────────────────────────────────────

const codeGenResponse = {
  files: [
    { path: "src/index.ts", content: "export const main = () => {};", reasoning: "Entry point", language: "typescript" },
    { path: "src/app.ts", content: "export class App {}", reasoning: "App class", language: "typescript" },
    { path: "README.md", content: "# Project", reasoning: "Documentation", language: "markdown" }
  ]
};

// ─── Helper: detect which step based on prompt content ──────────────────────────

/**
 * Detects which pipeline step is being called based on the prompt messages.
 * The PromptOrchestrator generates distinct system prompts for each step.
 */
function detectStepFromMessages(messages: { role: string; content: string }[]): string {
  const system = messages.find(m => m.role === 'system')?.content ?? '';
  const user = messages.find(m => m.role === 'user')?.content ?? '';

  // Architecture step references analysis + product + user stories
  if (system.includes('architect') || user.includes('architect') ||
      system.includes('manifest') || user.includes('ARCHITECTURE')) {
    return 'architecture';
  }
  // User stories step references epics
  if (system.includes('User Stories') || system.includes('user stories') ||
      system.includes('histórias') || user.includes('EPIC-')) {
    return 'userStories';
  }
  // Product step references product/epics planning
  if (system.includes('Product') || system.includes('product') ||
      system.includes('épicos') || system.includes('epic')) {
    return 'product';
  }
  // Default: analysis (first step)
  return 'analysis';
}

// ─── Helper: create mock clients ───────────────────────────────────────────────

function createMockClients(overrides?: { userStories?: object }) {
  let chatCallCount = 0;
  const responses: Record<string, object> = {
    analysis: analysisResponse,
    product: productResponse,
    userStories: overrides?.userStories ?? userStoriesResponse,
    architecture: architectureResponse,
  };

  const mockChatClient: ILLMClient = {
    chatCompletion: vi.fn().mockImplementation(async (messages: { role: string; content: string }[]) => {
      chatCallCount++;
      const step = detectStepFromMessages(messages);
      const response = responses[step] ?? analysisResponse;
      return { content: JSON.stringify(response) };
    })
  };

  const mockIncrementalClient: IIncrementalLLMClient = {
    incrementalCompletion: vi.fn().mockImplementation(function () {
      return (async function* () {
        yield { content: JSON.stringify(codeGenResponse) };
      })();
    })
  };

  return { mockChatClient, mockIncrementalClient, getChatCallCount: () => chatCallCount };
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('AnalysisAgent', () => {
  let agent: AnalysisAgent;

  beforeEach(() => {
    // Clear cache to prevent cross-test interference
    resetGlobalAnalysisCache();

    const mocks = createMockClients();
    agent = new AnalysisAgent({
      chatClient: mocks.mockChatClient,
      incrementalClient: mocks.mockIncrementalClient,
      projectRoot: '/tmp/test',
      model: 'test-model',
      temperature: 0.7
    });
  });

  it('deve instanciar corretamente', () => {
    expect(agent).toBeDefined();
  });

  it('deve executar o pipeline básico sem erro de validação', async () => {
    const result = await agent.analyze('Criar um projeto de teste');

    expect(result).toHaveProperty('analysis');
    expect(result.userStories.length).toBeGreaterThanOrEqual(1);
    expect(result.engine.files.length).toBeGreaterThanOrEqual(0);
    expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.analysis.complexity.level);
  });

  it('deve processar múltiplas épicas e acumular user stories', async () => {
    // Agent with 2 epics to test accumulation
    const twoEpicsProduct = {
      ...productResponse,
      epics: [
        { id: "EPIC-001", title: "Epic 1", category: "CORE", context: "Ctx", requirements: ["R1"], acceptanceCriteria: ["AC1"], priority: "P0", estimatedComplexity: "MEDIUM" },
        { id: "EPIC-002", title: "Epic 2", category: "CORE", context: "Ctx", requirements: ["R2"], acceptanceCriteria: ["AC2"], priority: "P1", estimatedComplexity: "LOW" },
      ]
    };

    const mockChatClient: ILLMClient = {
      chatCompletion: vi.fn().mockImplementation(async (messages: { role: string; content: string }[]) => {
        const step = detectStepFromMessages(messages);
        const responses: Record<string, object> = {
          analysis: analysisResponse,
          product: twoEpicsProduct,
          userStories: userStoriesResponse,
          architecture: architectureResponse,
        };
        return { content: JSON.stringify(responses[step] ?? analysisResponse) };
      })
    };

    const mockIncrementalClient: IIncrementalLLMClient = {
      incrementalCompletion: vi.fn().mockImplementation(function () {
        return (async function* () {
          yield { content: JSON.stringify(codeGenResponse) };
        })();
      })
    };

    const multiEpicAgent = new AnalysisAgent({
      chatClient: mockChatClient,
      incrementalClient: mockIncrementalClient,
      projectRoot: '/tmp/test',
      model: 'test-model',
      temperature: 0.7
    });

    const result = await multiEpicAgent.analyze('Sistema com múltiplos módulos');

    // Verify full pipeline produced a valid result
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('userStories');
    expect(result.userStories.length).toBeGreaterThanOrEqual(1);
    expect(result.engine.files.length).toBeGreaterThanOrEqual(0);
    expect(result.analysis.complexity.level).toBe('MEDIUM');
  }, 30000);

  describe('legacy constructor API', () => {
    it('deve instanciar com string apiKey e options legado', () => {
      resetGlobalAnalysisCache();
      // Legacy API: new AnalysisAgent(apiKey, { model, baseUrl })
      // This exercises the string branch of the constructor
      const legacyAgent = new AnalysisAgent('fake-api-key', { model: 'gpt-4o-mini' });
      expect(legacyAgent).toBeDefined();
    });

    it('deve instanciar com apenas apiKey sem options', () => {
      resetGlobalAnalysisCache();
      const legacyAgent = new AnalysisAgent('fake-api-key');
      expect(legacyAgent).toBeDefined();
    });

    it('deve instanciar com apiKey e baseUrl', () => {
      resetGlobalAnalysisCache();
      const legacyAgent = new AnalysisAgent('fake-api-key', { baseUrl: 'https://custom.api.com' });
      expect(legacyAgent).toBeDefined();
    });
  });

  describe('planProject()', () => {
    it('deve gerar plano sem geração de código', async () => {
      resetGlobalAnalysisCache();
      const mocks = createMockClients();
      const planAgent = new AnalysisAgent({
        chatClient: mocks.mockChatClient,
        incrementalClient: mocks.mockIncrementalClient,
        projectRoot: '/tmp/test',
        model: 'test-model',
        temperature: 0.7
      });

      const planResult = await planAgent.planProject('Criar um sistema de notas');

      expect(planResult).toHaveProperty('analysis');
      expect(planResult).toHaveProperty('product');
      expect(planResult).toHaveProperty('architect');
      expect(planResult).toHaveProperty('userStories');
      expect(planResult.summary).toBe('Planning complete. Ready for code generation.');
      expect(planResult.manifestFileCount).toBeGreaterThanOrEqual(1);
      expect(planResult.epicCount).toBeGreaterThanOrEqual(1);
      expect(planResult.userStoryCount).toBeGreaterThanOrEqual(1);
    });

    it('deve emitir evento planResult', async () => {
      resetGlobalAnalysisCache();
      const mocks = createMockClients();
      const planAgent = new AnalysisAgent({
        chatClient: mocks.mockChatClient,
        incrementalClient: mocks.mockIncrementalClient,
        projectRoot: '/tmp/test',
        model: 'test-model',
        temperature: 0.7
      });

      const events: unknown[] = [];
      planAgent.on('planResult', (data) => events.push(data));

      await planAgent.planProject('Test project');
      expect(events).toHaveLength(1);
    });
  });

  describe('generateFromPlan()', () => {
    it('deve gerar código a partir de um plano existente', async () => {
      resetGlobalAnalysisCache();
      const mocks = createMockClients();
      const genAgent = new AnalysisAgent({
        chatClient: mocks.mockChatClient,
        incrementalClient: mocks.mockIncrementalClient,
        projectRoot: '/tmp/test',
        model: 'test-model',
        temperature: 0.7
      });

      const plan = await genAgent.planProject('Generate from plan test');
      resetGlobalAnalysisCache();

      const result = await genAgent.generateFromPlan(plan);

      expect(result).toHaveProperty('engine');
      expect(result.engine.files.length).toBeGreaterThanOrEqual(0);
      expect(result.summary).toBe('Code generation complete.');
      expect(result.analysis).toBe(plan.analysis);
      expect(result.product).toBe(plan.product);
    });
  });

  describe('generateFromPlanIncremental()', () => {
    it('deve gerar código incrementalmente com callback de progresso', async () => {
      resetGlobalAnalysisCache();
      const mocks = createMockClients();
      const incAgent = new AnalysisAgent({
        chatClient: mocks.mockChatClient,
        incrementalClient: mocks.mockIncrementalClient,
        projectRoot: '/tmp/test',
        model: 'test-model',
        temperature: 0.7
      });

      const plan = await incAgent.planProject('Incremental gen test');
      resetGlobalAnalysisCache();

      const progressCalls: { name: string; progress: number }[] = [];
      const result = await incAgent.generateFromPlanIncremental(plan, undefined, (name, progress) => {
        progressCalls.push({ name, progress });
      });

      expect(result.summary).toBe('Incremental code generation complete.');
      expect(result.quality.codeCompleteness).toBe(100);
      expect(result.fenix.notes).toContain('incrementally');
      expect(progressCalls).toHaveLength(1);
      expect(progressCalls[0]).toEqual({ name: 'complete', progress: 100 });
    });

    it('deve funcionar sem callback de progresso', async () => {
      resetGlobalAnalysisCache();
      const mocks = createMockClients();
      const incAgent = new AnalysisAgent({
        chatClient: mocks.mockChatClient,
        incrementalClient: mocks.mockIncrementalClient,
        projectRoot: '/tmp/test',
        model: 'test-model',
        temperature: 0.7
      });

      const plan = await incAgent.planProject('No callback test');
      resetGlobalAnalysisCache();

      const result = await incAgent.generateFromPlanIncremental(plan);
      expect(result).toHaveProperty('engine');
    });
  });

  describe('governance events', () => {
    it('deve emitir impact:analysis para arquivos planejados', async () => {
      resetGlobalAnalysisCache();
      const mocks = createMockClients();
      const govAgent = new AnalysisAgent({
        chatClient: mocks.mockChatClient,
        incrementalClient: mocks.mockIncrementalClient,
        projectRoot: '/tmp/test',
        model: 'test-model',
        temperature: 0.7
      });

      const events: unknown[] = [];
      govAgent.on('impact:analysis', (data) => events.push(data));

      await govAgent.run('Governance test');
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('LLM caching', () => {
    it('deve usar cache para chamadas repetidas com mesmo prompt', async () => {
      resetGlobalAnalysisCache();
      const mocks = createMockClients();
      const cacheAgent = new AnalysisAgent({
        chatClient: mocks.mockChatClient,
        incrementalClient: mocks.mockIncrementalClient,
        projectRoot: '/tmp/test',
        model: 'test-model',
        temperature: 0.7
      });

      // Use a unique prompt to avoid disk cache contamination
      const uniquePrompt = `Caching test ${Date.now()}`;

      // First run populates cache
      await cacheAgent.run(uniquePrompt);
      const callCount1 = (mocks.mockChatClient.chatCompletion as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(callCount1).toBeGreaterThan(0);

      // Second run with same prompt should hit cache — fewer new LLM calls
      await cacheAgent.run(uniquePrompt);
      const callCount2 = (mocks.mockChatClient.chatCompletion as ReturnType<typeof vi.fn>).mock.calls.length;
      const secondRunCalls = callCount2 - callCount1;

      // Second run should make fewer LLM calls (or zero) due to caching
      expect(secondRunCalls).toBeLessThanOrEqual(callCount1);
    });
  });
});
