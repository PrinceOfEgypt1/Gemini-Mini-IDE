import { describe, it, expect, afterEach } from "vitest";
import { SandboxExecutor } from "./sandbox-executor.js";
import type { TechStack } from "../types/rich-schemas.js";

describe("SandboxExecutor", () => {
  let sandbox: SandboxExecutor;

  // Use minimal stack to speed up tests (no React = fewer deps to install)
  const mockStack: TechStack = {
    runtime: "Node.js",
    language: "TypeScript",
    framework: "None",
    testing: "Vitest",
    documentation: "README.md",
    orm: "N/A",
    database: "N/A",
    cache: "N/A",
    queue: "N/A"
  };

  afterEach(async () => {
    if (sandbox) {
      await sandbox.cleanup();
    }
  });

  describe("initialization", () => {
    it("should initialize sandbox with temp directory", async () => {
      sandbox = new SandboxExecutor();
      await sandbox.initialize(mockStack);

      expect(sandbox.isInitialized).toBe(true);
      expect(sandbox.path).toBeTruthy();
      expect(sandbox.path).toContain("mini-ide-sandbox-");
    }, 60000); // 60s timeout for npm install

    it("should create package.json and tsconfig.json", async () => {
      sandbox = new SandboxExecutor();
      await sandbox.initialize(mockStack);

      const files = await sandbox.listFiles();
      expect(files).toContain("package.json");
      expect(files).toContain("tsconfig.json");
    }, 60000);
  });

  describe("writeFile", () => {
    it("should write file to sandbox", async () => {
      sandbox = new SandboxExecutor();
      await sandbox.initialize(mockStack);

      await sandbox.writeFile("src/index.ts", "export const x = 1;");

      const files = await sandbox.listFiles();
      expect(files).toContain("src/index.ts");
    }, 60000);

    it("should create intermediate directories", async () => {
      sandbox = new SandboxExecutor();
      await sandbox.initialize(mockStack);

      await sandbox.writeFile("src/deep/nested/file.ts", "export const y = 2;");

      const files = await sandbox.listFiles();
      expect(files).toContain("src/deep/nested/file.ts");
    }, 60000);

    it("should throw if not initialized", async () => {
      sandbox = new SandboxExecutor();

      await expect(sandbox.writeFile("test.ts", "")).rejects.toThrow(
        "Sandbox not initialized"
      );
    });
  });

  describe("typecheck", () => {
    it("should pass typecheck for valid TypeScript", async () => {
      sandbox = new SandboxExecutor();
      await sandbox.initialize(mockStack);

      await sandbox.writeFile(
        "src/valid.ts",
        `
/**
 * A simple function
 */
export function add(a: number, b: number): number {
  return a + b;
}

/**
 * Test constant
 */
export const result: number = add(1, 2);
`
      );

      const result = await sandbox.typecheck();
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    }, 60000);

    it("should fail typecheck for invalid TypeScript", async () => {
      sandbox = new SandboxExecutor();
      await sandbox.initialize(mockStack);

      await sandbox.writeFile(
        "src/invalid.ts",
        `
/**
 * Invalid function with type error
 */
export function broken(): string {
  return 123; // Type error: number is not assignable to string
}
`
      );

      const result = await sandbox.typecheck();
      expect(result.success).toBe(false);
      // tsc may output to stdout or stderr depending on version
      const output = result.stdout + result.stderr;
      expect(output).toContain("error TS");
    }, 60000);
  });

  describe("cleanup", () => {
    it("should remove sandbox directory", async () => {
      sandbox = new SandboxExecutor();
      await sandbox.initialize(mockStack);

      const pathBefore = sandbox.path;
      expect(pathBefore).toBeTruthy();

      await sandbox.cleanup();

      expect(sandbox.path).toBeNull();
      expect(sandbox.isInitialized).toBe(false);
    }, 60000);

    it("should handle cleanup when not initialized", async () => {
      sandbox = new SandboxExecutor();

      // Should not throw
      await expect(sandbox.cleanup()).resolves.toBeUndefined();
    });
  });
});
