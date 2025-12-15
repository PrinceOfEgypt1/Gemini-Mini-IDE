import { describe, it, expect } from "vitest";
import { StructureAuditor } from "./structure-auditor.js";
import type { RichArchitecture } from "../types/rich-schemas.js";

describe("StructureAuditor", () => {
  const auditor = new StructureAuditor();

  describe("Mandatory documentation files", () => {
    it("should inject README.md if missing", () => {
      const architecture: RichArchitecture = {
        architectureStyle: "Clean Architecture",
        stack: {
          runtime: "Node.js 20",
          language: "TypeScript",
          framework: "Fastify",
          orm: "Prisma",
          database: "PostgreSQL",
          cache: "Redis",
          queue: "BullMQ",
          testing: "Vitest",
          documentation: "OpenAPI"
        },
        diagram: "",
        keyDecisions: [],
        manifest: [],
        securityConsiderations: [],
        scalabilityPath: []
      };

      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some(f => f.path === "README.md")).toBe(true);
      expect(result.manifest.find(f => f.path === "README.md")?.purpose).toBe("Documentation entry point");
      expect(result.manifest.find(f => f.path === "README.md")?.category).toBe("DOCS");
    });

    it("should inject USER_STORIES.md if missing", () => {
      const architecture: RichArchitecture = {
        architectureStyle: "Clean Architecture",
        stack: {
          runtime: "Node.js 20",
          language: "TypeScript",
          framework: "Fastify",
          orm: "N/A",
          database: "N/A",
          cache: "N/A",
          queue: "N/A",
          testing: "Vitest",
          documentation: "README.md"
        },
        diagram: "",
        keyDecisions: [],
        manifest: [],
        securityConsiderations: [],
        scalabilityPath: []
      };

      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some(f => f.path === "USER_STORIES.md")).toBe(true);
      expect(result.manifest.find(f => f.path === "USER_STORIES.md")?.purpose).toBe("Project requirements and stories");
    });

    it("should not duplicate README.md if already exists", () => {
      const architecture: RichArchitecture = {
        architectureStyle: "Clean Architecture",
        stack: {
          runtime: "Node.js 20",
          language: "TypeScript",
          framework: "Fastify",
          orm: "N/A",
          database: "N/A",
          cache: "N/A",
          queue: "N/A",
          testing: "Vitest",
          documentation: "README.md"
        },
        diagram: "",
        keyDecisions: [],
        manifest: [
          { path: "README.md", purpose: "Custom README", category: "DOCS", criticality: "HIGH" }
        ],
        securityConsiderations: [],
        scalabilityPath: []
      };

      const result = auditor.auditAndFix(architecture);

      const readmeCount = result.manifest.filter(f => f.path === "README.md").length;
      expect(readmeCount).toBe(1);
      expect(result.manifest.find(f => f.path === "README.md")?.purpose).toBe("Custom README");
    });
  });

  describe("Node.js configuration", () => {
    it("should inject package.json for Node.js runtime", () => {
      const architecture: RichArchitecture = {
        architectureStyle: "Modular Monolith",
        stack: {
          runtime: "Node.js 20 LTS",
          language: "JavaScript",
          framework: "Express",
          orm: "N/A",
          database: "N/A",
          cache: "N/A",
          queue: "N/A",
          testing: "Jest",
          documentation: "README.md"
        },
        diagram: "",
        keyDecisions: [],
        manifest: [],
        securityConsiderations: [],
        scalabilityPath: []
      };

      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some(f => f.path === "package.json")).toBe(true);
      expect(result.manifest.find(f => f.path === "package.json")?.category).toBe("CONFIG");
    });

    it("should not inject package.json for non-Node.js runtime", () => {
      const architecture: RichArchitecture = {
        architectureStyle: "Clean Architecture",
        stack: {
          runtime: "Python 3.11",
          language: "Python",
          framework: "FastAPI",
          orm: "SQLAlchemy",
          database: "PostgreSQL",
          cache: "N/A",
          queue: "N/A",
          testing: "pytest",
          documentation: "README.md"
        },
        diagram: "",
        keyDecisions: [],
        manifest: [],
        securityConsiderations: [],
        scalabilityPath: []
      };

      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some(f => f.path === "package.json")).toBe(false);
    });
  });

  describe("TypeScript configuration", () => {
    it("should inject tsconfig.json for TypeScript language", () => {
      const architecture: RichArchitecture = {
        architectureStyle: "Clean Architecture",
        stack: {
          runtime: "Node.js 20",
          language: "TypeScript 5.x",
          framework: "Fastify",
          orm: "N/A",
          database: "N/A",
          cache: "N/A",
          queue: "N/A",
          testing: "Vitest",
          documentation: "README.md"
        },
        diagram: "",
        keyDecisions: [],
        manifest: [],
        securityConsiderations: [],
        scalabilityPath: []
      };

      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some(f => f.path === "tsconfig.json")).toBe(true);
      expect(result.manifest.find(f => f.path === "tsconfig.json")?.purpose).toBe("TypeScript compiler configuration");
    });
  });

  describe("React framework specifics", () => {
    it("should inject vite.config.ts for React projects", () => {
      const architecture: RichArchitecture = {
        architectureStyle: "Component-based",
        stack: {
          runtime: "Node.js 20",
          language: "TypeScript",
          framework: "React 18",
          orm: "N/A",
          database: "N/A",
          cache: "N/A",
          queue: "N/A",
          testing: "Vitest",
          documentation: "README.md"
        },
        diagram: "",
        keyDecisions: [],
        manifest: [],
        securityConsiderations: [],
        scalabilityPath: []
      };

      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some(f => f.path === "vite.config.ts")).toBe(true);
    });

    it("should inject src/main.tsx if no entrypoint exists", () => {
      const architecture: RichArchitecture = {
        architectureStyle: "Component-based",
        stack: {
          runtime: "Node.js 20",
          language: "TypeScript",
          framework: "React 18",
          orm: "N/A",
          database: "N/A",
          cache: "N/A",
          queue: "N/A",
          testing: "Vitest",
          documentation: "README.md"
        },
        diagram: "",
        keyDecisions: [],
        manifest: [],
        securityConsiderations: [],
        scalabilityPath: []
      };

      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some(f => f.path === "src/main.tsx")).toBe(true);
      expect(result.manifest.find(f => f.path === "src/main.tsx")?.purpose).toBe("Application entrypoint");
    });

    it("should not inject entrypoint if src/main.tsx already exists", () => {
      const architecture: RichArchitecture = {
        architectureStyle: "Component-based",
        stack: {
          runtime: "Node.js 20",
          language: "TypeScript",
          framework: "React 18",
          orm: "N/A",
          database: "N/A",
          cache: "N/A",
          queue: "N/A",
          testing: "Vitest",
          documentation: "README.md"
        },
        diagram: "",
        keyDecisions: [],
        manifest: [
          { path: "src/main.tsx", purpose: "Custom entrypoint", category: "APPLICATION", criticality: "HIGH" }
        ],
        securityConsiderations: [],
        scalabilityPath: []
      };

      const result = auditor.auditAndFix(architecture);

      const entrypointCount = result.manifest.filter(f => f.path === "src/main.tsx").length;
      expect(entrypointCount).toBe(1);
    });

    it("should not inject src/main.tsx if src/index.ts exists", () => {
      const architecture: RichArchitecture = {
        architectureStyle: "Component-based",
        stack: {
          runtime: "Node.js 20",
          language: "TypeScript",
          framework: "React 18",
          orm: "N/A",
          database: "N/A",
          cache: "N/A",
          queue: "N/A",
          testing: "Vitest",
          documentation: "README.md"
        },
        diagram: "",
        keyDecisions: [],
        manifest: [
          { path: "src/index.ts", purpose: "Alternative entrypoint", category: "APPLICATION", criticality: "HIGH" }
        ],
        securityConsiderations: [],
        scalabilityPath: []
      };

      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some(f => f.path === "src/main.tsx")).toBe(false);
    });
  });

  describe("Idempotency", () => {
    it("should not duplicate files on multiple runs", () => {
      const architecture: RichArchitecture = {
        architectureStyle: "Clean Architecture",
        stack: {
          runtime: "Node.js 20",
          language: "TypeScript",
          framework: "Fastify",
          orm: "N/A",
          database: "N/A",
          cache: "N/A",
          queue: "N/A",
          testing: "Vitest",
          documentation: "README.md"
        },
        diagram: "",
        keyDecisions: [],
        manifest: [],
        securityConsiderations: [],
        scalabilityPath: []
      };

      // First run
      const result1 = auditor.auditAndFix(architecture);
      const count1 = result1.manifest.length;

      // Second run (should not add more files)
      const result2 = auditor.auditAndFix(result1);
      const count2 = result2.manifest.length;

      expect(count1).toBe(count2);
      expect(count1).toBeGreaterThan(0);
    });
  });
});
