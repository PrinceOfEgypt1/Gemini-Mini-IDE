import type {
  RiskLevel,
  ImpactArea,
  ValidationAction,
  AreaImpact,
  ImpactReport,
} from './types.js';

const RISK_ORDER: Record<RiskLevel, number> = {
  NENHUM: 0,
  BAIXO: 1,
  MEDIO: 2,
  ALTO: 3,
  CRITICO: 4,
};

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER[a] >= RISK_ORDER[b] ? a : b;
}

interface FileClassification {
  area: ImpactArea;
  risk: RiskLevel;
  validations: ValidationAction[];
}

function classifyFile(file: string): FileClassification {
  // Shared contracts — cross-package impact
  if (file.startsWith('packages/shared/')) {
    return { area: 'shared', risk: 'CRITICO', validations: ['lint', 'typecheck', 'build', 'test-all-packages'] };
  }

  // Server — critical entrypoint
  if (file === 'packages/server/src/index.ts') {
    return { area: 'server', risk: 'CRITICO', validations: ['lint', 'typecheck', 'build', 'test', 'runtime-healthz'] };
  }
  if (file === 'packages/server/package.json') {
    return { area: 'server', risk: 'ALTO', validations: ['lint', 'typecheck', 'build', 'test', 'runtime-healthz', 'entrypoint-check'] };
  }
  if (file.startsWith('packages/server/')) {
    return { area: 'server', risk: 'ALTO', validations: ['lint', 'typecheck', 'build', 'test', 'runtime-healthz'] };
  }

  // Analysis agent — critical core files
  if (file === 'packages/analysis-agent/src/agent.ts' || file === 'packages/analysis-agent/src/orchestrator.ts') {
    return { area: 'analysis-agent', risk: 'CRITICO', validations: ['lint', 'typecheck', 'build', 'test', 'review-governance'] };
  }
  if (file.startsWith('packages/analysis-agent/')) {
    return { area: 'analysis-agent', risk: 'ALTO', validations: ['lint', 'typecheck', 'build', 'test'] };
  }

  // UI — critical entrypoints
  if (file === 'packages/ui/src/App.tsx' || file === 'packages/ui/src/main.tsx') {
    return { area: 'ui', risk: 'ALTO', validations: ['lint', 'typecheck', 'build', 'test'] };
  }
  if (file.startsWith('packages/ui/')) {
    return { area: 'ui', risk: 'MEDIO', validations: ['lint', 'typecheck', 'build', 'test'] };
  }

  // CLI
  if (file.startsWith('packages/cli/')) {
    return { area: 'cli', risk: 'BAIXO', validations: ['lint', 'typecheck', 'build'] };
  }

  // CI workflows
  if (file.startsWith('.github/workflows/')) {
    return { area: 'ci', risk: 'ALTO', validations: ['review-workflow', 'lint', 'typecheck', 'build', 'test'] };
  }

  // Governance docs
  if (file.startsWith('docs/governance/')) {
    return { area: 'governance', risk: 'MEDIO', validations: ['review-coherence'] };
  }

  // Active scripts
  if (file.startsWith('scripts/active/')) {
    return { area: 'scripts', risk: 'MEDIO', validations: ['review-manual', 'test-script'] };
  }
  if (file.startsWith('scripts/')) {
    return { area: 'scripts', risk: 'BAIXO', validations: ['review-manual'] };
  }

  // Root configs — critical
  if (/^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml)$/.test(file)) {
    return { area: 'config', risk: 'CRITICO', validations: ['lint', 'typecheck', 'build', 'test-all-packages', 'runtime-healthz'] };
  }
  if (/^tsconfig.*\.json$/.test(file)) {
    return { area: 'config', risk: 'CRITICO', validations: ['lint', 'typecheck', 'build', 'test-all-packages'] };
  }
  if (/^\.(gitignore|eslintrc|prettier)/.test(file)) {
    return { area: 'config', risk: 'BAIXO', validations: ['lint'] };
  }

  // Documentation
  if (file.startsWith('docs/') || file.endsWith('.md')) {
    return { area: 'docs', risk: 'BAIXO', validations: ['review-textual'] };
  }

  // Default
  return { area: 'docs', risk: 'BAIXO', validations: ['review-manual'] };
}

export function analyzeImpact(files: string[]): ImpactReport {
  if (files.length === 0) {
    return {
      files: [],
      areas: [],
      overallRisk: 'NENHUM',
      requiredValidations: [],
      recommendations: ['No files to analyze.'],
    };
  }

  const uniqueFiles = [...new Set(files)].sort();
  const areaMap = new Map<ImpactArea, { risk: RiskLevel; files: string[]; validations: Set<ValidationAction> }>();

  let overallRisk: RiskLevel = 'NENHUM';

  for (const file of uniqueFiles) {
    const classification = classifyFile(file);
    overallRisk = maxRisk(overallRisk, classification.risk);

    const existing = areaMap.get(classification.area);
    if (existing) {
      existing.risk = maxRisk(existing.risk, classification.risk);
      existing.files.push(file);
      for (const v of classification.validations) existing.validations.add(v);
    } else {
      areaMap.set(classification.area, {
        risk: classification.risk,
        files: [file],
        validations: new Set(classification.validations),
      });
    }
  }

  // Build areas sorted by risk (highest first)
  const areaOrder: ImpactArea[] = ['shared', 'config', 'server', 'analysis-agent', 'ci', 'ui', 'governance', 'scripts', 'cli', 'docs'];
  const areas: AreaImpact[] = areaOrder
    .filter(a => areaMap.has(a))
    .map(a => {
      const data = areaMap.get(a)!;
      return { area: a, risk: data.risk, files: data.files, validations: [...data.validations].sort() };
    });

  // Collect all unique validations
  const allValidations = new Set<ValidationAction>();
  for (const area of areas) {
    for (const v of area.validations) allValidations.add(v);
  }
  const requiredValidations = [...allValidations].sort();

  // Generate recommendations
  const recommendations: string[] = [];
  if (RISK_ORDER[overallRisk] >= RISK_ORDER['CRITICO']) {
    recommendations.push('CRITICAL CHANGE: Run full pipeline before merging.');
    recommendations.push('Execute: ./scripts/active/pipeline.sh');
    recommendations.push('Verify runtime: server start + /healthz');
    recommendations.push('Review all affected packages for regressions.');
  } else if (RISK_ORDER[overallRisk] >= RISK_ORDER['ALTO']) {
    recommendations.push('HIGH RISK: Run pipeline and affected package tests.');
    recommendations.push('Execute: ./scripts/active/pipeline.sh');
    recommendations.push('Review changed files carefully.');
  } else if (RISK_ORDER[overallRisk] >= RISK_ORDER['MEDIO']) {
    recommendations.push('MEDIUM RISK: Run standard checks.');
    recommendations.push('Execute: pnpm lint && pnpm typecheck && pnpm build && pnpm test');
  } else {
    recommendations.push('LOW RISK: Standard review sufficient.');
    recommendations.push('Review changes for accuracy.');
  }

  return { files: uniqueFiles, areas, overallRisk, requiredValidations, recommendations };
}

export function formatImpactReport(report: ImpactReport): string {
  const lines: string[] = [];

  lines.push('=== IMPACT ANALYSIS REPORT ===');
  lines.push('');
  lines.push(`Files analyzed: ${report.files.length}`);
  lines.push('');

  // Files
  lines.push('1. CHANGED FILES');
  lines.push('─'.repeat(60));
  for (const f of report.files) lines.push(`  ${f}`);
  lines.push('');

  // Areas
  lines.push('2. IMPACTED AREAS');
  lines.push('─'.repeat(60));
  for (const area of report.areas) {
    lines.push(`  [${area.risk}] ${area.area}`);
    for (const f of area.files) lines.push(`       - ${f}`);
  }
  lines.push('');

  // Overall risk
  lines.push('3. OVERALL RISK');
  lines.push('─'.repeat(60));
  lines.push(`  ${report.overallRisk}`);
  lines.push(`  Areas affected: ${report.areas.length}`);
  lines.push('');

  // Validations
  const mandatory = RISK_ORDER[report.overallRisk] >= RISK_ORDER['ALTO'];
  lines.push('4. REQUIRED VALIDATIONS');
  lines.push('─'.repeat(60));
  const labels: Record<string, string> = {
    'lint': 'pnpm lint',
    'typecheck': 'pnpm typecheck',
    'build': 'pnpm build',
    'test': 'pnpm test (affected package)',
    'test-all-packages': 'pnpm test (ALL packages)',
    'runtime-healthz': 'Server startup + /healthz check',
    'entrypoint-check': 'Verify package.json main matches build output',
    'review-workflow': 'Manual review of CI workflow changes',
    'review-governance': 'Review governance docs for coherence',
    'review-coherence': 'Review document coherence with repo state',
    'review-manual': 'Manual review of changes',
    'review-textual': 'Review text for accuracy',
    'test-script': 'Test script execution manually',
  };
  for (const v of report.requiredValidations) {
    const tag = mandatory ? '[MANDATORY]' : '[RECOMMENDED]';
    lines.push(`  ${tag} ${labels[v] || v}`);
  }
  lines.push('');

  // Recommendations
  lines.push('5. RECOMMENDATIONS');
  lines.push('─'.repeat(60));
  for (const r of report.recommendations) lines.push(`  ${r}`);
  lines.push('');

  lines.push('='.repeat(60));
  lines.push(`Analysis complete. Overall risk: ${report.overallRisk}`);
  lines.push('='.repeat(60));

  return lines.join('\n');
}
