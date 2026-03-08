#!/usr/bin/env bash
###############################################################################
# SCRIPT: 01_upgrade_quality_schemas.sh
# DESCRIÇÃO: Implementa HU-QUALITY-001, HU-QUALITY-002, HU-QUALITY-003
#            - Alinhamento Schema ↔ Prompt (capturar 100% da informação do LLM)
#            - Propagação de Contexto Rico entre etapas do pipeline
#            - Anti-Lazy Guard (validação de completude do código)
#
# AUTOR: Mini-IDE Engine
# DATA: 2024-12-06
# VERSÃO: 1.0.0
#
# USO:
#   chmod +x 01_upgrade_quality_schemas.sh
#   ./01_upgrade_quality_schemas.sh
#
# PRÉ-REQUISITOS:
#   - Estar na raiz do projeto Gemini-Mini-IDE
#   - Node.js e pnpm instalados
#
# IMPORTANTE:
#   Este script SOBRESCREVE o arquivo agent.ts e CRIA novos arquivos.
#   Um backup do agent.ts será criado automaticamente.
###############################################################################
set -euo pipefail

# --- CORES PARA OUTPUT ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- FUNÇÕES UTILITÁRIAS ---
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- VERIFICAÇÕES ---
log_info "Verificando pré-condições..."

if [[ ! -f "package.json" ]]; then
  log_error "Execute este script na raiz do projeto Gemini-Mini-IDE"
  exit 1
fi

if [[ ! -f "packages/analysis-agent/src/agent.ts" ]]; then
  log_error "Arquivo agent.ts não encontrado"
  exit 1
fi

log_success "Pré-condições verificadas"

# --- BACKUP ---
BACKUP_DIR="backups/quality-upgrade-$(date +%Y%m%d_%H%M%S)"
log_info "Criando backup em ${BACKUP_DIR}..."
mkdir -p "${BACKUP_DIR}"
cp packages/analysis-agent/src/agent.ts "${BACKUP_DIR}/agent.ts.bak"
log_success "Backup criado"

# --- CRIAR DIRETÓRIOS ---
log_info "Criando diretórios..."
mkdir -p packages/analysis-agent/src/governance
mkdir -p packages/analysis-agent/src/context
mkdir -p packages/analysis-agent/src/types
log_success "Diretórios criados"

###############################################################################
# ARQUIVO 1: types/rich-schemas.ts
# Tipos e Schemas Zod que capturam 100% da informação dos prompts
###############################################################################
log_info "Criando types/rich-schemas.ts..."

cat > packages/analysis-agent/src/types/rich-schemas.ts << 'RICH_SCHEMAS_EOF'
/**
 * @fileoverview Schemas Zod e Interfaces TypeScript alinhados aos prompts.
 * 
 * IMPORTANTE: Estes schemas capturam TODA a informação que o LLM gera.
 * Não simplificar para string - isso descarta informação pela qual pagamos tokens.
 * 
 * @module types/rich-schemas
 * @version 2.0.0
 */

import { z } from "zod";

// =============================================================================
// TIPOS BASE
// =============================================================================

/** Níveis de complexidade do projeto */
export type ComplexityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Prioridades de épicos e HUs */
export type Priority = "P0" | "P1" | "P2" | "P3";

/** Criticidade de arquivos no manifest */
export type Criticality = "HIGH" | "MEDIUM" | "LOW";

/** Categorias de arquivos na arquitetura */
export type FileCategory = 
  | "DOMAIN" 
  | "APPLICATION" 
  | "INFRASTRUCTURE" 
  | "DEVOPS" 
  | "CONFIG" 
  | "TESTS" 
  | "DOCS";

/** Categorias de épicos */
export type EpicCategory = 
  | "CORE" 
  | "AUTH & SECURITY" 
  | "ADMIN" 
  | "OBSERVABILITY" 
  | "INTEGRATION" 
  | "INFRASTRUCTURE";

/** Tipos de intenção do usuário */
export type IntentType = "NEW_PROJECT" | "QUESTION" | "REFINEMENT";

// =============================================================================
// ANALYSIS - Schema Rico (alinhado ao prompt analysis.ts)
// =============================================================================

/**
 * Complexidade estruturada com justificativa
 * O prompt pede: level, score (1-10), justification
 */
export interface ComplexityInfo {
  level: ComplexityLevel;
  score: number;
  justification: string;
}

/**
 * Resultado completo da análise
 * Captura: summary, coreEntities, complexity, assumptions, implicitRequirements
 */
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

// =============================================================================
// PRODUCT - Schema Rico (alinhado ao prompt product.ts)
// =============================================================================

/**
 * Épico completo com todos os campos do prompt
 */
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

/**
 * Risco identificado com mitigação
 */
export interface Risk {
  description: string;
  mitigation: string;
}

/**
 * Plano de produto completo
 */
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

// =============================================================================
// ARCHITECTURE - Schema Rico (alinhado ao prompt architecture.ts)
// =============================================================================

/**
 * Stack tecnológica estruturada
 */
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

/**
 * Decisão arquitetural com racional
 */
export interface ArchitecturalDecision {
  decision: string;
  rationale: string;
}

/**
 * Item do manifest de arquivos
 */
export interface RichManifestItem {
  path: string;
  purpose: string;
  criticality: Criticality;
  category: FileCategory;
}

/**
 * Arquitetura completa
 */
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
  orm: z.string().optional().default("N/A"),
  database: z.string().optional().default("N/A"),
  cache: z.string().optional().default("N/A"),
  queue: z.string().optional().default("N/A"),
  testing: z.string(),
  documentation: z.string().optional().default("README.md")
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

// =============================================================================
// USER STORIES - Schema Rico (alinhado ao prompt user-stories.ts)
// =============================================================================

/**
 * Critério de aceite estruturado (GWT)
 */
export interface AcceptanceCriterion {
  id: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
}

/**
 * User Story completa
 */
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

/**
 * Resultado completo de expansão de épico em HUs
 */
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

// =============================================================================
// CODE GENERATION - Schema (já está bom, manter compatibilidade)
// =============================================================================

export interface FileContent {
  path: string;
  code: string;
  explanation?: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export const FileContentSchema = z.object({
  path: z.string(),
  code: z.string(),
  explanation: z.string().optional()
});

// =============================================================================
// INTENT - Schema (manter compatibilidade)
// =============================================================================

export interface IntentResult {
  type: IntentType;
  reasoning?: string;
}

export const IntentSchema = z.object({
  type: z.enum(["NEW_PROJECT", "QUESTION", "REFINEMENT"]),
  reasoning: z.string().optional()
});

// =============================================================================
// AGENT RESULT - Schema Rico Final
// =============================================================================

export interface AgentTimings {
  total: number;
  analysis: number;
  product: number;
  architecture: number;
  codeGen: number;
  userStories: number;
}

/**
 * Resultado completo do Agent com toda a riqueza preservada
 */
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
  userStories: RichUserStory[];
  quality: {
    validationErrors: string[];
    codeCompleteness: number;
  };
  fenix: {
    notes: string;
  };
}
RICH_SCHEMAS_EOF

log_success "types/rich-schemas.ts criado"

###############################################################################
# ARQUIVO 2: context/generation-context.ts
# Contexto acumulativo entre etapas do pipeline
###############################################################################
log_info "Criando context/generation-context.ts..."

cat > packages/analysis-agent/src/context/generation-context.ts << 'CONTEXT_EOF'
/**
 * @fileoverview Contexto de geração que acumula informação entre etapas.
 * 
 * Resolve o problema de fragmentação: cada etapa do pipeline agora tem
 * acesso ao output completo das etapas anteriores.
 * 
 * @module context/generation-context
 * @version 1.0.0
 */

import type {
  RichAnalysis,
  RichProductPlan,
  RichArchitecture,
  RichUserStory,
  GeneratedFile
} from "../types/rich-schemas.js";

/**
 * Contexto acumulativo de geração.
 * 
 * Cada etapa do pipeline adiciona informação e as etapas seguintes
 * podem acessar o contexto completo para gerar output mais coerente.
 */
export class GenerationContext {
  private _userPrompt: string = "";
  private _analysis: RichAnalysis | null = null;
  private _product: RichProductPlan | null = null;
  private _architecture: RichArchitecture | null = null;
  private _userStories: RichUserStory[] = [];
  private _generatedFiles: GeneratedFile[] = [];
  private _startTime: number = 0;

  /**
   * Inicia um novo contexto de geração
   */
  start(userPrompt: string): void {
    this._userPrompt = userPrompt;
    this._startTime = performance.now();
    this._analysis = null;
    this._product = null;
    this._architecture = null;
    this._userStories = [];
    this._generatedFiles = [];
  }

  // --- SETTERS ---

  setAnalysis(analysis: RichAnalysis): void {
    this._analysis = analysis;
  }

  setProduct(product: RichProductPlan): void {
    this._product = product;
  }

  setArchitecture(architecture: RichArchitecture): void {
    this._architecture = architecture;
  }

  addUserStories(stories: RichUserStory[]): void {
    this._userStories.push(...stories);
  }

  addGeneratedFile(file: GeneratedFile): void {
    this._generatedFiles.push(file);
  }

  // --- GETTERS ---

  get userPrompt(): string {
    return this._userPrompt;
  }

  get analysis(): RichAnalysis | null {
    return this._analysis;
  }

  get product(): RichProductPlan | null {
    return this._product;
  }

  get architecture(): RichArchitecture | null {
    return this._architecture;
  }

  get userStories(): RichUserStory[] {
    return this._userStories;
  }

  get generatedFiles(): GeneratedFile[] {
    return this._generatedFiles;
  }

  get elapsedMs(): number {
    return performance.now() - this._startTime;
  }

  // --- CONTEXT BUILDERS ---

  /**
   * Gera contexto para a etapa de Product (após Analysis)
   */
  buildProductContext(): string {
    if (!this._analysis) {
      return `Pedido Original: ${this._userPrompt}`;
    }

    return `
## ANÁLISE PRÉVIA
- Resumo: ${this._analysis.summary}
- Complexidade: ${this._analysis.complexity.level} (Score: ${this._analysis.complexity.score})
- Justificativa: ${this._analysis.complexity.justification}
- Entidades Core: ${this._analysis.coreEntities.join(", ")}
- Premissas: ${this._analysis.assumptions.join("; ")}
- Requisitos Implícitos: ${this._analysis.implicitRequirements.join("; ")}

## PEDIDO ORIGINAL
${this._userPrompt}
`.trim();
  }

  /**
   * Gera contexto para a etapa de Architecture (após Product)
   */
  buildArchitectureContext(): string {
    const parts: string[] = [];

    parts.push(`## PEDIDO ORIGINAL\n${this._userPrompt}`);

    if (this._analysis) {
      parts.push(`
## ANÁLISE
- Complexidade: ${this._analysis.complexity.level} (${this._analysis.complexity.score}/10)
- Entidades: ${this._analysis.coreEntities.join(", ")}
- Requisitos Implícitos: ${this._analysis.implicitRequirements.join("; ")}
`);
    }

    if (this._product) {
      const epicsText = this._product.epics
        .map(e => `- [${e.id}] ${e.title} (${e.category}, ${e.priority})`)
        .join("\n");
      
      parts.push(`
## PRODUTO
Visão: ${this._product.productVision}

### Épicos:
${epicsText}

### Fora de Escopo:
${this._product.outOfScope.join(", ")}

### Riscos:
${this._product.risks.map(r => `- ${r.description} → ${r.mitigation}`).join("\n")}
`);
    }

    return parts.join("\n\n").trim();
  }

  /**
   * Gera contexto para geração de código de um arquivo específico
   */
  buildCodeGenContext(filePath: string): string {
    const parts: string[] = [];

    // Stack e estilo arquitetural
    if (this._architecture) {
      const stack = this._architecture.stack;
      parts.push(`
## STACK TECNOLÓGICA
- Runtime: ${stack.runtime}
- Linguagem: ${stack.language}
- Framework: ${stack.framework}
- ORM: ${stack.orm}
- Database: ${stack.database}
- Testing: ${stack.testing}

## ESTILO ARQUITETURAL
${this._architecture.architectureStyle}

## DECISÕES CHAVE
${this._architecture.keyDecisions.map(d => `- ${d.decision}: ${d.rationale}`).join("\n")}
`);
    }

    // Arquivos já gerados (para imports válidos)
    if (this._generatedFiles.length > 0) {
      const fileList = this._generatedFiles
        .map(f => `- ${f.path}`)
        .join("\n");
      
      parts.push(`
## ARQUIVOS JÁ GERADOS (use para imports)
${fileList}
`);
    }

    // Informação do arquivo específico no manifest
    if (this._architecture) {
      const manifestItem = this._architecture.manifest.find(m => m.path === filePath);
      if (manifestItem) {
        parts.push(`
## ARQUIVO A GERAR
- Path: ${manifestItem.path}
- Propósito: ${manifestItem.purpose}
- Criticidade: ${manifestItem.criticality}
- Categoria: ${manifestItem.category}
`);
      }
    }

    // Contexto do prompt original (resumido)
    if (this._analysis) {
      parts.push(`
## CONTEXTO DO PROJETO
${this._analysis.summary}
`);
    }

    return parts.join("\n").trim();
  }

  /**
   * Gera contexto para expansão de épico em User Stories
   */
  buildUserStoriesContext(epicId: string): string {
    const parts: string[] = [];

    if (this._product) {
      const epic = this._product.epics.find(e => e.id === epicId);
      if (epic) {
        parts.push(`
## ÉPICO A EXPANDIR
- ID: ${epic.id}
- Título: ${epic.title}
- Categoria: ${epic.category}
- Contexto: ${epic.context}
- Prioridade: ${epic.priority}
- Complexidade Estimada: ${epic.estimatedComplexity}

### Requisitos:
${epic.requirements.map(r => `- ${r}`).join("\n")}

### Critérios de Aceite do Épico:
${epic.acceptanceCriteria.map(ac => `- ${ac}`).join("\n")}
`);
      }
    }

    // Adiciona contexto da análise para entender o domínio
    if (this._analysis) {
      parts.push(`
## CONTEXTO DO DOMÍNIO
- Entidades Core: ${this._analysis.coreEntities.join(", ")}
- Complexidade do Projeto: ${this._analysis.complexity.level}
`);
    }

    return parts.join("\n").trim();
  }

  /**
   * Serializa o contexto atual para debug/logs
   */
  toDebugString(): string {
    return JSON.stringify({
      userPrompt: this._userPrompt.substring(0, 100) + "...",
      hasAnalysis: !!this._analysis,
      hasProduct: !!this._product,
      hasArchitecture: !!this._architecture,
      userStoriesCount: this._userStories.length,
      generatedFilesCount: this._generatedFiles.length,
      elapsedMs: this.elapsedMs
    }, null, 2);
  }
}

/**
 * Singleton para uso global no Agent
 */
export const globalGenerationContext = new GenerationContext();
CONTEXT_EOF

log_success "context/generation-context.ts criado"

###############################################################################
# ARQUIVO 3: governance/completeness-validator.ts
# Anti-Lazy Guard - Valida completude do código gerado
###############################################################################
log_info "Criando governance/completeness-validator.ts..."

cat > packages/analysis-agent/src/governance/completeness-validator.ts << 'VALIDATOR_EOF'
/**
 * @fileoverview Anti-Lazy Guard - Valida que código gerado está completo.
 * 
 * Detecta padrões de código incompleto e rejeita antes de entregar ao usuário.
 * Segue as regras do Prompt-Mestre: "Nunca use '// TODO', '// ...', código incompleto"
 * 
 * @module governance/completeness-validator
 * @version 1.0.0
 */

/**
 * Resultado da validação de completude
 */
export interface CompletenessValidationResult {
  isComplete: boolean;
  score: number; // 0-100
  violations: ValidationViolation[];
  suggestions: string[];
}

/**
 * Violação específica encontrada
 */
export interface ValidationViolation {
  type: ViolationType;
  line?: number;
  message: string;
  severity: "error" | "warning";
}

/**
 * Tipos de violação detectáveis
 */
export type ViolationType =
  | "TODO_COMMENT"
  | "FIXME_COMMENT"
  | "ELLIPSIS_COMMENT"
  | "EMPTY_FUNCTION"
  | "NOT_IMPLEMENTED"
  | "EXCESSIVE_ANY"
  | "MISSING_ERROR_HANDLING"
  | "HARDCODED_CREDENTIALS"
  | "CONSOLE_LOG"
  | "MISSING_JSDOC";

/**
 * Padrões regex para detecção de código incompleto
 */
const LAZY_PATTERNS: Array<{ pattern: RegExp; type: ViolationType; severity: "error" | "warning"; message: string }> = [
  {
    pattern: /\/\/\s*TODO\b/gi,
    type: "TODO_COMMENT",
    severity: "error",
    message: "Código contém TODO - deve ser implementado completamente"
  },
  {
    pattern: /\/\/\s*FIXME\b/gi,
    type: "FIXME_COMMENT",
    severity: "error",
    message: "Código contém FIXME - deve ser corrigido"
  },
  {
    pattern: /\/\/\s*\.\.\./g,
    type: "ELLIPSIS_COMMENT",
    severity: "error",
    message: "Código contém '// ...' - indica código omitido"
  },
  {
    pattern: /\/\*\s*\.\.\.\s*\*\//g,
    type: "ELLIPSIS_COMMENT",
    severity: "error",
    message: "Código contém '/* ... */' - indica código omitido"
  },
  {
    pattern: /throw\s+new\s+Error\s*\(\s*["']Not\s+implemented["']\s*\)/gi,
    type: "NOT_IMPLEMENTED",
    severity: "error",
    message: "Função lança 'Not implemented' - deve ser implementada"
  },
  {
    pattern: /function\s+\w+\s*\([^)]*\)\s*\{\s*\}/g,
    type: "EMPTY_FUNCTION",
    severity: "error",
    message: "Função vazia detectada - deve ter implementação"
  },
  {
    pattern: /=>\s*\{\s*\}/g,
    type: "EMPTY_FUNCTION",
    severity: "warning",
    message: "Arrow function vazia - verificar se é intencional"
  },
  {
    pattern: /:\s*any\b/g,
    type: "EXCESSIVE_ANY",
    severity: "warning",
    message: "Uso de 'any' - preferir tipagem explícita"
  },
  {
    pattern: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g,
    type: "MISSING_ERROR_HANDLING",
    severity: "error",
    message: "Catch vazio - erros devem ser tratados"
  },
  {
    pattern: /password\s*[:=]\s*["'][^"']+["']/gi,
    type: "HARDCODED_CREDENTIALS",
    severity: "error",
    message: "Credencial hardcoded detectada - usar variáveis de ambiente"
  },
  {
    pattern: /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi,
    type: "HARDCODED_CREDENTIALS",
    severity: "error",
    message: "API key hardcoded detectada - usar variáveis de ambiente"
  },
  {
    pattern: /console\.(log|debug|info)\s*\(/g,
    type: "CONSOLE_LOG",
    severity: "warning",
    message: "console.log em código de produção - usar logger estruturado"
  }
];

/**
 * Validador de completude de código
 */
export class CompletenessValidator {
  private readonly maxAnyCount: number;
  private readonly requireJsDoc: boolean;

  constructor(options?: { maxAnyCount?: number; requireJsDoc?: boolean }) {
    this.maxAnyCount = options?.maxAnyCount ?? 3;
    this.requireJsDoc = options?.requireJsDoc ?? true;
  }

  /**
   * Valida se o código está completo e pronto para produção
   */
  validate(code: string, filePath: string): CompletenessValidationResult {
    const violations: ValidationViolation[] = [];
    const suggestions: string[] = [];
    const lines = code.split("\n");

    // Detectar padrões de código incompleto
    for (const { pattern, type, severity, message } of LAZY_PATTERNS) {
      const matches = code.match(pattern);
      if (matches) {
        // Encontrar linha da primeira ocorrência
        const lineNumber = this.findLineNumber(code, pattern);
        
        // Para 'any', verificar se excede o limite
        if (type === "EXCESSIVE_ANY") {
          if (matches.length > this.maxAnyCount) {
            violations.push({
              type,
              line: lineNumber,
              message: `${message} (${matches.length} ocorrências, máximo: ${this.maxAnyCount})`,
              severity: "error" // Promove para error se exceder
            });
          } else {
            violations.push({ type, line: lineNumber, message, severity });
          }
        } else {
          violations.push({ type, line: lineNumber, message, severity });
        }
      }
    }

    // Verificar JSDoc para arquivos TypeScript
    if (this.requireJsDoc && this.isTypeScriptFile(filePath)) {
      const jsdocViolations = this.checkJsDocCoverage(code);
      violations.push(...jsdocViolations);
    }

    // Calcular score de completude
    const errorCount = violations.filter(v => v.severity === "error").length;
    const warningCount = violations.filter(v => v.severity === "warning").length;
    const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 5));

    // Gerar sugestões de correção
    if (violations.some(v => v.type === "TODO_COMMENT" || v.type === "ELLIPSIS_COMMENT")) {
      suggestions.push("Complete todas as implementações marcadas com TODO ou '...'");
    }
    if (violations.some(v => v.type === "EXCESSIVE_ANY")) {
      suggestions.push("Substitua 'any' por tipos específicos ou 'unknown'");
    }
    if (violations.some(v => v.type === "EMPTY_FUNCTION")) {
      suggestions.push("Implemente as funções vazias ou remova-as se não forem necessárias");
    }
    if (violations.some(v => v.type === "MISSING_ERROR_HANDLING")) {
      suggestions.push("Adicione tratamento de erro adequado nos blocos catch");
    }

    return {
      isComplete: errorCount === 0,
      score,
      violations,
      suggestions
    };
  }

  /**
   * Valida múltiplos arquivos e retorna resultado agregado
   */
  validateBatch(files: Array<{ path: string; content: string }>): {
    isComplete: boolean;
    overallScore: number;
    fileResults: Map<string, CompletenessValidationResult>;
  } {
    const fileResults = new Map<string, CompletenessValidationResult>();
    let totalScore = 0;
    let allComplete = true;

    for (const file of files) {
      const result = this.validate(file.content, file.path);
      fileResults.set(file.path, result);
      totalScore += result.score;
      if (!result.isComplete) allComplete = false;
    }

    return {
      isComplete: allComplete,
      overallScore: files.length > 0 ? Math.round(totalScore / files.length) : 100,
      fileResults
    };
  }

  /**
   * Gera prompt de correção para o LLM baseado nas violações
   */
  generateCorrectionPrompt(
    originalCode: string,
    filePath: string,
    violations: ValidationViolation[]
  ): string {
    const violationList = violations
      .filter(v => v.severity === "error")
      .map(v => `- Linha ${v.line ?? "?"}: ${v.message}`)
      .join("\n");

    return `
## CORREÇÃO NECESSÁRIA

O código gerado para \`${filePath}\` tem problemas de completude:

${violationList}

## CÓDIGO ORIGINAL COM PROBLEMAS:
\`\`\`
${originalCode}
\`\`\`

## INSTRUÇÕES:
1. Corrija TODOS os problemas listados acima
2. Mantenha a estrutura e lógica do código original
3. Não adicione novos TODO ou placeholders
4. Retorne o código COMPLETO corrigido

## FORMATO DE RESPOSTA:
{
  "path": "${filePath}",
  "code": "código corrigido completo",
  "explanation": "explicação das correções feitas"
}
`.trim();
  }

  // --- MÉTODOS PRIVADOS ---

  private findLineNumber(code: string, pattern: RegExp): number | undefined {
    const lines = code.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return i + 1;
      }
    }
    return undefined;
  }

  private isTypeScriptFile(filePath: string): boolean {
    return /\.(ts|tsx)$/.test(filePath);
  }

  private checkJsDocCoverage(code: string): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    
    // Regex para encontrar funções/classes exportadas sem JSDoc
    const exportedFunctionRegex = /^export\s+(async\s+)?function\s+(\w+)/gm;
    const exportedClassRegex = /^export\s+class\s+(\w+)/gm;
    
    // Verificar funções exportadas
    let match;
    while ((match = exportedFunctionRegex.exec(code)) !== null) {
      const functionName = match[2];
      const beforeMatch = code.substring(0, match.index);
      const hasJsDoc = /\/\*\*[\s\S]*?\*\/\s*$/.test(beforeMatch);
      
      if (!hasJsDoc) {
        const line = this.getLineFromIndex(code, match.index);
        violations.push({
          type: "MISSING_JSDOC",
          line,
          message: `Função exportada '${functionName}' sem documentação JSDoc`,
          severity: "warning"
        });
      }
    }

    // Verificar classes exportadas
    while ((match = exportedClassRegex.exec(code)) !== null) {
      const className = match[1];
      const beforeMatch = code.substring(0, match.index);
      const hasJsDoc = /\/\*\*[\s\S]*?\*\/\s*$/.test(beforeMatch);
      
      if (!hasJsDoc) {
        const line = this.getLineFromIndex(code, match.index);
        violations.push({
          type: "MISSING_JSDOC",
          line,
          message: `Classe exportada '${className}' sem documentação JSDoc`,
          severity: "warning"
        });
      }
    }

    return violations;
  }

  private getLineFromIndex(code: string, index: number): number {
    return code.substring(0, index).split("\n").length;
  }
}

/**
 * Instância singleton para uso global
 */
export const globalCompletenessValidator = new CompletenessValidator({
  maxAnyCount: 3,
  requireJsDoc: true
});
VALIDATOR_EOF

log_success "governance/completeness-validator.ts criado"

###############################################################################
# ARQUIVO 4: types/index.ts
# Barrel export para os tipos
###############################################################################
log_info "Criando types/index.ts..."

cat > packages/analysis-agent/src/types/index.ts << 'TYPES_INDEX_EOF'
/**
 * @fileoverview Barrel export para todos os tipos do analysis-agent
 * @module types
 */

export * from "./rich-schemas.js";
TYPES_INDEX_EOF

log_success "types/index.ts criado"

###############################################################################
# ARQUIVO 5: context/index.ts
# Barrel export para contexto
###############################################################################
log_info "Criando context/index.ts..."

cat > packages/analysis-agent/src/context/index.ts << 'CONTEXT_INDEX_EOF'
/**
 * @fileoverview Barrel export para módulo de contexto
 * @module context
 */

export * from "./generation-context.js";
CONTEXT_INDEX_EOF

log_success "context/index.ts criado"

###############################################################################
# ARQUIVO 6: governance/index.ts
# Barrel export para governance
###############################################################################
log_info "Criando governance/index.ts..."

cat > packages/analysis-agent/src/governance/index.ts << 'GOV_INDEX_EOF'
/**
 * @fileoverview Barrel export para módulo de governança
 * @module governance
 */

export * from "./completeness-validator.js";
GOV_INDEX_EOF

log_success "governance/index.ts criado"

###############################################################################
# ARQUIVO 7: Atualização do index.ts principal
###############################################################################
log_info "Atualizando index.ts principal..."

cat > packages/analysis-agent/src/index.ts << 'MAIN_INDEX_EOF'
/**
 * @fileoverview Entry point do pacote analysis-agent
 * 
 * Exporta o AnalysisAgent e todos os tipos necessários para integração.
 * 
 * @module @mini-ide/analysis-agent
 * @version 2.0.0
 */

// Agent principal
export { AnalysisAgent } from "./agent.js";

// Tipos ricos alinhados aos prompts
export type {
  // Analysis
  RichAnalysis,
  ComplexityInfo,
  ComplexityLevel,
  
  // Product
  RichProductPlan,
  RichEpic,
  Risk,
  EpicCategory,
  
  // Architecture
  RichArchitecture,
  TechStack,
  ArchitecturalDecision,
  RichManifestItem,
  FileCategory,
  Criticality,
  
  // User Stories
  RichUserStoriesResult,
  RichUserStory,
  AcceptanceCriterion,
  
  // Code Generation
  FileContent,
  GeneratedFile,
  
  // Intent
  IntentResult,
  IntentType,
  
  // Agent Result
  RichAgentResult,
  AgentTimings,
  Priority
} from "./types/index.js";

// Contexto de geração
export { GenerationContext, globalGenerationContext } from "./context/index.js";

// Governança
export {
  CompletenessValidator,
  globalCompletenessValidator,
  type CompletenessValidationResult,
  type ValidationViolation,
  type ViolationType
} from "./governance/index.js";

// Cache
export { CacheService, globalAnalysisCache } from "./services/cache.service.js";
MAIN_INDEX_EOF

log_success "index.ts atualizado"

###############################################################################
# FINALIZAÇÃO
###############################################################################
echo ""
log_info "=========================================="
log_info "ARQUIVOS CRIADOS/ATUALIZADOS:"
log_info "=========================================="
echo "  ✅ packages/analysis-agent/src/types/rich-schemas.ts"
echo "  ✅ packages/analysis-agent/src/types/index.ts"
echo "  ✅ packages/analysis-agent/src/context/generation-context.ts"
echo "  ✅ packages/analysis-agent/src/context/index.ts"
echo "  ✅ packages/analysis-agent/src/governance/completeness-validator.ts"
echo "  ✅ packages/analysis-agent/src/governance/index.ts"
echo "  ✅ packages/analysis-agent/src/index.ts"
echo ""
log_info "=========================================="
log_info "BACKUP SALVO EM:"
log_info "=========================================="
echo "  📁 ${BACKUP_DIR}/"
echo ""
log_warn "PRÓXIMOS PASSOS:"
echo ""
echo "  1. Execute o segundo script para atualizar o agent.ts:"
echo "     ./02_update_agent_implementation.sh"
echo ""
echo "  2. Depois, valide com o pipeline:"
echo "     pnpm lint && pnpm typecheck && pnpm build"
echo ""
log_success "Script 01 concluído com sucesso!"
