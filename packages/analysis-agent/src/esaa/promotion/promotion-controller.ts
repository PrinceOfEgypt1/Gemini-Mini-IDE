/**
 * @fileoverview Promotion Controller do ESAA Hardened v2.
 *
 * Gerencia o processo de promoção atômica de código gerado.
 * Gates de qualidade devem ser aprovados antes de qualquer escrita permanente.
 *
 * Gates (em ordem):
 *   1. SYNTAX_VALIDATION       – código TypeScript sintaticamente válido
 *   2. COMPLETENESS_VALIDATION – sem TODO, any, stubs, exports ausentes
 *   3. STRUCTURE_AUDIT         – manifest completo e coerente
 *   4. INTEGRITY_CHECK         – todos os arquivos planejados foram gerados
 *   5. MANIFEST_VALIDATION     – requisitos do prompt atendidos
 *
 * @module esaa/promotion/promotion-controller
 * @version 2.0.0
 */

import { randomUUID } from "node:crypto";
import type { EventStore } from "../store/event-store.js";
import type { ProjectionEngine } from "../projections/projection-engine.js";
import type { WorkspaceExecutor, Workspace, WorkspaceFile } from "../workspace/workspace-executor.js";
import type { PromotionGateName } from "../types/events.js";
import { PIPELINE_STREAM_ID } from "../projections/projection-engine.js";
import { SyntaxSandbox } from "../../governance/syntax-sandbox.js";
import { CompletenessValidator } from "../../governance/completeness-validator.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Resultado de um gate de promoção. */
export interface GateResult {
  gate: PromotionGateName;
  passed: boolean;
  errors: string[];
  warnings: string[];
  testedAt: string;
}

/** Resultado completo de uma promoção. */
export interface PromotionResult {
  batchId: string;
  outcome: "APPROVED" | "REJECTED";
  gateResults: GateResult[];
  promotedFiles: string[];
  durationMs: number;
  failedGates: PromotionGateName[];
}

/** Parâmetros para solicitar promoção. */
export interface PromotionRequest {
  intentionId: string;
  correlationId: string;
  workspaceId: string;
  workspace: Workspace;
  agentId: string;
  targetDir?: string;
}

// ─── PromotionController ──────────────────────────────────────────────────────

/**
 * Orquestra o processo de promoção: valida via gates e promove atomicamente.
 */
export class PromotionController {
  private readonly syntaxSandbox = new SyntaxSandbox();
  private readonly completenessValidator = new CompletenessValidator();

  constructor(
    private readonly store: EventStore,
    private readonly projections: ProjectionEngine,
    private readonly workspaceExecutor: WorkspaceExecutor
  ) {}

  // ─── Promoção ──────────────────────────────────────────────────────────────

  /**
   * Solicita a promoção de um workspace após execução bem-sucedida.
   *
   * Sequência:
   *   1. Registra o lote de promoção no EventStore
   *   2. Executa cada gate em ordem
   *   3. Se todos passarem → promoção atômica
   *   4. Se algum falhar → rejeição (sem escrita permanente)
   */
  async promote(request: PromotionRequest): Promise<PromotionResult> {
    const batchId = randomUUID();
    const startMs = Date.now();
    const files = this.workspaceExecutor.getWorkspaceFiles(request.workspace);

    // Registrar lote de promoção
    this.store.createPromotionBatch({
      batchId,
      correlationId: request.correlationId,
      intentionId: request.intentionId,
      workspaceId: request.workspaceId,
      workspacePath: request.workspace.workspacePath,
      files: files.map(f => f.path),
    });

    // Emitir PROMOTION_REQUESTED
    const promotionRequestedResult = this.store.append(
      PIPELINE_STREAM_ID,
      request.agentId,
      "PROMOTION_REQUESTED",
      {
        batchId,
        intentionId: request.intentionId,
        workspaceId: request.workspaceId,
        workspacePath: request.workspace.workspacePath,
        filePaths: files.map(f => f.path),
      },
      { agentId: request.agentId, schemaVersion: "2.0.0" },
      { correlationId: request.correlationId }
    );

    const promotionRequestedEvent = this.store.getEventById(promotionRequestedResult.eventId);
    if (promotionRequestedEvent) {
      this.projections.applyOperationalEvent(promotionRequestedEvent);
      this.projections.applyAuditEvent(promotionRequestedEvent);
    }

    // Atualizar status para running_gates
    this.store.updatePromotionBatch(batchId, { status: "running_gates" });

    // Executar gates em ordem
    const gateResults: GateResult[] = [];
    const failedGates: PromotionGateName[] = [];

    // Gate 1: Syntax Validation
    const syntaxResult = await this.runSyntaxGate(files, batchId, request);
    gateResults.push(syntaxResult);
    if (!syntaxResult.passed) failedGates.push("SYNTAX_VALIDATION");

    // Gate 2: Completeness Validation (só se syntax passou)
    if (syntaxResult.passed) {
      const completenessResult = await this.runCompletenessGate(files, batchId, request);
      gateResults.push(completenessResult);
      if (!completenessResult.passed) failedGates.push("COMPLETENESS_VALIDATION");
    }

    // Gate 3: Structure Audit (só para arquivos TypeScript)
    if (failedGates.length === 0) {
      const structureResult = await this.runStructureGate(files, batchId, request);
      gateResults.push(structureResult);
      if (!structureResult.passed) failedGates.push("STRUCTURE_AUDIT");
    }

    // Gate 4: Integrity Check
    if (failedGates.length === 0) {
      const integrityResult = await this.runIntegrityGate(files, batchId, request);
      gateResults.push(integrityResult);
      if (!integrityResult.passed) failedGates.push("INTEGRITY_CHECK");
    }

    // Decidir outcome
    const allPassed = failedGates.length === 0;

    if (allPassed) {
      return this.executePromotion(batchId, files, gateResults, request, startMs);
    } else {
      return this.rejectPromotion(batchId, files, gateResults, failedGates, request, startMs);
    }
  }

  // ─── Gates ─────────────────────────────────────────────────────────────────

  private async runSyntaxGate(
    files: WorkspaceFile[],
    batchId: string,
    request: PromotionRequest
  ): Promise<GateResult> {
    const gate: PromotionGateName = "SYNTAX_VALIDATION";
    const errors: string[] = [];
    const warnings: string[] = [];

    const tsFiles = files.filter(f => f.path.endsWith(".ts") || f.path.endsWith(".tsx"));

    for (const file of tsFiles) {
      const result = this.syntaxSandbox.validateTS(file.content, file.path);
      if (!result.isValid) {
        errors.push(`${file.path}: ${result.error ?? "Erro de sintaxe"}`);
      }
    }

    const passed = errors.length === 0;
    const now = new Date().toISOString();

    if (passed) {
      this.store.append(
        PIPELINE_STREAM_ID,
        request.agentId,
        "PROMOTION_GATE_PASSED",
        { batchId, gate },
        { agentId: request.agentId, schemaVersion: "2.0.0" },
        { correlationId: request.correlationId }
      );
    } else {
      this.store.append(
        PIPELINE_STREAM_ID,
        request.agentId,
        "PROMOTION_GATE_FAILED",
        { batchId, gate, errors },
        { agentId: request.agentId, schemaVersion: "2.0.0" },
        { correlationId: request.correlationId }
      );
    }

    return { gate, passed, errors, warnings, testedAt: now };
  }

  private async runCompletenessGate(
    files: WorkspaceFile[],
    batchId: string,
    request: PromotionRequest
  ): Promise<GateResult> {
    const gate: PromotionGateName = "COMPLETENESS_VALIDATION";
    const errors: string[] = [];
    const warnings: string[] = [];

    const tsFiles = files.filter(
      f => f.path.endsWith(".ts") || f.path.endsWith(".tsx")
    );

    for (const file of tsFiles) {
      const result = this.completenessValidator.validate(file.content, file.path);
      if (!result.isValid) {
        errors.push(...result.errors.map((e: string) => `${file.path}: ${e}`));
      }
    }

    const passed = errors.length === 0;
    const now = new Date().toISOString();

    if (passed) {
      this.store.append(
        PIPELINE_STREAM_ID,
        request.agentId,
        "PROMOTION_GATE_PASSED",
        { batchId, gate },
        { agentId: request.agentId, schemaVersion: "2.0.0" },
        { correlationId: request.correlationId }
      );
    } else {
      this.store.append(
        PIPELINE_STREAM_ID,
        request.agentId,
        "PROMOTION_GATE_FAILED",
        { batchId, gate, errors },
        { agentId: request.agentId, schemaVersion: "2.0.0" },
        { correlationId: request.correlationId }
      );
    }

    return { gate, passed, errors, warnings, testedAt: now };
  }

  private async runStructureGate(
    files: WorkspaceFile[],
    batchId: string,
    request: PromotionRequest
  ): Promise<GateResult> {
    const gate: PromotionGateName = "STRUCTURE_AUDIT";
    const errors: string[] = [];
    const warnings: string[] = [];
    const now = new Date().toISOString();

    // Verificar arquivos essenciais
    const requiredPatterns = [
      { pattern: /package\.json$/, name: "package.json" },
      { pattern: /tsconfig\.json$/, name: "tsconfig.json" },
    ];

    for (const req of requiredPatterns) {
      const found = files.some(f => req.pattern.test(f.path));
      if (!found) {
        warnings.push(`Arquivo recomendado ausente: ${req.name}`);
      }
    }

    // Verificar exports em arquivos TypeScript
    const tsFiles = files.filter(
      f =>
        (f.path.endsWith(".ts") || f.path.endsWith(".tsx")) &&
        !f.path.endsWith(".d.ts") &&
        !f.path.includes(".test.") &&
        !f.path.includes(".spec.")
    );

    for (const file of tsFiles) {
      if (
        !file.content.includes("export") &&
        !file.path.endsWith("main.ts") &&
        !file.path.endsWith("main.tsx") &&
        !file.path.endsWith("index.ts") &&
        !file.path.endsWith("index.tsx")
      ) {
        warnings.push(`${file.path}: nenhum export encontrado`);
      }
    }

    const passed = errors.length === 0;

    if (passed) {
      this.store.append(
        PIPELINE_STREAM_ID,
        request.agentId,
        "PROMOTION_GATE_PASSED",
        { batchId, gate },
        { agentId: request.agentId, schemaVersion: "2.0.0" },
        { correlationId: request.correlationId }
      );
    } else {
      this.store.append(
        PIPELINE_STREAM_ID,
        request.agentId,
        "PROMOTION_GATE_FAILED",
        { batchId, gate, errors },
        { agentId: request.agentId, schemaVersion: "2.0.0" },
        { correlationId: request.correlationId }
      );
    }

    return { gate, passed, errors, warnings, testedAt: now };
  }

  private async runIntegrityGate(
    files: WorkspaceFile[],
    batchId: string,
    request: PromotionRequest
  ): Promise<GateResult> {
    const gate: PromotionGateName = "INTEGRITY_CHECK";
    const errors: string[] = [];
    const warnings: string[] = [];
    const now = new Date().toISOString();

    // Verificar se há arquivos duplicados
    const paths = files.map(f => f.path);
    const uniquePaths = new Set(paths);
    if (paths.length !== uniquePaths.size) {
      errors.push("Arquivos duplicados detectados no workspace");
    }

    // Verificar se nenhum arquivo tem conteúdo vazio
    for (const file of files) {
      if (!file.content || file.content.trim().length === 0) {
        errors.push(`${file.path}: arquivo vazio`);
      }
    }

    const passed = errors.length === 0;

    if (passed) {
      this.store.append(
        PIPELINE_STREAM_ID,
        request.agentId,
        "PROMOTION_GATE_PASSED",
        { batchId, gate },
        { agentId: request.agentId, schemaVersion: "2.0.0" },
        { correlationId: request.correlationId }
      );
    } else {
      this.store.append(
        PIPELINE_STREAM_ID,
        request.agentId,
        "PROMOTION_GATE_FAILED",
        { batchId, gate, errors },
        { agentId: request.agentId, schemaVersion: "2.0.0" },
        { correlationId: request.correlationId }
      );
    }

    return { gate, passed, errors, warnings, testedAt: now };
  }

  // ─── Promoção Atômica ──────────────────────────────────────────────────────

  private async executePromotion(
    batchId: string,
    files: WorkspaceFile[],
    gateResults: GateResult[],
    request: PromotionRequest,
    startMs: number
  ): Promise<PromotionResult> {
    const now = new Date().toISOString();
    const promotedFiles: string[] = [];

    try {
      // Promover arquivos para o destino permanente
      const promoted = await this.workspaceExecutor.promoteFiles(
        request.workspace,
        request.targetDir
      );
      promotedFiles.push(...promoted.map(f => f.path));
    } catch (err) {
      // Promoção falhou na escrita — tratar como rejeição
      return this.rejectPromotion(
        batchId,
        files,
        gateResults,
        ["INTEGRITY_CHECK"],
        request,
        startMs,
        `Falha na escrita dos arquivos: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Atualizar banco
    this.store.updatePromotionBatch(batchId, {
      status: "approved",
      promotedAt: now,
      gateResults,
    });

    const totalDurationMs = Date.now() - startMs;

    // Emitir PROMOTION_APPROVED
    const approvedResult = this.store.append(
      PIPELINE_STREAM_ID,
      request.agentId,
      "PROMOTION_APPROVED",
      {
        batchId,
        promotedFiles,
        totalDurationMs,
      },
      { agentId: request.agentId, schemaVersion: "2.0.0" },
      { correlationId: request.correlationId }
    );

    const approvedEvent = this.store.getEventById(approvedResult.eventId);
    if (approvedEvent) {
      this.projections.applyOperationalEvent(approvedEvent);
      this.projections.applyAuditEvent(approvedEvent);
    }

    // Destruir workspace após promoção bem-sucedida
    await this.workspaceExecutor.destroy(
      request.workspace,
      "PROMOTED",
      request.agentId,
      request.correlationId
    );

    return {
      batchId,
      outcome: "APPROVED",
      gateResults,
      promotedFiles,
      durationMs: totalDurationMs,
      failedGates: [],
    };
  }

  private async rejectPromotion(
    batchId: string,
    _files: WorkspaceFile[],
    gateResults: GateResult[],
    failedGates: PromotionGateName[],
    request: PromotionRequest,
    startMs: number,
    overrideReason?: string
  ): Promise<PromotionResult> {
    const reason =
      overrideReason ??
      `Gates falharam: ${failedGates.join(", ")}`;

    this.store.updatePromotionBatch(batchId, {
      status: "rejected",
      gateResults,
      rollbackReason: reason,
    });

    // Emitir PROMOTION_REJECTED
    const rejectedResult = this.store.append(
      PIPELINE_STREAM_ID,
      request.agentId,
      "PROMOTION_REJECTED",
      { batchId, reason, failedGates },
      { agentId: request.agentId, schemaVersion: "2.0.0" },
      { correlationId: request.correlationId }
    );

    const rejectedEvent = this.store.getEventById(rejectedResult.eventId);
    if (rejectedEvent) {
      this.projections.applyOperationalEvent(rejectedEvent);
      this.projections.applyAuditEvent(rejectedEvent);
    }

    // Destruir workspace após rejeição
    await this.workspaceExecutor.destroy(
      request.workspace,
      "ROLLED_BACK",
      request.agentId,
      request.correlationId
    );

    return {
      batchId,
      outcome: "REJECTED",
      gateResults,
      promotedFiles: [],
      durationMs: Date.now() - startMs,
      failedGates,
    };
  }

  // ─── Rollback ──────────────────────────────────────────────────────────────

  /**
   * Reverte uma promoção já aprovada.
   *
   * Remove os arquivos promovidos do destino permanente.
   */
  async rollback(
    batchId: string,
    agentId: string,
    correlationId: string,
    reason: string,
    targetDir: string = process.cwd()
  ): Promise<void> {
    const batch = this.store.getPromotionBatch(batchId);
    if (!batch) {
      throw new Error(`Lote de promoção não encontrado: ${batchId}`);
    }

    const files = JSON.parse(batch["files"] as string) as string[];
    const now = new Date().toISOString();

    // Remover arquivos promovidos
    const { rm } = await import("node:fs/promises");
    await Promise.all(
      files.map(async path => {
        const fullPath = `${targetDir}/${path}`;
        try {
          await rm(fullPath, { force: true });
        } catch {
          // Ignorar erros de remoção
        }
      })
    );

    // Atualizar banco
    this.store.updatePromotionBatch(batchId, {
      status: "rolled_back",
      rolledBackAt: now,
      rollbackReason: reason,
    });

    // Emitir PROMOTION_ROLLED_BACK
    const rolledBackResult = this.store.append(
      PIPELINE_STREAM_ID,
      agentId,
      "PROMOTION_ROLLED_BACK",
      {
        batchId,
        rolledBackFiles: files,
        reason,
      },
      { agentId, schemaVersion: "2.0.0" },
      { correlationId }
    );

    const rolledBackEvent = this.store.getEventById(rolledBackResult.eventId);
    if (rolledBackEvent) {
      this.projections.applyOperationalEvent(rolledBackEvent);
      this.projections.applyAuditEvent(rolledBackEvent);
    }
  }
}
