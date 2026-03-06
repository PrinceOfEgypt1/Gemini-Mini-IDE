import { describe, it, expect, beforeEach } from "vitest";
import { VirtualFilesystem } from "./virtual-filesystem.js";

describe("VirtualFilesystem", () => {
  let vfs: VirtualFilesystem;

  beforeEach(() => {
    vfs = new VirtualFilesystem();
  });

  describe("basic operations", () => {
    it("should store and retrieve files", () => {
      vfs.set("src/index.ts", "export const x = 1;");

      expect(vfs.has("src/index.ts")).toBe(true);
      expect(vfs.get("src/index.ts")).toBe("export const x = 1;");
    });

    it("should return null for non-existent files", () => {
      expect(vfs.get("nonexistent.ts")).toBeNull();
    });

    it("should delete files", () => {
      vfs.set("src/test.ts", "content");
      expect(vfs.has("src/test.ts")).toBe(true);

      vfs.delete("src/test.ts");
      expect(vfs.has("src/test.ts")).toBe(false);
    });

    it("should clear all files", () => {
      vfs.set("file1.ts", "content1");
      vfs.set("file2.ts", "content2");

      vfs.clear();

      expect(vfs.size).toBe(0);
    });

    it("should track file count", () => {
      vfs.set("file1.ts", "content1");
      vfs.set("file2.ts", "content2");

      expect(vfs.size).toBe(2);
    });
  });

  describe("getExports", () => {
    it("should extract class exports", () => {
      vfs.set("src/stack.ts", `
/**
 * Stack data structure
 */
export class Stack<T> {
  push(item: T): void {}
  pop(): T | undefined { return undefined; }
}

export abstract class BaseCollection<T> {}
`);

      const exports = vfs.getExports("src/stack.ts");

      expect(exports).toContainEqual({ name: "Stack", kind: "class", line: 5 });
      expect(exports).toContainEqual({ name: "BaseCollection", kind: "class", line: 10 });
    });

    it("should extract interface exports", () => {
      vfs.set("src/types.ts", `
export interface User {
  name: string;
  email: string;
}

export interface Product {
  id: number;
}
`);

      const exports = vfs.getExports("src/types.ts");

      expect(exports).toContainEqual({ name: "User", kind: "interface", line: 2 });
      expect(exports).toContainEqual({ name: "Product", kind: "interface", line: 7 });
    });

    it("should extract type exports", () => {
      vfs.set("src/types.ts", `
export type ID = string | number;
export type Callback<T> = (value: T) => void;
`);

      const exports = vfs.getExports("src/types.ts");

      expect(exports).toContainEqual({ name: "ID", kind: "type", line: 2 });
      expect(exports).toContainEqual({ name: "Callback", kind: "type", line: 3 });
    });

    it("should extract function exports", () => {
      vfs.set("src/utils.ts", `
export function add(a: number, b: number): number {
  return a + b;
}

export async function fetchData(url: string): Promise<void> {}
`);

      const exports = vfs.getExports("src/utils.ts");

      expect(exports).toContainEqual({ name: "add", kind: "function", line: 2 });
      expect(exports).toContainEqual({ name: "fetchData", kind: "function", line: 6 });
    });

    it("should extract const exports", () => {
      vfs.set("src/constants.ts", `
export const MAX_SIZE = 100;
export let counter = 0;
`);

      const exports = vfs.getExports("src/constants.ts");

      expect(exports).toContainEqual({ name: "MAX_SIZE", kind: "const", line: 2 });
      expect(exports).toContainEqual({ name: "counter", kind: "const", line: 3 });
    });

    it("should extract enum exports", () => {
      vfs.set("src/enums.ts", `
export enum Color {
  Red,
  Green,
  Blue
}
`);

      const exports = vfs.getExports("src/enums.ts");

      expect(exports).toContainEqual({ name: "Color", kind: "enum", line: 2 });
    });

    it("should extract default exports", () => {
      vfs.set("src/component.ts", `
export default class MyComponent {}
`);

      const exports = vfs.getExports("src/component.ts");

      expect(exports).toContainEqual({ name: "MyComponent", kind: "default", line: 2 });
    });

    it("should return empty array for non-existent file", () => {
      const exports = vfs.getExports("nonexistent.ts");
      expect(exports).toEqual([]);
    });

    it("should extract ALL exports without limit", () => {
      const manyExports = Array.from({ length: 20 }, (_, i) =>
        `export const var${i} = ${i};`
      ).join("\n");

      vfs.set("src/many.ts", manyExports);

      const exports = vfs.getExports("src/many.ts");

      expect(exports.length).toBe(20);
    });
  });

  describe("buildContextSummary", () => {
    it("should build summary with exports", () => {
      vfs.set("src/types.ts", "export interface User {}");
      vfs.set("src/utils.ts", "export function helper() {}");

      const summary = vfs.buildContextSummary();

      expect(summary).toContain("src/types.ts");
      expect(summary).toContain("User");
      expect(summary).toContain("src/utils.ts");
      expect(summary).toContain("helper");
    });

    it("should truncate when exceeding maxTokens", () => {
      for (let i = 0; i < 100; i++) {
        vfs.set(`src/file${i}.ts`, `export const var${i} = ${i};`);
      }

      const summary = vfs.buildContextSummary(200);

      expect(summary).toContain("... and");
      expect(summary).toContain("more files");
    });
  });

  describe("buildFileContext", () => {
    it("should prioritize type definition files", () => {
      vfs.set("src/types/index.ts", "export interface Config {}");
      vfs.set("src/utils/helper.ts", "export function help() {}");
      vfs.set("src/domain/user.ts", "export class User {}");

      const context = vfs.buildFileContext("src/app/main.ts");

      // Types should appear first and with full content
      expect(context.indexOf("src/types/index.ts")).toBeLessThan(
        context.indexOf("src/domain/user.ts")
      );
    });

    it("should include files from same directory", () => {
      vfs.set("src/app/utils.ts", "export function utilFn() {}");
      vfs.set("src/app/types.ts", "export interface AppConfig {}");

      const context = vfs.buildFileContext("src/app/main.ts");

      expect(context).toContain("src/app/utils.ts");
      expect(context).toContain("utilFn");
    });
  });

  describe("stats", () => {
    it("should calculate file statistics", () => {
      vfs.set("file1.ts", "line1\nline2\nline3");
      vfs.set("file2.ts", "single line");

      const stats = vfs.stats;

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalLines).toBe(4); // 3 + 1
      expect(stats.totalBytes).toBeGreaterThan(0);
    });
  });
});
