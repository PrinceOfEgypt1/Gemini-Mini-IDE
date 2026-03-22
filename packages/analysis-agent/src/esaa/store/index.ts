/**
 * @fileoverview Barrel export para o Event Store do ESAA v2.
 * @module esaa/store
 */

export { EventStore, getGlobalEventStore, closeGlobalEventStore, resetGlobalEventStore } from "./event-store.js";
export type { AppendResult, EventQueryOptions } from "./event-store.js";
export { SCHEMA_VERSION, SCHEMA_DDL, QUERIES } from "./schema.js";
