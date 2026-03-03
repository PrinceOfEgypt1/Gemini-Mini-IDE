/**
 * Declarações de tipo para o módulo `node:sqlite` (built-in, Node.js >= 22.5.0).
 *
 * O módulo é experimental mas estável o suficiente para uso interno.
 * Referência: https://nodejs.org/api/sqlite.html
 */
declare module "node:sqlite" {
  /** Tipos de valor aceitos por StatementSync como parâmetros. */
  type SqliteValue = null | number | string | bigint | Uint8Array;

  /** Resultado de uma operação run(). */
  interface RunResult {
    /** Número de linhas afetadas (INSERT/UPDATE/DELETE). */
    changes: number;
    /** ROWID da última linha inserida. */
    lastInsertRowid: number | bigint;
  }

  /** Statement preparado (synchronous). */
  class StatementSync {
    /**
     * Executa o statement e retorna o resultado.
     * Use para INSERT, UPDATE, DELETE.
     */
    run(...params: SqliteValue[]): RunResult;

    /**
     * Executa o statement e retorna a primeira linha.
     * Retorna undefined se não houver resultado.
     */
    get(...params: SqliteValue[]): Record<string, SqliteValue> | undefined;

    /**
     * Executa o statement e retorna todas as linhas.
     */
    all(...params: SqliteValue[]): Record<string, SqliteValue>[];
  }

  /** Opções de abertura do banco de dados. */
  interface DatabaseSyncOptions {
    /** Se false, abre o banco sem executar PRAGMA automaticamente. */
    open?: boolean;
    /** Se true, abre o banco em modo read-only. */
    readOnly?: boolean;
    /** Se true, permite extensões carregadas dinamicamente. */
    allowExtension?: boolean;
  }

  /** Banco de dados SQLite síncrono. */
  class DatabaseSync {
    /** Abre ou cria um banco de dados. Use ':memory:' para banco in-memory. */
    constructor(location: string, options?: DatabaseSyncOptions);

    /** Abre o banco (se foi criado com open:false). */
    open(): void;

    /** Fecha o banco e libera recursos. */
    close(): void;

    /**
     * Executa uma ou mais SQL statements (separadas por ;).
     * Não suporta parâmetros; use prepare() para isso.
     */
    exec(sql: string): void;

    /** Compila um SQL statement para execução repetida com parâmetros. */
    prepare(sql: string): StatementSync;
  }
}
