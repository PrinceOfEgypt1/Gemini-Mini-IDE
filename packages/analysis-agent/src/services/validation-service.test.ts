import { describe, it, expect } from "vitest";
import { ValidationService } from "./validation-service.js";
import type { LLMGeneratedFile } from "../types/generation-types.js";
import type { RichArchitecture, RichManifestItem } from "../types/rich-schemas.js";

function makeArchitecture(manifest: RichManifestItem[]): RichArchitecture {
  return {
    architectureStyle: "Modular",
    stack: {
      runtime: "Node",
      language: "TypeScript",
      framework: "React",
      testing: "Vitest",
      documentation: "README.md",
      orm: "N/A",
      database: "N/A",
      cache: "N/A",
      queue: "N/A",
    },
    diagram: "flow",
    manifest,
    keyDecisions: [],
    securityConsiderations: [],
    scalabilityPath: [],
  };
}

describe("ValidationService", () => {
  describe("validateGeneratedCode()", () => {
    it("should return empty errors for valid TypeScript files", () => {
      const service = new ValidationService();
      const files: LLMGeneratedFile[] = [
        { path: "src/index.ts", content: "export const x = 1;\n", reasoning: "entry", language: "typescript" },
      ];
      const arch = makeArchitecture([
        { path: "src/index.ts", purpose: "Entry", criticality: "HIGH", category: "APPLICATION" },
      ]);

      const errors = service.validateGeneratedCode(files, arch);
      // May have completeness or integrity warnings, but no syntax errors
      const syntaxErrors = errors.filter(e => e.startsWith("Syntax error"));
      expect(syntaxErrors).toHaveLength(0);
    });

    it("should report syntax errors for invalid TypeScript", () => {
      const service = new ValidationService();
      const files: LLMGeneratedFile[] = [
        { path: "src/bad.ts", content: "export const x: = ;\n", reasoning: "bad", language: "typescript" },
      ];
      const arch = makeArchitecture([
        { path: "src/bad.ts", purpose: "Bad", criticality: "HIGH", category: "APPLICATION" },
      ]);

      const errors = service.validateGeneratedCode(files, arch);
      const syntaxErrors = errors.filter(e => e.includes("Syntax error"));
      expect(syntaxErrors.length).toBeGreaterThan(0);
    });

    it("should report completeness errors for files with TODO markers", () => {
      const service = new ValidationService();
      const files: LLMGeneratedFile[] = [
        { path: "src/todo.ts", content: "export function doSomething() {\n  // TODO: implement\n  return null;\n}\n", reasoning: "todo", language: "typescript" },
      ];
      const arch = makeArchitecture([
        { path: "src/todo.ts", purpose: "Todo", criticality: "HIGH", category: "APPLICATION" },
      ]);

      const errors = service.validateGeneratedCode(files, arch);
      const completenessErrors = errors.filter(e => e.includes("Completeness error"));
      expect(completenessErrors.length).toBeGreaterThan(0);
    });

    it("should validate integrity across multiple files", () => {
      const service = new ValidationService();
      const files: LLMGeneratedFile[] = [
        { path: "src/index.ts", content: "export const main = () => {};\n", reasoning: "entry", language: "typescript" },
      ];
      const arch = makeArchitecture([
        { path: "src/index.ts", purpose: "Entry", criticality: "HIGH", category: "APPLICATION" },
        { path: "src/missing.ts", purpose: "Missing", criticality: "HIGH", category: "APPLICATION" },
      ]);

      const errors = service.validateGeneratedCode(files, arch);
      // Should report missing file
      expect(errors.some(e => e.toLowerCase().includes("missing") || e.toLowerCase().includes("src/missing.ts"))).toBe(true);
    });

    it("should handle empty files array", () => {
      const service = new ValidationService();
      const arch = makeArchitecture([
        { path: "src/index.ts", purpose: "Entry", criticality: "HIGH", category: "APPLICATION" },
      ]);

      const errors = service.validateGeneratedCode([], arch);
      // Should report missing files
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("validateManifest()", () => {
    it("should validate manifest against user prompt", () => {
      const service = new ValidationService();
      const arch = makeArchitecture([
        { path: "src/index.ts", purpose: "Entry", criticality: "HIGH", category: "APPLICATION" },
      ]);

      const errors = service.validateManifest(arch, "Create a todo app");
      expect(Array.isArray(errors)).toBe(true);
    });

    it("should return errors for empty manifest", () => {
      const service = new ValidationService();
      const arch = makeArchitecture([]);

      const errors = service.validateManifest(arch, "Create a complex system");
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
