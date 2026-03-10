/**
 * Minimal type declarations for node:sqlite
 * This allows typecheck to pass without Node.js 22+ types
 */
declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(location: string, options?: { open?: boolean });
    open(): void;
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }

  export class StatementSync {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  export interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }
}
