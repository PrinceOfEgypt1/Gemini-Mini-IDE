/**
 * @fileoverview Public type contracts for the impact-analysis library.
 *
 * These types are the cross-package vocabulary used by `analyzeImpact` and
 * `formatImpactReport` to classify file changes, aggregate risk and recommend
 * validations. They are consumed by the CLI (`mini-ide impact`), the server
 * (`POST /impact-analysis`) and the analysis-agent (architecture phase).
 *
 * @module shared/impact-analysis/types
 */

/**
 * Ordered risk taxonomy used by the impact-analysis pipeline.
 *
 * The ordering is monotonic and forms a join-semilattice: any reduction of
 * multiple per-file risks collapses to the *maximum* level. The concrete
 * ordering (low → high) is:
 *
 *   NENHUM → BAIXO → MEDIO → ALTO → CRITICO
 *
 * Consumers must treat `ALTO` and `CRITICO` as mandatory validation triggers
 * (the CLI exits non-zero; the analysis-agent requires full pipeline runs).
 */
export type RiskLevel = 'NENHUM' | 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';

/**
 * Stable identifier of a project area impacted by a change.
 *
 * The set is intentionally closed — new areas require updating the classifier
 * in `impact-analysis.ts` together with this union, so downstream consumers
 * can rely on exhaustive pattern matching.
 */
export type ImpactArea =
  | 'ui'
  | 'server'
  | 'analysis-agent'
  | 'shared'
  | 'cli'
  | 'ci'
  | 'governance'
  | 'scripts'
  | 'config'
  | 'docs';

/**
 * Named validation action recommended by the impact analyzer.
 *
 * Each value is a contract label (not an implementation). Downstream tooling
 * (CLI, CI scripts, docs) translates the label into an executable step — see
 * the `labels` map in `formatImpactReport` for the human-readable version of
 * each action.
 */
export type ValidationAction =
  | 'lint'
  | 'typecheck'
  | 'build'
  | 'test'
  | 'test-all-packages'
  | 'runtime-healthz'
  | 'entrypoint-check'
  | 'review-workflow'
  | 'review-governance'
  | 'review-coherence'
  | 'review-manual'
  | 'review-textual'
  | 'test-script';

/**
 * Risk aggregation for a single {@link ImpactArea}.
 *
 * Invariants enforced by {@link analyzeImpact}:
 * - `files` contains at least one entry;
 * - `risk` is the maximum risk among all files in that area;
 * - `validations` is the union (deduplicated, sorted) of per-file
 *   recommended validations.
 */
export interface AreaImpact {
  area: ImpactArea;
  risk: RiskLevel;
  files: string[];
  validations: ValidationAction[];
}

/**
 * Full impact analysis report for a change set.
 *
 * Shape contract:
 * - `files` — input files, deduplicated and sorted alphabetically;
 * - `areas` — impacted areas ordered by business criticality (shared,
 *   config and server first; docs and cli last);
 * - `overallRisk` — maximum risk across all areas;
 * - `requiredValidations` — deduplicated, sorted union of every area's
 *   validations; consumers must treat them as mandatory when `overallRisk`
 *   is `ALTO` or `CRITICO`;
 * - `recommendations` — short, human-readable next steps keyed off
 *   `overallRisk`.
 *
 * This report is serializable as JSON without loss and is the canonical
 * wire format returned by the CLI `--json` flag and the
 * `POST /impact-analysis` endpoint.
 */
export interface ImpactReport {
  files: string[];
  areas: AreaImpact[];
  overallRisk: RiskLevel;
  requiredValidations: ValidationAction[];
  recommendations: string[];
}
