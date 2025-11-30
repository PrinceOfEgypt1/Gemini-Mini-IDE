#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 03_implement_cache.sh
# DESCRIÇÃO: Implementa CacheService em memória com TTL e hash semântico,
#            integrando ao AnalysisAgent para reduzir latência e custo (Fase 3).
# AUTOR: Mini-IDE Engine Team
# ==============================================================================

echo ">>> Iniciando Fase 3: Implementação de Cache Semântico..."

# 1. Criar diretório de serviços
mkdir -p packages/analysis-agent/src/services

# 2. Criar Cache Service
echo ">>> Criando packages/analysis-agent/src/services/cache.service.ts..."
cat > packages/analysis-agent/src/services/cache.service.ts << 'EOF'
import { createHash } from "crypto";

interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(ttlMinutes = 60, maxSize = 1000) {
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.maxSize = maxSize;
  }

  /**
   * Gera uma chave única baseada nos parâmetros da chamada LLM
   */
  generateKey(systemPrompt: string, userPrompt: string, model: string, temperature: number): string {
    const content = `${model}:${temperature}:${systemPrompt}:${userPrompt}`;
    return createHash("sha256").update(content).digest("hex");
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verifica TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    // Eviction simples se estourar limite
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      timestamp: Date.now(),
      data
    });
  }

  clear(): void {
    this.cache.clear();
  }

  stats(): { size: number; ttlMinutes: number } {
    return {
      size: this.cache.size,
      ttlMinutes: this.ttlMs / 60000
    };
  }
}
EOF

# 3. Atualizar Agent para usar Cache
# Nota: Mantemos os imports da Fase 2 (SYSTEM_PROMPTS) e configs da Fase 1 (timeout, seed)
echo ">>> Atualizando packages/analysis-agent/src/agent.ts..."
cat > packages/analysis-agent/src/agent.ts << 'EOF'
import OpenAI from "openai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "./prompts/index.js";
import { CacheService } from "./services/cache.service.js";

// --- TIPOS & SCHEMAS ---
export type Complexity = "Baixa" | "Média" | "Alta" | "Crítica";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Criticality = "Core" | "Support" | "Config";

export interface Analysis {
  summary: string;
  complexity: Complexity;
  assumptions: string[];
}

export interface Epic {
  title: string;
  context: string;
  requirements: string[];
}

export interface ProductPlan {
  epics: Epic[];
}

export interface ManifestItem {
  path: string;
  purpose: string;
  criticality: Criticality;
}

export interface Architecture {
  stack: string;
  diagram?: string;
  manifest: ManifestItem[];
}

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

export interface AgentResult {
  summary: string;
  requestId: string;
  timestamp: string;
  analysis: Analysis;
  product: { userStories: MappedUserStory[] };
  architect: { diagram?: string; stack: string };
  engine: { files: GeneratedFile[] };
  ux: { components: unknown[] };
  quality: { tests: unknown[] };
  ops: { scripts: unknown[] };
  fenix: { notes: string };
}

// --- ZOD SCHEMAS ---
const AnalysisSchema = z.object({
  summary: z.string(),
  complexity: z.enum(["Baixa", "Média", "Alta", "Crítica"]),
  assumptions: z.array(z.string())
});

const EpicSchema = z.object({
  title: z.string(),
  context: z.string(),
  requirements: z.array(z.string())
});

const ProductPlanSchema = z.object({
  epics: z.array(EpicSchema)
});

const ManifestItemSchema = z.object({
  path: z.string(),
  purpose: z.string(),
  criticality: z.enum(["Core", "Support", "Config"])
});

const ArchitectureSchema = z.object({
  stack: z.string(),
  diagram: z.string().optional(),
  manifest: z.array(ManifestItemSchema)
});

const FileContentSchema = z.object({
  path: z.string(),
  code: z.string(),
  explanation: z.string().optional()
});

const UserStorySchema = z.object({
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
});

const UserStoriesSchema = z.object({
  userStories: z.array(UserStorySchema)
});

const IntentSchema = z.object({
  type: z.enum(["NEW_PROJECT", "QUESTION", "REFINEMENT"]),
  reasoning: z.string().optional()
});

// --- SANITIZATION MAPS ---
const PRIORITY_MAP: Record<string, Priority> = {
  "p0": "P0", "critical": "P0",
  "p1": "P1", "high": "P1",
  "p2": "P2", "medium": "P2",
  "p3": "P3", "low": "P3"
};

const COMPLEXITY_MAP: Record<string, Complexity> = {
  "baixa": "Baixa", "low": "Baixa",
  "média": "Média", "media": "Média", "medium": "Média",
  "alta": "Alta", "high": "Alta",
  "crítica": "Crítica", "critica": "Crítica", "critical": "Crítica"
};

const CRITICALITY_MAP: Record<string, Criticality> = {
  "core": "Core", "main": "Core",
  "support": "Support", "utils": "Support",
  "config": "Config", "settings": "Config"
};

// --- SANITIZATION FUNCTIONS ---
function normalizePath(rawPath: unknown): string {
  if (typeof rawPath !== "string") return "unknown.file";
  return rawPath.trim().replace(/^(\.\/|\/)+/, "");
}

function sanitizePriority(value: unknown): Priority {
  if (typeof value !== "string") return "P2";
  const normalized = PRIORITY_MAP[value.trim().toLowerCase()];
  if (normalized) return normalized;

  const v = value.toLowerCase();
  if (v.includes("p0") || v.includes("critical")) return "P0";
  if (v.includes("p1") || v.includes("high")) return "P1";
  if (v.includes("p3") || v.includes("low")) return "P3";
  return "P2";
}

function sanitizeComplexity(value: unknown): Complexity {
  if (typeof value !== "string") return "Média";
  return COMPLEXITY_MAP[value.trim().toLowerCase()] ?? "Média";
}

function sanitizeCriticality(value: unknown): Criticality {
  if (typeof value !== "string") return "Core";
  return CRITICALITY_MAP[value.trim().toLowerCase()] ?? "Core";
}

function ensureString(value: unknown, fallback: string): string {
  return (typeof value === "string" && value.trim().length > 0) ? value.trim() : fallback;
}

function ensureStringArray(value: unknown, defaultText?: string): string[] {
  if (!Array.isArray(value)) return defaultText ? [defaultText] : [];
  const result = value
    .filter((item): item is string => typeof item === "string")
    .map(s => s.trim())
    .filter(s => s.length > 0);
  if (result.length === 0 && defaultText) return [defaultText];
  return result;
}

function sanitizeUserStory(raw: unknown, index: number): UserStory {
  const story = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  return {
    id: ensureString(story["id"], `HU-${String(index + 1).padStart(3, "0")}`),
    title: ensureString(story["title"], `História de Usuário ${index + 1}`),
    priority: sanitizePriority(story["priority"]),
    role: ensureString(story["role"], "usuário"),
    action: ensureString(story["action"], "realizar ação"),
    benefit: ensureString(story["benefit"], "obter valor"),
    acceptanceCriteria: ensureStringArray(story["acceptanceCriteria"], "Critério pendente"),
    functionalRequirements: ensureStringArray(story["functionalRequirements"], "Requisito pendente"),
    securityRequirements: ensureStringArray(story["securityRequirements"], "Requisito de segurança padrão"),
    businessContext: ensureString(story["businessContext"], "Contexto de negócio")
  };
}

function sanitizeAnalysis(raw: unknown): Analysis {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  return {
    summary: ensureString(data["summary"], "N/A"),
    complexity: sanitizeComplexity(data["complexity"]),
    assumptions: ensureStringArray(data["assumptions"])
  };
}

function sanitizeProductPlan(raw: unknown): ProductPlan {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawEpics = Array.isArray(data["epics"]) ? data["epics"] : [];
  return {
    epics: rawEpics.map((e: unknown, i: number) => {
      const epic = (e && typeof e === "object") ? e as Record<string, unknown> : {};
      return {
        title: ensureString(epic["title"], `Epic ${i}`),
        context: ensureString(epic["context"], ""),
        requirements: ensureStringArray(epic["requirements"])
      };
    })
  };
}

function sanitizeArchitecture(raw: unknown): Architecture {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawManifest = Array.isArray(data["manifest"]) ? data["manifest"] : [];
  return {
    stack: ensureString(data["stack"], "TypeScript"),
    diagram: typeof data["diagram"] === "string" ? data["diagram"] : undefined,
    manifest: rawManifest
      .map((m: unknown) => {
        const item = (m && typeof m === "object") ? m as Record<string, unknown> : {};
        return {
          path: normalizePath(item["path"]),
          purpose: ensureString(item["purpose"], "Code"),
          criticality: sanitizeCriticality(item["criticality"])
        };
      })
      .filter(m => m.path !== "unknown.file")
  };
}

function sanitizeFileContent(raw: unknown, path: string): FileContent {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  return {
    path: normalizePath(data["path"] ?? path),
    code: ensureString(data["code"], "// Error generating code"),
    explanation: typeof data["explanation"] === "string" ? data["explanation"] : undefined
  };
}

function sanitizeUserStories(raw: unknown): UserStoriesResult {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const stories = Array.isArray(data["userStories"]) ? data["userStories"] : [];
  return {
    userStories: stories.map((s: unknown, i: number) => sanitizeUserStory(s, i))
  };
}

function sanitizeIntent(raw: unknown): IntentResult {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const typeValue = data["type"];
  let type: IntentResult["type"] = "NEW_PROJECT";

  if (typeof typeValue === "string") {
    if (typeValue === "QUESTION" || typeValue === "REFINEMENT" || typeValue === "NEW_PROJECT") {
      type = typeValue;
    }
  }

  return { type, reasoning: typeof data["reasoning"] === "string" ? data["reasoning"] : undefined };
}

type SanitizeFunction<T> = (raw: unknown) => T;

function cleanJsonString(input: string): string {
  return input.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
}

// --- MAIN AGENT CLASS ---
export class AnalysisAgent {
  private client: OpenAI;
  private model: string;
  private cache: CacheService;

  constructor(apiKey: string, baseURL?: string, model?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model ?? "gpt-4o";
    // Inicia Cache com 60 minutos de TTL
    this.cache = new CacheService(60);
  }

  async analyze(userPrompt: string, _budgetContext?: BudgetContext): Promise<AgentResult> {
    const logger = console;
    logger.info(`[Agent v4.3] Pipeline com Cache Ativo. Cache Size: ${this.cache.stats().size}`);

    try {
      const intent = await this.detectIntent(userPrompt);
      logger.info(`[Agent] Intenção detectada: ${intent.type}`);

      if (intent.type === "QUESTION") {
        const answer = await this.generateTextResponse(userPrompt);
        return this.createChatResponse(answer);
      }

      const analysis = await this.runAnalysisStep(userPrompt);
      const productPlan = await this.runProductStep(userPrompt, analysis);

      logger.info("[Agent] Desenhando Arquitetura...");
      const architecture = await this.runArchitectureStep(userPrompt, productPlan);

      const manifest = architecture.manifest;
      logger.info(`[Agent] ${manifest.length} arquivos planejados`);

      const batchSize = 5;
      const allFiles: GeneratedFile[] = [];

      logger.info(`[Agent] Gerando ${manifest.length} arquivos...`);

      for (let i = 0; i < manifest.length; i += batchSize) {
        const batch = manifest.slice(i, i + batchSize);
        logger.info(`[Agent] Batch ${Math.floor(i / batchSize) + 1}...`);

        const batchResults = await Promise.all(
          batch.map(fileSpec =>
            this.generateFileContent(fileSpec, architecture.stack, userPrompt)
          )
        );

        allFiles.push(...batchResults);
      }

      logger.info("[Agent] Gerando Histórias de Usuário...");
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);

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
        description: `Como ${hu.role}, quero ${hu.action}, para ${hu.benefit}`,
      }));

      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      return {
        summary: analysis.summary,
        requestId,
        timestamp: new Date().toISOString(),
        analysis,
        product: { userStories: mappedHUs },
        architect: { diagram: architecture.diagram, stack: architecture.stack },
        engine: { files: allFiles },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via Agent v4.3 (Cached)" }
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[Agent] Erro fatal:", errorMessage);
      throw error;
    }
  }

  private createChatResponse(answer: string): AgentResult {
    return {
      summary: answer,
      requestId: `chat-${Date.now()}`,
      timestamp: new Date().toISOString(),
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

  private async detectIntent(prompt: string): Promise<IntentResult> {
    return this.callLLM(
      SYSTEM_PROMPTS.DETECT_INTENT,
      `Entrada do Usuário: "${prompt}"`,
      sanitizeIntent,
      IntentSchema,
      "Intent"
    );
  }

  private async generateTextResponse(prompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
    }, { timeout: 30000 });
    return completion.choices[0]?.message?.content ?? "Sem resposta.";
  }

  private async runAnalysisStep(prompt: string): Promise<Analysis> {
    return this.callLLM(
      SYSTEM_PROMPTS.ANALYSIS,
      `Pedido do Usuário: ${prompt}`,
      sanitizeAnalysis,
      AnalysisSchema,
      "Analysis"
    );
  }

  private async runProductStep(prompt: string, analysis: Analysis): Promise<ProductPlan> {
    const context = `Resumo da Análise: ${analysis.summary}\n\nPedido Original: ${prompt}`;
    return this.callLLM(
      SYSTEM_PROMPTS.PRODUCT,
      context,
      sanitizeProductPlan,
      ProductPlanSchema,
      "Product"
    );
  }

  private async runArchitectureStep(userPrompt: string, productPlan: ProductPlan): Promise<Architecture> {
    const epicsContext = productPlan.epics.map(e => `- ${e.title}: ${e.context}`).join("\n");
    const fullContext = `Contexto dos Épicos:\n${epicsContext}\n\nRequisito Original: ${userPrompt}`;
    
    return this.callLLM(
      SYSTEM_PROMPTS.ARCHITECTURE,
      fullContext,
      sanitizeArchitecture,
      ArchitectureSchema,
      "Architecture"
    );
  }

  private async generateFileContent(
    spec: ManifestItem,
    stack: string,
    userPrompt: string
  ): Promise<GeneratedFile> {
    try {
      const context = `Arquivo Alvo: ${spec.path}\nPropósito: ${spec.purpose}\nStack: ${stack}\nContexto Global: ${userPrompt}`;
      
      const parsed = await this.callLLM(
        SYSTEM_PROMPTS.CODE_GEN,
        context,
        (r) => sanitizeFileContent(r, spec.path),
        FileContentSchema,
        `File:${spec.path}`
      );
      return {
        path: parsed.path,
        content: parsed.code,
        language: this.detectLanguage(parsed.path)
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        path: normalizePath(spec.path),
        content: `// Erro: ${errorMessage}`,
        language: this.detectLanguage(spec.path)
      };
    }
  }

  private async expandEpicsToStories(epics: Epic[]): Promise<UserStory[]> {
    const targetEpics = epics.slice(0, 10);
    const richContext = targetEpics.map(e => `Épico: ${e.title}\nRequisitos: ${e.requirements.join(", ")}`).join("\n---\n");
    
    const result = await this.callLLM(
      SYSTEM_PROMPTS.USER_STORIES,
      richContext,
      sanitizeUserStories,
      UserStoriesSchema,
      "HUs"
    );
    return result.userStories;
  }

  private async callLLM<T>(
    sys: string,
    usr: string,
    san: SanitizeFunction<T>,
    sch: z.ZodType<T>,
    ctx: string
  ): Promise<T> {
    try {
      // 1. Geração de Chave de Cache
      const cacheKey = this.cache.generateKey(sys, usr, this.model, 0.0);
      
      // 2. Verificação de Cache
      const cached = this.cache.get<T>(cacheKey);
      if (cached) {
        // eslint-disable-next-line no-console
        console.info(`[Agent][Cache Hit] ${ctx}`);
        return cached;
      }

      // 3. Chamada à API
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr }
        ],
        response_format: { type: "json_object" },
        temperature: 0.0,
        seed: 42
      }, {
        timeout: 30000 
      });

      const rawContent = completion.choices[0]?.message?.content || "{}";
      const raw: unknown = JSON.parse(cleanJsonString(rawContent));
      const result = sch.parse(san(raw));

      // 4. Salva no Cache
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error(`[Agent] Error in ${ctx}:`, errorMessage);
      return sch.parse(san({}));
    }
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

# 4. Pipeline de Verificação
echo ">>> Arquivos gerados. Verificando integridade..."

pnpm lint || { echo "❌ Lint falhou"; exit 1; }
pnpm typecheck || { echo "❌ Typecheck falhou"; exit 1; }
pnpm build || { echo "❌ Build falhou"; exit 1; }

echo "✅ Fase 3 (Cache Semântico) implementada e validada!"
echo "Sugestão de commit: 'feat(agent): implement in-memory semantic cache with 1h TTL'"
EOF
