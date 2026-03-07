import { describe, it, expect } from "vitest";
import { BaseProjectAuditor } from "./base-project-auditor.js";
import type { RichArchitecture } from "../types/rich-schemas.js";

describe("BaseProjectAuditor", () => {
  const auditor = new BaseProjectAuditor();

  const createArchitecture = (
    manifest: RichArchitecture["manifest"] = [],
    overrides: Partial<RichArchitecture["stack"]> = {}
  ): RichArchitecture => ({
    architectureStyle: "Clean Architecture",
    stack: {
      runtime: "Node.js 20",
      language: "TypeScript",
      framework: "React",
      orm: "N/A",
      database: "N/A",
      cache: "N/A",
      queue: "N/A",
      testing: "Vitest",
      documentation: "README.md",
      ...overrides,
    },
    diagram: "",
    keyDecisions: [],
    manifest,
    securityConsiderations: [],
    scalabilityPath: [],
  });

  describe("Universal files injection", () => {
    it("should inject README.md if missing", () => {
      const architecture = createArchitecture([]);
      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some((f) => f.path === "README.md")).toBe(true);
      expect(result.manifest.find((f) => f.path === "README.md")?.category).toBe(
        "DOCS"
      );
    });

    it("should inject .gitignore if missing", () => {
      const architecture = createArchitecture([]);
      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some((f) => f.path === ".gitignore")).toBe(true);
    });

    it("should inject CI workflow if missing", () => {
      const architecture = createArchitecture([]);
      const result = auditor.auditAndFix(architecture);

      expect(
        result.manifest.some((f) => f.path === ".github/workflows/ci.yml")
      ).toBe(true);
    });

    it("should NOT duplicate existing files", () => {
      const architecture = createArchitecture([
        {
          path: "README.md",
          purpose: "Custom README",
          category: "DOCS",
          criticality: "HIGH",
        },
      ]);

      const result = auditor.auditAndFix(architecture);

      const readmeCount = result.manifest.filter(
        (f) => f.path.toLowerCase() === "readme.md"
      ).length;
      expect(readmeCount).toBe(1);
      expect(result.manifest.find((f) => f.path === "README.md")?.purpose).toBe(
        "Custom README"
      );
    });
  });

  describe("Node.js projects", () => {
    it("should inject package.json for Node.js runtime", () => {
      const architecture = createArchitecture([], { runtime: "Node.js 20 LTS" });
      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some((f) => f.path === "package.json")).toBe(true);
    });

    it("should inject package.json for Bun runtime", () => {
      const architecture = createArchitecture([], { runtime: "Bun 1.0" });
      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some((f) => f.path === "package.json")).toBe(true);
    });

    it("should NOT inject package.json for non-Node runtime", () => {
      const architecture = createArchitecture([], { runtime: "Python 3.11" });
      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some((f) => f.path === "package.json")).toBe(false);
    });
  });

  describe("TypeScript projects", () => {
    it("should inject tsconfig.json for TypeScript", () => {
      const architecture = createArchitecture([], { language: "TypeScript 5.3" });
      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some((f) => f.path === "tsconfig.json")).toBe(true);
    });

    it("should NOT inject tsconfig.json for JavaScript", () => {
      const architecture = createArchitecture([], { language: "JavaScript ES2022" });
      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some((f) => f.path === "tsconfig.json")).toBe(false);
    });
  });

  describe("React projects", () => {
    it("should inject entry point for React projects", () => {
      const architecture = createArchitecture([], { framework: "React 18" });
      const result = auditor.auditAndFix(architecture);

      const hasEntrypoint =
        result.manifest.some((f) => f.path === "src/main.tsx") ||
        result.manifest.some((f) => f.path === "src/index.tsx");

      expect(hasEntrypoint).toBe(true);
    });

    it("should inject App component for React projects", () => {
      const architecture = createArchitecture([], { framework: "React 18" });
      const result = auditor.auditAndFix(architecture);

      expect(result.manifest.some((f) => f.path === "src/App.tsx")).toBe(true);
    });

    it("should NOT inject entry point if already exists", () => {
      const architecture = createArchitecture(
        [
          {
            path: "src/main.tsx",
            purpose: "Custom entrypoint",
            category: "APPLICATION",
            criticality: "HIGH",
          },
        ],
        { framework: "React 18" }
      );

      const result = auditor.auditAndFix(architecture);

      const entrypoints = result.manifest.filter(
        (f) => f.path === "src/main.tsx" || f.path === "src/index.tsx"
      );
      expect(entrypoints.length).toBe(1);
    });
  });

  describe("Generic behavior (NO overfitting)", () => {
    it("should NOT inject visualization-specific files", () => {
      const architecture = createArchitecture([]);
      const result = auditor.auditAndFix(architecture);

      const visualizationFiles = result.manifest.filter(
        (f) =>
          f.path.includes("animation") ||
          f.path.includes("visualizer") ||
          f.path.includes("data-structure") ||
          f.path.includes("simulator")
      );

      expect(visualizationFiles.length).toBe(0);
    });

    it("should NOT inject domain-specific files", () => {
      const architecture = createArchitecture([]);
      const result = auditor.auditAndFix(architecture);

      const domainFiles = result.manifest.filter(
        (f) =>
          f.path.includes("Stack") ||
          f.path.includes("Queue") ||
          f.path.includes("Graph") ||
          f.path.includes("Tree")
      );

      expect(domainFiles.length).toBe(0);
    });
  });
});
