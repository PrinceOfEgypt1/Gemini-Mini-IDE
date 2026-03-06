import { describe, it, expect } from "vitest";
import { ContractValidator } from "./contract-validator.js";

describe("ContractValidator", () => {
  const validator = new ContractValidator();

  describe("Class validation", () => {
    it("should pass when promised class exists", () => {
      const code = `
/**
 * Stack data structure
 */
export class Stack<T> {
  private items: T[] = [];

  /**
   * Push an item onto the stack
   */
  push(item: T): void {
    this.items.push(item);
  }

  /**
   * Pop an item from the stack
   */
  pop(): T | undefined {
    return this.items.pop();
  }
}
`;
      const purpose = "Stack class with push and pop methods";
      const result = validator.validate(code, purpose, "src/stack.ts");

      expect(result.isValid).toBe(true);
      expect(result.classes).toContain("Stack");
    });

    it("should fail when promised class is missing", () => {
      const code = `
/**
 * Some other class
 */
export class Queue<T> {
  enqueue(item: T): void {}
}
`;
      const purpose = "Stack class with push and pop methods";
      const result = validator.validate(code, purpose, "src/stack.ts");

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.type === "MISSING_CLASS")).toBe(true);
    });
  });

  describe("Method validation", () => {
    it("should pass when all promised methods exist", () => {
      const code = `
/**
 * Stack implementation
 */
export class Stack<T> {
  private items: T[] = [];

  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
  peek(): T | undefined { return this.items[this.items.length - 1]; }
  isEmpty(): boolean { return this.items.length === 0; }
}
`;
      const purpose = "Stack class with push, pop, peek, isEmpty methods";
      const result = validator.validate(code, purpose, "src/stack.ts");

      expect(result.isValid).toBe(true);
      expect(result.methods.get("Stack")).toEqual(
        expect.arrayContaining(["push", "pop", "peek", "isEmpty"])
      );
    });

    it("should fail when promised method is missing", () => {
      const code = `
/**
 * Incomplete Stack
 */
export class Stack<T> {
  private items: T[] = [];

  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}
`;
      const purpose = "Stack class with push, pop, peek methods";
      const result = validator.validate(code, purpose, "src/stack.ts");

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v =>
        v.type === "MISSING_METHOD" && v.expected.includes("peek")
      )).toBe(true);
    });
  });

  describe("Stub detection", () => {
    it("should detect 'Not implemented' stubs", () => {
      const code = `
/**
 * Stack class
 */
export class Stack<T> {
  push(item: T): void {
    throw new Error("Not implemented");
  }
}
`;
      const result = validator.validate(code, "Stack class", "src/stack.ts");

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.type === "STUB_DETECTED")).toBe(true);
    });

    it("should detect empty method bodies", () => {
      const code = `
/**
 * Stack class
 */
export class Stack<T> {
  push(item: T): void {}
}
`;
      const result = validator.validate(code, "Stack class", "src/stack.ts");

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.type === "EMPTY_IMPLEMENTATION")).toBe(true);
    });

    it("should detect methods that only return null/undefined", () => {
      const code = `
/**
 * Stack class
 */
export class Stack<T> {
  pop(): T | undefined { return undefined; }
}
`;
      const result = validator.validate(code, "Stack class", "src/stack.ts");

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.type === "STUB_DETECTED")).toBe(true);
    });
  });

  describe("Interface validation", () => {
    it("should validate interface existence", () => {
      const code = `
/**
 * Sortable interface
 */
export interface Sortable<T> {
  sort(): T[];
}

/**
 * Comparable interface
 */
export interface Comparable<T> {
  compareTo(other: T): number;
}
`;
      const purpose = "interface Sortable and interface Comparable";
      const result = validator.validate(code, purpose, "src/interfaces.ts");

      expect(result.isValid).toBe(true);
      expect(result.interfaces).toContain("Sortable");
      expect(result.interfaces).toContain("Comparable");
    });
  });

  describe("Non-TypeScript files", () => {
    it("should skip validation for non-TS files", () => {
      const code = "# README";
      const result = validator.validate(code, "Documentation", "README.md");

      expect(result.isValid).toBe(true);
    });

    it("should skip validation for JSON files", () => {
      const code = '{ "name": "test" }';
      const result = validator.validate(code, "Config file", "package.json");

      expect(result.isValid).toBe(true);
    });
  });

  describe("Complex purpose parsing", () => {
    it("should handle Portuguese descriptions with method counts", () => {
      const code = `
/**
 * Binary Search Tree implementation
 */
export class BinarySearchTree<T> {
  insert(value: T): void { /* impl */ }
  search(value: T): boolean { return true; }
  remove(value: T): void { /* impl */ }
  inOrder(): T[] { return []; }
  preOrder(): T[] { return []; }
}
`;
      const purpose = "BinarySearchTree class com insert, search, remove, inOrder, preOrder (5 métodos)";
      const result = validator.validate(code, purpose, "src/bst.ts");

      expect(result.isValid).toBe(true);
      expect(result.methods.get("BinarySearchTree")?.length).toBeGreaterThanOrEqual(5);
    });

    it("should extract common data structure method names", () => {
      const code = `
/**
 * Queue implementation
 */
export class Queue<T> {
  enqueue(item: T): void { /* impl */ }
  dequeue(): T | undefined { return undefined; }
  peek(): T | undefined { return undefined; }
  isEmpty(): boolean { return true; }
  size(): number { return 0; }
}
`;
      const purpose = "Queue class with enqueue, dequeue, peek, isEmpty and size operations";
      const result = validator.validate(code, purpose, "src/queue.ts");

      expect(result.classes).toContain("Queue");
      expect(result.methods.get("Queue")).toEqual(
        expect.arrayContaining(["enqueue", "dequeue", "peek", "isEmpty", "size"])
      );
    });
  });
});
