import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create: vi.fn() } },
    })),
  };
});

vi.mock("./agents/user-profiler.js", () => ({
  UserProfilerAgent: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      knowledgeLevel: "intermediate",
      estimatedAge: "young_adult_18_30",
      communicationStyle: "conversational",
      domain: "web",
      language: "pt-BR",
      culturalContext: "Brazil",
      urgency: "medium",
      accessibilityNeeds: [],
      autonomyPreference: "collaborate",
      confidence: 0.7,
    }),
  })),
}));

vi.mock("./agents/emotional-intelligence.js", () => ({
  EmotionalIntelligenceAgent: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      primaryEmotion: "curious",
      emotionalIntensity: 0.5,
      motivationalDrivers: ["learn"],
      fears: [],
      needsEncouragement: false,
      needsSimplification: false,
      needsPatience: false,
      suggestedTone: "professional",
      emotionalStrategy: "Standard",
    }),
  })),
}));

vi.mock("./agents/adaptive-interaction.js", () => ({
  AdaptiveInteractionAgent: vi.fn().mockImplementation(() => ({
    createStrategy: vi.fn().mockResolvedValue({
      tone: "collaborative",
      vocabulary: "clear",
      maxMessageLength: "medium",
      useEmojis: false,
      useAnalogies: true,
      useCodeExamples: true,
      autonomyLevel: 0.7,
      questionsToAsk: [],
      questionsToSkip: [],
      suggestGamification: false,
      suggestVisualLearning: false,
      suggestStepByStep: false,
      suggestAudioFeedback: false,
      checkpoints: [],
      fallbackStrategy: "defaults",
    }),
  })),
}));

vi.mock("./agents/autonomous-decision-engine.js", () => ({
  AutonomousDecisionEngine: vi.fn().mockImplementation(() => ({
    decide: vi.fn().mockResolvedValue({
      decisions: [{ category: "stack", decision: "Next.js", rationale: "SSR", alternatives: [], confidence: 0.9, impactIfWrong: "medium" }],
      confidenceLevel: 0.85,
      requiresValidation: false,
      questionsForUser: [],
      internalRationale: "Good choice",
    }),
  })),
}));

vi.mock("./agents/experience-designer.js", () => ({
  ExperienceDesignerAgent: vi.fn().mockImplementation(() => ({
    design: vi.fn().mockResolvedValue({
      experienceVision: "Great experience",
      targetEmotion: "satisfaction",
      userJourney: [],
      gamificationElements: [],
      adaptiveRules: [],
      accessibilityFeatures: [],
      safetyMeasures: [],
      contentStrategy: { tone: "warm", visualStyle: "clean", audioElements: [], interactiveElements: [], culturalAdaptations: [] },
      emotionalDesignPrinciples: [],
    }),
  })),
}));

vi.mock("./agent.js", () => ({
  AnalysisAgent: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      analysis: {
        summary: "Test app",
        complexity: { level: "medium", score: 5, justification: "test" },
        coreEntities: ["User"],
        assumptions: [],
        implicitRequirements: [],
      },
      product: {
        productVision: "Vision",
        epics: [],
        outOfScope: [],
        risks: [],
      },
      architect: {
        stack: { runtime: "Node.js", language: "TypeScript", framework: "Express", orm: "Prisma", database: "PG", testing: "Vitest" },
        architectureStyle: "Hexagonal",
        keyDecisions: [],
        manifest: [],
      },
    }),
  })),
}));

describe("TransformativeOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should execute full pipeline and return combined result", async () => {
    const { TransformativeOrchestrator } = await import("./orchestrator.js");
    const orchestrator = new TransformativeOrchestrator("test-api-key");
    const result = await orchestrator.analyze("Build me a todo app");

    expect(result).toBeDefined();
    expect(result.analysis).toBeDefined();
    expect(result.analysis.summary).toBe("Test app");
    expect(result.product).toBeDefined();
    expect(result.architect).toBeDefined();
    expect(result.transformative).toBeDefined();
    expect(result.transformative.userProfile.knowledgeLevel).toBe("intermediate");
    expect(result.transformative.emotionalContext.primaryEmotion).toBe("curious");
    expect(result.transformative.interactionStrategy.tone).toBe("collaborative");
    expect(result.transformative.autonomousDecisions.decisions).toHaveLength(1);
    expect(result.transformative.experienceDesign.experienceVision).toBe("Great experience");
  });

  it("should expose context via getContext()", async () => {
    const { TransformativeOrchestrator } = await import("./orchestrator.js");
    const orchestrator = new TransformativeOrchestrator("test-api-key");
    await orchestrator.analyze("test prompt");
    const ctx = orchestrator.getContext();
    expect(ctx).toBeDefined();
    expect(ctx.userPrompt).toBe("test prompt");
    expect(ctx.userProfile).toBeDefined();
    expect(ctx.emotionalContext).toBeDefined();
    expect(ctx.interactionStrategy).toBeDefined();
    expect(ctx.autonomousDecisions).toBeDefined();
    expect(ctx.experienceDesign).toBeDefined();
    expect(ctx.analysis).toBeDefined();
  });
});
