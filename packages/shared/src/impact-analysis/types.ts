export type RiskLevel = 'NENHUM' | 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';

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

export interface AreaImpact {
  area: ImpactArea;
  risk: RiskLevel;
  files: string[];
  validations: ValidationAction[];
}

export interface ImpactReport {
  files: string[];
  areas: AreaImpact[];
  overallRisk: RiskLevel;
  requiredValidations: ValidationAction[];
  recommendations: string[];
}
