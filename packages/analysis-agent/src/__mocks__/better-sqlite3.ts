// Mock for better-sqlite3 to allow tests to run without native module

interface MockStatement {
  run: () => { changes: number; lastInsertRowid: number };
  get: () => undefined;
  all: () => unknown[];
  iterate: () => Generator<never, void, unknown>;
  bind: () => MockStatement;
  pluck: () => MockStatement;
  expand: () => MockStatement;
  raw: () => MockStatement;
  columns: () => unknown[];
  safeIntegers: () => MockStatement;
}

export class Database {
  constructor(_filename: string, _options?: unknown) {
    // Mock constructor
  }

  prepare(_sql: string): MockStatement {
    const stmt: MockStatement = {
      run: () => ({ changes: 0, lastInsertRowid: 0 }),
      get: () => undefined,
      all: () => [],
      iterate: function* () { yield* []; },
      bind: () => stmt,
      pluck: () => stmt,
      expand: () => stmt,
      raw: () => stmt,
      columns: () => [],
      safeIntegers: () => stmt
    };
    return stmt;
  }

  exec(_sql: string): this {
    return this;
  }

  pragma(_pragma: string, _options?: unknown): unknown[] {
    return [];
  }

  transaction<T>(fn: () => T): () => T {
    return fn;
  }

  close(): void {
    // Mock close
  }

  get open(): boolean {
    return true;
  }

  get inTransaction(): boolean {
    return false;
  }

  get name(): string {
    return ':memory:';
  }

  get memory(): boolean {
    return true;
  }

  get readonly(): boolean {
    return false;
  }
}

export default Database;
