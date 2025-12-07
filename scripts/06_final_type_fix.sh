#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Iniciando Correção Definitiva de Tipagem..."

# 1. CORRIGIR COMPLETENESS-VALIDATOR (Interface Correta)
# ==============================================================================
echo "[INFO] Atualizando packages/analysis-agent/src/governance/completeness-validator.ts..."
cat > packages/analysis-agent/src/governance/completeness-validator.ts << 'EOF'
export interface CompletenessValidationResult {
  isValid: boolean;
  errors: string[];
}

export class CompletenessValidator {
  /**
   * Valida se o código gerado parece completo e profissional.
   * Rejeita placeholders como "// TODO", funções vazias, etc.
   */
  public validate(code: string, filePath: string): CompletenessValidationResult {
    const errors: string[] = [];

    // 1. Checagem de Placeholders óbvios
    if (code.includes("// TODO") || code.includes("// FIXME")) {
      errors.push("Contains TODO/FIXME markers");
    }

    if (code.includes("...rest") && code.includes("//")) {
      errors.push("Contains lazy comments like '...rest'");
    }

    // 2. Checagem de Tamanho Mínimo (evita arquivos vazios)
    if (code.trim().length < 50) {
      errors.push("File content is suspiciously short (<50 chars)");
    }

    // 3. Checagem de Exportação (para arquivos TS/JS)
    if ((filePath.endsWith(".ts") || filePath.endsWith(".tsx") || filePath.endsWith(".js")) && 
        !code.includes("export") && 
        !code.includes("module.exports")) {
       // Exceção para arquivos de definição ou scripts simples
       if (!filePath.endsWith(".d.ts")) {
         errors.push("Module does not export anything");
       }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
EOF

# 2. CORRIGIR RICH-SCHEMAS (Adicionar Aliases de Compatibilidade)
# ==============================================================================
echo "[INFO] Atualizando packages/analysis-agent/src/types/rich-schemas.ts..."
cat > packages/analysis-agent/src/types/rich-schemas.ts << 'EOF'
/**
 * @fileoverview Schemas Zod e Interfaces TypeScript alinhados aos prompts.
 * VERSÃO CORRIGIDA COM ALIASES PARA COMPATIBILIDADE.
 */

import { z } from "zod";

// --- TIPOS BASE ---
export type ComplexityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Criticality = "HIGH" | "MEDIUM" | "LOW";
export type FileCategory = "DOMAIN" | "APPLICATION" | "INFRASTRUCTURE" | "DEVOPS" | "CONFIG" | "TESTS" | "DOCS";
export type EpicCategory = "CORE" | "AUTH & SECURITY" | "ADMIN" | "OBSERVABILITY" | "INTEGRATION" | "INFRASTRUCTURE";
export type IntentType = "NEW_PROJECT" | "QUESTION" | "REFINEMENT";

// --- ANALYSIS ---
export interface ComplexityInfo {
  level: ComplexityLevel;
  score: number;
  justification: string;
}

export interface RichAnalysis {
  summary: string;
  coreEntities: string[];
  complexity: ComplexityInfo;
  assumptions: string[];
  implicitRequirements: string[];
}

export const ComplexityInfoSchema = z.object({
  level: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  score: z.number().min(1).max(10),
  justification: z.string()
});

export const RichAnalysisSchema = z.object({
  summary: z.string(),
  coreEntities: z.array(z.string()),
  complexity: ComplexityInfoSchema,
  assumptions: z.array(z.string()),
  implicitRequirements: z.array(z.string())
});

// Alias para compatibilidade
export const AnalysisSchema = RichAnalysisSchema;

// --- PRODUCT ---
export interface RichEpic {
  id: string;
  title: string;
  category: EpicCategory;
  context: string;
  requirements: string[];
  acceptanceCriteria: string[];
  priority: Priority;
  estimatedComplexity: ComplexityLevel;
}

export interface Risk {
  description: string;
  mitigation: string;
}

export interface RichProductPlan {
  productVision: string;
  epics: RichEpic[];
  outOfScope: string[];
  risks: Risk[];
}

export const RichEpicSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(["CORE", "AUTH & SECURITY", "ADMIN", "OBSERVABILITY", "INTEGRATION", "INFRASTRUCTURE"]),
  context: z.string(),
  requirements: z.array(z.string()),
  acceptanceCriteria: z.array(z.string()),
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  estimatedComplexity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
});

export const RiskSchema = z.object({
  description: z.string(),
  mitigation: z.string()
});

export const RichProductPlanSchema = z.object({
  productVision: z.string(),
  epics: z.array(RichEpicSchema),
  outOfScope: z.array(z.string()),
  risks: z.array(RiskSchema)
});

// --- ARCHITECTURE ---
export interface TechStack {
  runtime: string;
  language: string;
  framework: string;
  orm: string;
  database: string;
  cache: string;
  queue: string;
  testing: string;
  documentation: string;
}

export interface ArchitecturalDecision {
  decision: string;
  rationale: string;
}

export interface RichManifestItem {
  path: string;
  purpose: string;
  criticality: Criticality;
  category: FileCategory;
}

export interface RichArchitecture {
  architectureStyle: string;
  stack: TechStack;
  diagram: string;
  keyDecisions: ArchitecturalDecision[];
  manifest: RichManifestItem[];
  securityConsiderations: string[];
  scalabilityPath: string[];
}

export const TechStackSchema = z.object({
  runtime: z.string(),
  language: z.string(),
  framework: z.string(),
  orm: z.string().default("N/A"),
  database: z.string().default("N/A"),
  cache: z.string().default("N/A"),
  queue: z.string().default("N/A"),
  testing: z.string(),
  documentation: z.string().default("README.md")
});

export const ArchitecturalDecisionSchema = z.object({
  decision: z.string(),
  rationale: z.string()
});

export const RichManifestItemSchema = z.object({
  path: z.string(),
  purpose: z.string(),
  criticality: z.enum(["HIGH", "MEDIUM", "LOW"]),
  category: z.enum(["DOMAIN", "APPLICATION", "INFRASTRUCTURE", "DEVOPS", "CONFIG", "TESTS", "DOCS"])
});

export const RichArchitectureSchema = z.object({
  architectureStyle: z.string(),
  stack: TechStackSchema,
  diagram: z.string().optional().default(""),
  keyDecisions: z.array(ArchitecturalDecisionSchema),
  manifest: z.array(RichManifestItemSchema),
  securityConsiderations: z.array(z.string()),
  scalabilityPath: z.array(z.string())
});

// --- USER STORIES ---
export interface AcceptanceCriterion {
  id: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
}

export interface RichUserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: AcceptanceCriterion[];
  technicalNotes: string[];
  dependencies: string[];
  estimatedPoints: number;
  priority: Priority;
}

export interface RichUserStoriesResult {
  epicId: string;
  epicTitle: string;
  userStories: RichUserStory[];
  summary: {
    totalStories: number;
    totalPoints: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
}

export const AcceptanceCriterionSchema = z.object({
  id: z.string(),
  scenario: z.string(),
  given: z.string(),
  when: z.string(),
  then: z.string()
});

export const RichUserStorySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema),
  technicalNotes: z.array(z.string()),
  dependencies: z.array(z.string()),
  estimatedPoints: z.number(),
  priority: z.enum(["P0", "P1", "P2", "P3"])
});

export const UserStoriesSummarySchema = z.object({
  totalStories: z.number(),
  totalPoints: z.number(),
  p0Count: z.number(),
  p1Count: z.number(),
  p2Count: z.number()
});

export const RichUserStoriesResultSchema = z.object({
  epicId: z.string(),
  epicTitle: z.string(),
  userStories: z.array(RichUserStorySchema),
  summary: UserStoriesSummarySchema
});

// Aliases para compatibilidade com agent.ts
export const UserStoriesSchema = RichUserStoriesResultSchema;
export type UserStoriesResult = RichUserStoriesResult;

// --- AGENT RESULT ---
export interface AgentTimings {
  total: number;
  analysis: number;
  product: number;
  architecture: number;
  codeGen: number;
  userStories: number;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface RichAgentResult {
  summary: string;
  requestId: string;
  timestamp: string;
  timings: AgentTimings;
  analysis: RichAnalysis;
  product: RichProductPlan;
  architect: RichArchitecture;
  engine: {
    files: GeneratedFile[];
  };
  userStories: RichUserStory[]; // Array plano
  quality: {
    validationErrors: string[];
    codeCompleteness: number;
  };
  fenix: {
    notes: string;
  };
}

// Alias para compatibilidade
export type AgentResult = RichAgentResult;
EOF

# 3. CORRIGIR AGENT.TS (Remover vars não usadas e summaryData)
# ==============================================================================
echo "[INFO] Atualizando packages/analysis-agent/src/agent.ts (Correções Finais)..."

# Usando sed para renomear argumentos não usados (prefixo _)
sed -i 's/runProductStep(userPrompt: string, analysis: RichAnalysis)/runProductStep(userPrompt: string, _analysis: RichAnalysis)/' packages/analysis-agent/src/agent.ts
sed -i 's/runArchitectureStep(userPrompt: string, productPlan: RichProductPlan)/runArchitectureStep(userPrompt: string, _productPlan: RichProductPlan)/' packages/analysis-agent/src/agent.ts

# Removendo a declaração de _summaryData e seu uso, pois não é necessário
# Localiza e remove o bloco const _summaryData ... até : {};
perl -i -0777 -pe 's/  const _summaryData = \(data\["summary"\][\s\S]*?: \{\};\n//g' packages/analysis-agent/src/agent.ts

echo "[SUCCESS] Tipagem Sincronizada com Sucesso."
