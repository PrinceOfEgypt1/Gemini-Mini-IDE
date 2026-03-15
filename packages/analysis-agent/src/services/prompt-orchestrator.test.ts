/**
 * Tests for PromptOrchestrator — pure business logic for prompt generation.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the prompts module
vi.mock("../prompts/index.js", () => ({
  SYSTEM_PROMPTS: {
    ANALYSIS: "SYSTEM_ANALYSIS_PROMPT",
    PRODUCT: "SYSTEM_PRODUCT_PROMPT",
    ARCHITECTURE: "SYSTEM_ARCHITECTURE_PROMPT",
    USER_STORIES: "SYSTEM_USER_STORIES_PROMPT",
    CODE_GEN: "SYSTEM_CODE_GEN_PROMPT"
  }
}));

import { PromptOrchestrator } from "./prompt-orchestrator.js";
import type {
  RichAnalysis,
  RichProductPlan,
  RichArchitecture,
  RichEpic,
  RichUserStory
} from "../types/rich-schemas.js";

// Minimal mock data that satisfies the type interfaces
const mockAnalysis: RichAnalysis = {
  intent: "Build a todo app",
  complexity: { level: "medium", score: 5, justification: "Standard CRUD" },
  requirements: ["user auth", "task CRUD"],
  constraints: [],
  risks: []
} as unknown as RichAnalysis;

const mockProductPlan: RichProductPlan = {
  projectName: "TodoApp",
  description: "A todo application",
  epics: [{ id: "E1", title: "Core", description: "Core features", priority: "high" }],
  techStack: { frontend: "React", backend: "Node.js" }
} as unknown as RichProductPlan;

const mockArchitecture: RichArchitecture = {
  manifest: [{ path: "src/index.ts", description: "Entry point", imports: [] }],
  decisions: []
} as unknown as RichArchitecture;

const mockEpic: RichEpic = {
  id: "E1",
  title: "Core Features",
  description: "Core CRUD features",
  priority: "high"
} as unknown as RichEpic;

const mockUserStory: RichUserStory = {
  id: "US1",
  title: "As a user I can add tasks",
  acceptanceCriteria: ["Given I am logged in"]
} as unknown as RichUserStory;

describe("PromptOrchestrator", () => {
  let orchestrator: PromptOrchestrator;

  beforeEach(() => {
    orchestrator = new PromptOrchestrator();
  });

  describe("start", () => {
    it("initializes with user prompt and resets state", () => {
      orchestrator.setAnalysis(mockAnalysis);
      orchestrator.start("New prompt");
      expect(orchestrator.getUserPrompt()).toBe("New prompt");
      expect(orchestrator.getAnalysis()).toBeNull();
      expect(orchestrator.getProductPlan()).toBeNull();
      expect(orchestrator.getArchitecture()).toBeNull();
      expect(orchestrator.getUserStories()).toHaveLength(0);
    });
  });

  describe("analysis management", () => {
    it("sets and gets analysis", () => {
      orchestrator.setAnalysis(mockAnalysis);
      expect(orchestrator.getAnalysis()).toEqual(mockAnalysis);
    });

    it("returns null when analysis not set", () => {
      expect(orchestrator.getAnalysis()).toBeNull();
    });
  });

  describe("product plan management", () => {
    it("sets and gets product plan", () => {
      orchestrator.setProductPlan(mockProductPlan);
      expect(orchestrator.getProductPlan()).toEqual(mockProductPlan);
    });

    it("returns null when product plan not set", () => {
      expect(orchestrator.getProductPlan()).toBeNull();
    });
  });

  describe("architecture management", () => {
    it("sets and gets architecture", () => {
      orchestrator.setArchitecture(mockArchitecture);
      expect(orchestrator.getArchitecture()).toEqual(mockArchitecture);
    });

    it("returns null when architecture not set", () => {
      expect(orchestrator.getArchitecture()).toBeNull();
    });
  });

  describe("user stories management", () => {
    it("adds and gets user stories", () => {
      orchestrator.addUserStories([mockUserStory]);
      expect(orchestrator.getUserStories()).toHaveLength(1);
      expect(orchestrator.getUserStories()[0]).toEqual(mockUserStory);
    });

    it("accumulates user stories from multiple calls", () => {
      orchestrator.addUserStories([mockUserStory]);
      orchestrator.addUserStories([{ ...mockUserStory, id: "US2" } as unknown as RichUserStory]);
      expect(orchestrator.getUserStories()).toHaveLength(2);
    });

    it("returns empty array initially", () => {
      expect(orchestrator.getUserStories()).toHaveLength(0);
    });
  });

  describe("getAnalysisPrompt", () => {
    it("returns system and user prompts for analysis", () => {
      const result = orchestrator.getAnalysisPrompt("Build a todo app");
      expect(result.system).toBe("SYSTEM_ANALYSIS_PROMPT");
      expect(result.user).toBe("Build a todo app");
    });
  });

  describe("getProductPrompt", () => {
    it("returns product prompt with analysis context", () => {
      const result = orchestrator.getProductPrompt("Build a todo app", mockAnalysis);
      expect(result.system).toBe("SYSTEM_PRODUCT_PROMPT");
      expect(result.user).toContain("Build a todo app");
      expect(result.user).toContain("CONTEXTO DE ANÁLISE");
    });

    it("uses previously set analysis when null passed", () => {
      orchestrator.setAnalysis(mockAnalysis);
      const result = orchestrator.getProductPrompt("Build a todo app", null);
      expect(result.user).toContain("CONTEXTO DE ANÁLISE");
    });

    it("throws if no analysis context available", () => {
      expect(() => orchestrator.getProductPrompt("prompt", null))
        .toThrow("Analysis context not set for product prompt.");
    });
  });

  describe("getArchitecturePrompt", () => {
    it("returns architecture prompt with product context", () => {
      const result = orchestrator.getArchitecturePrompt(
        "Build app", mockAnalysis, mockProductPlan, [mockUserStory]
      );
      expect(result.system).toBe("SYSTEM_ARCHITECTURE_PROMPT");
      expect(result.user).toContain("Build app");
      expect(result.user).toContain("CONTEXTO DE PRODUTO");
    });

    it("throws if no product plan context available", () => {
      expect(() => orchestrator.getArchitecturePrompt("prompt", null, null, []))
        .toThrow("Product plan context not set for architecture prompt.");
    });
  });

  describe("getUserStoriesPrompt", () => {
    it("returns user stories prompt with epic context", () => {
      orchestrator.setProductPlan(mockProductPlan);
      const result = orchestrator.getUserStoriesPrompt(mockEpic, null);
      expect(result.system).toBe("SYSTEM_USER_STORIES_PROMPT");
      expect(result.user).toContain("Expand the following epic");
    });

    it("throws if no product plan context available", () => {
      expect(() => orchestrator.getUserStoriesPrompt(mockEpic, null))
        .toThrow("Product plan context not set for user stories prompt.");
    });
  });

  describe("getCodeGenPrompt", () => {
    it("returns code gen prompt with architecture context", () => {
      orchestrator.setArchitecture(mockArchitecture);
      orchestrator.addUserStories([mockUserStory]);
      const result = orchestrator.getCodeGenPrompt("src/index.ts", "Entry point", ["express"]);
      expect(result.system).toBe("SYSTEM_CODE_GEN_PROMPT");
      expect(result.user).toContain("src/index.ts");
      expect(result.user).toContain("Entry point");
      expect(result.user).toContain("express");
      expect(result.user).toContain("ARCHITECTURE CONTEXT");
      expect(result.user).toContain("USER STORIES CONTEXT");
    });

    it("throws if no architecture context available", () => {
      expect(() => orchestrator.getCodeGenPrompt("file.ts", "desc", []))
        .toThrow("Architecture context not set for code generation prompt.");
    });
  });

  describe("getUserPrompt", () => {
    it("returns empty string initially", () => {
      expect(orchestrator.getUserPrompt()).toBe("");
    });

    it("returns the prompt set by start()", () => {
      orchestrator.start("My prompt");
      expect(orchestrator.getUserPrompt()).toBe("My prompt");
    });
  });
});
