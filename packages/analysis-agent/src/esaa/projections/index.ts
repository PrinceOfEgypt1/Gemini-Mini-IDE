/**
 * @fileoverview Barrel export para as projeções do ESAA v2.
 * @module esaa/projections
 */

export { ProjectionEngine, GLOBAL_AGGREGATE_ID, PIPELINE_STREAM_ID } from "./projection-engine.js";
export {
  createEmptyOperationalProjection,
  applyEventToOperational,
  replayEventsToOperational,
  computeProjectionHash,
} from "./operational-projection.js";
export {
  createEmptyAuditProjection,
  applyEventToAudit,
  replayEventsToAudit,
} from "./audit-projection.js";
