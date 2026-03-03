/**
 * @fileoverview ESAA Hardened v2 Orchestrator — Facade central.
 *
 * Ponto único de acesso ao sistema ESAA. Compõe todos os componentes
 * e integra com o pipeline existente do AnalysisAgent de forma transparente.
 *
 * Modo de operação:
 *   - `ESAA_ENABLED=true`  → usa pipeline ESAA com event sourcing
 *   - `ESAA_ENABLED=false` → bypassa ESAA (backward compat para testes)
 *
 * @module esaa/orchestrator
 * @version 2.0.0
 */

import { EventStore } from "./store/event-store.js";
import { ProjectionEngine, PIPELINE_STREAM_ID } from "./projections/projection-engine.js";
import { IntentionGateway } from "./gateway/intention-gateway.js";
import { PolicyEngine } from "./policy/policy-engine.js";
import { InvariantEngine } from "./policy/invariant-engine.js";
import { WorkspaceExecutor } from "./workspace/workspace-executor.js";
import { PromotionController } from "./promotion/promotion-controller.js";
import { RecoveryController } from "./recovery/recovery-controller.js";
import type { ESAAEvent } from "./types/events.js";
import type { OperationalProjection, AuditProjection } from "./types/projections.js";
import type { RecoveryResult } from "./recovery/recovery-controller.js";
import type { PromotionResult, PromotionRequest } from "./promotion/promotion-controller.js";
import type { ProposeResult } from "./gateway/intention-gateway.js";
import type { ApprovedIntention } from "./types/intentions.js";
import type { WorkspaceFile, Workspace } from "./workspace/workspace-executor.js";

// ─── Tipos Públicos ───────────────────────────────────────────────────────────

/** Configuração do ESAA Orchestrator. */
export interface ESAAConfig {
  /** Caminho para o banco SQLite. Padrão: .esaa-events.db */
  dbPath?: string;
  /** Se true, habilita o modo ESAA completo. */
  enabled: boolean;
}

/** Status de saúde do sistema ESAA. */
export interface ESAAHealthStatus {
  enabled: boolean;
  dbPath: string;
  streamVersion: number;
  operational: {
    activeAgents: number;
    quarantinedAgents: number;
    activeIntentions: number;
    activeWorkspaces: number;
    activePromotions: number;
    projectionHash: string;
  };
  uptime: number;
}

// ─── ESAAOrchestrator ─────────────────────────────────────────────────────────

/**
 * Facade do ESAA Hardened v2.
 *
 * Cria e conecta todos os componentes internos.
 * Expõe uma API limpa para o AnalysisAgent e para o servidor HTTP.
 */
export class ESAAOrchestrator {
  readonly store: EventStore;
  readonly projections: ProjectionEngine;
  readonly gateway: IntentionGateway;
  readonly policy: PolicyEngine;
  readonly invariants: InvariantEngine;
  readonly workspaceExecutor: WorkspaceExecutor;
  readonly promotion: PromotionController;
  readonly recovery: RecoveryController;

  private readonly startTime: number;
  readonly config: ESAAConfig;

  constructor(config: ESAAConfig) {
    this.config = config;
    this.startTime = Date.now();

    // Compor componentes
    this.store = new EventStore(config.dbPath);
    this.projections = new ProjectionEngine(this.store);
    this.policy = new PolicyEngine();
    this.invariants = new InvariantEngine();
    this.gateway = new IntentionGateway(
      this.store,
      this.projections,
      this.policy,
      this.invariants
    );
    this.workspaceExecutor = new WorkspaceExecutor(this.store, this.projections);
    this.promotion = new PromotionController(
      this.store,
      this.projections,
      this.workspaceExecutor
    );
    this.recovery = new RecoveryController(
      this.store,
      this.projections,
      this.promotion
    );
  }

  // ─── Pipeline Principal ────────────────────────────────────────────────────

  /**
   * Executa um pipeline completo via ESAA.
   *
   * O pipeline:
   *   1. Propõe intenção FULL_PIPELINE ao gateway
   *   2. Se aprovada, cria workspace efêmero
   *   3. Executa o pipeline (função passada pelo caller)
   *   4. Promove via gates de qualidade
   *   5. Verifica auto-quarentena de agente
   *
   * @param agentId    ID do agente executando o pipeline
   * @param userPrompt Prompt do usuário
   * @param execute    Função que executa o pipeline e retorna os arquivos
   * @param correlationId ID de correlação (opcional, gerado se ausente)
   */
  async runPipeline(
    agentId: string,
    userPrompt: string,
    execute: (workspace: Workspace) => Promise<WorkspaceFile[]>,
    correlationId?: string
  ): Promise<{ correlationId: string; result: PromotionResult | null; skipped: boolean }> {
    if (!this.config.enabled) {
      return { correlationId: correlationId ?? "bypass", result: null, skipped: true };
    }

    // 1. Propor intenção
    const proposeResult: ProposeResult<{ userPrompt: string }> = await this.gateway.propose(
      agentId,
      "FULL_PIPELINE",
      { userPrompt },
      { correlationId }
    );

    if (proposeResult.outcome === "rejected") {
      throw new Error(
        `Intenção FULL_PIPELINE rejeitada: ${proposeResult.reasons.join("; ")}`
      );
    }

    const approvedIntention = proposeResult.intention as ApprovedIntention<{ userPrompt: string }>;

    // 2. Emitir EXECUTION_STARTED
    const execStartResult = this.store.append(
      PIPELINE_STREAM_ID,
      agentId,
      "EXECUTION_STARTED",
      {
        intentionId: approvedIntention.intentionId,
        workspaceId: "",
        workspacePath: "",
        step: "FULL_PIPELINE",
      },
      { agentId, schemaVersion: "2.0.0" },
      { correlationId: approvedIntention.correlationId }
    );
    const execStartEvent = this.store.getEventById(execStartResult.eventId);
    if (execStartEvent) this.projections.applyOperationalEvent(execStartEvent);

    // 3. Criar workspace
    const workspace = await this.workspaceExecutor.create(approvedIntention);

    const startMs = Date.now();
    let files: WorkspaceFile[] = [];

    try {
      // 4. Executar pipeline
      files = await this.workspaceExecutor.execute(workspace, execute).then(r => r.files);

      // 5. Emitir EXECUTION_SUCCEEDED
      const succeedResult = this.store.append(
        PIPELINE_STREAM_ID,
        agentId,
        "EXECUTION_SUCCEEDED",
        {
          intentionId: approvedIntention.intentionId,
          workspaceId: workspace.workspaceId,
          filesGenerated: files.length,
          filePaths: files.map(f => f.path),
          durationMs: Date.now() - startMs,
        },
        { agentId, schemaVersion: "2.0.0" },
        { correlationId: approvedIntention.correlationId }
      );
      const succeedEvent = this.store.getEventById(succeedResult.eventId);
      if (succeedEvent) {
        this.projections.applyOperationalEvent(succeedEvent);
        this.projections.applyAuditEvent(succeedEvent);
      }

      // 6. Promover via gates
      const promotionRequest: PromotionRequest = {
        intentionId: approvedIntention.intentionId,
        correlationId: approvedIntention.correlationId,
        workspaceId: workspace.workspaceId,
        workspace,
        agentId,
      };

      const promotionResult = await this.promotion.promote(promotionRequest);

      // 7. Verificar auto-quarentena (se promoção rejeitada)
      if (promotionResult.outcome === "REJECTED") {
        this.recovery.checkAutoQuarantine(agentId, execStartResult.eventId);
      }

      return {
        correlationId: approvedIntention.correlationId,
        result: promotionResult,
        skipped: false,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Emitir EXECUTION_FAILED
      const failResult = this.store.append(
        PIPELINE_STREAM_ID,
        agentId,
        "EXECUTION_FAILED",
        {
          intentionId: approvedIntention.intentionId,
          workspaceId: workspace.workspaceId,
          error: errorMessage,
          durationMs: Date.now() - startMs,
          attempt: 1,
          maxAttempts: 1,
        },
        { agentId, schemaVersion: "2.0.0" },
        { correlationId: approvedIntention.correlationId }
      );
      const failEvent = this.store.getEventById(failResult.eventId);
      if (failEvent) {
        this.projections.applyOperationalEvent(failEvent);
        this.projections.applyAuditEvent(failEvent);
      }

      // Verificar auto-quarentena
      this.recovery.checkAutoQuarantine(agentId, failResult.eventId);

      // Destruir workspace
      await this.workspaceExecutor.destroy(
        workspace,
        "ERROR",
        agentId,
        approvedIntention.correlationId
      );

      throw err;
    }
  }

  // ─── API Pública ───────────────────────────────────────────────────────────

  /**
   * Retorna status de saúde do sistema ESAA.
   */
  healthStatus(): ESAAHealthStatus {
    const status = this.recovery.getSystemStatus();
    const streamVersion = this.store.getStreamVersion(PIPELINE_STREAM_ID);

    return {
      enabled: this.config.enabled,
      dbPath: this.config.dbPath ?? ".esaa-events.db",
      streamVersion,
      operational: {
        activeAgents: status.activeAgents,
        quarantinedAgents: status.quarantinedAgents,
        activeIntentions: status.activeIntentions,
        activeWorkspaces: status.activeWorkspaces,
        activePromotions: status.activePromotions,
        projectionHash: status.projection.hash,
      },
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Consulta eventos por critério.
   */
  queryEvents(opts: Parameters<EventStore["query"]>[0]): ESAAEvent[] {
    return this.store.query(opts);
  }

  /**
   * Retorna a projeção operacional atual.
   */
  getOperationalProjection(): OperationalProjection {
    return this.projections.getOperational();
  }

  /**
   * Retorna a projeção de auditoria atual.
   */
  getAuditProjection(): AuditProjection {
    return this.projections.getAudit();
  }

  /**
   * Cria snapshots de ambas as projeções.
   */
  createSnapshots(): ReturnType<RecoveryController["createSnapshots"]> {
    return this.recovery.createSnapshots("ESAA_ORCHESTRATOR");
  }

  /**
   * Rollback para um snapshot.
   */
  rollbackToSnapshot(snapshotId: string): RecoveryResult {
    return this.recovery.rollbackToSnapshot(snapshotId, "ESAA_ORCHESTRATOR");
  }

  /**
   * Replay completo.
   */
  async fullReplay(): Promise<RecoveryResult> {
    return this.recovery.fullReplay("ESAA_ORCHESTRATOR");
  }

  /**
   * Quarentena um agente.
   */
  quarantineAgent(
    agentId: string,
    reason: string,
    triggeringEventId: string
  ): RecoveryResult {
    return this.recovery.quarantineAgent({
      agentId,
      reason,
      triggeringEventId,
      operatorId: "ESAA_ORCHESTRATOR",
    });
  }

  /**
   * Reintegra um agente quarentenado.
   */
  reinstateAgent(agentId: string): RecoveryResult {
    return this.recovery.reinstateAgent({
      agentId,
      operatorId: "ESAA_ORCHESTRATOR",
    });
  }

  /**
   * Fecha a conexão com o banco de dados.
   * Deve ser chamado ao encerrar o processo.
   */
  close(): void {
    this.store.close();
  }
}

// ─── Singleton Global ─────────────────────────────────────────────────────────

/** Instância global do ESAA Orchestrator. */
export const globalESAAOrchestrator = new ESAAOrchestrator({
  enabled: process.env["ESAA_ENABLED"] === "true",
  dbPath: process.env["ESAA_DB_PATH"],
});
