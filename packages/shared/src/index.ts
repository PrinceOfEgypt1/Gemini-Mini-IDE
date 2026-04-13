/**
 * @fileoverview Public surface of `@gemini-mini-ide/shared`.
 *
 * This package is the single source of truth for cross-package contracts:
 * HTTP DTOs of the `/analyze` endpoint, wizard/user-story value objects and
 * the `impact-analysis` library (consumed by both the CLI and the analysis
 * agent). Anything re-exported from this barrel is considered stable API for
 * internal consumers (`ui`, `server`, `analysis-agent`, `cli`) — breaking
 * changes here ripple across every package and therefore must go through
 * explicit review.
 *
 * Stability rules:
 * - Only types and helpers whose shape is genuinely shared across packages
 *   belong in this barrel.
 * - Experimental or contained subsystems (e.g. ESAA) are intentionally kept
 *   off this surface — see the note below.
 *
 * @module shared
 */

export * from './types/analyze-response.js';
export * from './types/analyze-request.js';
export * from './types/wizard.js';
export * from './impact-analysis/index.js';

// P27.1 — The ESAA HTTP DTO contracts under `./esaa/` are intentionally
// NOT re-exported here. The ESAA subsystem is officially classified as
// EXPERIMENTAL and CONTAINED (see docs/ESAA_ARCHITECTURE.md § 0). The
// 18 contract types still exist on disk under `./esaa/contracts.ts`,
// but they are not part of `@gemini-mini-ide/shared`'s public surface.
// They are kept as a frozen reference for any future ciclo that decides
// to revive ESAA — promotion would require the 6 prerequisites listed
// in docs/ESAA_ARCHITECTURE.md § 0 ("Como reverter a contenção"),
// including a real client, end-to-end tests, and a versioned contract.
