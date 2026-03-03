/**
 * @fileoverview Policy Engine do ESAA Hardened v2.
 *
 * Classifica o risco de intenções e verifica permissões dos agentes.
 * Roda antes da execução de qualquer intenção.
 *
 * @module esaa/policy/policy-engine
 * @version 2.0.0
 */

import type { IntentionType, RiskLevel } from "../types/events.js";
import type { Intention } from "../types/intentions.js";
import type { OperationalProjection } from "../types/projections.js";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Permissões de um agente no sistema. */
export interface AgentPermissions {
  agentId: string;
  /** Tipos de intenção que este agente pode propor. */
  allowedIntentionTypes: IntentionType[];
  /** Máximo de risco permitido sem aprovação manual. */
  maxAutoApproveRisk: RiskLevel;
  /** Se pode quarentenar outros agentes. */
  canQuarantine: boolean;
  /** Se pode reinstate agentes quarentenados. */
  canReinstate: boolean;
}

/** Resultado da avaliação de política. */
export interface PolicyEvaluationResult {
  approved: boolean;
  riskLevel: RiskLevel;
  /** Requer aprovação humana (risco CRITICAL ou agente sem permissão auto). */
  requiresHumanApproval: boolean;
  /** Razões para rejeição (vazio se aprovado). */
  rejectionReasons: string[];
  /** Warnings não-bloqueantes. */
  warnings: string[];
}

// ─── Mapeamento de Risco por Tipo de Intenção ────────────────────────────────

/** Risco padrão de cada tipo de intenção. */
const INTENTION_RISK_MAP: Record<IntentionType, RiskLevel> = {
  GENERATE_ANALYSIS: "LOW",
  GENERATE_PRODUCT: "LOW",
  GENERATE_ARCHITECTURE: "MEDIUM",
  GENERATE_USER_STORIES: "LOW",
  GENERATE_FILE: "MEDIUM",
  AUDIT_MANIFEST: "LOW",
  FULL_PIPELINE: "HIGH",
};

/** Níveis de risco em ordem crescente (para comparação). */
const RISK_ORDER: Record<RiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

// ─── Permissões Padrão ───────────────────────────────────────────────────────

/** Permissões padrão para um agente novo (conservadoras). */
const DEFAULT_PERMISSIONS: Omit<AgentPermissions, "agentId"> = {
  allowedIntentionTypes: [
    "GENERATE_ANALYSIS",
    "GENERATE_PRODUCT",
    "GENERATE_ARCHITECTURE",
    "GENERATE_USER_STORIES",
    "GENERATE_FILE",
    "AUDIT_MANIFEST",
    "FULL_PIPELINE",
  ],
  maxAutoApproveRisk: "HIGH",
  canQuarantine: false,
  canReinstate: false,
};

/** Permissões de administrador (ESAA_ORCHESTRATOR). */
const ADMIN_PERMISSIONS: Omit<AgentPermissions, "agentId"> = {
  allowedIntentionTypes: [
    "GENERATE_ANALYSIS",
    "GENERATE_PRODUCT",
    "GENERATE_ARCHITECTURE",
    "GENERATE_USER_STORIES",
    "GENERATE_FILE",
    "AUDIT_MANIFEST",
    "FULL_PIPELINE",
  ],
  maxAutoApproveRisk: "HIGH",
  canQuarantine: true,
  canReinstate: true,
};

// ─── PolicyEngine ─────────────────────────────────────────────────────────────

/**
 * Avalia se uma intenção pode ser executada pelo agente que a propôs.
 */
export class PolicyEngine {
  /** Registro de permissões customizadas (agentId → permissões). */
  private readonly customPermissions = new Map<string, AgentPermissions>();

  /**
   * Registra permissões customizadas para um agente específico.
   */
  setAgentPermissions(permissions: AgentPermissions): void {
    this.customPermissions.set(permissions.agentId, permissions);
  }

  /**
   * Retorna as permissões de um agente.
   * Agentes com ID "ESAA_ORCHESTRATOR" têm permissões de admin.
   */
  getAgentPermissions(agentId: string): AgentPermissions {
    const custom = this.customPermissions.get(agentId);
    if (custom) return custom;

    if (agentId === "ESAA_ORCHESTRATOR") {
      return { agentId, ...ADMIN_PERMISSIONS };
    }

    return { agentId, ...DEFAULT_PERMISSIONS };
  }

  /**
   * Avalia uma intenção contra as políticas do sistema.
   *
   * @param intention   Intenção a avaliar
   * @param projection  Estado atual do sistema (para decisões contextuais)
   */
  evaluate(
    intention: Intention,
    projection: OperationalProjection
  ): PolicyEvaluationResult {
    const rejectionReasons: string[] = [];
    const warnings: string[] = [];

    // 1. Verificar se o agente está quarentenado
    const agentState = projection.agents[intention.agentId];
    if (agentState?.status === "QUARANTINED") {
      rejectionReasons.push(
        `Agente ${intention.agentId} está quarentenado (razão: ${agentState.quarantineReason})`
      );
    }

    // 2. Obter permissões do agente
    const permissions = this.getAgentPermissions(intention.agentId);

    // 3. Verificar se o tipo de intenção é permitido
    if (!permissions.allowedIntentionTypes.includes(intention.type)) {
      rejectionReasons.push(
        `Agente ${intention.agentId} não tem permissão para propor intenções do tipo ${intention.type}`
      );
    }

    // 4. Classificar risco (pode ser escalado por contexto)
    const riskLevel = this.classifyRisk(intention, projection);

    // 5. Verificar se requer aprovação manual
    const requiresHumanApproval =
      RISK_ORDER[riskLevel] > RISK_ORDER[permissions.maxAutoApproveRisk];

    if (requiresHumanApproval) {
      warnings.push(
        `Intenção ${intention.intentionId} requer aprovação humana (risco: ${riskLevel}, limite do agente: ${permissions.maxAutoApproveRisk})`
      );
    }

    // 6. Verificar sobrecarga do sistema (muitas intenções ativas)
    const activeCount = Object.keys(projection.activeIntentions).length;
    if (activeCount >= 10) {
      warnings.push(
        `Sistema com alta carga: ${activeCount} intenções ativas. Considere aguardar.`
      );
    }

    // 7. Verificar se há FULL_PIPELINE duplicado
    if (intention.type === "FULL_PIPELINE") {
      const existingPipeline = Object.values(projection.activeIntentions).find(
        i => i.type === "FULL_PIPELINE" && i.status !== "SUCCEEDED" && i.status !== "FAILED"
      );

      if (existingPipeline) {
        rejectionReasons.push(
          `Já existe um FULL_PIPELINE ativo (${existingPipeline.intentionId}). Aguarde a conclusão.`
        );
      }
    }

    const approved = rejectionReasons.length === 0;

    return {
      approved,
      riskLevel,
      requiresHumanApproval: approved && requiresHumanApproval,
      rejectionReasons,
      warnings,
    };
  }

  // ─── Classificação de Risco ──────────────────────────────────────────────

  /**
   * Classifica o risco de uma intenção considerando contexto do sistema.
   * O risco base pode ser escalado por fatores contextuais.
   */
  classifyRisk(
    intention: Intention,
    projection: OperationalProjection
  ): RiskLevel {
    let risk = INTENTION_RISK_MAP[intention.type];

    // Escalação: agente com muitas falhas consecutivas aumenta o risco
    const agentState = projection.agents[intention.agentId];
    if (agentState && agentState.consecutiveFailures >= 3) {
      risk = escalateRisk(risk);
    }

    // Escalação: FULL_PIPELINE com muitos arquivos é CRITICAL
    if (
      intention.type === "FULL_PIPELINE" &&
      "maxFiles" in (intention.payload as Record<string, unknown>)
    ) {
      const maxFiles = (intention.payload as Record<string, unknown>)["maxFiles"];
      if (typeof maxFiles === "number" && maxFiles > 100) {
        risk = "CRITICAL";
      }
    }

    return risk;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Eleva um nível de risco ao próximo nível. */
function escalateRisk(risk: RiskLevel): RiskLevel {
  switch (risk) {
    case "LOW": return "MEDIUM";
    case "MEDIUM": return "HIGH";
    case "HIGH": return "CRITICAL";
    case "CRITICAL": return "CRITICAL";
  }
}

/** Instância global do PolicyEngine. */
export const globalPolicyEngine = new PolicyEngine();
