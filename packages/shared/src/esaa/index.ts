/**
 * @fileoverview Barrel export para os contratos ESAA do pacote shared.
 *
 * @experimental
 *
 * **STATUS: EXPERIMENTAL / CONTIDO (P27 + P27.1).** Este barrel agrupa
 * os 18 contratos HTTP do subsistema ESAA. A partir do P27.1 ele NÃO é
 * re-exportado por `packages/shared/src/index.ts` — portanto não faz
 * parte da superfície pública de `@gemini-mini-ide/shared`. Permanece
 * em disco como referência congelada para um eventual ciclo futuro de
 * promoção do ESAA. Ver `docs/ESAA_ARCHITECTURE.md` § 0.
 *
 * @module shared/esaa
 */

export type {
  ESAAHealthResponse,
  ESAAEventsQueryParams,
  ESAAEventsResponse,
  ESAAEventDTO,
  ESAAOperationalProjectionResponse,
  ESAAAuditTrailResponse,
  ESAAProposeIntentionRequest,
  ESAAProposeIntentionResponse,
  ESAAPromotionResponse,
  ESAAPromotionRollbackRequest,
  ESAAAgentDTO,
  ESAAAgentsResponse,
  ESAAQuarantineRequest,
  ESAAReinstateRequest,
  ESAASnapshotResponse,
  ESAARecoveryRollbackRequest,
  ESAAReplayResponse,
  ESAAReplayRequest,
} from "./contracts.js";
