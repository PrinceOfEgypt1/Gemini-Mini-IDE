/**
 * @fileoverview Public barrel of the `impact-analysis` library.
 *
 * Exports the two stable entry points — {@link analyzeImpact} and
 * {@link formatImpactReport} — along with their type contracts. Every
 * cross-package consumer (CLI, server, analysis-agent) must import from this
 * barrel; deep imports into `./impact-analysis.js` or `./types.js` are
 * considered internal and are not covered by the stability guarantees of
 * `@gemini-mini-ide/shared`.
 *
 * @module shared/impact-analysis
 */

export { analyzeImpact, formatImpactReport } from './impact-analysis.js';
export type {
  RiskLevel,
  ImpactArea,
  ValidationAction,
  AreaImpact,
  ImpactReport,
} from './types.js';
