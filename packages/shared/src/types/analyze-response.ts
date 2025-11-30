/**
 * Contrato de resposta do endpoint /analyze
 * Atualizado: 2025-11-29 (v4.0.0 - UTF-8 Fixed)
 */

export type Complexity = "Baixa" | "Média" | "Alta" | "Crítica";
export type Priority = "P0" | "P1" | "P2" | "P3";

export interface MappedUserStory {
  id: string;
  title: string;
  priority: Priority;
  role: string;
  action: string;
  benefit: string;
  acceptanceCriteria: string[];
  /** Mapeado de functionalRequirements */
  functionalReqs: string[];
  /** Mapeado de securityRequirements */
  security: string[];
  /** Mapeado de businessContext */
  context: string;
  nonFunctionalReqs: string[];
  description: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface AnalysisResult {
  summary: string;
  complexity: Complexity;
  assumptions: string[];
}

export interface ArchitectResult {
  diagram?: string;
  stack: string;
}

export interface AnalyzeResponse {
  // Campos na raiz (acesso direto pelo Frontend)
  summary: string;
  requestId: string;
  timestamp: string;

  // Campos legados para compatibilidade
  inputLength?: number;
  outputLength?: number;
  budgetUsed?: number;
  budgetRemaining?: number;

  // Estrutura completa
  analysis: AnalysisResult;

  product: {
    userStories: MappedUserStory[];
  };

  architect: ArchitectResult;

  engine: {
    files: GeneratedFile[];
  };

  ux: { components: unknown[] };
  quality: { tests: unknown[] };
  ops: { scripts: unknown[] };
  fenix: { notes: string };
}
