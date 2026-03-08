import { describe, it, expect } from "vitest";
import { CompletenessValidator } from "./completeness-validator.js";

describe("CompletenessValidator", () => {
  const validator = new CompletenessValidator();

  describe("Placeholder detection", () => {
    it("should reject code with TODO marker", () => {
      const code = `
        export function foo() {
          // TODO: implement this
          return null;
        }
      `;
      const result = validator.validate(code, "src/test.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Contains TODO marker");
    });

    it("should reject code with FIXME marker", () => {
      const code = `
        export function bar() {
          // FIXME: broken logic
          return 0;
        }
      `;
      const result = validator.validate(code, "src/test.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Contains FIXME marker");
    });

    it("should reject code with ... placeholder comment", () => {
      const code = `
        /**
         * Does something.
         */
        export function baz() {
          // ... implement later
          return null;
        }
      `;
      const result = validator.validate(code, "src/test.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Contains '...' placeholder");
    });

    it("should accept valid spread syntax (not placeholder)", () => {
      const code = `
        /**
         * Merges objects.
         */
        export function merge(a: object, b: object) {
          return { ...a, ...b };
        }
      `;
      const result = validator.validate(code, "src/test.ts");
      // Spread syntax is valid, not a placeholder
      expect(result.errors).not.toContain("Contains '...' placeholder");
    });
  });

  describe("Type checking", () => {
    it("should reject code with 'any' type", () => {
      const code = `
        export function process(data: any) {
          return data;
        }
      `;
      const result = validator.validate(code, "src/test.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Contains forbidden type 'any'");
    });

    it("should reject code with 'as any' cast", () => {
      const code = `
        export function convert(x: unknown) {
          return x as any;
        }
      `;
      const result = validator.validate(code, "src/test.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Contains forbidden cast 'as any'");
    });
  });

  describe("Suppression checking", () => {
    it("should reject @ts-ignore", () => {
      const code = `
        // @ts-ignore
        export const x = undefinedVar;
      `;
      const result = validator.validate(code, "src/test.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Contains @ts-ignore (forbidden)");
    });

    it("should reject @ts-nocheck", () => {
      const code = `
        // @ts-nocheck
        export function foo() {
          return 42;
        }
      `;
      const result = validator.validate(code, "src/test.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Contains @ts-nocheck (forbidden)");
    });

    it("should reject @ts-expect-error without justification", () => {
      const code = `
        // @ts-expect-error
        export const y = brokenCode;
      `;
      const result = validator.validate(code, "src/test.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("@ts-expect-error must include a justification on the same line");
    });

    it("should accept @ts-expect-error with justification", () => {
      const code = `
        /**
         * Test function with proper documentation.
         */
        // @ts-expect-error - Testing legacy API that has incorrect types
        export const z = legacyFunc();
      `;
      const result = validator.validate(code, "src/test.ts");
      expect(result.isValid).toBe(true);
    });
  });

  describe("Export checking", () => {
    it("should reject source file without exports", () => {
      const code = `
        function helper() {
          return 42;
        }
      `;
      const result = validator.validate(code, "src/utils.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Module does not export anything");
    });

    it("should accept test file without exports", () => {
      const code = `
        function testHelper() {
          return 42;
        }
      `;
      const result = validator.validate(code, "src/utils.test.ts");
      expect(result.isValid).toBe(true);
    });
  });

  describe("JSDoc checking", () => {
    it("should reject exported class without JSDoc", () => {
      const code = `
        export class MyClass {
          constructor() {}
        }
      `;
      const result = validator.validate(code, "src/MyClass.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Missing JSDoc"))).toBe(true);
    });

    it("should reject exported function without JSDoc", () => {
      const code = `
        export function myFunction() {
          return 42;
        }
      `;
      const result = validator.validate(code, "src/myFunction.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Missing JSDoc"))).toBe(true);
    });

    it("should accept exported class with JSDoc", () => {
      const code = `
        /**
         * My class description.
         */
        export class MyClass {
          constructor() {}
        }
      `;
      const result = validator.validate(code, "src/MyClass.ts");
      expect(result.isValid).toBe(true);
    });

    it("should accept exported function with JSDoc", () => {
      const code = `
        /**
         * My function description.
         * @returns The answer
         */
        export function myFunction() {
          return 42;
        }
      `;
      const result = validator.validate(code, "src/myFunction.ts");
      expect(result.isValid).toBe(true);
    });
  });

  describe("File type exceptions", () => {
    it("should accept .json files", () => {
      const code = '{"key": "value"}';
      const result = validator.validate(code, "package.json");
      expect(result.isValid).toBe(true);
    });

    it("should accept .md files", () => {
      const code = "# Heading\n\nSome content";
      const result = validator.validate(code, "README.md");
      expect(result.isValid).toBe(true);
    });

    it("should accept .yml files", () => {
      const code = "key: value\narray:\n  - item1";
      const result = validator.validate(code, "config.yml");
      expect(result.isValid).toBe(true);
    });

    it("should accept .d.ts files", () => {
      const code = "declare module 'foo';";
      const result = validator.validate(code, "types.d.ts");
      expect(result.isValid).toBe(true);
    });

    it("should not require JSDoc in test files", () => {
      const code = `
        export function testHelper() {
          return 42;
        }
      `;
      const result = validator.validate(code, "src/__tests__/helper.ts");
      expect(result.isValid).toBe(true);
    });

    it("should not require JSDoc in config files", () => {
      const code = `
        export const config = {
          port: 3000
        };
      `;
      const result = validator.validate(code, "src/config/app.config.ts");
      expect(result.isValid).toBe(true);
    });
  });

  describe("G1 Fix: async function detection", () => {
    it("should reject export async function without JSDoc", () => {
      const code = `
        export async function fetchUser(id: string) {
          const res = await fetch(\`/api/users/\${id}\`);
          return res.json();
        }
      `;
      const result = validator.validate(code, "src/api/user.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Missing JSDoc"))).toBe(true);
    });

    it("should accept export async function with JSDoc", () => {
      const code = `
        /**
         * Fetches user data from API.
         * @param id - User ID
         * @returns User data
         */
        export async function fetchUser(id: string) {
          const res = await fetch(\`/api/users/\${id}\`);
          return res.json();
        }
      `;
      const result = validator.validate(code, "src/api/user.ts");
      expect(result.isValid).toBe(true);
    });
  });

  describe("G3 Fix: entrypoints don't require exports", () => {
    it("should accept src/main.tsx without exports", () => {
      const code = `
        import React from 'react';
        import ReactDOM from 'react-dom/client';
        import App from './App.tsx';

        ReactDOM.createRoot(document.getElementById('root')!).render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
      `;
      const result = validator.validate(code, "src/main.tsx");
      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain("Module does not export anything");
    });

    it("should accept Windows path src\\\\main.tsx as entrypoint", () => {
      const code = `
        import React from 'react';
        import ReactDOM from 'react-dom/client';
        import App from './App.tsx';

        ReactDOM.createRoot(document.getElementById('root')!).render(
          <App />
        );
      `;
      const result = validator.validate(code, "src\\main.tsx");
      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain("Module does not export anything");
    });

    it("should accept monorepo entrypoint packages/app/src/index.tsx", () => {
      const code = `
        import React from 'react';
        import ReactDOM from 'react-dom/client';
        import App from './App.tsx';

        ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
      `;
      const result = validator.validate(code, "packages/app/src/index.tsx");
      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain("Module does not export anything");
    });

    it("should reject src/utils/index.ts as NON-entrypoint (false positive)", () => {
      const code = `
        function helper() {
          return 42;
        }
      `;
      const result = validator.validate(code, "src/utils/index.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Module does not export anything");
    });

    it("should reject src/lib/index.ts with export but no JSDoc", () => {
      const code = `
        export function helper() {
          return 42;
        }
      `;
      const result = validator.validate(code, "src/lib/index.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes("Missing JSDoc"))).toBe(true);
    });

    it("should reject packages/foo/index.ts as NON-entrypoint", () => {
      const code = `
        const x = 42;
      `;
      const result = validator.validate(code, "packages/foo/index.ts");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Module does not export anything");
    });

    it("should reject entrypoint with TODO (other validations still apply)", () => {
      const code = `
        import React from 'react';
        import ReactDOM from 'react-dom/client';
        import App from './App.tsx';

        // TODO: add error boundary
        ReactDOM.createRoot(document.getElementById('root')!).render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
      `;
      const result = validator.validate(code, "src/main.tsx");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Contains TODO marker");
    });
  });
});
