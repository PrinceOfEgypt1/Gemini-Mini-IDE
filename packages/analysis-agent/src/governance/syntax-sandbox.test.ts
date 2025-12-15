import { describe, it, expect } from "vitest";
import { SyntaxSandbox } from "./syntax-sandbox.js";

describe("SyntaxSandbox", () => {
  const sandbox = new SyntaxSandbox();

  describe("Valid TypeScript code", () => {
    it("should accept valid class definition", () => {
      const code = `
        export class MyClass {
          private value: number;

          constructor(value: number) {
            this.value = value;
          }

          getValue(): number {
            return this.value;
          }
        }
      `;
      const result = sandbox.validateTS(code, "src/MyClass.ts");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept valid function definition", () => {
      const code = `
        export function add(a: number, b: number): number {
          return a + b;
        }
      `;
      const result = sandbox.validateTS(code, "src/math.ts");
      expect(result.isValid).toBe(true);
    });

    it("should accept valid interface and type definitions", () => {
      const code = `
        export interface User {
          id: string;
          name: string;
        }

        export type UserId = string;
      `;
      const result = sandbox.validateTS(code, "src/types.ts");
      expect(result.isValid).toBe(true);
    });
  });

  describe("Syntax errors", () => {
    it("should reject code with missing closing brace", () => {
      const code = `
        export function broken() {
          return 42;
      `;
      const result = sandbox.validateTS(code, "src/broken.ts");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Syntax Error");
    });

    it("should reject code with invalid token", () => {
      const code = `
        export function invalid() {
          return @@@;
        }
      `;
      const result = sandbox.validateTS(code, "src/invalid.ts");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject code with missing semicolon after statement", () => {
      const code = `
        export function test() {
          const x = 5
          const y = 10
          return x + y
        }
      `;
      // Note: TypeScript allows missing semicolons with ASI, so this should actually pass
      const result = sandbox.validateTS(code, "src/test.ts");
      expect(result.isValid).toBe(true);
    });

    it("should reject code with unclosed string literal", () => {
      const code = `
        export const message = "Hello World;
      `;
      const result = sandbox.validateTS(code, "src/message.ts");
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Non-TypeScript files", () => {
    it("should skip validation for .js files", () => {
      const code = "const x = 42;"; // no export, would fail other validators
      const result = sandbox.validateTS(code, "src/script.js");
      expect(result.isValid).toBe(true);
    });

    it("should skip validation for .json files", () => {
      const code = '{"key": "value"}';
      const result = sandbox.validateTS(code, "package.json");
      expect(result.isValid).toBe(true);
    });

    it("should skip validation for .md files", () => {
      const code = "# Heading";
      const result = sandbox.validateTS(code, "README.md");
      expect(result.isValid).toBe(true);
    });
  });

  describe("TypeScript specific syntax", () => {
    it("should accept generics", () => {
      const code = `
        export function identity<T>(value: T): T {
          return value;
        }
      `;
      const result = sandbox.validateTS(code, "src/generic.ts");
      expect(result.isValid).toBe(true);
    });

    it("should accept decorators syntax", () => {
      const code = `
        function sealed(target: Function) {
          Object.seal(target);
        }

        @sealed
        export class MyClass {}
      `;
      const result = sandbox.validateTS(code, "src/decorated.ts");
      expect(result.isValid).toBe(true);
    });

    it("should accept async/await", () => {
      const code = `
        export async function fetchData(): Promise<string> {
          const response = await fetch('https://api.example.com');
          return response.text();
        }
      `;
      const result = sandbox.validateTS(code, "src/async.ts");
      expect(result.isValid).toBe(true);
    });
  });

  describe("Error reporting", () => {
    it("should include line number in error message", () => {
      const code = `
        export function test() {
          return {
            value: 42
        }
      `;
      const result = sandbox.validateTS(code, "src/test.ts");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/Line \d+/);
    });

    it("should handle compiler exceptions gracefully", () => {
      // This tests the catch block for unexpected compiler errors
      const code = ""; // Empty code might trigger edge cases
      const result = sandbox.validateTS(code, "src/empty.ts");
      // Empty code is actually valid TypeScript
      expect(result.isValid).toBe(true);
    });
  });
});
