import { describe, it, expect, beforeEach } from "vitest";
import { TransformativeContext } from "./transformative-context.js";
import type { UserProfile, EmotionalContext, InteractionStrategy, AutonomousDecisions, ExperienceDesign } from "../types/transformative-schemas.js";
import type { RichAnalysis, RichProductPlan, RichArchitecture, RichUserStory, GeneratedFile } from "../types/rich-schemas.js";

function makeUserProfile(): UserProfile {
  return {
    knowledgeLevel: "intermediate",
    estimatedAge: "young_adult_18_30",
    communicationStyle: "conversational",
    domain: "web",
    language: "pt-BR",
    culturalContext: "Brazil",
    urgency: "medium",
    accessibilityNeeds: ["screen-reader"],
    autonomyPreference: "collaborate",
    confidence: 0.8,
  };
}

function makeEmotionalContext(): EmotionalContext {
  return {
    primaryEmotion: "curious",
    emotionalIntensity: 0.6,
    motivationalDrivers: ["learn", "grow"],
    fears: ["failure"],
    needsEncouragement: true,
    needsSimplification: false,
    needsPatience: false,
    suggestedTone: "encouraging",
    emotionalStrategy: "Be supportive",
  };
}

function makeInteractionStrategy(): InteractionStrategy {
  return {
    tone: "friendly",
    vocabulary: "clear",
    maxMessageLength: "medium",
    useEmojis: true,
    useAnalogies: true,
    useCodeExamples: false,
    autonomyLevel: 0.7,
    questionsToAsk: [],
    questionsToSkip: [],
    suggestGamification: true,
    suggestVisualLearning: true,
    suggestStepByStep: true,
    suggestAudioFeedback: false,
    checkpoints: ["after setup"],
    fallbackStrategy: "use defaults",
  };
}

function makeAutonomousDecisions(): AutonomousDecisions {
  return {
    decisions: [
      { category: "stack", decision: "Use React", rationale: "Popular", alternatives: ["Vue"], confidence: 0.9, impactIfWrong: "medium" },
    ],
    confidenceLevel: 0.85,
    requiresValidation: false,
    questionsForUser: [],
    internalRationale: "Based on user profile",
  };
}

function makeExperienceDesign(): ExperienceDesign {
  return {
    experienceVision: "Delightful learning experience",
    targetEmotion: "joy",
    userJourney: [
      { name: "Onboarding", objective: "Welcome", emotionalGoal: "Feel safe", interactions: ["intro"], successCriteria: ["understands"], failsafeActions: ["retry"] },
    ],
    gamificationElements: [
      { type: "reward", description: "Badge earned", trigger: "task complete", psychologicalEffect: "motivation" },
    ],
    adaptiveRules: [
      { condition: "user stuck", action: "simplify", rationale: "reduce frustration" },
    ],
    accessibilityFeatures: ["high contrast"],
    safetyMeasures: ["no tracking"],
    contentStrategy: { tone: "warm", visualStyle: "clean", audioElements: [], interactiveElements: ["buttons"], culturalAdaptations: [] },
    emotionalDesignPrinciples: ["Empathy", "Clarity"],
  };
}

function makeAnalysis(): RichAnalysis {
  return {
    summary: "Test analysis summary",
    complexity: { level: "MEDIUM", score: 5, justification: "test" },
    coreEntities: ["User", "Order"],
    assumptions: ["a1"],
    implicitRequirements: ["ir1"],
  } as RichAnalysis;
}

function makeProduct(): RichProductPlan {
  return {
    productVision: "Best product",
    epics: [{ id: "E1", title: "Epic One", category: "CORE", priority: "P0", context: "ctx", estimatedComplexity: "MEDIUM", requirements: [], acceptanceCriteria: [] }],
    outOfScope: ["mobile"],
    risks: [],
  } as RichProductPlan;
}

function makeArchitecture(): RichArchitecture {
  return {
    stack: { runtime: "Node.js", language: "TypeScript", framework: "Express", orm: "Prisma", database: "PG", cache: "N/A", queue: "N/A", testing: "Vitest", documentation: "README.md" },
    architectureStyle: "Clean",
    diagram: "",
    keyDecisions: [{ decision: "DDD", rationale: "separation" }],
    manifest: [{ path: "src/index.ts", purpose: "Entry", criticality: "HIGH", category: "DOMAIN" }],
    securityConsiderations: [],
    scalabilityPath: [],
  } as RichArchitecture;
}

describe("TransformativeContext", () => {
  let ctx: TransformativeContext;

  beforeEach(() => {
    ctx = new TransformativeContext();
  });

  describe("start()", () => {
    it("should reset all layers", () => {
      ctx.start("test prompt");
      expect(ctx.userPrompt).toBe("test prompt");
      expect(ctx.userProfile).toBeNull();
      expect(ctx.emotionalContext).toBeNull();
      expect(ctx.interactionStrategy).toBeNull();
      expect(ctx.autonomousDecisions).toBeNull();
      expect(ctx.experienceDesign).toBeNull();
      expect(ctx.analysis).toBeNull();
      expect(ctx.product).toBeNull();
      expect(ctx.architecture).toBeNull();
      expect(ctx.userStories).toEqual([]);
      expect(ctx.generatedFiles).toEqual([]);
    });

    it("should clear previous data on second call", () => {
      ctx.start("first");
      ctx.setUserProfile(makeUserProfile());
      ctx.setAnalysis(makeAnalysis());
      ctx.start("second");
      expect(ctx.userProfile).toBeNull();
      expect(ctx.analysis).toBeNull();
      expect(ctx.userPrompt).toBe("second");
    });
  });

  describe("human layer setters/getters", () => {
    it("should set and get user profile", () => {
      const profile = makeUserProfile();
      ctx.setUserProfile(profile);
      expect(ctx.userProfile).toBe(profile);
    });

    it("should set and get emotional context", () => {
      const ec = makeEmotionalContext();
      ctx.setEmotionalContext(ec);
      expect(ctx.emotionalContext).toBe(ec);
    });

    it("should set and get interaction strategy", () => {
      const strategy = makeInteractionStrategy();
      ctx.setInteractionStrategy(strategy);
      expect(ctx.interactionStrategy).toBe(strategy);
    });
  });

  describe("strategic layer setters/getters", () => {
    it("should set and get autonomous decisions", () => {
      const decisions = makeAutonomousDecisions();
      ctx.setAutonomousDecisions(decisions);
      expect(ctx.autonomousDecisions).toBe(decisions);
    });

    it("should set and get experience design", () => {
      const design = makeExperienceDesign();
      ctx.setExperienceDesign(design);
      expect(ctx.experienceDesign).toBe(design);
    });
  });

  describe("engineering layer setters/getters", () => {
    it("should set and get analysis", () => {
      const a = makeAnalysis();
      ctx.setAnalysis(a);
      expect(ctx.analysis).toBe(a);
    });

    it("should set and get product", () => {
      const p = makeProduct();
      ctx.setProduct(p);
      expect(ctx.product).toBe(p);
    });

    it("should set and get architecture", () => {
      const arch = makeArchitecture();
      ctx.setArchitecture(arch);
      expect(ctx.architecture).toBe(arch);
    });

    it("should accumulate user stories", () => {
      ctx.addUserStories([{ id: "US-1" } as RichUserStory]);
      ctx.addUserStories([{ id: "US-2" } as RichUserStory]);
      expect(ctx.userStories).toHaveLength(2);
    });

    it("should accumulate generated files", () => {
      ctx.addGeneratedFile({ path: "a.ts" } as GeneratedFile);
      ctx.addGeneratedFile({ path: "b.ts" } as GeneratedFile);
      expect(ctx.generatedFiles).toHaveLength(2);
    });

    it("should track elapsed time", () => {
      ctx.start("test");
      expect(ctx.elapsedMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("buildHumanLayerContext()", () => {
    it("should return empty when no data", () => {
      expect(ctx.buildHumanLayerContext()).toBe("");
    });

    it("should include user profile", () => {
      ctx.setUserProfile(makeUserProfile());
      const result = ctx.buildHumanLayerContext();
      expect(result).toContain("PERFIL DO USUÁRIO");
      expect(result).toContain("intermediate");
      expect(result).toContain("screen-reader");
    });

    it("should include emotional context", () => {
      ctx.setEmotionalContext(makeEmotionalContext());
      const result = ctx.buildHumanLayerContext();
      expect(result).toContain("CONTEXTO EMOCIONAL");
      expect(result).toContain("curious");
      expect(result).toContain("failure");
    });

    it("should include interaction strategy", () => {
      ctx.setInteractionStrategy(makeInteractionStrategy());
      const result = ctx.buildHumanLayerContext();
      expect(result).toContain("ESTRATÉGIA DE INTERAÇÃO");
      expect(result).toContain("friendly");
    });

    it("should handle empty accessibility needs", () => {
      const profile = makeUserProfile();
      profile.accessibilityNeeds = [];
      ctx.setUserProfile(profile);
      const result = ctx.buildHumanLayerContext();
      expect(result).toContain("nenhuma");
    });

    it("should handle empty fears", () => {
      const ec = makeEmotionalContext();
      ec.fears = [];
      ctx.setEmotionalContext(ec);
      const result = ctx.buildHumanLayerContext();
      expect(result).toContain("nenhum");
    });
  });

  describe("buildDecisionsContext()", () => {
    it("should return empty when no decisions", () => {
      expect(ctx.buildDecisionsContext()).toBe("");
    });

    it("should format decisions", () => {
      ctx.setAutonomousDecisions(makeAutonomousDecisions());
      const result = ctx.buildDecisionsContext();
      expect(result).toContain("DECISÕES AUTÔNOMAS");
      expect(result).toContain("Use React");
      expect(result).toContain("Based on user profile");
    });
  });

  describe("buildExperienceContext()", () => {
    it("should return empty when no design", () => {
      expect(ctx.buildExperienceContext()).toBe("");
    });

    it("should format experience design with all sections", () => {
      ctx.setExperienceDesign(makeExperienceDesign());
      const result = ctx.buildExperienceContext();
      expect(result).toContain("DESIGN DE EXPERIÊNCIA");
      expect(result).toContain("Delightful learning experience");
      expect(result).toContain("Onboarding");
      expect(result).toContain("Badge earned");
      expect(result).toContain("user stuck");
      expect(result).toContain("high contrast");
      expect(result).toContain("no tracking");
      expect(result).toContain("Empathy");
    });

    it("should handle empty gamification and rules", () => {
      const design = makeExperienceDesign();
      design.gamificationElements = [];
      design.adaptiveRules = [];
      ctx.setExperienceDesign(design);
      const result = ctx.buildExperienceContext();
      expect(result).toContain("Sem elementos de gamificação");
      expect(result).toContain("Sem regras adaptativas");
    });
  });

  describe("buildEnrichedProductContext()", () => {
    it("should include analysis and human layer", () => {
      ctx.start("build me an app");
      ctx.setAnalysis(makeAnalysis());
      ctx.setUserProfile(makeUserProfile());
      ctx.setAutonomousDecisions(makeAutonomousDecisions());
      const result = ctx.buildEnrichedProductContext();
      expect(result).toContain("ANÁLISE TÉCNICA");
      expect(result).toContain("PERFIL DO USUÁRIO");
      expect(result).toContain("DECISÕES AUTÔNOMAS");
      expect(result).toContain("build me an app");
    });

    it("should work with minimal data", () => {
      ctx.start("simple request");
      const result = ctx.buildEnrichedProductContext();
      expect(result).toContain("simple request");
    });
  });

  describe("buildEnrichedArchitectureContext()", () => {
    it("should combine all layers", () => {
      ctx.start("my app");
      ctx.setUserProfile(makeUserProfile());
      ctx.setAutonomousDecisions(makeAutonomousDecisions());
      ctx.setAnalysis(makeAnalysis());
      ctx.setProduct(makeProduct());
      ctx.setExperienceDesign(makeExperienceDesign());
      const result = ctx.buildEnrichedArchitectureContext();
      expect(result).toContain("my app");
      expect(result).toContain("PERFIL DO USUÁRIO");
      expect(result).toContain("ANÁLISE");
      expect(result).toContain("PRODUTO");
      expect(result).toContain("Epic One");
      expect(result).toContain("DESIGN DE EXPERIÊNCIA");
    });
  });

  describe("buildEnrichedCodeGenContext()", () => {
    it("should include stack info", () => {
      ctx.setArchitecture(makeArchitecture());
      const result = ctx.buildEnrichedCodeGenContext("src/index.ts");
      expect(result).toContain("Node.js");
      expect(result).toContain("Clean");
      expect(result).toContain("Entry");
    });

    it("should include generated files", () => {
      ctx.setArchitecture(makeArchitecture());
      ctx.addGeneratedFile({ path: "src/utils.ts" } as GeneratedFile);
      const result = ctx.buildEnrichedCodeGenContext("src/index.ts");
      expect(result).toContain("src/utils.ts");
    });

    it("should include user profile context", () => {
      ctx.setArchitecture(makeArchitecture());
      ctx.setUserProfile(makeUserProfile());
      const result = ctx.buildEnrichedCodeGenContext("src/index.ts");
      expect(result).toContain("CONTEXTO DO USUÁRIO");
      expect(result).toContain("intermediate");
    });

    it("should include experience design", () => {
      ctx.setArchitecture(makeArchitecture());
      ctx.setExperienceDesign(makeExperienceDesign());
      const result = ctx.buildEnrichedCodeGenContext("src/index.ts");
      expect(result).toContain("EXPERIÊNCIA ESPERADA");
      expect(result).toContain("Badge earned");
    });

    it("should handle experience without gamification", () => {
      ctx.setArchitecture(makeArchitecture());
      const design = makeExperienceDesign();
      design.gamificationElements = [];
      ctx.setExperienceDesign(design);
      const result = ctx.buildEnrichedCodeGenContext("src/index.ts");
      expect(result).not.toContain("Gamificação:");
    });

    it("should include analysis summary", () => {
      ctx.setAnalysis(makeAnalysis());
      const result = ctx.buildEnrichedCodeGenContext("src/index.ts");
      expect(result).toContain("Test analysis summary");
    });

    it("should return empty for no data", () => {
      const result = ctx.buildEnrichedCodeGenContext("src/unknown.ts");
      expect(result).toBe("");
    });
  });

  describe("toDebugString()", () => {
    it("should serialize all flags", () => {
      ctx.start("prompt");
      ctx.setUserProfile(makeUserProfile());
      ctx.setEmotionalContext(makeEmotionalContext());
      const debug = JSON.parse(ctx.toDebugString());
      expect(debug.hasUserProfile).toBe(true);
      expect(debug.hasEmotionalContext).toBe(true);
      expect(debug.hasInteractionStrategy).toBe(false);
      expect(debug.hasAutonomousDecisions).toBe(false);
      expect(debug.hasExperienceDesign).toBe(false);
      expect(debug.hasAnalysis).toBe(false);
      expect(debug.hasProduct).toBe(false);
      expect(debug.hasArchitecture).toBe(false);
      expect(debug.userStoriesCount).toBe(0);
      expect(debug.generatedFilesCount).toBe(0);
    });

    it("should truncate long prompts", () => {
      ctx.start("x".repeat(200));
      const debug = JSON.parse(ctx.toDebugString());
      expect(debug.userPrompt).toHaveLength(103); // 100 + "..."
    });
  });
});
