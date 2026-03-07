#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 09_fix_compilation.sh
# DESCRIÇÃO: 
#   1. Remove funções não utilizadas (dead code) em agent.ts.
#   2. Corrige interfaces TypeScript (Architecture, Epic) para compatibilidade com Zod.
#   3. Sincroniza exports em index.ts.
# AUTOR: Mini-IDE Engine Team
# ==============================================================================

echo ">>> Iniciando Correção de Compilação (TypeScript Fixes)..."

# ------------------------------------------------------------------------------
# 1. Corrigindo packages/analysis-agent/src/agent.ts
# ------------------------------------------------------------------------------
echo ">>> Reescrevendo packages/analysis-agent/src/agent.ts (Clean & Typed)..."
cat > packages/analysis-agent/src/agent.ts << 'EOF'
import OpenAI from "openai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "./prompts/index.js";
import { globalAnalysisCache } from "./services/cache.service.js";

// --- TIPOS ---

export type Complexity = "Baixa" | "Média" | "Alta" | "Crítica";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Criticality = "Core" | "Support" | "Config";

export interface Analysis {
  summary: string;
  scope_quantification?: {
    expected_modules: number;
    estimated_features_min: number;
    complexity_reasoning: string;
  };
  complexity: Complexity;
  assumptions: string[];
}

export interface Requirement {
  id: string;
  description: string;
  acceptance_criteria: string[];
}

export interface Epic {
  title: string;
  business_value?: string; // Corrigido: Opcional para bater com Zod
  requirements: Requirement[];
}

export interface ProductPlan {
  thought_process?: {
    atomic_breakdown_list: string[];
  };
  epics: Epic[];
  granularity_score?: number;
}

export interface ManifestItem {
  path: string;
  purpose: string;
  criticality: Criticality;
  implements_requirements?: string[];
}

export interface Architecture {
  stack: string;
  architecture_pattern?: string;
  diagram?: string; // Corrigido: Adicionado campo que faltava na interface
  manifest: ManifestItem[];
}

export interface TechnicalSpec {
  file_path: string;
  technical_spec: {
    imports_required: string[];
    interfaces_to_define: string[];
    functions_to_implement: Array<{
      name: string;
      args: string;
      return_type: string;
      logic_steps: string[];
      error_handling?: string;
    }>;
  };
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  explanation?: string;
}

// Tipo simplificado para FileContent se for usado externamente
export interface FileContent {
  path: string;
  code: string;
  explanation?: string;
}

export interface UserStory {
  id: string;
  title: string;
  priority: Priority;
  role: string;
  action: string;
  benefit: string;
  acceptanceCriteria: string[];
  functionalRequirements: string[];
  securityRequirements: string[];
  businessContext: string;
}

export interface UserStoriesResult {
  userStories: UserStory[];
}

export interface MappedUserStory {
  id: string;
  title: string;
  priority: Priority;
  role: string;
  action: string;
  benefit: string;
  acceptanceCriteria: string[];
  functionalReqs: string[];
  security: string[];
  context: string;
  nonFunctionalReqs: string[];
  description: string;
}

export interface IntentResult {
  type: "NEW_PROJECT" | "QUESTION" | "REFINEMENT";
  reasoning?: string;
}

export interface BudgetContext {
  files?: Array<{ path: string; purpose?: string }>;
  summary?: string;
}

export interface AgentTimings {
  total: number;
  analysis: number;
  product: number;
  architecture: number;
  codeGen: number;
  userStories: number;
}

export interface AgentResult {
  summary: string;
  requestId: string;
  timestamp: string;
  timings: AgentTimings;
  analysis: Analysis;
  product: { userStories: MappedUserStory[]; rawEpics?: Epic[] };
  architect: { diagram?: string; stack: string; pattern?: string };
  engine: { files: GeneratedFile[] };
  ux: { components: unknown[] };
  quality: { tests: unknown[] };
  ops: { scripts: unknown[] };
  fenix: { notes: string };
}

// --- ZOD SCHEMAS ---

const AnalysisSchema = z.object({
  summary: z.string(),
  scope_quantification: z.object({
    expected_modules: z.number(),
    estimated_features_min: z.number(),
    complexity_reasoning: z.string()
  }).optional(),
  complexity: z.enum(["Baixa", "Média", "Alta", "Crítica"]),
  assumptions: z.array(z.string())
});

const RequirementSchema = z.object({
  id: z.string(),
  description: z.string(),
  acceptance_criteria: z.array(z.string())
});

const EpicSchema = z.object({
  title: z.string(),
  business_value: z.string().optional(),
  requirements: z.array(RequirementSchema)
});

const ProductPlanSchema = z.object({
  thought_process: z.object({
    atomic_breakdown_list: z.array(z.string())
  }).optional(),
  epics: z.array(EpicSchema),
  granularity_score: z.number().optional()
});

const ArchitectureSchema = z.object({
  stack: z.string(),
  architecture_pattern: z.string().optional(),
  diagram: z.string().optional(),
  manifest: z.array(z.object({
    path: z.string(),
    purpose: z.string(),
    criticality: z.enum(["Core", "Support", "Config"]),
    implements_requirements: z.array(z.string()).optional()
  }))
});

const TechnicalSpecSchema = z.object({
  file_path: z.string(),
  technical_spec: z.object({
    imports_required: z.array(z.string()),
    interfaces_to_define: z.array(z.string()),
    functions_to_implement: z.array(z.object({
      name: z.string(),
      args: z.string(),
      return_type: z.string(),
      logic_steps: z.array(z.string()),
      error_handling: z.string().optional()
    }))
  })
});

const FileContentSchema = z.object({
  path: z.string(),
  code: z.string(),
  explanation: z.string().optional()
});

const UserStoriesSchema = z.object({
  userStories: z.array(z.object({
    id: z.string(),
    title: z.string(),
    priority: z.enum(["P0", "P1", "P2", "P3"]),
    role: z.string(),
    action: z.string(),
    benefit: z.string(),
    acceptanceCriteria: z.array(z.string()),
    functionalRequirements: z.array(z.string()),
    securityRequirements: z.array(z.string()),
    businessContext: z.string()
  }))
});

const IntentSchema = z.object({
  type: z.enum(["NEW_PROJECT", "QUESTION", "REFINEMENT"]),
  reasoning: z.string().optional()
});

// --- HELPER FUNCTIONS ---

function normalizePath(rawPath: unknown): string {
  if (typeof rawPath !== "string") return "unknown.file";
  return rawPath.trim().replace(/^(\.\/|\/)+/, "");
}

// REMOVIDO: Funções de sanitize manuais não utilizadas para evitar erro TS6133
// sanitizePriority, sanitizeComplexity, etc. agora são tratadas via Zod ou inline se necessário.

function cleanJsonString(input: string): string {
  return input.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
}

// Sanitização Genérica
function sanitizeGeneric<T>(raw: unknown, schema: z.ZodType<T>, fallback: T): T {
  try {
    return schema.parse(raw);
  } catch (e) {
    if (typeof raw === 'object' && raw !== null) {
      // Em um cenário real, aqui poderíamos tentar recuperar parcial
      // Por simplicidade, retornamos fallback em caso de falha estrutural grave
      // eslint-disable-next-line no-console
      console.warn("Schema validation failed, using fallback/partial", e);
    }
    return fallback;
  }
}

type SanitizeFunction<T> = (raw: unknown) => T;

// --- MAIN AGENT CLASS ---

export class AnalysisAgent {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseURL?: string, model?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model ?? "gpt-4o";
  }

  private cleanPrompt(prompt: string): string {
    return prompt.replace(/[o]\s+/g, "").replace(/\r\n/g, "\n").trim();
  }

  async analyze(userPrompt: string, _budgetContext?: BudgetContext): Promise<AgentResult> {
    // eslint-disable-next-line no-console
    console.info(`[Agent v9.1] Pipeline Validado. Cache Size: ${globalAnalysisCache.stats().size}`);
    
    const cleanUserPrompt = this.cleanPrompt(userPrompt);
    const tStart = performance.now();
    const stepTimes = { analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0 };

    try {
      // 0. Intenção
      const intent = await this.detectIntent(cleanUserPrompt);
      if (intent.type === "QUESTION") {
        const answer = await this.generateTextResponse(cleanUserPrompt);
        const tEnd = performance.now();
        return this.createChatResponse(answer, tEnd - tStart);
      }

      // 1. Análise
      const t1 = performance.now();
      const analysis = await this.runAnalysisStep(cleanUserPrompt);
      stepTimes.analysis = performance.now() - t1;

      // 2. Produto
      const t2 = performance.now();
      const productPlan = await this.runProductStep(cleanUserPrompt, analysis);
      stepTimes.product = performance.now() - t2;

      // 3. Arquitetura
      const t3 = performance.now();
      // eslint-disable-next-line no-console
      console.info("[Agent] Desenhando Arquitetura e Rastreabilidade...");
      const architecture = await this.runArchitectureStep(cleanUserPrompt, productPlan);
      stepTimes.architecture = performance.now() - t3;

      const manifest = architecture.manifest;
      // eslint-disable-next-line no-console
      console.info(`[Agent] ${manifest.length} arquivos planejados.`);

      // 4. Engenharia
      const t4 = performance.now();
      const batchSize = 2; 
      const allFiles: GeneratedFile[] = [];

      // eslint-disable-next-line no-console
      console.info(`[Agent] Iniciando Codificação Profunda (Spec -> Code)...`);

      for (let i = 0; i < manifest.length; i += batchSize) {
        const batch = manifest.slice(i, i + batchSize);
        // eslint-disable-next-line no-console
        console.info(`[Agent] Batch ${Math.floor(i / batchSize) + 1}...`);
        
        const batchResults = await Promise.all(
          batch.map(fileSpec => 
            this.generateFileContent(fileSpec, architecture.stack, architecture.architecture_pattern || "Standard", cleanUserPrompt)
          )
        );
        allFiles.push(...batchResults);
      }
      stepTimes.codeGen = performance.now() - t4;

      // 5. Histórias de Usuário
      const t5 = performance.now();
      // eslint-disable-next-line no-console
      console.info("[Agent] Formatando Histórias de Usuário...");
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);
      stepTimes.userStories = performance.now() - t5;

      const mappedHUs: MappedUserStory[] = detailedHUs.map(hu => ({
        id: hu.id,
        title: hu.title,
        priority: hu.priority,
        role: hu.role,
        action: hu.action,
        benefit: hu.benefit,
        acceptanceCriteria: hu.acceptanceCriteria,
        functionalReqs: hu.functionalRequirements,
        security: hu.securityRequirements,
        context: hu.businessContext,
        nonFunctionalReqs: [],
        description: `Como ${hu.role}, quero ${hu.action}, para ${hu.benefit}`
      }));

      const requestId = `req-${Date.now()}`;
      const tTotal = performance.now() - tStart;

      return {
        summary: analysis.summary,
        requestId,
        timestamp: new Date().toISOString(),
        timings: { total: tTotal, ...stepTimes },
        analysis,
        product: { userStories: mappedHUs, rawEpics: productPlan.epics },
        architect: { 
          diagram: architecture.diagram, 
          stack: architecture.stack, 
          pattern: architecture.architecture_pattern 
        },
        engine: { files: allFiles },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via Agent v9.1 (Clean Types)" }
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error("[Agent] Erro fatal:", errorMessage);
      throw error;
    }
  }

  private createChatResponse(answer: string, totalTime: number): AgentResult {
    return {
      summary: answer,
      requestId: `chat-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timings: { total: totalTime, analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0 },
      analysis: { summary: answer, complexity: "Baixa", assumptions: [] },
      product: { userStories: [] },
      architect: { stack: "", diagram: "" },
      engine: { files: [] },
      ux: { components: [] },
      quality: { tests: [] },
      ops: { scripts: [] },
      fenix: { notes: "Chat Response Only" }
    };
  }

  // --- STEPS ---

  private async detectIntent(prompt: string): Promise<IntentResult> {
    return this.callLLM(SYSTEM_PROMPTS.DETECT_INTENT, `Entrada: "${prompt}"`, (r) => sanitizeGeneric(r, IntentSchema, { type: "NEW_PROJECT" }), IntentSchema, "Intent");
  }

  private async generateTextResponse(prompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
    }, { timeout: 60000 });
    return completion.choices[0]?.message?.content ?? "Sem resposta.";
  }

  private async runAnalysisStep(prompt: string): Promise<Analysis> {
    return this.callLLM(
      SYSTEM_PROMPTS.ANALYSIS, 
      `Pedido: ${prompt}`, 
      (r) => sanitizeGeneric(r, AnalysisSchema, { summary: "Erro", complexity: "Média", assumptions: [] }), 
      AnalysisSchema, 
      "Analysis"
    );
  }

  private async runProductStep(prompt: string, analysis: Analysis): Promise<ProductPlan> {
    const context = `Análise: ${analysis.complexity}\nResumo: ${analysis.summary}\nPedido: ${prompt}`;
    return this.callLLM(
      SYSTEM_PROMPTS.PRODUCT, 
      context, 
      (r) => sanitizeGeneric(r, ProductPlanSchema, { epics: [] }), 
      ProductPlanSchema, 
      "Product"
    );
  }

  private async runArchitectureStep(userPrompt: string, productPlan: ProductPlan): Promise<Architecture> {
    // Uso explícito do userPrompt no template para satisfazer TS6133
    const allReqs = productPlan.epics.flatMap(e => e.requirements.map(r => `[${r.id}] ${r.description}`)).join("\n");
    const fullContext = `Requisitos:\n${allReqs}\n\nContexto Original: ${userPrompt}`;
    
    return this.callLLM(
      SYSTEM_PROMPTS.ARCHITECTURE, 
      fullContext, 
      (r) => sanitizeGeneric(r, ArchitectureSchema, { stack: "Unknown", manifest: [] }), 
      ArchitectureSchema, 
      "Architecture"
    );
  }

  private async generateFileContent(spec: ManifestItem, stack: string, pattern: string, userPrompt: string): Promise<GeneratedFile> {
    try {
      const requirementsContext = spec.implements_requirements ? `Reqs: ${spec.implements_requirements.join(", ")}` : "Core logic";
      // Uso explícito de userPrompt
      const contextBase = `Arquivo: ${spec.path}\nStack: ${stack}\nPadrão: ${pattern}\nContexto: ${requirementsContext}\nPedido Global: ${userPrompt}`;

      // Passo 1: Spec
      const techSpec = await this.callLLM(
        SYSTEM_PROMPTS.TECH_SPEC,
        `Planeje implementação:\n${contextBase}`,
        (r) => sanitizeGeneric(r, TechnicalSpecSchema, { file_path: spec.path, technical_spec: { imports_required: [], interfaces_to_define: [], functions_to_implement: [] } }),
        TechnicalSpecSchema,
        `Spec:${spec.path}`
      );

      // Passo 2: Code
      const codeResult = await this.callLLM(
        SYSTEM_PROMPTS.CODE_GEN,
        `Implemente esta Spec:\n${JSON.stringify(techSpec)}`,
        (r) => sanitizeGeneric(r, FileContentSchema, { path: spec.path, code: "// Falha geração", explanation: "Erro" }),
        FileContentSchema,
        `Code:${spec.path}`
      );

      return {
        path: codeResult.path,
        content: codeResult.code,
        language: this.detectLanguage(codeResult.path),
        explanation: codeResult.explanation
      };

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { 
        path: normalizePath(spec.path), 
        content: `// Erro Crítico: ${msg}`, 
        language: this.detectLanguage(spec.path) 
      };
    }
  }

  private async expandEpicsToStories(epics: Epic[]): Promise<UserStory[]> {
    const richContext = epics.map(e => `Épico: ${e.title}\nReqs: ${e.requirements.map(r => r.description).join("; ")}`).join("\n---\n");
    const result = await this.callLLM(
      SYSTEM_PROMPTS.USER_STORIES, 
      richContext, 
      (r) => sanitizeGeneric(r, UserStoriesSchema, { userStories: [] }), 
      UserStoriesSchema, 
      "HUs"
    );
    return result.userStories;
  }

  private async callLLM<T>(sys: string, usr: string, san: SanitizeFunction<T>, sch: z.ZodType<T>, ctx: string): Promise<T> {
    const cacheKey = globalAnalysisCache.generateKey(sys, usr, this.model, 0.0);
    const cached = globalAnalysisCache.get<T>(cacheKey);
    
    if (cached) {
      // eslint-disable-next-line no-console
      console.info(`[Agent][Cache Hit] ${ctx}`);
      return cached;
    }

    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          response_format: { type: "json_object" },
          temperature: 0.0,
          seed: 42
        }, { timeout: 90000 });

        const rawContent = completion.choices[0]?.message?.content || "{}";
        const jsonRaw = JSON.parse(cleanJsonString(rawContent));
        const result = sch.parse(san(jsonRaw));
        
        globalAnalysisCache.set(cacheKey, result);
        return result;

      } catch (e) {
        attempt++;
        const err = e instanceof Error ? e.message : String(e);
        // eslint-disable-next-line no-console
        console.warn(`[Agent] Tentativa ${attempt} falhou em ${ctx}: ${err}`);
        
        if (attempt >= maxRetries) {
           // eslint-disable-next-line no-console
           console.error(`[Agent] Erro definitivo em ${ctx}.`);
           throw e; 
        }
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    throw new Error("Unreachable");
  }

  private detectLanguage(path: string): string {
    if (/\.(ts|tsx)$/.test(path)) return "typescript";
    if (/\.(js|jsx)$/.test(path)) return "javascript";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".md")) return "markdown";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".html")) return "html";
    return "plaintext";
  }
}
EOF

# ------------------------------------------------------------------------------
# 2. Corrigindo packages/analysis-agent/src/index.ts (Exports)
# ------------------------------------------------------------------------------
echo ">>> Sincronizando packages/analysis-agent/src/index.ts..."
cat > packages/analysis-agent/src/index.ts << 'EOF'
// Re-exporta tudo do agent para garantir visibilidade
export * from "./agent.js";
// Exporta prompts se necessário externamente
export * from "./prompts/index.js";
// Exporta serviço de cache
export * from "./services/cache.service.js";
EOF

# ------------------------------------------------------------------------------
# 3. Verificação
# ------------------------------------------------------------------------------
echo ">>> Executando Typecheck para validar correções..."
pnpm --filter @mini-ide/analysis-agent typecheck || { echo "❌ Typecheck falhou"; exit 1; }

echo "✅ Compilação corrigida. Código limpo e tipado."
EOF
