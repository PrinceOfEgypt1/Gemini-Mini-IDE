/**
 * @fileoverview Schemas Zod e Interfaces TypeScript alinhados aos prompts.
 * VERSÃO CORRIGIDA COM ALIASES PARA COMPATIBILIDADE.
 */

import { z } from "zod";

// --- TIPOS BASE ---
export type ComplexityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Criticality = "HIGH" | "MEDIUM" | "LOW";
export type FileCategory = "DOMAIN" | "APPLICATION" | "INFRASTRUCTURE" | "DEVOPS" | "CONFIG" | "TESTS" | "DOCS" | "ANIMATION" | "UI" | "STORE";
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
  category: z.enum(["DOMAIN", "APPLICATION", "INFRASTRUCTURE", "DEVOPS", "CONFIG", "TESTS", "DOCS", "ANIMATION", "UI", "STORE"])
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

/**
 * Resultado da fase de planejamento (Steps 1-4).
 * Contém análise, produto, arquitetura e user stories para revisão do usuário.
 */
export interface PlanResult {
  summary: string;
  analysis: RichAnalysis;
  product: RichProductPlan;
  architect: RichArchitecture;
  userStories: RichUserStory[];
  manifestFileCount: number;
  epicCount: number;
  userStoryCount: number;
}
