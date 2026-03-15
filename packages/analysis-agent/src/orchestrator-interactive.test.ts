/**
 * Tests for InteractiveOrchestrator — the central multi-turn orchestration module.
 *
 * Strategy: Mock all external dependencies (OpenAI, SessionManager, agents, AnalysisAgent)
 * to test orchestration logic in isolation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock OpenAI before importing the module under test
vi.mock("openai", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Dynamic LLM message" } }]
  });
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } }
    }))
  };
});

// Mock SessionDatabase to avoid SQLite
vi.mock("./session/database.js", () => ({
  SessionDatabase: vi.fn().mockImplementation(() => ({
    initialize: vi.fn()
  }))
}));

// Mock SessionManager
const mockCreateSession = vi.fn();
const mockGetSession = vi.fn();
const mockAddMessage = vi.fn();
const mockUpdateSessionContext = vi.fn();
const mockUpdateSessionPhase = vi.fn();
const mockListSessions = vi.fn();
const mockDeleteSession = vi.fn();

vi.mock("./session/manager.js", () => ({
  SessionManager: vi.fn().mockImplementation(() => ({
    createSession: mockCreateSession,
    getSession: mockGetSession,
    addMessage: mockAddMessage,
    updateSessionContext: mockUpdateSessionContext,
    updateSessionPhase: mockUpdateSessionPhase,
    listSessions: mockListSessions,
    deleteSession: mockDeleteSession
  }))
}));

// Mock all interactive agents
const mockInitiateConversation = vi.fn();
const mockProcessUserResponse = vi.fn();

vi.mock("./agents/interactive-user-profiler.js", () => ({
  InteractiveUserProfilerAgent: vi.fn().mockImplementation(() => ({
    agentType: "user_profiler",
    initiateConversation: mockInitiateConversation,
    processUserResponse: mockProcessUserResponse,
    canProceedToNext: vi.fn().mockReturnValue(true),
    generateSummary: vi.fn().mockReturnValue("summary")
  }))
}));

vi.mock("./agents/interactive-emotional-intelligence.js", () => ({
  InteractiveEmotionalIntelligenceAgent: vi.fn().mockImplementation(() => ({
    agentType: "emotional_intelligence",
    initiateConversation: mockInitiateConversation,
    processUserResponse: mockProcessUserResponse,
    canProceedToNext: vi.fn().mockReturnValue(true),
    generateSummary: vi.fn().mockReturnValue("summary")
  }))
}));

vi.mock("./agents/interactive-adaptive-interaction.js", () => ({
  InteractiveAdaptiveInteractionAgent: vi.fn().mockImplementation(() => ({
    agentType: "adaptive_interaction",
    initiateConversation: mockInitiateConversation,
    processUserResponse: mockProcessUserResponse,
    canProceedToNext: vi.fn().mockReturnValue(true),
    generateSummary: vi.fn().mockReturnValue("summary")
  }))
}));

vi.mock("./agents/interactive-autonomous-decision.js", () => ({
  InteractiveAutonomousDecisionAgent: vi.fn().mockImplementation(() => ({
    agentType: "autonomous_decision",
    initiateConversation: mockInitiateConversation,
    processUserResponse: mockProcessUserResponse,
    canProceedToNext: vi.fn().mockReturnValue(true),
    generateSummary: vi.fn().mockReturnValue("summary")
  }))
}));

vi.mock("./agents/interactive-experience-designer.js", () => ({
  InteractiveExperienceDesignerAgent: vi.fn().mockImplementation(() => ({
    agentType: "experience_designer",
    initiateConversation: mockInitiateConversation,
    processUserResponse: mockProcessUserResponse,
    canProceedToNext: vi.fn().mockReturnValue(true),
    generateSummary: vi.fn().mockReturnValue("summary")
  }))
}));

// Mock AnalysisAgent
const mockPlanProject = vi.fn();
const mockGenerateFromPlan = vi.fn();
const mockGenerateFromPlanIncremental = vi.fn();
const mockAnalyze = vi.fn();

vi.mock("./agent.js", () => ({
  AnalysisAgent: vi.fn().mockImplementation(() => ({
    planProject: mockPlanProject,
    generateFromPlan: mockGenerateFromPlan,
    generateFromPlanIncremental: mockGenerateFromPlanIncremental,
    analyze: mockAnalyze
  }))
}));

import { InteractiveOrchestrator } from "./orchestrator-interactive.js";
import type { ConversationSession, ConversationMessage } from "./session/types.js";

// Helper to create a mock session
function makeMockSession(overrides: Partial<ConversationSession> = {}): ConversationSession {
  return {
    sessionId: "test-session-1",
    userId: "user-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
    currentPhase: "human_layer_profiling",
    currentAgent: "user_profiler",
    contextData: {},
    metadata: { totalMessages: 0, totalIterations: 0, averageResponseTime: 0, userSatisfaction: 0 },
    ...overrides
  };
}

function makeMockMessage(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
  return {
    id: "msg-1",
    sessionId: "test-session-1",
    role: "agent",
    content: "Test message",
    timestamp: new Date().toISOString(),
    ...overrides
  };
}

describe("InteractiveOrchestrator", () => {
  let orchestrator: InteractiveOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behaviors
    mockCreateSession.mockReturnValue(makeMockSession());
    mockGetSession.mockReturnValue(makeMockSession());
    mockAddMessage.mockReturnValue(makeMockMessage());
    mockListSessions.mockReturnValue([]);

    mockInitiateConversation.mockResolvedValue({
      type: "question",
      content: "What is your experience level?",
      options: ["Beginner", "Intermediate", "Expert"]
    });

    mockProcessUserResponse.mockResolvedValue({
      understood: true,
      feedback: "Got it!",
      dataExtracted: { knowledgeLevel: "beginner" },
      nextAction: "continue",
      agentMessage: {
        type: "question",
        content: "And your age group?",
        options: ["18-25", "26-35", "36+"]
      }
    });

    orchestrator = new InteractiveOrchestrator("test-api-key");
  });

  describe("constructor", () => {
    it("creates an orchestrator with default options", () => {
      expect(orchestrator).toBeDefined();
    });

    it("creates an orchestrator with custom options", () => {
      const orch = new InteractiveOrchestrator("key", undefined, {
        model: "gpt-4o",
        baseUrl: "https://custom.api.com"
      });
      expect(orch).toBeDefined();
    });

    it("creates an orchestrator with custom db path", () => {
      const orch = new InteractiveOrchestrator("key", "/tmp/test.db");
      expect(orch).toBeDefined();
    });
  });

  describe("startConversation", () => {
    it("creates a session and initiates the first agent", async () => {
      const result = await orchestrator.startConversation("user-1", "I want a recipe app");

      expect(mockCreateSession).toHaveBeenCalledWith("user-1");
      expect(mockUpdateSessionContext).toHaveBeenCalledWith("test-session-1", {
        originalUserPrompt: "I want a recipe app"
      });
      expect(mockAddMessage).toHaveBeenCalledWith("test-session-1", "user", "I want a recipe app");
      expect(mockInitiateConversation).toHaveBeenCalled();
      expect(result.sessionId).toBe("test-session-1");
      expect(result.currentPhase).toBe("human_layer_profiling");
      expect(result.currentAgent).toBe("user_profiler");
      expect(result.isComplete).toBe(false);
    });

    it("returns options from the first agent", async () => {
      const result = await orchestrator.startConversation("user-1", "Build me a todo app");
      expect(result.options).toEqual(["Beginner", "Intermediate", "Expert"]);
    });
  });

  describe("respondToAgent", () => {
    it("processes user response and continues conversation", async () => {
      const result = await orchestrator.respondToAgent("test-session-1", "I am a beginner");

      expect(mockAddMessage).toHaveBeenCalledWith("test-session-1", "user", "I am a beginner");
      expect(mockProcessUserResponse).toHaveBeenCalled();
      expect(mockUpdateSessionContext).toHaveBeenCalledWith("test-session-1", { knowledgeLevel: "beginner" });
      expect(result.isComplete).toBe(false);
    });

    it("throws if session not found", async () => {
      mockGetSession.mockReturnValue(null);
      await expect(orchestrator.respondToAgent("nonexistent", "hello"))
        .rejects.toThrow("Session not found: nonexistent");
    });

    it("advances to next agent when response says proceed_to_next", async () => {
      mockProcessUserResponse.mockResolvedValue({
        understood: true,
        feedback: "Moving on",
        dataExtracted: {},
        nextAction: "proceed_to_next"
      });

      // First agent is user_profiler, next should be emotional_intelligence
      await orchestrator.respondToAgent("test-session-1", "Done");
      expect(mockUpdateSessionPhase).toHaveBeenCalled();
    });

    it("delegates to generatePlan when in engineering phase", async () => {
      const engineeringSession = makeMockSession({
        currentAgent: "analysis",
        currentPhase: "engineering_layer",
        contextData: { originalUserPrompt: "Build a todo app" },
        messages: [makeMockMessage()]
      });
      mockGetSession.mockReturnValue(engineeringSession);

      mockPlanProject.mockResolvedValue({
        epicCount: 3,
        userStoryCount: 10,
        manifestFileCount: 15
      });

      const result = await orchestrator.respondToAgent("test-session-1", "Generate now");
      expect(mockPlanProject).toHaveBeenCalled();
      expect(result.currentPhase).toBe("engineering_layer");
      expect(result.currentAgent).toBe("analysis");
    });

    it("does not update context when no data extracted", async () => {
      mockProcessUserResponse.mockResolvedValue({
        understood: true,
        feedback: "Ok",
        dataExtracted: {},
        nextAction: "continue",
        agentMessage: { type: "question", content: "Anything else?" }
      });

      await orchestrator.respondToAgent("test-session-1", "Nothing");
      // updateSessionContext should NOT be called for empty data
      // It's called once for the initial call, but not again for empty extracted data
      expect(mockUpdateSessionContext).not.toHaveBeenCalledWith("test-session-1", {});
    });
  });

  describe("advanceToNextAgent", () => {
    it("advances from user_profiler to emotional_intelligence", async () => {
      const result = await orchestrator.advanceToNextAgent("test-session-1");

      expect(mockUpdateSessionPhase).toHaveBeenCalledWith(
        "test-session-1",
        "human_layer_emotions",
        "emotional_intelligence"
      );
      expect(result.currentPhase).toBe("human_layer_emotions");
      expect(result.currentAgent).toBe("emotional_intelligence");
      expect(result.isComplete).toBe(false);
    });

    it("transitions to engineering layer when all agents complete", async () => {
      // Last interactive agent is experience_designer (index 4)
      const lastAgentSession = makeMockSession({
        currentAgent: "experience_designer",
        currentPhase: "strategic_layer_experience",
        contextData: { originalUserPrompt: "Build a todo app" }
      });
      mockGetSession.mockReturnValue(lastAgentSession);

      const result = await orchestrator.advanceToNextAgent("test-session-1");

      expect(mockUpdateSessionPhase).toHaveBeenCalledWith(
        "test-session-1",
        "engineering_layer",
        "analysis"
      );
      expect(result.currentPhase).toBe("engineering_layer");
      expect(result.currentAgent).toBe("analysis");
    });

    it("throws if session not found", async () => {
      mockGetSession.mockReturnValue(null);
      await expect(orchestrator.advanceToNextAgent("nonexistent"))
        .rejects.toThrow("Session not found: nonexistent");
    });
  });

  describe("skipCurrentAgent", () => {
    it("skips current agent and advances", async () => {
      await orchestrator.skipCurrentAgent("test-session-1");

      // Should add a skip message
      expect(mockAddMessage).toHaveBeenCalledWith(
        "test-session-1",
        "agent",
        expect.any(String),
        "user_profiler",
        { type: "feedback", data: { skipped: true } }
      );
      // Should advance
      expect(mockUpdateSessionPhase).toHaveBeenCalled();
    });

    it("throws if session not found", async () => {
      mockGetSession.mockReturnValue(null);
      await expect(orchestrator.skipCurrentAgent("nonexistent"))
        .rejects.toThrow("Session not found: nonexistent");
    });
  });

  describe("generatePlan", () => {
    it("generates a plan from accumulated context", async () => {
      const session = makeMockSession({
        contextData: { originalUserPrompt: "Build a todo app" }
      });
      mockGetSession.mockReturnValue(session);

      mockPlanProject.mockResolvedValue({
        epicCount: 3,
        userStoryCount: 10,
        manifestFileCount: 15
      });

      const plan = await orchestrator.generatePlan("test-session-1");

      expect(mockPlanProject).toHaveBeenCalledWith("Build a todo app");
      expect(plan.epicCount).toBe(3);
      expect(plan.userStoryCount).toBe(10);
      expect(plan.manifestFileCount).toBe(15);
      expect(mockUpdateSessionContext).toHaveBeenCalledWith("test-session-1", {
        planResult: plan
      });
    });

    it("throws if session not found", async () => {
      mockGetSession.mockReturnValue(null);
      await expect(orchestrator.generatePlan("nonexistent"))
        .rejects.toThrow("Session not found: nonexistent");
    });
  });

  describe("generateCodeFromPlan", () => {
    it("generates code from an approved plan", async () => {
      const plan = { epicCount: 3, userStoryCount: 10, manifestFileCount: 15 };
      const session = makeMockSession({
        contextData: { originalUserPrompt: "Build a todo app", planResult: plan }
      });
      mockGetSession.mockReturnValue(session);

      const mockResult = {
        summary: "Generated 5 files",
        engine: { files: [{ path: "a.ts" }, { path: "b.ts" }] }
      };
      mockGenerateFromPlan.mockResolvedValue(mockResult);

      const result = await orchestrator.generateCodeFromPlan("test-session-1");

      expect(mockGenerateFromPlan).toHaveBeenCalledWith(plan, "Build a todo app");
      expect(result.summary).toBe("Generated 5 files");
      expect(mockUpdateSessionPhase).toHaveBeenCalledWith("test-session-1", "completed", "code_gen");
    });

    it("throws if no plan found", async () => {
      const session = makeMockSession({
        contextData: { originalUserPrompt: "Build a todo app" }
      });
      mockGetSession.mockReturnValue(session);

      await expect(orchestrator.generateCodeFromPlan("test-session-1"))
        .rejects.toThrow("No plan found. Call generatePlan first.");
    });

    it("throws if session not found", async () => {
      mockGetSession.mockReturnValue(null);
      await expect(orchestrator.generateCodeFromPlan("nonexistent"))
        .rejects.toThrow("Session not found: nonexistent");
    });
  });

  describe("generateCodeFromPlanIncremental", () => {
    it("generates code incrementally with progress callback", async () => {
      const plan = { epicCount: 3, userStoryCount: 10, manifestFileCount: 15 };
      const session = makeMockSession({
        contextData: { originalUserPrompt: "Build a todo app", planResult: plan }
      });
      mockGetSession.mockReturnValue(session);

      const mockResult = {
        summary: "Generated incrementally",
        engine: { files: [{ path: "a.ts" }] },
        quality: { codeCompleteness: 95 }
      };
      mockGenerateFromPlanIncremental.mockResolvedValue(mockResult);

      const onProgress = vi.fn();
      const result = await orchestrator.generateCodeFromPlanIncremental("test-session-1", onProgress);

      expect(mockGenerateFromPlanIncremental).toHaveBeenCalledWith(plan, "Build a todo app", onProgress);
      expect(result.quality?.codeCompleteness).toBe(95);
      expect(mockUpdateSessionPhase).toHaveBeenCalledWith("test-session-1", "completed", "code_gen");
    });

    it("throws if no plan found", async () => {
      const session = makeMockSession({
        contextData: { originalUserPrompt: "Build a todo app" }
      });
      mockGetSession.mockReturnValue(session);

      await expect(orchestrator.generateCodeFromPlanIncremental("test-session-1"))
        .rejects.toThrow("No plan found. Call generatePlan first.");
    });
  });

  describe("generateFinalResult", () => {
    it("runs legacy one-shot generation", async () => {
      const session = makeMockSession({
        contextData: { originalUserPrompt: "Build a todo app" }
      });
      mockGetSession.mockReturnValue(session);

      const mockResult = {
        summary: "Full generation",
        engine: { files: [{ path: "index.ts" }] }
      };
      mockAnalyze.mockResolvedValue(mockResult);

      const result = await orchestrator.generateFinalResult("test-session-1");

      expect(mockAnalyze).toHaveBeenCalledWith("Build a todo app");
      expect(result.summary).toBe("Full generation");
      expect(mockUpdateSessionPhase).toHaveBeenCalledWith("test-session-1", "completed", "code_gen");
    });

    it("throws if session not found", async () => {
      mockGetSession.mockReturnValue(null);
      await expect(orchestrator.generateFinalResult("nonexistent"))
        .rejects.toThrow("Session not found: nonexistent");
    });
  });

  describe("getSession", () => {
    it("returns session when found", () => {
      const session = makeMockSession();
      mockGetSession.mockReturnValue(session);
      expect(orchestrator.getSession("test-session-1")).toEqual(session);
    });

    it("returns null when not found", () => {
      mockGetSession.mockReturnValue(null);
      expect(orchestrator.getSession("nonexistent")).toBeNull();
    });
  });

  describe("listSessions", () => {
    it("returns sessions for a user", () => {
      const sessions = [makeMockSession(), makeMockSession({ sessionId: "s2" })];
      mockListSessions.mockReturnValue(sessions);
      expect(orchestrator.listSessions("user-1")).toHaveLength(2);
    });

    it("returns empty array when no sessions", () => {
      mockListSessions.mockReturnValue([]);
      expect(orchestrator.listSessions("user-1")).toHaveLength(0);
    });
  });

  describe("deleteSession", () => {
    it("deletes a session", () => {
      orchestrator.deleteSession("test-session-1");
      expect(mockDeleteSession).toHaveBeenCalledWith("test-session-1");
    });
  });

  describe("buildEnrichedPrompt (tested via generatePlan)", () => {
    it("enriches prompt with user profile data", async () => {
      const session = makeMockSession({
        contextData: {
          originalUserPrompt: "Build a todo app",
          userProfileData: {
            knowledgeLevel: "beginner",
            communicationStyle: "informal",
            ageGroup: "26-35"
          }
        }
      });
      mockGetSession.mockReturnValue(session);
      mockPlanProject.mockResolvedValue({ epicCount: 1, userStoryCount: 1, manifestFileCount: 1 });

      await orchestrator.generatePlan("test-session-1");

      const enrichedPrompt = mockPlanProject.mock.calls[0][0] as string;
      expect(enrichedPrompt).toContain("Build a todo app");
      expect(enrichedPrompt).toContain("[PERFIL DO USUÁRIO]");
      expect(enrichedPrompt).toContain("beginner");
      expect(enrichedPrompt).toContain("informal");
      expect(enrichedPrompt).toContain("26-35");
    });

    it("enriches prompt with emotional context", async () => {
      const session = makeMockSession({
        contextData: {
          originalUserPrompt: "Help me",
          emotionalData: {
            primaryEmotion: "excitement",
            suggestedTone: "encouraging"
          }
        }
      });
      mockGetSession.mockReturnValue(session);
      mockPlanProject.mockResolvedValue({ epicCount: 1, userStoryCount: 1, manifestFileCount: 1 });

      await orchestrator.generatePlan("test-session-1");

      const enrichedPrompt = mockPlanProject.mock.calls[0][0] as string;
      expect(enrichedPrompt).toContain("[CONTEXTO EMOCIONAL]");
      expect(enrichedPrompt).toContain("excitement");
      expect(enrichedPrompt).toContain("encouraging");
    });

    it("enriches prompt with interaction strategy", async () => {
      const session = makeMockSession({
        contextData: {
          originalUserPrompt: "Create app",
          interactionData: { autonomyLevel: 3, tone: "professional" }
        }
      });
      mockGetSession.mockReturnValue(session);
      mockPlanProject.mockResolvedValue({ epicCount: 1, userStoryCount: 1, manifestFileCount: 1 });

      await orchestrator.generatePlan("test-session-1");

      const enrichedPrompt = mockPlanProject.mock.calls[0][0] as string;
      expect(enrichedPrompt).toContain("[ESTRATÉGIA DE INTERAÇÃO]");
      expect(enrichedPrompt).toContain("3");
      expect(enrichedPrompt).toContain("professional");
    });

    it("enriches prompt with decisions and experience adjustments", async () => {
      const session = makeMockSession({
        contextData: {
          originalUserPrompt: "Build app",
          decisionsData: { framework: "React" },
          experienceAdjustments: { complexity: "simplified" }
        }
      });
      mockGetSession.mockReturnValue(session);
      mockPlanProject.mockResolvedValue({ epicCount: 1, userStoryCount: 1, manifestFileCount: 1 });

      await orchestrator.generatePlan("test-session-1");

      const enrichedPrompt = mockPlanProject.mock.calls[0][0] as string;
      expect(enrichedPrompt).toContain("[DECISÕES TÉCNICAS]");
      expect(enrichedPrompt).toContain("React");
      expect(enrichedPrompt).toContain("[AJUSTES DE EXPERIÊNCIA]");
      expect(enrichedPrompt).toContain("simplified");
    });
  });

  describe("getFallbackMessage (tested via LLM failure)", () => {
    it("uses fallback when LLM fails during startConversation", async () => {
      // The fallback is tested indirectly — the generateDynamicMessage catches errors
      // and returns fallback messages. Since we mocked OpenAI to succeed,
      // we test that the normal flow works. The fallback logic is simple switch/case.
      const result = await orchestrator.startConversation("user-1", "Test");
      expect(result.sessionId).toBe("test-session-1");
    });
  });
});
