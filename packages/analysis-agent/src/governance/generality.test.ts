import { describe, it, expect } from "vitest";
import { BaseProjectAuditor } from "./base-project-auditor.js";
import { CategoryValidator } from "./category-validator.js";
import { CompletenessValidator } from "./completeness-validator.js";
import { ContractValidator } from "./contract-validator.js";
import type { RichArchitecture, RichManifestItem } from "../types/rich-schemas.js";

/**
 * MULTI-PROMPT GENERALITY TESTS
 *
 * These tests verify that the governance system is GENERIC and not
 * coupled to any specific domain (like Prompt 7 - Data Structures).
 *
 * For each test case, we verify:
 * 1. No domain-specific errors or warnings
 * 2. Generic validators work correctly
 * 3. No overfitting to visualization/animation/data structures
 */
describe("Multi-Prompt Generality Tests", () => {
  const auditor = new BaseProjectAuditor();
  const categoryValidator = new CategoryValidator();
  const completenessValidator = new CompletenessValidator();
  const contractValidator = new ContractValidator();

  const createArchitecture = (
    manifest: RichManifestItem[],
    stackOverrides: Partial<RichArchitecture["stack"]> = {}
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
      ...stackOverrides,
    },
    diagram: "",
    keyDecisions: [],
    manifest,
    securityConsiderations: [],
    scalabilityPath: [],
  });

  describe("Web Application Prompt", () => {
    const webAppManifest: RichManifestItem[] = [
      { path: "package.json", purpose: "Dependencies", category: "CONFIG", criticality: "HIGH" },
      { path: "src/main.tsx", purpose: "App entrypoint", category: "APPLICATION", criticality: "HIGH" },
      { path: "src/App.tsx", purpose: "Root component", category: "UI", criticality: "HIGH" },
      { path: "src/pages/Home.tsx", purpose: "Home page", category: "UI", criticality: "MEDIUM" },
      { path: "src/components/Button.tsx", purpose: "Button component", category: "UI", criticality: "MEDIUM" },
      { path: "README.md", purpose: "Documentation", category: "DOCS", criticality: "MEDIUM" },
      { path: "src/tests/App.test.tsx", purpose: "App tests", category: "TESTS", criticality: "MEDIUM" },
    ];

    it("should validate web app manifest without data structure errors", () => {
      const result = categoryValidator.validate(webAppManifest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      // Should not mention data structures
      const allMessages = [...result.errors, ...result.warnings].join(" ");
      expect(allMessages).not.toContain("Stack");
      expect(allMessages).not.toContain("Queue");
      expect(allMessages).not.toContain("Graph");
      expect(allMessages).not.toContain("visualization");
    });

    it("should audit web app without injecting visualization files", () => {
      const arch = createArchitecture(webAppManifest);
      const result = auditor.auditAndFix(arch);

      const injectedFiles = result.manifest.filter(
        (f) => !webAppManifest.some((m) => m.path === f.path)
      );

      // Should only inject basic files (README, gitignore, CI)
      for (const file of injectedFiles) {
        expect(file.path).not.toContain("animation");
        expect(file.path).not.toContain("visualizer");
        expect(file.path).not.toContain("data-structure");
      }
    });
  });

  describe("API/Backend Prompt", () => {
    const apiManifest: RichManifestItem[] = [
      { path: "package.json", purpose: "Dependencies", category: "CONFIG", criticality: "HIGH" },
      { path: "src/index.ts", purpose: "Server entrypoint", category: "APPLICATION", criticality: "HIGH" },
      { path: "src/routes/users.ts", purpose: "User routes", category: "INFRASTRUCTURE", criticality: "HIGH" },
      { path: "src/controllers/userController.ts", purpose: "User controller", category: "APPLICATION", criticality: "MEDIUM" },
      { path: "src/models/User.ts", purpose: "User model", category: "DOMAIN", criticality: "HIGH" },
      { path: "README.md", purpose: "API documentation", category: "DOCS", criticality: "MEDIUM" },
    ];

    it("should validate API manifest as backend project", () => {
      const result = categoryValidator.validateForProjectType(apiManifest, "backend");

      expect(result.isValid).toBe(true);
      // Should not require UI for backend
      expect(result.warnings.some((w) => w.includes("UI category"))).toBe(false);
    });

    it("should not inject frontend files for API project", () => {
      const arch = createArchitecture(apiManifest, { framework: "Fastify" });
      const result = auditor.auditAndFix(arch);

      // Should not inject React-specific files
      expect(result.manifest.some((f) => f.path === "src/App.tsx")).toBe(false);
    });
  });

  describe("Library Prompt", () => {
    const libraryManifest: RichManifestItem[] = [
      { path: "package.json", purpose: "Package config", category: "CONFIG", criticality: "HIGH" },
      { path: "src/index.ts", purpose: "Library exports", category: "APPLICATION", criticality: "HIGH" },
      { path: "src/utils/format.ts", purpose: "Format utilities", category: "DOMAIN", criticality: "HIGH" },
      { path: "src/utils/validate.ts", purpose: "Validation utilities", category: "DOMAIN", criticality: "MEDIUM" },
      { path: "README.md", purpose: "Usage documentation", category: "DOCS", criticality: "HIGH" },
      { path: "src/tests/format.test.ts", purpose: "Format tests", category: "TESTS", criticality: "MEDIUM" },
    ];

    it("should validate library manifest correctly", () => {
      const result = categoryValidator.validateForProjectType(libraryManifest, "library");

      expect(result.isValid).toBe(true);
      // Has DOMAIN, so should not warn about it
      expect(result.warnings.some((w) => w.includes("DOMAIN"))).toBe(false);
    });
  });

  describe("CLI Tool Prompt", () => {
    const cliManifest: RichManifestItem[] = [
      { path: "package.json", purpose: "CLI config", category: "CONFIG", criticality: "HIGH" },
      { path: "src/cli.ts", purpose: "CLI entrypoint", category: "APPLICATION", criticality: "HIGH" },
      { path: "src/commands/init.ts", purpose: "Init command", category: "APPLICATION", criticality: "MEDIUM" },
      { path: "src/commands/build.ts", purpose: "Build command", category: "APPLICATION", criticality: "MEDIUM" },
      { path: "README.md", purpose: "CLI documentation", category: "DOCS", criticality: "MEDIUM" },
    ];

    it("should validate CLI manifest without UI requirements", () => {
      const result = categoryValidator.validate(cliManifest);

      expect(result.isValid).toBe(true);
      // CLI doesn't need UI
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Dashboard Prompt", () => {
    const dashboardManifest: RichManifestItem[] = [
      { path: "package.json", purpose: "Dependencies", category: "CONFIG", criticality: "HIGH" },
      { path: "src/main.tsx", purpose: "Dashboard entrypoint", category: "APPLICATION", criticality: "HIGH" },
      { path: "src/components/Chart.tsx", purpose: "Chart component", category: "UI", criticality: "HIGH" },
      { path: "src/components/Table.tsx", purpose: "Data table", category: "UI", criticality: "HIGH" },
      { path: "src/api/dataService.ts", purpose: "Data fetching", category: "INFRASTRUCTURE", criticality: "MEDIUM" },
      { path: "README.md", purpose: "Dashboard docs", category: "DOCS", criticality: "MEDIUM" },
    ];

    it("should validate dashboard as frontend project", () => {
      const result = categoryValidator.validateForProjectType(dashboardManifest, "frontend");

      expect(result.isValid).toBe(true);
      // Has UI, so should pass
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Completeness Validator Generality", () => {
    it("should validate generic code without domain-specific checks", () => {
      const genericCode = `
/**
 * Generic service for handling user operations
 */
export class UserService {
  private users: Map<string, User> = new Map();

  public createUser(data: CreateUserInput): User {
    const user = new User(data);
    this.users.set(user.id, user);
    return user;
  }

  public getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  public deleteUser(id: string): boolean {
    return this.users.delete(id);
  }
}
`;
      const result = completenessValidator.validate(genericCode, "src/services/UserService.ts");

      expect(result.isValid).toBe(true);
      // Should not require specific method counts
      expect(result.errors.some((e) => e.includes("methods"))).toBe(false);
    });
  });

  describe("Contract Validator Generality", () => {
    it("should validate generic class without data structure requirements", () => {
      const genericCode = `
export class Logger {
  public log(message: string): void {
    console.log(message);
  }

  public error(message: string): void {
    console.error(message);
  }
}
`;
      const result = contractValidator.validate(
        genericCode,
        "Logger class with log, error methods",
        "src/utils/Logger.ts"
      );

      expect(result.isValid).toBe(true);
      expect(result.classes).toContain("Logger");
    });

    it("should not require visualization-specific methods", () => {
      const serviceCode = `
export class DataService {
  public async fetch(url: string): Promise<unknown> {
    const response = await fetch(url);
    return response.json();
  }
}
`;
      const result = contractValidator.validate(
        serviceCode,
        "DataService class with fetch method",
        "src/services/DataService.ts"
      );

      expect(result.isValid).toBe(true);
      // Should not require animation, visualization, or step methods
      expect(result.violations.some((v) => v.message.includes("animation"))).toBe(false);
      expect(result.violations.some((v) => v.message.includes("visualization"))).toBe(false);
      expect(result.violations.some((v) => v.message.includes("step"))).toBe(false);
    });
  });

  describe("No Overfitting Verification", () => {
    it("should not contain hardcoded data structure references in validators", () => {
      // This is a meta-test that verifies the validators themselves
      // don't contain hardcoded references to data structures

      // The category validator should work for any category
      const genericManifest: RichManifestItem[] = [
        { path: "package.json", purpose: "Config", category: "CONFIG", criticality: "HIGH" },
        { path: "src/foo.ts", purpose: "Foo module", category: "DOMAIN", criticality: "MEDIUM" },
      ];

      const result = categoryValidator.validate(genericManifest);

      // Should not mention any specific data structures
      const allOutput = JSON.stringify(result);
      expect(allOutput).not.toContain("Stack");
      expect(allOutput).not.toContain("Queue");
      expect(allOutput).not.toContain("LinkedList");
      expect(allOutput).not.toContain("BinaryTree");
      expect(allOutput).not.toContain("Graph");
      expect(allOutput).not.toContain("Heap");
    });
  });
});
