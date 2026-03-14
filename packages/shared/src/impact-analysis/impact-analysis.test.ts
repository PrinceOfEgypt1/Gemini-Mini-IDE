import { describe, it, expect } from 'vitest';
import { analyzeImpact, formatImpactReport } from './impact-analysis.js';

describe('analyzeImpact', () => {
  it('should return NENHUM risk for empty file list', () => {
    const result = analyzeImpact([]);
    expect(result.overallRisk).toBe('NENHUM');
    expect(result.files).toEqual([]);
    expect(result.areas).toEqual([]);
    expect(result.requiredValidations).toEqual([]);
    expect(result.recommendations).toContain('No files to analyze.');
  });

  it('should classify shared package files as CRITICO', () => {
    const result = analyzeImpact(['packages/shared/src/index.ts']);
    expect(result.overallRisk).toBe('CRITICO');
    expect(result.areas).toHaveLength(1);
    expect(result.areas[0].area).toBe('shared');
    expect(result.areas[0].risk).toBe('CRITICO');
    expect(result.areas[0].validations).toContain('test-all-packages');
  });

  it('should classify server index.ts as CRITICO', () => {
    const result = analyzeImpact(['packages/server/src/index.ts']);
    expect(result.overallRisk).toBe('CRITICO');
    expect(result.areas[0].area).toBe('server');
    expect(result.areas[0].validations).toContain('runtime-healthz');
  });

  it('should classify server package.json as ALTO', () => {
    const result = analyzeImpact(['packages/server/package.json']);
    expect(result.overallRisk).toBe('ALTO');
    expect(result.areas[0].validations).toContain('entrypoint-check');
  });

  it('should classify generic server files as ALTO', () => {
    const result = analyzeImpact(['packages/server/src/routes/conversations.ts']);
    expect(result.overallRisk).toBe('ALTO');
    expect(result.areas[0].area).toBe('server');
  });

  it('should classify analysis-agent core files as CRITICO', () => {
    const result = analyzeImpact(['packages/analysis-agent/src/agent.ts']);
    expect(result.overallRisk).toBe('CRITICO');
    expect(result.areas[0].validations).toContain('review-governance');
  });

  it('should classify analysis-agent orchestrator as CRITICO', () => {
    const result = analyzeImpact(['packages/analysis-agent/src/orchestrator.ts']);
    expect(result.overallRisk).toBe('CRITICO');
  });

  it('should classify generic analysis-agent files as ALTO', () => {
    const result = analyzeImpact(['packages/analysis-agent/src/generation/index.ts']);
    expect(result.overallRisk).toBe('ALTO');
    expect(result.areas[0].area).toBe('analysis-agent');
  });

  it('should classify UI entrypoints as ALTO', () => {
    const result = analyzeImpact(['packages/ui/src/App.tsx']);
    expect(result.overallRisk).toBe('ALTO');
    expect(result.areas[0].area).toBe('ui');
  });

  it('should classify generic UI files as MEDIO', () => {
    const result = analyzeImpact(['packages/ui/src/components/Button.tsx']);
    expect(result.overallRisk).toBe('MEDIO');
    expect(result.areas[0].area).toBe('ui');
  });

  it('should classify CLI files as BAIXO', () => {
    const result = analyzeImpact(['packages/cli/src/index.ts']);
    expect(result.overallRisk).toBe('BAIXO');
    expect(result.areas[0].area).toBe('cli');
  });

  it('should classify CI workflows as ALTO', () => {
    const result = analyzeImpact(['.github/workflows/ci.yml']);
    expect(result.overallRisk).toBe('ALTO');
    expect(result.areas[0].area).toBe('ci');
    expect(result.areas[0].validations).toContain('review-workflow');
  });

  it('should classify governance docs as MEDIO', () => {
    const result = analyzeImpact(['docs/governance/MASTER_COMPLIANCE_MATRIX.md']);
    expect(result.overallRisk).toBe('MEDIO');
    expect(result.areas[0].area).toBe('governance');
    expect(result.areas[0].validations).toContain('review-coherence');
  });

  it('should classify active scripts as MEDIO', () => {
    const result = analyzeImpact(['scripts/active/pipeline.sh']);
    expect(result.overallRisk).toBe('MEDIO');
    expect(result.areas[0].area).toBe('scripts');
    expect(result.areas[0].validations).toContain('test-script');
  });

  it('should classify inactive scripts as BAIXO', () => {
    const result = analyzeImpact(['scripts/old/cleanup.sh']);
    expect(result.overallRisk).toBe('BAIXO');
    expect(result.areas[0].validations).toContain('review-manual');
  });

  it('should classify root package.json as CRITICO config', () => {
    const result = analyzeImpact(['package.json']);
    expect(result.overallRisk).toBe('CRITICO');
    expect(result.areas[0].area).toBe('config');
  });

  it('should classify tsconfig as CRITICO config', () => {
    const result = analyzeImpact(['tsconfig.json']);
    expect(result.overallRisk).toBe('CRITICO');
    expect(result.areas[0].area).toBe('config');
  });

  it('should classify gitignore as BAIXO config', () => {
    const result = analyzeImpact(['.gitignore']);
    expect(result.overallRisk).toBe('BAIXO');
    expect(result.areas[0].area).toBe('config');
  });

  it('should classify docs/README as BAIXO', () => {
    const result = analyzeImpact(['docs/README.md']);
    expect(result.overallRisk).toBe('BAIXO');
    expect(result.areas[0].area).toBe('docs');
  });

  it('should classify unknown files as BAIXO docs', () => {
    const result = analyzeImpact(['random-unknown-file.xyz']);
    expect(result.overallRisk).toBe('BAIXO');
    expect(result.areas[0].area).toBe('docs');
  });

  it('should deduplicate files', () => {
    const result = analyzeImpact(['packages/cli/src/index.ts', 'packages/cli/src/index.ts']);
    expect(result.files).toHaveLength(1);
  });

  it('should sort files', () => {
    const result = analyzeImpact(['packages/ui/src/App.tsx', 'packages/cli/src/index.ts']);
    expect(result.files[0]).toBe('packages/cli/src/index.ts');
    expect(result.files[1]).toBe('packages/ui/src/App.tsx');
  });

  it('should aggregate multiple areas and use max risk', () => {
    const result = analyzeImpact([
      'packages/shared/src/types/index.ts',
      'packages/cli/src/index.ts',
      'docs/README.md',
    ]);
    expect(result.overallRisk).toBe('CRITICO');
    expect(result.areas.length).toBeGreaterThanOrEqual(3);
  });

  it('should produce correct recommendations for CRITICO risk', () => {
    const result = analyzeImpact(['packages/shared/src/index.ts']);
    expect(result.recommendations).toContain('CRITICAL CHANGE: Run full pipeline before merging.');
    expect(result.recommendations).toContain('Execute: ./scripts/active/pipeline.sh');
  });

  it('should produce correct recommendations for ALTO risk', () => {
    const result = analyzeImpact(['packages/server/src/routes/conversations.ts']);
    expect(result.recommendations).toContain('HIGH RISK: Run pipeline and affected package tests.');
  });

  it('should produce correct recommendations for MEDIO risk', () => {
    const result = analyzeImpact(['packages/ui/src/components/Button.tsx']);
    expect(result.recommendations).toContain('MEDIUM RISK: Run standard checks.');
  });

  it('should produce correct recommendations for BAIXO risk', () => {
    const result = analyzeImpact(['packages/cli/src/index.ts']);
    expect(result.recommendations).toContain('LOW RISK: Standard review sufficient.');
  });

  it('should collect all unique validations from all areas', () => {
    const result = analyzeImpact([
      'packages/shared/src/index.ts',
      'packages/server/src/index.ts',
    ]);
    expect(result.requiredValidations).toContain('lint');
    expect(result.requiredValidations).toContain('typecheck');
    expect(result.requiredValidations).toContain('build');
    expect(result.requiredValidations).toContain('test-all-packages');
    expect(result.requiredValidations).toContain('runtime-healthz');
  });

  it('should order areas by predefined priority', () => {
    const result = analyzeImpact([
      'packages/ui/src/App.tsx',
      'packages/shared/src/index.ts',
      'packages/server/src/index.ts',
    ]);
    const areaNames = result.areas.map(a => a.area);
    expect(areaNames.indexOf('shared')).toBeLessThan(areaNames.indexOf('server'));
    expect(areaNames.indexOf('server')).toBeLessThan(areaNames.indexOf('ui'));
  });
});

describe('formatImpactReport', () => {
  it('should format an empty report', () => {
    const report = analyzeImpact([]);
    const formatted = formatImpactReport(report);
    expect(formatted).toContain('=== IMPACT ANALYSIS REPORT ===');
    expect(formatted).toContain('Files analyzed: 0');
    expect(formatted).toContain('NENHUM');
  });

  it('should format a report with multiple areas', () => {
    const report = analyzeImpact([
      'packages/shared/src/index.ts',
      'packages/ui/src/App.tsx',
    ]);
    const formatted = formatImpactReport(report);
    expect(formatted).toContain('Files analyzed: 2');
    expect(formatted).toContain('[CRITICO] shared');
    expect(formatted).toContain('[ALTO] ui');
    expect(formatted).toContain('REQUIRED VALIDATIONS');
    expect(formatted).toContain('[MANDATORY]');
    expect(formatted).toContain('RECOMMENDATIONS');
  });

  it('should show RECOMMENDED tag for non-ALTO risk', () => {
    const report = analyzeImpact(['packages/cli/src/index.ts']);
    const formatted = formatImpactReport(report);
    expect(formatted).toContain('[RECOMMENDED]');
  });

  it('should include all sections', () => {
    const report = analyzeImpact(['packages/shared/src/index.ts']);
    const formatted = formatImpactReport(report);
    expect(formatted).toContain('1. CHANGED FILES');
    expect(formatted).toContain('2. IMPACTED AREAS');
    expect(formatted).toContain('3. OVERALL RISK');
    expect(formatted).toContain('4. REQUIRED VALIDATIONS');
    expect(formatted).toContain('5. RECOMMENDATIONS');
    expect(formatted).toContain('Analysis complete.');
  });

  it('should handle validation label lookup', () => {
    const report = analyzeImpact(['packages/server/package.json']);
    const formatted = formatImpactReport(report);
    expect(formatted).toContain('Verify package.json main matches build output');
  });
});
