import { describe, it, expect, beforeEach } from "vitest";
import { GenerationContext, globalGenerationContext } from "./generation-context.js";
import type {
  RichAnalysis,
  RichProductPlan,
  RichArchitecture,
  RichUserStory,
  GeneratedFile,
} from "../types/rich-schemas.js";

function makeAnalysis(overrides?: Partial<RichAnalysis>): RichAnalysis {
  return {
    summary: "Test summary",
    complexity: { level: "MEDIUM", score: 5, justification: "test" },
    coreEntities: ["User", "Product"],
    assumptions: ["assumption1"],
    implicitRequirements: ["req1", "req2"],
    ...overrides,
  } as RichAnalysis;
}

function makeProduct(overrides?: Partial<RichProductPlan>): RichProductPlan {
  return {
    productVision: "A great product",
    epics: [
      {
        id: "E1",
        title: "First Epic",
        category: "CORE",
        context: "main feature",
        priority: "P0",
        estimatedComplexity: "MEDIUM",
        requirements: ["req-a"],
        acceptanceCriteria: ["ac-1"],
      },
    ],
    outOfScope: ["mobile"],
    risks: [{ description: "risk1", mitigation: "mitigation1" }],
    ...overrides,
  } as RichProductPlan;
}

function makeArchitecture(overrides?: Partial<RichArchitecture>): RichArchitecture {
  return {
    stack: {
      runtime: "Node.js",
      language: "TypeScript",
      framework: "Express",
      orm: "Prisma",
      database: "PostgreSQL",
      cache: "Redis",
      queue: "BullMQ",
      testing: "Vitest",
      documentation: "README.md",
    },
    architectureStyle: "Hexagonal",
    diagram: "",
    keyDecisions: [{ decision: "Use DDD", rationale: "Better separation" }],
    manifest: [
      { path: "src/index.ts", purpose: "Entry point", criticality: "HIGH", category: "DOMAIN" },
      { path: "src/user/service.ts", purpose: "User service", criticality: "MEDIUM", category: "APPLICATION" },
    ],
    securityConsiderations: [],
    scalabilityPath: [],
    ...overrides,
  } as RichArchitecture;
}

function makeUserStory(overrides?: Partial<RichUserStory>): RichUserStory {
  return {
    id: "US-1",
    title: "User login",
    description: "As a user I can login to the core system",
    estimatedPoints: 5,
    priority: "high",
    ...overrides,
  } as RichUserStory;
}

function makeGeneratedFile(overrides?: Partial<GeneratedFile>): GeneratedFile {
  return {
    path: "src/index.ts",
    content: "console.log('hello')",
    ...overrides,
  } as GeneratedFile;
}

describe("GenerationContext", () => {
  let ctx: GenerationContext;

  beforeEach(() => {
    ctx = new GenerationContext();
  });

  describe("start()", () => {
    it("should reset all state and record prompt", () => {
      ctx.start("build me an app");
      expect(ctx.userPrompt).toBe("build me an app");
      expect(ctx.analysis).toBeNull();
      expect(ctx.product).toBeNull();
      expect(ctx.architecture).toBeNull();
      expect(ctx.userStories).toEqual([]);
      expect(ctx.generatedFiles).toEqual([]);
      expect(ctx.elapsedMs).toBeGreaterThanOrEqual(0);
    });

    it("should reset accumulated data on second call", () => {
      ctx.start("first");
      ctx.setAnalysis(makeAnalysis());
      ctx.addUserStories([makeUserStory()]);
      ctx.start("second");
      expect(ctx.userPrompt).toBe("second");
      expect(ctx.analysis).toBeNull();
      expect(ctx.userStories).toEqual([]);
    });
  });

  describe("setters and getters", () => {
    it("should set and get analysis", () => {
      const analysis = makeAnalysis();
      ctx.setAnalysis(analysis);
      expect(ctx.analysis).toBe(analysis);
    });

    it("should set and get product", () => {
      const product = makeProduct();
      ctx.setProduct(product);
      expect(ctx.product).toBe(product);
    });

    it("should set and get architecture", () => {
      const arch = makeArchitecture();
      ctx.setArchitecture(arch);
      expect(ctx.architecture).toBe(arch);
    });

    it("should accumulate user stories", () => {
      ctx.addUserStories([makeUserStory({ id: "US-1" })]);
      ctx.addUserStories([makeUserStory({ id: "US-2" })]);
      expect(ctx.userStories).toHaveLength(2);
    });

    it("should accumulate generated files", () => {
      ctx.addGeneratedFile(makeGeneratedFile({ path: "a.ts" }));
      ctx.addGeneratedFile(makeGeneratedFile({ path: "b.ts" }));
      expect(ctx.generatedFiles).toHaveLength(2);
    });
  });

  describe("buildProductContext()", () => {
    it("should return only prompt when no analysis", () => {
      ctx.start("build something");
      const result = ctx.buildProductContext();
      expect(result).toContain("Pedido Original: build something");
    });

    it("should include analysis data when available", () => {
      ctx.start("build something");
      ctx.setAnalysis(makeAnalysis({ summary: "My summary", coreEntities: ["Entity1"] }));
      const result = ctx.buildProductContext();
      expect(result).toContain("ANÁLISE PRÉVIA");
      expect(result).toContain("My summary");
      expect(result).toContain("Entity1");
      expect(result).toContain("build something");
    });
  });

  describe("buildArchitectureContext()", () => {
    it("should include original prompt", () => {
      ctx.start("my prompt");
      const result = ctx.buildArchitectureContext();
      expect(result).toContain("my prompt");
    });

    it("should include analysis when set", () => {
      ctx.start("my prompt");
      ctx.setAnalysis(makeAnalysis());
      const result = ctx.buildArchitectureContext();
      expect(result).toContain("ANÁLISE");
      expect(result).toContain("MEDIUM");
    });

    it("should include product when set", () => {
      ctx.start("my prompt");
      ctx.setProduct(makeProduct());
      const result = ctx.buildArchitectureContext();
      expect(result).toContain("PRODUTO");
      expect(result).toContain("First Epic");
      expect(result).toContain("req-a");
    });

    it("should include epics without requirements", () => {
      ctx.start("my prompt");
      ctx.setProduct(makeProduct({
        epics: [{
          id: "E1", title: "No Reqs", category: "CORE",
          context: "ctx", priority: "P3", estimatedComplexity: "LOW",
          requirements: [], acceptanceCriteria: [],
        }],
      }));
      const result = ctx.buildArchitectureContext();
      expect(result).toContain("No Reqs");
    });
  });

  describe("buildCodeGenContext()", () => {
    it("should return empty string when no data", () => {
      ctx.start("test");
      const result = ctx.buildCodeGenContext("src/index.ts");
      expect(result).toBe("");
    });

    it("should include stack and architecture", () => {
      ctx.start("test");
      ctx.setArchitecture(makeArchitecture());
      const result = ctx.buildCodeGenContext("src/index.ts");
      expect(result).toContain("Node.js");
      expect(result).toContain("Hexagonal");
      expect(result).toContain("Use DDD");
      expect(result).toContain("Entry point");
    });

    it("should include already generated files", () => {
      ctx.start("test");
      ctx.setArchitecture(makeArchitecture());
      ctx.addGeneratedFile(makeGeneratedFile({ path: "src/utils.ts" }));
      const result = ctx.buildCodeGenContext("src/index.ts");
      expect(result).toContain("src/utils.ts");
    });

    it("should include related user stories by category match", () => {
      ctx.start("test");
      ctx.setArchitecture(makeArchitecture());
      ctx.addUserStories([makeUserStory({ title: "DOMAIN feature", description: "DOMAIN system logic" })]);
      const result = ctx.buildCodeGenContext("src/index.ts");
      expect(result).toContain("DOMAIN feature");
    });

    it("should include related user stories by filename match", () => {
      ctx.start("test");
      ctx.setArchitecture(makeArchitecture());
      ctx.addUserStories([makeUserStory({ title: "Service for index", description: "Handles index logic" })]);
      const result = ctx.buildCodeGenContext("src/index.ts");
      expect(result).toContain("Service for index");
    });

    it("should include related user stories by purpose keyword match", () => {
      ctx.start("test");
      ctx.setArchitecture(makeArchitecture());
      ctx.addUserStories([makeUserStory({ title: "Entry setup", description: "Some desc about point" })]);
      const result = ctx.buildCodeGenContext("src/index.ts");
      expect(result).toContain("Entry setup");
    });

    it("should include analysis summary", () => {
      ctx.start("test");
      ctx.setAnalysis(makeAnalysis({ summary: "Project context info" }));
      const result = ctx.buildCodeGenContext("src/index.ts");
      expect(result).toContain("Project context info");
    });

    it("should handle file not in manifest", () => {
      ctx.start("test");
      ctx.setArchitecture(makeArchitecture());
      const result = ctx.buildCodeGenContext("src/unknown.ts");
      expect(result).not.toContain("ARQUIVO A GERAR");
    });
  });

  describe("buildUserStoriesContext()", () => {
    it("should return empty when no product", () => {
      ctx.start("test");
      const result = ctx.buildUserStoriesContext("E1");
      expect(result).toBe("");
    });

    it("should include epic details when found", () => {
      ctx.start("test");
      ctx.setProduct(makeProduct());
      const result = ctx.buildUserStoriesContext("E1");
      expect(result).toContain("First Epic");
      expect(result).toContain("req-a");
      expect(result).toContain("ac-1");
    });

    it("should return empty for unknown epic", () => {
      ctx.start("test");
      ctx.setProduct(makeProduct());
      const result = ctx.buildUserStoriesContext("E999");
      expect(result).toBe("");
    });

    it("should include analysis context when available", () => {
      ctx.start("test");
      ctx.setProduct(makeProduct());
      ctx.setAnalysis(makeAnalysis({ coreEntities: ["Domain1"] }));
      const result = ctx.buildUserStoriesContext("E1");
      expect(result).toContain("Domain1");
    });
  });

  describe("toDebugString()", () => {
    it("should serialize context state", () => {
      ctx.start("a".repeat(200));
      ctx.setAnalysis(makeAnalysis());
      const debug = JSON.parse(ctx.toDebugString());
      expect(debug.hasAnalysis).toBe(true);
      expect(debug.hasProduct).toBe(false);
      expect(debug.userPrompt.length).toBeLessThanOrEqual(104);
    });
  });

  describe("globalGenerationContext singleton", () => {
    it("should be a GenerationContext instance", () => {
      expect(globalGenerationContext).toBeInstanceOf(GenerationContext);
    });
  });
});
