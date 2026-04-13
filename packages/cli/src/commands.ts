/**
 * @fileoverview Pure command handlers for the `mini-ide` CLI.
 *
 * Each function in this module is side-effect-free with respect to stdout:
 * instead of printing, it returns a structured `{ exitCode, output }` result
 * that the thin `src/index.ts` entrypoint prints and exits with. This makes
 * the commands trivially unit-testable without mocking `console` or
 * `process.exit`.
 *
 * @module cli/commands
 */

import { analyzeImpact, formatImpactReport } from '@gemini-mini-ide/shared';

/**
 * Runs the `mini-ide impact` command.
 *
 * Exit code contract (consumed by CI and by `src/index.ts`):
 * - `0` — safe change (`overallRisk` is `NENHUM`, `BAIXO` or `MEDIO`).
 * - `1` — risky change (`overallRisk` is `ALTO` or `CRITICO`); mandatory
 *          validations must run before merging.
 * - `2` — input error (no files were provided).
 *
 * Output format:
 * - When `options.json` is `true`, `output` is a pretty-printed JSON of
 *   the raw {@link import('@gemini-mini-ide/shared').ImpactReport ImpactReport}.
 * - Otherwise, `output` is the human-readable block produced by
 *   `formatImpactReport`.
 *
 * Pure: no I/O, no global state, no `process.exit` — safe to call from
 * tests. The caller is responsible for printing `output` and exiting with
 * `exitCode`.
 *
 * @param files Non-empty list of file paths to classify. Typically comes
 *              from `git diff --name-only`.
 * @param options `json` toggles JSON vs. formatted output.
 */
export function runImpactAnalysis(
  files: string[],
  options: { json?: boolean }
): { exitCode: number; output: string } {
  if (files.length === 0) {
    return {
      exitCode: 2,
      output: 'Error: Provide at least one file path to analyze.',
    };
  }

  const report = analyzeImpact(files);

  let output: string;
  if (options.json) {
    output = JSON.stringify(report, null, 2);
  } else {
    output = formatImpactReport(report);
  }

  const highRisk = report.overallRisk === 'ALTO' || report.overallRisk === 'CRITICO';

  return {
    exitCode: highRisk ? 1 : 0,
    output,
  };
}

/**
 * Resolves the target server URL for CLI commands that hit the HTTP API.
 *
 * Precedence:
 * 1. `MINI_IDE_SERVER_URL` environment variable (opt-in override).
 * 2. `http://localhost:3200` — the default dev server address.
 *
 * Read lazily on each call so tests can mutate `process.env` between cases
 * without re-importing the module.
 */
export function getServerUrl(): string {
  return process.env["MINI_IDE_SERVER_URL"] ?? 'http://localhost:3200';
}
