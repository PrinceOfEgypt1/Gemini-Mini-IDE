import { analyzeImpact, formatImpactReport } from '@gemini-mini-ide/shared';

/**
 * Runs the impact analysis command logic.
 * Returns the exit code (0 = safe, 1 = high risk, 2 = input error).
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
 * Returns the server URL from environment or default.
 */
export function getServerUrl(): string {
  return process.env["MINI_IDE_SERVER_URL"] ?? 'http://localhost:3200';
}
