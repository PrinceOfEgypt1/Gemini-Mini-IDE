// Hook de streaming de analise
export { useAnalysisStream } from './useAnalysisStream';

// Tipos para compatibilidade (serao implementados na integracao completa)
export type TabType = 'overview' | 'code' | 'hus' | 'docs' | 'tests' | 'timeline' | 'outputs';

export interface GeneratedProject {
  engine?: { files?: Array<{ path: string; content: string }> };
  product?: { userStories?: Array<{ id: string; title: string; description: string; criteria: string[] }> };
  summary?: string;
  requestId?: string;
}
