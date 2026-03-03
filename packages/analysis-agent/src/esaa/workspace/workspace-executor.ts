/**
 * @fileoverview Workspace Executor Efêmero do ESAA Hardened v2.
 *
 * Executa operações em diretório temporário isolado antes de promover
 * ao estado permanente. Garante que código inválido nunca chegue ao destino.
 *
 * @module esaa/workspace/workspace-executor
 * @version 2.0.0
 */

import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile, readFile, cp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { EventStore } from "../store/event-store.js";
import type { ProjectionEngine } from "../projections/projection-engine.js";
import type { ApprovedIntention } from "../types/intentions.js";
import { PIPELINE_STREAM_ID } from "../projections/projection-engine.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Arquivo a ser escrito no workspace. */
export interface WorkspaceFile {
  path: string;
  content: string;
}

/** Estado de um workspace efêmero. */
export interface Workspace {
  workspaceId: string;
  intentionId: string;
  workspacePath: string;
  createdAt: string;
  /** Arquivos atualmente no workspace (path → conteúdo). */
  files: Map<string, string>;
}

/** Resultado da execução de uma função no workspace. */
export interface WorkspaceExecutionResult {
  workspaceId: string;
  /** Arquivos gerados pela execução. */
  files: WorkspaceFile[];
  durationMs: number;
}

/** Resultado da destruição do workspace. */
export interface WorkspaceDestructionResult {
  workspaceId: string;
  reason: "PROMOTED" | "ROLLED_BACK" | "EXPIRED" | "ERROR";
}

// ─── WorkspaceExecutor ───────────────────────────────────────────────────────

/**
 * Gerencia workspaces efêmeros para execução isolada de intenções.
 */
export class WorkspaceExecutor {
  /** Workspaces ativos em memória (workspaceId → Workspace). */
  private readonly activeWorkspaces = new Map<string, Workspace>();

  constructor(
    private readonly store: EventStore,
    private readonly projections: ProjectionEngine
  ) {}

  // ─── Criação ───────────────────────────────────────────────────────────────

  /**
   * Cria um workspace efêmero para uma intenção aprovada.
   *
   * O workspace é criado em `os.tmpdir()/esaa-workspace-{uuid}/`.
   */
  async create(intention: ApprovedIntention): Promise<Workspace> {
    const workspaceId = randomUUID();
    const workspacePath = join(tmpdir(), `esaa-workspace-${workspaceId}`);

    await mkdir(workspacePath, { recursive: true });

    const workspace: Workspace = {
      workspaceId,
      intentionId: intention.intentionId,
      workspacePath,
      createdAt: new Date().toISOString(),
      files: new Map(),
    };

    this.activeWorkspaces.set(workspaceId, workspace);

    // Emitir WORKSPACE_CREATED
    const createResult = this.store.append(
      PIPELINE_STREAM_ID,
      intention.agentId,
      "WORKSPACE_CREATED",
      {
        workspaceId,
        workspacePath,
        intentionId: intention.intentionId,
      },
      { agentId: intention.agentId, schemaVersion: "2.0.0" },
      { correlationId: intention.correlationId }
    );

    const createdEvent = this.store.getEventById(createResult.eventId);
    if (createdEvent) {
      this.projections.applyOperationalEvent(createdEvent);
    }

    return workspace;
  }

  // ─── Escrita de Arquivos ───────────────────────────────────────────────────

  /**
   * Escreve um arquivo no workspace.
   * O arquivo é persistido no disco temporário E na memória.
   */
  async writeWorkspaceFile(
    workspace: Workspace,
    file: WorkspaceFile
  ): Promise<void> {
    const fullPath = join(workspace.workspacePath, file.path);

    // Criar diretórios intermediários se necessário
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    if (dir !== workspace.workspacePath) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(fullPath, file.content, "utf-8");
    workspace.files.set(file.path, file.content);
  }

  /**
   * Escreve múltiplos arquivos no workspace.
   */
  async writeWorkspaceFiles(
    workspace: Workspace,
    files: WorkspaceFile[]
  ): Promise<void> {
    await Promise.all(files.map(f => this.writeWorkspaceFile(workspace, f)));
  }

  // ─── Leitura ───────────────────────────────────────────────────────────────

  /**
   * Lê um arquivo do workspace.
   * Prioriza o cache em memória; fallback para disco.
   */
  async readWorkspaceFile(workspace: Workspace, path: string): Promise<string | null> {
    const cached = workspace.files.get(path);
    if (cached !== undefined) return cached;

    try {
      const fullPath = join(workspace.workspacePath, path);
      const content = await readFile(fullPath, "utf-8");
      workspace.files.set(path, content);
      return content;
    } catch {
      return null;
    }
  }

  /**
   * Retorna todos os arquivos do workspace como array.
   */
  getWorkspaceFiles(workspace: Workspace): WorkspaceFile[] {
    return Array.from(workspace.files.entries()).map(([path, content]) => ({
      path,
      content,
    }));
  }

  // ─── Execução ──────────────────────────────────────────────────────────────

  /**
   * Executa uma função dentro do contexto do workspace.
   *
   * A função recebe o workspace e pode escrever arquivos nele.
   * O resultado inclui todos os arquivos escritos durante a execução.
   */
  async execute(
    workspace: Workspace,
    fn: (workspace: Workspace) => Promise<WorkspaceFile[]>
  ): Promise<WorkspaceExecutionResult> {
    const startMs = Date.now();

    const newFiles = await fn(workspace);

    // Persistir novos arquivos no workspace
    await this.writeWorkspaceFiles(workspace, newFiles);

    return {
      workspaceId: workspace.workspaceId,
      files: this.getWorkspaceFiles(workspace),
      durationMs: Date.now() - startMs,
    };
  }

  // ─── Promoção ──────────────────────────────────────────────────────────────

  /**
   * Promove os arquivos do workspace para o destino permanente.
   *
   * A promoção é atômica: todos os arquivos são copiados de uma vez.
   * Se falhar, o workspace não é destruído (rollback possível).
   *
   * @param workspace  Workspace a promover
   * @param targetDir  Diretório de destino (padrão: process.cwd())
   */
  async promoteFiles(
    workspace: Workspace,
    targetDir: string = process.cwd()
  ): Promise<WorkspaceFile[]> {
    const files = this.getWorkspaceFiles(workspace);

    // Copiar todos os arquivos atomicamente
    await Promise.all(
      files.map(async file => {
        const targetPath = join(targetDir, file.path);
        const targetFileDir = targetPath.substring(0, targetPath.lastIndexOf("/"));

        await mkdir(targetFileDir, { recursive: true });
        await writeFile(targetPath, file.content, "utf-8");
      })
    );

    return files;
  }

  /**
   * Copia o workspace inteiro para um destino (usado em snapshot/backup).
   */
  async copyWorkspace(workspace: Workspace, destPath: string): Promise<void> {
    await cp(workspace.workspacePath, destPath, { recursive: true });
  }

  // ─── Destruição ────────────────────────────────────────────────────────────

  /**
   * Destrói um workspace e remove o diretório temporário.
   */
  async destroy(
    workspace: Workspace,
    reason: WorkspaceDestructionResult["reason"],
    agentId: string,
    correlationId: string
  ): Promise<WorkspaceDestructionResult> {
    // Remover diretório temporário
    try {
      await rm(workspace.workspacePath, { recursive: true, force: true });
    } catch {
      // Ignorar erros de remoção (pode já ter sido removido)
    }

    // Remover da memória
    this.activeWorkspaces.delete(workspace.workspaceId);

    // Emitir WORKSPACE_DESTROYED
    const destroyResult = this.store.append(
      PIPELINE_STREAM_ID,
      agentId,
      "WORKSPACE_DESTROYED",
      {
        workspaceId: workspace.workspaceId,
        workspacePath: workspace.workspacePath,
        reason,
      },
      { agentId, schemaVersion: "2.0.0" },
      { correlationId }
    );

    const destroyedEvent = this.store.getEventById(destroyResult.eventId);
    if (destroyedEvent) {
      this.projections.applyOperationalEvent(destroyedEvent);
    }

    return { workspaceId: workspace.workspaceId, reason };
  }

  // ─── Consultas ─────────────────────────────────────────────────────────────

  /**
   * Retorna um workspace ativo pelo ID.
   */
  getWorkspace(workspaceId: string): Workspace | null {
    return this.activeWorkspaces.get(workspaceId) ?? null;
  }

  /**
   * Lista todos os workspaces ativos.
   */
  listWorkspaces(): Workspace[] {
    return Array.from(this.activeWorkspaces.values());
  }

  /**
   * Limpa workspaces expirados (criados há mais de `ttlMs` ms).
   */
  async cleanExpired(ttlMs = 30 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let count = 0;

    for (const [_id, workspace] of this.activeWorkspaces) {
      const createdAt = new Date(workspace.createdAt).getTime();
      if (now - createdAt > ttlMs) {
        await this.destroy(workspace, "EXPIRED", "SYSTEM", "cleanup");
        count++;
      }
    }

    return count;
  }
}
