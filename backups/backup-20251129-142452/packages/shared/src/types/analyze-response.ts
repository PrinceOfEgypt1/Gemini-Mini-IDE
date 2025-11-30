/**
 * Contrato de resposta do endpoint /analyze
 * Atualizado: 2024-11-26 (v3.2.1 - Contract Aligned)
 */

export interface MappedUserStory {
  id: string;
  title: string;
  priority: string;
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

export interface AnalyzeResponse {
  // Campos na raiz (acesso direto pelo Frontend)
  summary: string;
  requestId: string;
  timestamp: string;

  // Estrutura completa
  analysis: {
    summary: string;
    complexity: "Baixa" | "Média" | "Alta" | "Crítica";
    assumptions: string[];
  };

  product: {
    userStories: MappedUserStory[];
  };

  architect: {
    diagram?: string;
    stack: string;
  };

  engine: {
    files: GeneratedFile[];
  };

  ux: { components: unknown[] };
  quality: { tests: unknown[] };
  ops: { scripts: unknown[] };
  fenix: { notes: string };
}
