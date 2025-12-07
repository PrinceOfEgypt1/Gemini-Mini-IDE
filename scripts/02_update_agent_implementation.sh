#!/usr/bin/env bash
###############################################################################
# SCRIPT: 02_update_agent_implementation.sh
# DESCRIÇÃO: Atualiza o agent.ts para integrar com:
#            - Schemas ricos (types/rich-schemas.ts)
#            - Contexto de geração (context/generation-context.ts)
#            - Validador de completude (governance/completeness-validator.ts)
#
# AUTOR: Mini-IDE Engine
# DATA: 2024-12-06
# VERSÃO: 1.0.0
#
# USO:
#   chmod +x 02_update_agent_implementation.sh
#   ./02_update_agent_implementation.sh
#
# PRÉ-REQUISITOS:
#   - Script 01_upgrade_quality_schemas.sh já executado
#   - Estar na raiz do projeto Gemini-Mini-IDE
#
# IMPORTANTE:
#   Este script SOBRESCREVE o arquivo agent.ts.
#   Um backup já foi criado pelo script 01.
###############################################################################
set -euo pipefail

# --- CORES PARA OUTPUT ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# --- VERIFICAÇÕES ---
log_info "Verificando pré-condições..."

if [[ ! -f "packages/analysis-agent/src/types/rich-schemas.ts" ]]; then
  log_error "Execute primeiro: ./01_upgrade_quality_schemas.sh"
  exit 1
fi

if [[ ! -f "packages/analysis-agent/src/context/generation-context.ts" ]]; then
  log_error "Execute primeiro: ./01_upgrade_quality_schemas.sh"
  exit 1
fi

log_success "Pré-condições verificadas"

# --- BACKUP ADICIONAL ---
BACKUP_FILE="backups/agent.ts.pre-update-$(date +%Y%m%d_%H%M%S).bak"
mkdir -p backups
cp packages/analysis-agent/src/agent.ts "${BACKUP_FILE}"
log_info "Backup adicional: ${BACKUP_FILE}"

###############################################################################
# NOVO agent.ts COMPLETO
# Integrado com schemas ricos, contexto e validador
###############################################################################
log_info "Reescrevendo agent.ts com integração completa..."

cat > packages/analysis-agent/src/agent.ts << 'AGENT_EOF'
/**
 * @fileoverview AnalysisAgent v14.0 - Quality Upgrade
 * 
 * Melhorias implementadas:
 * - Schemas ricos que capturam 100% da informação do LLM
 * - Contexto acumulativo entre etapas do pipeline
 * - Validação de completude (Anti-Lazy Guard)
 * - Sanitizers que preservam estrutura (não convertem para string)
 * 
 * @module agent
 * @version 14.0.0
 */

import OpenAI from "openai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "./prompts/index.js";
import { globalAnalysisCache } from "./services/cache.service.js";
import { globalGenerationContext, GenerationContext } from "./context/generation-context.js";
import { globalCompletenessValidator } from "./governance/completeness-validator.js";
import {
  // Schemas
  RichAnalysisSchema,
  RichProductPlanSchema,
  RichArchitectureSchema,
  RichUserStoriesResultSchema,
  FileContentSchema,
  IntentSchema,
  // Types
  type RichAnalysis,
  type RichProductPlan,
  type RichArchitecture,
  type RichUserStoriesResult,
  type RichUserStory,
  type FileContent,
  type GeneratedFile,
  type IntentResult,
  type RichAgentResult,
  type AgentTimings,
  type ComplexityLevel,
  type Priority,
  type Criticality,
  type FileCategory,
  type TechStack,
  type RichManifestItem
} from "./types/rich-schemas.js";

// =============================================================================
// MAPS DE NORMALIZAÇÃO
// =============================================================================

const COMPLEXITY_MAP: Record<string, ComplexityLevel> = {
  "baixa": "LOW", "low": "LOW",
  "média": "MEDIUM", "media": "MEDIUM", "medium": "MEDIUM",
  "alta": "HIGH", "high": "HIGH",
  "crítica": "CRITICAL", "critica": "CRITICAL", "critical": "CRITICAL"
};

const PRIORITY_MAP: Record<string, Priority> = {
  "p0": "P0", "critical": "P0",
  "p1": "P1", "high": "P1",
  "p2": "P2", "medium": "P2",
  "p3": "P3", "low": "P3"
};

const CRITICALITY_MAP: Record<string, Criticality> = {
  "high": "HIGH", "alta": "HIGH", "core": "HIGH",
  "medium": "MEDIUM", "média": "MEDIUM", "media": "MEDIUM", "support": "MEDIUM",
  "low": "LOW", "baixa": "LOW", "config": "LOW"
};

const CATEGORY_MAP: Record<string, FileCategory> = {
  "domain": "DOMAIN", "domínio": "DOMAIN",
  "application": "APPLICATION", "aplicação": "APPLICATION",
  "infrastructure": "INFRASTRUCTURE", "infra": "INFRASTRUCTURE",
  "devops": "DEVOPS", "ci": "DEVOPS", "cd": "DEVOPS",
  "config": "CONFIG", "configuração": "CONFIG",
  "tests": "TESTS", "test": "TESTS", "testes": "TESTS",
  "docs": "DOCS", "documentation": "DOCS", "documentação": "DOCS"
};

// =============================================================================
// FUNÇÕES DE SANITIZAÇÃO (Preservam estrutura rica)
// =============================================================================

function ensureString(value: unknown, fallback: string): string {
  return (typeof value === "string" && value.trim().length > 0) ? value.trim() : fallback;
}

function ensureStringArray(value: unknown, defaultItems?: string[]): string[] {
  if (!Array.isArray(value)) return defaultItems ?? [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function ensureNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

function normalizeComplexity(value: unknown): ComplexityLevel {
  if (typeof value !== "string") return "MEDIUM";
  return COMPLEXITY_MAP[value.trim().toLowerCase()] ?? "MEDIUM";
}

function normalizePriority(value: unknown): Priority {
  if (typeof value !== "string") return "P2";
  return PRIORITY_MAP[value.trim().toLowerCase()] ?? "P2";
}

function normalizeCriticality(value: unknown): Criticality {
  if (typeof value !== "string") return "MEDIUM";
  return CRITICALITY_MAP[value.trim().toLowerCase()] ?? "MEDIUM";
}

function normalizeCategory(value: unknown): FileCategory {
  if (typeof value !== "string") return "APPLICATION";
  return CATEGORY_MAP[value.trim().toLowerCase()] ?? "APPLICATION";
}

function normalizePath(rawPath: unknown): string {
  if (typeof rawPath !== "string") return "unknown.file";
  return rawPath.trim().replace(/^(\.\/|\/)+/, "");
}

function cleanJsonString(input: string): string {
  return input.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
}

// =============================================================================
// SANITIZERS RICOS (Capturam toda informação do LLM)
// =============================================================================

/**
 * Sanitiza resposta de Analysis preservando estrutura rica
 */
function sanitizeRichAnalysis(raw: unknown): RichAnalysis {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const complexityData = (data["complexity"] && typeof data["complexity"] === "object")
    ? data["complexity"] as Record<string, unknown>
    : {};

  return {
    summary: ensureString(data["summary"], "Análise não disponível"),
    coreEntities: ensureStringArray(data["coreEntities"], ["Entidade"]),
    complexity: {
      level: normalizeComplexity(complexityData["level"] ?? data["complexity"]),
      score: ensureNumber(complexityData["score"], 5),
      justification: ensureString(complexityData["justification"], "Complexidade estimada")
    },
    assumptions: ensureStringArray(data["assumptions"], ["Premissa padrão assumida"]),
    implicitRequirements: ensureStringArray(data["implicitRequirements"], [])
  };
}

/**
 * Sanitiza resposta de Product preservando estrutura rica
 */
function sanitizeRichProductPlan(raw: unknown): RichProductPlan {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawEpics = Array.isArray(data["epics"]) ? data["epics"] : [];

  return {
    productVision: ensureString(data["productVision"], "Visão do produto"),
    epics: rawEpics.map((e: unknown, i: number) => {
      const epic = (e && typeof e === "object") ? e as Record<string, unknown> : {};
      return {
        id: ensureString(epic["id"], `EPIC-${String(i + 1).padStart(3, "0")}`),
        title: ensureString(epic["title"], `Épico ${i + 1}`),
        category: (epic["category"] as string) ?? "CORE",
        context: ensureString(epic["context"], "Contexto do épico"),
        requirements: ensureStringArray(epic["requirements"], ["Requisito pendente"]),
        acceptanceCriteria: ensureStringArray(epic["acceptanceCriteria"], ["Critério pendente"]),
        priority: normalizePriority(epic["priority"]),
        estimatedComplexity: normalizeComplexity(epic["estimatedComplexity"])
      };
    }),
    outOfScope: ensureStringArray(data["outOfScope"], []),
    risks: Array.isArray(data["risks"])
      ? data["risks"].map((r: unknown) => {
          const risk = (r && typeof r === "object") ? r as Record<string, unknown> : {};
          return {
            description: ensureString(risk["description"], "Risco identificado"),
            mitigation: ensureString(risk["mitigation"], "Mitigação pendente")
          };
        })
      : []
  };
}

/**
 * Sanitiza resposta de Architecture preservando estrutura rica
 */
function sanitizeRichArchitecture(raw: unknown): RichArchitecture {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawStack = (data["stack"] && typeof data["stack"] === "object")
    ? data["stack"] as Record<string, unknown>
    : {};
  const rawManifest = Array.isArray(data["manifest"]) ? data["manifest"] : [];
  const rawDecisions = Array.isArray(data["keyDecisions"]) ? data["keyDecisions"] : [];

  // Normalizar stack - pode vir como objeto ou string
  let stack: TechStack;
  if (typeof data["stack"] === "string") {
    // LLM retornou string - criar objeto padrão com a string como descrição
    stack = {
      runtime: "Node.js",
      language: data["stack"],
      framework: "Fastify",
      orm: "N/A",
      database: "N/A",
      cache: "N/A",
      queue: "N/A",
      testing: "Vitest",
      documentation: "README.md"
    };
  } else {
    stack = {
      runtime: ensureString(rawStack["runtime"], "Node.js"),
      language: ensureString(rawStack["language"], "TypeScript"),
      framework: ensureString(rawStack["framework"], "Fastify"),
      orm: ensureString(rawStack["orm"], "N/A"),
      database: ensureString(rawStack["database"], "N/A"),
      cache: ensureString(rawStack["cache"], "N/A"),
      queue: ensureString(rawStack["queue"], "N/A"),
      testing: ensureString(rawStack["testing"], "Vitest"),
      documentation: ensureString(rawStack["documentation"], "README.md")
    };
  }

  return {
    architectureStyle: ensureString(data["architectureStyle"], "Clean Architecture"),
    stack,
    diagram: ensureString(data["diagram"], ""),
    keyDecisions: rawDecisions.map((d: unknown) => {
      const dec = (d && typeof d === "object") ? d as Record<string, unknown> : {};
      return {
        decision: ensureString(dec["decision"], "Decisão"),
        rationale: ensureString(dec["rationale"], "Racional")
      };
    }),
    manifest: rawManifest.map((m: unknown) => {
      const item = (m && typeof m === "object") ? m as Record<string, unknown> : {};
      return {
        path: normalizePath(item["path"]),
        purpose: ensureString(item["purpose"], "Arquivo do projeto"),
        criticality: normalizeCriticality(item["criticality"]),
        category: normalizeCategory(item["category"])
      };
    }).filter(m => m.path !== "unknown.file"),
    securityConsiderations: ensureStringArray(data["securityConsiderations"], []),
    scalabilityPath: ensureStringArray(data["scalabilityPath"], [])
  };
}

/**
 * Sanitiza resposta de User Stories preservando estrutura GWT
 */
function sanitizeRichUserStories(raw: unknown): RichUserStoriesResult {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawStories = Array.isArray(data["userStories"]) ? data["userStories"] : [];

  const userStories = rawStories.map((s: unknown, i: number) => {
    const story = (s && typeof s === "object") ? s as Record<string, unknown> : {};
    const rawAC = Array.isArray(story["acceptanceCriteria"]) ? story["acceptanceCriteria"] : [];

    return {
      id: ensureString(story["id"], `US-${String(i + 1).padStart(3, "0")}`),
      title: ensureString(story["title"], `História ${i + 1}`),
      description: ensureString(story["description"], "Como usuário, quero realizar ação, para obter valor"),
      acceptanceCriteria: rawAC.map((ac: unknown, j: number) => {
        const criterion = (ac && typeof ac === "object") ? ac as Record<string, unknown> : {};
        // Se veio como string simples, converter para estrutura GWT
        if (typeof ac === "string") {
          return {
            id: `AC-${i + 1}-${j + 1}`,
            scenario: ac,
            given: "Dado contexto inicial",
            when: "Quando ação é executada",
            then: ac
          };
        }
        return {
          id: ensureString(criterion["id"], `AC-${i + 1}-${j + 1}`),
          scenario: ensureString(criterion["scenario"], `Cenário ${j + 1}`),
          given: ensureString(criterion["given"], "Dado que"),
          when: ensureString(criterion["when"], "Quando"),
          then: ensureString(criterion["then"], "Então")
        };
      }),
      technicalNotes: ensureStringArray(story["technicalNotes"], []),
      dependencies: ensureStringArray(story["dependencies"], []),
      estimatedPoints: ensureNumber(story["estimatedPoints"], 3),
      priority: normalizePriority(story["priority"])
    };
  });

  const summaryData = (data["summary"] && typeof data["summary"] === "object")
    ? data["summary"] as Record<string, unknown>
    : {};

  return {
    epicId: ensureString(data["epicId"], "EPIC-000"),
    epicTitle: ensureString(data["epicTitle"], "Épico"),
    userStories,
    summary: {
      totalStories: userStories.length,
      totalPoints: userStories.reduce((sum, s) => sum + s.estimatedPoints, 0),
      p0Count: userStories.filter(s => s.priority === "P0").length,
      p1Count: userStories.filter(s => s.priority === "P1").length,
      p2Count: userStories.filter(s => s.priority === "P2").length
    }
  };
}

/**
 * Sanitiza resposta de Code Generation
 */
function sanitizeFileContent(raw: unknown, path: string): FileContent {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  return {
    path: normalizePath(data["path"] ?? path),
    code: ensureString(data["code"], "// Erro na geração de código"),
    explanation: typeof data["explanation"] === "string" ? data["explanation"] : undefined
  };
}

/**
 * Sanitiza resposta de Intent
 */
function sanitizeIntent(raw: unknown): IntentResult {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const typeValue = data["type"];
  let type: IntentResult["type"] = "NEW_PROJECT";

  if (typeof typeValue === "string" && ["QUESTION", "REFINEMENT", "NEW_PROJECT"].includes(typeValue)) {
    type = typeValue as IntentResult["type"];
  }

  return {
    type,
    reasoning: typeof data["reasoning"] === "string" ? data["reasoning"] : undefined
  };
}

// =============================================================================
// TIPO GENÉRICO PARA SANITIZADOR
// =============================================================================

type SanitizeFunction<T> = (raw: unknown) => T;

// =============================================================================
// CLASSE PRINCIPAL: AnalysisAgent v14.0
// =============================================================================

/**
 * Agente de análise que orquestra o pipeline de geração.
 * 
 * @version 14.0.0
 * @description Quality Upgrade - Schemas ricos, contexto acumulativo, validação
 */
export class AnalysisAgent {
  private client: OpenAI;
  private model: string;
  private context: GenerationContext;

  constructor(apiKey: string, baseURL?: string, model?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model ?? "gpt-4o";
    this.context = globalGenerationContext;
  }

  /**
   * Limpa formatação do prompt do usuário
   */
  private cleanPrompt(prompt: string): string {
    return prompt.replace(/\r\n/g, "\n").trim();
  }

  /**
   * Executa o pipeline completo de análise
   */
  async analyze(userPrompt: string): Promise<RichAgentResult> {
    const logger = console;
    logger.info(`[Agent v14.0] Quality Upgrade. Cache: ${globalAnalysisCache.stats().size}`);

    const cleanUserPrompt = this.cleanPrompt(userPrompt);
    this.context.start(cleanUserPrompt);

    const stepTimes: AgentTimings = {
      total: 0, analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0
    };
    const tStart = performance.now();

    try {
      // --- INTENT DETECTION ---
      const intent = await this.detectIntent(cleanUserPrompt);
      logger.info(`[Agent] Intent: ${intent.type}`);

      if (intent.type === "QUESTION") {
        const answer = await this.generateTextResponse(cleanUserPrompt);
        stepTimes.total = performance.now() - tStart;
        return this.createChatResponse(answer, stepTimes);
      }

      // --- STEP 1: ANALYSIS ---
      const t1 = performance.now();
      const analysis = await this.runAnalysisStep(cleanUserPrompt);
      this.context.setAnalysis(analysis);
      stepTimes.analysis = performance.now() - t1;
      logger.info(`[Agent] Analysis: ${analysis.complexity.level} (${analysis.complexity.score}/10)`);

      // --- STEP 2: PRODUCT ---
      const t2 = performance.now();
      const productPlan = await this.runProductStep();
      this.context.setProduct(productPlan);
      stepTimes.product = performance.now() - t2;
      logger.info(`[Agent] Product: ${productPlan.epics.length} épicos`);

      // --- STEP 3: ARCHITECTURE ---
      const t3 = performance.now();
      const architecture = await this.runArchitectureStep();
      this.context.setArchitecture(architecture);
      stepTimes.architecture = performance.now() - t3;
      logger.info(`[Agent] Architecture: ${architecture.manifest.length} arquivos no manifest`);

      // --- STEP 4: CODE GENERATION ---
      const t4 = performance.now();
      const allFiles = await this.generateAllFiles(architecture);
      stepTimes.codeGen = performance.now() - t4;
      logger.info(`[Agent] Code: ${allFiles.length} arquivos gerados`);

      // --- STEP 5: USER STORIES ---
      const t5 = performance.now();
      const allUserStories = await this.expandAllEpicsToStories(productPlan);
      stepTimes.userStories = performance.now() - t5;
      logger.info(`[Agent] HUs: ${allUserStories.length} histórias`);

      // --- VALIDAÇÃO DE COMPLETUDE ---
      const validationResult = globalCompletenessValidator.validateBatch(
        allFiles.map(f => ({ path: f.path, content: f.content }))
      );
      logger.info(`[Agent] Completeness: ${validationResult.overallScore}%`);

      stepTimes.total = performance.now() - tStart;
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      return {
        summary: analysis.summary,
        requestId,
        timestamp: new Date().toISOString(),
        timings: stepTimes,
        analysis,
        product: productPlan,
        architect: architecture,
        engine: { files: allFiles },
        userStories: allUserStories,
        quality: {
          validationErrors: Array.from(validationResult.fileResults.entries())
            .flatMap(([path, result]) =>
              result.violations
                .filter(v => v.severity === "error")
                .map(v => `${path}:${v.line ?? 0} - ${v.message}`)
            ),
          codeCompleteness: validationResult.overallScore
        },
        fenix: {
          notes: `Generated via Agent v14.0 (Quality Upgrade) in ${Math.round(stepTimes.total)}ms`
        }
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[Agent] Erro fatal:", errorMessage);
      throw error;
    }
  }

  // ===========================================================================
  // MÉTODOS DE PIPELINE
  // ===========================================================================

  private async detectIntent(prompt: string): Promise<IntentResult> {
    return this.callLLM(
      SYSTEM_PROMPTS.DETECT_INTENT,
      `Entrada: "${prompt}"`,
      sanitizeIntent,
      IntentSchema,
      "Intent"
    );
  }

  private async generateTextResponse(prompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: [{ role: "user", content: prompt }]
      },
      { timeout: 60000 }
    );
    return completion.choices[0]?.message?.content ?? "Sem resposta.";
  }

  private async runAnalysisStep(prompt: string): Promise<RichAnalysis> {
    return this.callLLM(
      SYSTEM_PROMPTS.ANALYSIS,
      `Pedido: ${prompt}`,
      sanitizeRichAnalysis,
      RichAnalysisSchema,
      "Analysis"
    );
  }

  private async runProductStep(): Promise<RichProductPlan> {
    const richContext = this.context.buildProductContext();
    return this.callLLM(
      SYSTEM_PROMPTS.PRODUCT,
      richContext,
      sanitizeRichProductPlan,
      RichProductPlanSchema,
      "Product"
    );
  }

  private async runArchitectureStep(): Promise<RichArchitecture> {
    const richContext = this.context.buildArchitectureContext();
    return this.callLLM(
      SYSTEM_PROMPTS.ARCHITECTURE,
      richContext,
      sanitizeRichArchitecture,
      RichArchitectureSchema,
      "Architecture"
    );
  }

  private async generateAllFiles(architecture: RichArchitecture): Promise<GeneratedFile[]> {
    const manifest = architecture.manifest;
    const batchSize = 3;
    const allFiles: GeneratedFile[] = [];

    // Ordenar por categoria para gerar configs/types primeiro
    const sortedManifest = [...manifest].sort((a, b) => {
      const order: Record<FileCategory, number> = {
        CONFIG: 1, DOMAIN: 2, APPLICATION: 3, INFRASTRUCTURE: 4, DEVOPS: 5, TESTS: 6, DOCS: 7
      };
      return (order[a.category] ?? 99) - (order[b.category] ?? 99);
    });

    for (let i = 0; i < sortedManifest.length; i += batchSize) {
      const batch = sortedManifest.slice(i, i + batchSize);
      // eslint-disable-next-line no-console
      console.info(`[Agent] Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sortedManifest.length / batchSize)}...`);

      const batchResults = await Promise.all(
        batch.map(spec => this.generateFileContent(spec))
      );

      for (const file of batchResults) {
        allFiles.push(file);
        this.context.addGeneratedFile(file);
      }
    }

    return allFiles;
  }

  private async generateFileContent(spec: RichManifestItem): Promise<GeneratedFile> {
    try {
      const richContext = this.context.buildCodeGenContext(spec.path);
      const userMessage = `${richContext}\n\n## GERE O CÓDIGO PARA: ${spec.path}`;

      const parsed = await this.callLLM(
        SYSTEM_PROMPTS.CODE_GEN,
        userMessage,
        (r) => sanitizeFileContent(r, spec.path),
        FileContentSchema,
        `File:${spec.path}`
      );

      // Validar completude
      const validation = globalCompletenessValidator.validate(parsed.code, spec.path);
      if (!validation.isComplete && validation.violations.some(v => v.severity === "error")) {
        // eslint-disable-next-line no-console
        console.warn(`[Agent] Código incompleto para ${spec.path}: ${validation.violations.length} violações`);
        // Poderia disparar loop de correção aqui (futuro)
      }

      return {
        path: parsed.path,
        content: parsed.code,
        language: this.detectLanguage(parsed.path)
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`[Agent] Erro gerando ${spec.path}:`, error);
      return {
        path: normalizePath(spec.path),
        content: `// Erro na geração: ${error instanceof Error ? error.message : "Unknown"}`,
        language: "plaintext"
      };
    }
  }

  private async expandAllEpicsToStories(productPlan: RichProductPlan): Promise<RichUserStory[]> {
    const allStories: RichUserStory[] = [];

    for (const epic of productPlan.epics) {
      const richContext = this.context.buildUserStoriesContext(epic.id);
      const result = await this.callLLM(
        SYSTEM_PROMPTS.USER_STORIES,
        richContext,
        sanitizeRichUserStories,
        RichUserStoriesResultSchema,
        `HUs:${epic.id}`
      );

      allStories.push(...result.userStories);
      this.context.addUserStories(result.userStories);
    }

    return allStories;
  }

  // ===========================================================================
  // MÉTODO CORE DE CHAMADA LLM
  // ===========================================================================

  private async callLLM<T>(
    sys: string,
    usr: string,
    san: SanitizeFunction<T>,
    sch: z.ZodType<T>,
    ctx: string
  ): Promise<T> {
    const cacheKey = globalAnalysisCache.generateKey(sys, usr, this.model, 0.0);
    const cached = globalAnalysisCache.get<T>(cacheKey);

    if (cached) {
      // eslint-disable-next-line no-console
      console.info(`[Agent][Cache Hit] ${ctx}`);
      return cached;
    }

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        const completion = await this.client.chat.completions.create(
          {
            model: this.model,
            messages: [
              { role: "system", content: sys },
              { role: "user", content: usr }
            ],
            response_format: { type: "json_object" },
            temperature: 0.0,
            seed: 42
          },
          { timeout: 60000 }
        );

        const rawContent = completion.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(cleanJsonString(rawContent));
        const sanitized = san(parsed);
        const validated = sch.parse(sanitized);

        globalAnalysisCache.set(cacheKey, validated);
        return validated;

      } catch (e) {
        attempt++;
        // eslint-disable-next-line no-console
        console.warn(`[Agent] Tentativa ${attempt}/${maxAttempts} falhou para ${ctx}:`, e);
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    // Fallback com dados vazios
    // eslint-disable-next-line no-console
    console.error(`[Agent] Todas tentativas falharam para ${ctx}, usando fallback`);
    return sch.parse(san({}));
  }

  // ===========================================================================
  // MÉTODOS AUXILIARES
  // ===========================================================================

  private detectLanguage(path: string): string {
    if (/\.(ts|tsx)$/.test(path)) return "typescript";
    if (/\.(js|jsx)$/.test(path)) return "javascript";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".md")) return "markdown";
    if (path.endsWith(".yml") || path.endsWith(".yaml")) return "yaml";
    if (path.endsWith(".sh")) return "bash";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".html")) return "html";
    return "plaintext";
  }

  private createChatResponse(answer: string, timings: AgentTimings): RichAgentResult {
    return {
      summary: answer,
      requestId: `chat-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timings,
      analysis: {
        summary: answer,
        coreEntities: [],
        complexity: { level: "LOW", score: 1, justification: "Pergunta simples" },
        assumptions: [],
        implicitRequirements: []
      },
      product: { productVision: "", epics: [], outOfScope: [], risks: [] },
      architect: {
        architectureStyle: "",
        stack: {
          runtime: "", language: "", framework: "", orm: "",
          database: "", cache: "", queue: "", testing: "", documentation: ""
        },
        diagram: "",
        keyDecisions: [],
        manifest: [],
        securityConsiderations: [],
        scalabilityPath: []
      },
      engine: { files: [] },
      userStories: [],
      quality: { validationErrors: [], codeCompleteness: 100 },
      fenix: { notes: "Chat Response Only" }
    };
  }
}
AGENT_EOF

log_success "agent.ts atualizado com integração completa"

###############################################################################
# FINALIZAÇÃO
###############################################################################
echo ""
log_info "=========================================="
log_info "AGENT.TS ATUALIZADO COM SUCESSO"
log_info "=========================================="
echo ""
log_warn "VALIDAÇÃO OBRIGATÓRIA:"
echo ""
echo "  Execute os comandos abaixo para validar:"
echo ""
echo "  pnpm lint"
echo "  pnpm typecheck"
echo "  pnpm build"
echo ""
echo "  Se tudo passar, o upgrade está completo!"
echo ""
log_success "Script 02 concluído!"
