import OpenAI from "openai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "./prompts/index.js";
import { globalAnalysisCache } from "./services/cache.service.js";
import { ModelTier } from "./types/model-tiers.js";
import { getModelForTier, detectProviderFromURL } from "./config/model-mappings.js";
import { determineTierFromContext } from "./config/model-strategy.js";
import { getTimeoutForTier, FILE_BATCH_SIZES } from "./config/concurrency.js";
import { processBatches } from "./utils/array.js";
import type { LLMCallMetrics, ProjectGenerationMetrics, MetricsTracker } from "./types/metrics.js";
import { calculateCost, formatCost, formatTokens, calculatePremiumOnlyCost, calculateSavings } from "./config/pricing.js";

// --- TIPOS ---
export type Complexity = "Baixa" | "Média" | "Alta" | "Crítica";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Criticality = "Core" | "Support" | "Config";
export type FileCategory = "DOMAIN" | "APPLICATION" | "INFRASTRUCTURE" | "DEVOPS" | "CONFIG" | "TESTS" | "DOCS";

export interface Analysis { summary: string; complexity: Complexity; assumptions: string[]; }
export interface Epic { title: string; context: string; requirements: string[]; }
export interface ProductPlan { epics: Epic[]; }
export interface ManifestItem { path: string; purpose: string; criticality: Criticality; category?: FileCategory; }
export interface Architecture { stack: string; diagram?: string; manifest: ManifestItem[]; }
export interface FileContent { path: string; code: string; explanation?: string; }
export interface GeneratedFile { path: string; content: string; language: string; }
export interface UserStory { id: string; title: string; priority: Priority; role: string; action: string; benefit: string; acceptanceCriteria: string[]; functionalRequirements: string[]; securityRequirements: string[]; businessContext: string; }
export interface UserStoriesResult { userStories: UserStory[]; }
export interface MappedUserStory { id: string; title: string; priority: Priority; role: string; action: string; benefit: string; acceptanceCriteria: string[]; functionalReqs: string[]; security: string[]; context: string; nonFunctionalReqs: string[]; description: string; }
export interface IntentResult { type: "NEW_PROJECT" | "QUESTION" | "REFINEMENT"; reasoning?: string; }
export interface BudgetContext { files?: Array<{ path: string; purpose?: string }>; summary?: string; }
export interface AgentTimings { total: number; analysis: number; product: number; architecture: number; codeGen: number; userStories: number; }
export interface AgentResult { summary: string; requestId: string; timestamp: string; timings: AgentTimings; analysis: Analysis; product: { userStories: MappedUserStory[] }; architect: { diagram?: string; stack: string }; engine: { files: GeneratedFile[] }; ux: { components: unknown[] }; quality: { tests: unknown[] }; ops: { scripts: unknown[] }; fenix: { notes: string }; }

// --- SCHEMAS ---
const AnalysisSchema = z.object({ summary: z.string(), complexity: z.enum(["Baixa", "Média", "Alta", "Crítica"]), assumptions: z.array(z.string()) });
const EpicSchema = z.object({ title: z.string(), context: z.string(), requirements: z.array(z.string()) });
const ProductPlanSchema = z.object({ epics: z.array(EpicSchema) });
const ManifestItemSchema = z.object({
  path: z.string(),
  purpose: z.string(),
  criticality: z.enum(["Core", "Support", "Config"]),
  category: z.enum(["DOMAIN", "APPLICATION", "INFRASTRUCTURE", "DEVOPS", "CONFIG", "TESTS", "DOCS"]).optional()
});

// CORREÇÃO AQUI: Stack agora é simplesmente z.string() porque o sanitizer roda antes.
const ArchitectureSchema = z.object({ 
  stack: z.string(), 
  diagram: z.string().optional(), 
  manifest: z.array(ManifestItemSchema) 
});

const FileContentSchema = z.object({ path: z.string(), code: z.string(), explanation: z.string().optional() });
const UserStorySchema = z.object({ id: z.string(), title: z.string(), priority: z.enum(["P0", "P1", "P2", "P3"]), role: z.string(), action: z.string(), benefit: z.string(), acceptanceCriteria: z.array(z.string()), functionalRequirements: z.array(z.string()), securityRequirements: z.array(z.string()), businessContext: z.string() });
const UserStoriesSchema = z.object({ userStories: z.array(UserStorySchema) });
const IntentSchema = z.object({ type: z.enum(["NEW_PROJECT", "QUESTION", "REFINEMENT"]), reasoning: z.string().optional() });

// --- SANITIZATION ---
const PRIORITY_MAP: Record<string, Priority> = { "p0": "P0", "critical": "P0", "p1": "P1", "high": "P1", "p2": "P2", "medium": "P2", "p3": "P3", "low": "P3" };
const COMPLEXITY_MAP: Record<string, Complexity> = { "baixa": "Baixa", "low": "Baixa", "média": "Média", "media": "Média", "medium": "Média", "alta": "Alta", "high": "Alta", "crítica": "Crítica", "critica": "Crítica", "critical": "Crítica" };
const CRITICALITY_MAP: Record<string, Criticality> = { "core": "Core", "main": "Core", "support": "Support", "utils": "Support", "config": "Config", "settings": "Config" };

const CATEGORY_MAP: Record<string, FileCategory> = {
  // Domain
  "domain": "DOMAIN", "entity": "DOMAIN", "entities": "DOMAIN", "value-object": "DOMAIN", "value-objects": "DOMAIN", "aggregate": "DOMAIN",
  // Application
  "application": "APPLICATION", "use-case": "APPLICATION", "use-cases": "APPLICATION", "usecase": "APPLICATION", "usecases": "APPLICATION", "dto": "APPLICATION", "dtos": "APPLICATION",
  // Infrastructure
  "infrastructure": "INFRASTRUCTURE", "infra": "INFRASTRUCTURE", "controller": "INFRASTRUCTURE", "controllers": "INFRASTRUCTURE", "repository": "INFRASTRUCTURE", "repositories": "INFRASTRUCTURE", "adapter": "INFRASTRUCTURE", "adapters": "INFRASTRUCTURE", "external": "INFRASTRUCTURE", "http": "INFRASTRUCTURE", "api": "INFRASTRUCTURE",
  // DevOps
  "devops": "DEVOPS", "ci": "DEVOPS", "cd": "DEVOPS", "pipeline": "DEVOPS", "docker": "DEVOPS", "deploy": "DEVOPS", "deployment": "DEVOPS",
  // Config
  "config": "CONFIG", "configuration": "CONFIG", "settings": "CONFIG", "env": "CONFIG", "environment": "CONFIG",
  // Tests
  "test": "TESTS", "tests": "TESTS", "testing": "TESTS", "spec": "TESTS", "e2e": "TESTS", "integration": "TESTS", "unit": "TESTS",
  // Docs
  "docs": "DOCS", "doc": "DOCS", "documentation": "DOCS", "readme": "DOCS", "md": "DOCS",
  // Common mismatches (LLM alucinações - mapeamento inteligente)
  "hooks": "APPLICATION", "hook": "APPLICATION", "utils": "APPLICATION", "util": "APPLICATION", "utilities": "APPLICATION", "helpers": "APPLICATION", "helper": "APPLICATION",
  "data-structures": "DOMAIN", "data": "DOMAIN", "models": "DOMAIN", "model": "DOMAIN",
  "components": "INFRASTRUCTURE", "component": "INFRASTRUCTURE", "services": "APPLICATION", "service": "APPLICATION"
};

function normalizePath(rawPath: unknown): string { if (typeof rawPath !== "string") return "unknown.file"; return rawPath.trim().replace(/^(\.\/|\/)+/, ""); }
function sanitizePriority(value: unknown): Priority { if (typeof value !== "string") return "P2"; const normalized = PRIORITY_MAP[value.trim().toLowerCase()]; return normalized || "P2"; }
function sanitizeComplexity(value: unknown): Complexity { if (typeof value !== "string") return "Média"; return COMPLEXITY_MAP[value.trim().toLowerCase()] ?? "Média"; }
function sanitizeCriticality(value: unknown): Criticality { if (typeof value !== "string") return "Core"; return CRITICALITY_MAP[value.trim().toLowerCase()] ?? "Core"; }

function sanitizeCategory(value: unknown): FileCategory {
  if (typeof value !== "string") return "APPLICATION";

  // Normalizar: remover espaços, converter para minúsculas, remover _ e -
  const normalized = value.trim().toLowerCase().replace(/[_-]/g, "");
  const mapped = CATEGORY_MAP[normalized];

  if (mapped) return mapped;

  // Fallback inteligente baseado em path
  const pathStr = String(value);
  if (pathStr.includes("domain")) return "DOMAIN";
  if (pathStr.includes("application")) return "APPLICATION";
  if (pathStr.includes("infrastructure") || pathStr.includes("infra")) return "INFRASTRUCTURE";
  if (pathStr.includes("test")) return "TESTS";
  if (pathStr.includes("config")) return "CONFIG";
  if (pathStr.includes(".md")) return "DOCS";
  if (pathStr.includes("docker") || pathStr.includes("ci") || pathStr.includes("cd")) return "DEVOPS";

  // Último recurso
  console.warn(`[Sanitizer] Categoria desconhecida: "${value}" - usando APPLICATION como fallback`);
  return "APPLICATION";
}
function ensureString(value: unknown, fallback: string): string { return (typeof value === "string" && value.trim().length > 0) ? value.trim() : fallback; }
function ensureStringArray(value: unknown, defaultText?: string): string[] { if (!Array.isArray(value)) return defaultText ? [defaultText] : []; return value.filter((item): item is string => typeof item === "string").map(s => s.trim()).filter(s => s.length > 0); }
function sanitizeUserStory(raw: unknown, index: number): UserStory { const story = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; return { id: ensureString(story["id"], `HU-${String(index + 1).padStart(3, "0")}`), title: ensureString(story["title"], `História de Usuário ${index + 1}`), priority: sanitizePriority(story["priority"]), role: ensureString(story["role"], "usuário"), action: ensureString(story["action"], "realizar ação"), benefit: ensureString(story["benefit"], "obter valor"), acceptanceCriteria: ensureStringArray(story["acceptanceCriteria"], "Critério pendente"), functionalRequirements: ensureStringArray(story["functionalRequirements"], "Requisito pendente"), securityRequirements: ensureStringArray(story["securityRequirements"], "Requisito de segurança padrão"), businessContext: ensureString(story["businessContext"], "Contexto de negócio") }; }
function sanitizeAnalysis(raw: unknown): Analysis { const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; return { summary: ensureString(data["summary"], "N/A"), complexity: sanitizeComplexity(data["complexity"]), assumptions: ensureStringArray(data["assumptions"]) }; }
function sanitizeProductPlan(raw: unknown): ProductPlan { const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; const rawEpics = Array.isArray(data["epics"]) ? data["epics"] : []; return { epics: rawEpics.map((e: unknown, i: number) => { const epic = (e && typeof e === "object") ? e as Record<string, unknown> : {}; return { title: ensureString(epic["title"], `Epic ${i}`), context: ensureString(epic["context"], ""), requirements: ensureStringArray(epic["requirements"]) }; }) }; }

function sanitizeArchitecture(raw: unknown): Architecture {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawManifest = Array.isArray(data["manifest"]) ? data["manifest"] : [];

  // O Sanitizer normaliza 'stack' para string ANTES do Zod validar
  let stackStr = "Unknown Stack";
  if (typeof data["stack"] === "string") stackStr = data["stack"];
  else if (typeof data["stack"] === "object") stackStr = JSON.stringify(data["stack"], null, 2);

  return {
    stack: stackStr,
    diagram: typeof data["diagram"] === "string" ? data["diagram"] : undefined,
    manifest: rawManifest.map((m: unknown) => {
      const item = (m && typeof m === "object") ? m as Record<string, unknown> : {};
      return {
        path: normalizePath(item["path"]),
        purpose: ensureString(item["purpose"], "Code"),
        criticality: sanitizeCriticality(item["criticality"]),
        category: sanitizeCategory(item["category"])  // NEW: Sanitização de categoria
      };
    }).filter(m => m.path !== "unknown.file")
  };
}

function sanitizeFileContent(raw: unknown, path: string): FileContent { const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; return { path: normalizePath(data["path"] ?? path), code: ensureString(data["code"], "// Error generating code"), explanation: typeof data["explanation"] === "string" ? data["explanation"] : undefined }; }
function sanitizeUserStories(raw: unknown): UserStoriesResult { const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; const stories = Array.isArray(data["userStories"]) ? data["userStories"] : []; return { userStories: stories.map((s: unknown, i: number) => sanitizeUserStory(s, i)) }; }
function sanitizeIntent(raw: unknown): IntentResult { const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; const typeValue = data["type"]; let type: IntentResult["type"] = "NEW_PROJECT"; if (typeof typeValue === "string" && ["QUESTION", "REFINEMENT", "NEW_PROJECT"].includes(typeValue)) { type = typeValue as IntentResult["type"]; } return { type, reasoning: typeof data["reasoning"] === "string" ? data["reasoning"] : undefined }; }
function cleanJsonString(input: string): string { return input.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim(); }
type SanitizeFunction<T> = (raw: unknown) => T;

export class AnalysisAgent {
  private client: OpenAI;
  private model: string;
  private provider: string;
  private metricsTracker: MetricsTracker | null = null;

  constructor(apiKey: string, baseURL?: string, model?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model ?? "gpt-4o";

    // HU-AGENT-OPT-001: Detectar provedor a partir da baseURL
    this.provider = detectProviderFromURL(baseURL);
    // eslint-disable-next-line no-console
    console.info(`[Agent] Provider detectado: "${this.provider}" (baseURL: ${baseURL || "default"})`);
  }

  private cleanPrompt(prompt: string): string {
    return prompt.replace(/[o]\s+/g, "").replace(/\r\n/g, "\n").trim();
  }

  async analyze(userPrompt: string, _budgetContext?: BudgetContext): Promise<AgentResult> {
    const logger = console;
    logger.info(`[Agent v13.0 + Tier System] Cache Size: ${globalAnalysisCache.stats().size}`);

    // HU-AGENT-OPT-004: Inicializar rastreador de métricas
    const projectId = `proj-${Date.now()}`;
    const projectName = userPrompt.substring(0, 50) + (userPrompt.length > 50 ? "..." : "");
    this.metricsTracker = this.createMetricsTracker(projectId, projectName);
    logger.info(`[Agent] Métricas habilitadas para projeto: "${projectName}"`);

    const cleanUserPrompt = this.cleanPrompt(userPrompt);
    const tStart = performance.now();
    const stepTimes = { analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0 };

    try {
      const intent = await this.detectIntent(cleanUserPrompt);
      if (intent.type === "QUESTION") {
        const answer = await this.generateTextResponse(cleanUserPrompt);
        const tEnd = performance.now();
        return this.createChatResponse(answer, tEnd - tStart);
      }

      // Step 1
      const t1 = performance.now();
      const analysis = await this.runAnalysisStep(cleanUserPrompt);
      stepTimes.analysis = performance.now() - t1;

      // Step 2
      const t2 = performance.now();
      const productPlan = await this.runProductStep(cleanUserPrompt, analysis);
      stepTimes.product = performance.now() - t2;

      // Step 3
      const t3 = performance.now();
      logger.info("[Agent] Desenhando Arquitetura...");
      const architecture = await this.runArchitectureStep(cleanUserPrompt, productPlan);
      stepTimes.architecture = performance.now() - t3;

      const manifest = architecture.manifest;
      logger.info(`[Agent] ${manifest.length} arquivos planejados.`);

      // Step 4: Code Generation (PARALLEL - HU-AGENT-OPT-002)
      const t4 = performance.now();
      logger.info("[Agent] Iniciando geração paralela de código...");
      const allFiles = await this.generateAllFilesParallel(manifest, architecture.stack, cleanUserPrompt);
      stepTimes.codeGen = performance.now() - t4;
      logger.info(`[Agent] ✓ ${allFiles.length} arquivos gerados em ${(stepTimes.codeGen / 1000).toFixed(1)}s`);

      // Step 5: User Stories (PARALLEL - HU-AGENT-OPT-003)
      const t5 = performance.now();
      logger.info("[Agent] Gerando Histórias de Usuário (paralelo)...");
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);
      stepTimes.userStories = performance.now() - t5;
      logger.info(`[Agent] ✓ ${detailedHUs.length} HUs geradas em ${(stepTimes.userStories / 1000).toFixed(1)}s`);

      const mappedHUs: MappedUserStory[] = detailedHUs.map(hu => ({
        id: hu.id, title: hu.title, priority: hu.priority, role: hu.role, action: hu.action, benefit: hu.benefit,
        acceptanceCriteria: hu.acceptanceCriteria, functionalReqs: hu.functionalRequirements, security: hu.securityRequirements,
        context: hu.businessContext, nonFunctionalReqs: [], description: `Como ${hu.role}, quero ${hu.action}, para ${hu.benefit}`
      }));

      const requestId = `req-${Date.now()}`;
      const tTotal = performance.now() - tStart;

      // HU-AGENT-OPT-004: Finalizar e logar métricas
      if (this.metricsTracker) {
        const metrics = this.metricsTracker.finalize();

        // Calcular economia
        const premiumOnlyCost = calculatePremiumOnlyCost(
          this.provider,
          metrics.totals.totalInputTokens,
          metrics.totals.totalOutputTokens
        );
        const actualCost = metrics.totals.estimatedTotalCostUSD;
        const savings = calculateSavings(actualCost, premiumOnlyCost);

        metrics.savings = {
          costWithOnlyPremium: premiumOnlyCost,
          actualCost,
          savedUSD: savings.savedUSD,
          savedPercentage: savings.savedPercentage,
        };

        this.logMetrics(metrics);
      }

      return {
        summary: analysis.summary, requestId, timestamp: new Date().toISOString(), timings: { total: tTotal, ...stepTimes },
        analysis, product: { userStories: mappedHUs }, architect: { diagram: architecture.diagram, stack: architecture.stack },
        engine: { files: allFiles }, ux: { components: [] }, quality: { tests: [] }, ops: { scripts: [] },
        fenix: { notes: "Generated via Agent v13.0 + Tier System (Final)" }
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[Agent] Erro fatal:", errorMessage);

      // HU-AGENT-OPT-004: Logar métricas parciais mesmo em caso de erro
      if (this.metricsTracker && this.metricsTracker.calls.length > 0) {
        logger.warn("[Agent] Logando métricas parciais devido a erro...");
        const partialMetrics = this.metricsTracker.getPartialMetrics();
        logger.info(`[Agent] Chamadas completadas antes do erro: ${partialMetrics.totals?.callCount || 0}`);
        logger.info(`[Agent] Custo parcial: ${formatCost(partialMetrics.totals?.estimatedTotalCostUSD || 0)}`);
      }

      throw error;
    }
  }

  private createChatResponse(answer: string, totalTime: number): AgentResult {
    return { summary: answer, requestId: `chat-${Date.now()}`, timestamp: new Date().toISOString(), timings: { total: totalTime, analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0 }, analysis: { summary: answer, complexity: "Baixa", assumptions: [] }, product: { userStories: [] }, architect: { stack: "", diagram: "" }, engine: { files: [] }, ux: { components: [] }, quality: { tests: [] }, ops: { scripts: [] }, fenix: { notes: "Chat Response Only" } };
  }

  // --- METHODS ---
  private async detectIntent(prompt: string): Promise<IntentResult> { 
    return this.callLLM(SYSTEM_PROMPTS.DETECT_INTENT, `Entrada: "${prompt}"`, sanitizeIntent, IntentSchema, "Intent"); 
  }
  private async generateTextResponse(prompt: string): Promise<string> {
      const completion = await this.client.chat.completions.create({ model: this.model, messages: [{ role: "user", content: prompt }] }, { timeout: 60000 });
      return completion.choices[0]?.message?.content ?? "Sem resposta.";
  }
  private async runAnalysisStep(prompt: string): Promise<Analysis> { 
    return this.callLLM(SYSTEM_PROMPTS.ANALYSIS, `Pedido: ${prompt}`, sanitizeAnalysis, AnalysisSchema, "Analysis"); 
  }
  private async runProductStep(prompt: string, analysis: Analysis): Promise<ProductPlan> { 
    return this.callLLM(SYSTEM_PROMPTS.PRODUCT, `Análise: ${analysis.summary}\nPrompt: ${prompt}`, sanitizeProductPlan, ProductPlanSchema, "Product"); 
  }
  private async runArchitectureStep(userPrompt: string, productPlan: ProductPlan): Promise<Architecture> {
    const epicsSummary = productPlan.epics.map(e => `- ${e.title}: ${e.context}`).join('\n');

    // Truncar prompt original se for muito grande (> 3000 chars)
    const MAX_PROMPT_SIZE = 3000;
    let truncatedPrompt = userPrompt;
    if (userPrompt.length > MAX_PROMPT_SIZE) {
      truncatedPrompt = userPrompt.substring(0, MAX_PROMPT_SIZE) + `\n\n[... prompt truncado de ${userPrompt.length} para ${MAX_PROMPT_SIZE} chars ...]`;
      // eslint-disable-next-line no-console
      console.warn(`[Agent] Prompt truncado: ${userPrompt.length} → ${MAX_PROMPT_SIZE} chars`);
    }

    const richContext = `CONTEXTO DO PROJETO:\nPedido Original: ${truncatedPrompt}\n\nÉPICOS IDENTIFICADOS:\n${epicsSummary}`;
    // eslint-disable-next-line no-console
    console.info(`[Agent] runArchitectureStep - Context size: ${richContext.length} chars, Epics: ${productPlan.epics.length}`);
    return this.callLLM(SYSTEM_PROMPTS.ARCHITECTURE, richContext, sanitizeArchitecture, ArchitectureSchema, "Architecture");
  }
  private async generateFileContent(spec: ManifestItem, stack: string, userPrompt: string): Promise<GeneratedFile> {
    try {
      // Truncar contexto para geração de arquivos (mais agressivo: 1500 chars)
      const MAX_CONTEXT_SIZE = 1500;
      const truncatedContext = userPrompt.length > MAX_CONTEXT_SIZE
        ? userPrompt.substring(0, MAX_CONTEXT_SIZE) + `\n[... truncado ...]`
        : userPrompt;

      const parsed = await this.callLLM(SYSTEM_PROMPTS.CODE_GEN, `File: ${spec.path}\nStack: ${stack}\nContext: ${truncatedContext}`, (r) => sanitizeFileContent(r, spec.path), FileContentSchema, `File:${spec.path}`);
      return { path: parsed.path, content: parsed.code, language: this.detectLanguage(parsed.path) };
    } catch (error) { return { path: normalizePath(spec.path), content: "// Error", language: "plaintext" }; }
  }
  private async expandEpicsToStories(epics: Epic[]): Promise<UserStory[]> {
    // eslint-disable-next-line no-console
    console.info(`[Agent] Expandindo ${epics.length} épicos em User Stories (PARALELO)...`);

    // HU-AGENT-OPT-003: Gerar HUs de cada épico em paralelo
    const allStoriesNested = await Promise.all(
      epics.map(async (epic, index) => {
        const epicContext = `Épico ${index + 1}/${epics.length}: ${epic.title}
Contexto: ${epic.context}
Requisitos:
${epic.requirements.map(r => `- ${r}`).join('\n')}`;

        // eslint-disable-next-line no-console
        console.info(`[Agent] Gerando HUs para épico: "${epic.title}"...`);

        const result = await this.callLLM(
          SYSTEM_PROMPTS.USER_STORIES,
          epicContext,
          sanitizeUserStories,
          UserStoriesSchema,
          `UserStories:Epic:${epic.title}`
        );

        // eslint-disable-next-line no-console
        console.info(`[Agent] ✓ ${result.userStories.length} HUs geradas para "${epic.title}"`);
        return result.userStories;
      })
    );

    // Flatten array de arrays
    const allStories = allStoriesNested.flat();

    // eslint-disable-next-line no-console
    console.info(`[Agent] Total de ${allStories.length} User Stories geradas de ${epics.length} épicos`);
    return allStories;
  }

  private async callLLM<T>(sys: string, usr: string, san: SanitizeFunction<T>, sch: z.ZodType<T>, ctx: string): Promise<T> {
    const cacheKey = globalAnalysisCache.generateKey(sys, usr, this.model, 0.0);
    const cached = globalAnalysisCache.get<T>(cacheKey);
    if (cached) {
      // eslint-disable-next-line no-console
      console.info(`[Agent][Cache Hit] ${ctx}`);
      return cached;
    }

    // HU-AGENT-OPT-001: Selecionar modelo baseado no contexto
    const selectedModel = this.selectModelForTask(ctx);
    const tier = determineTierFromContext(ctx);

    // HU-AGENT-OPT-004: Preparar tracking de métricas
    const callStartTime = performance.now();

    const maxRetries = 3;
    const baseDelay = 2000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // HU-AGENT-OPT-001: Timeout baseado no tier
        const timeoutMs = getTimeoutForTier(tier);

        // eslint-disable-next-line no-console
        console.info(`[Agent][LLM Call] ${ctx} (attempt ${attempt + 1}/${maxRetries}, model: ${selectedModel}, timeout: ${timeoutMs}ms)`);

        const completion = await this.client.chat.completions.create({
          model: selectedModel,
          messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          response_format: { type: "json_object" },
          temperature: 0.0,
          seed: 42
        }, { timeout: timeoutMs });

        const rawContent = completion.choices[0]?.message?.content || "{}";
        const result = sch.parse(san(JSON.parse(cleanJsonString(rawContent))));
        globalAnalysisCache.set(cacheKey, result);

        // HU-AGENT-OPT-004: Registrar métricas de sucesso
        if (this.metricsTracker) {
          const callEndTime = performance.now();
          const usage = completion.usage;
          const inputTokens = usage?.prompt_tokens || 0;
          const outputTokens = usage?.completion_tokens || 0;
          const totalTokens = usage?.total_tokens || (inputTokens + outputTokens);
          const estimatedCost = calculateCost(this.provider, tier, inputTokens, outputTokens);

          this.metricsTracker.addCall({
            context: ctx,
            tier,
            provider: this.provider,
            model: selectedModel,
            startTime: callStartTime,
            endTime: callEndTime,
            durationMs: callEndTime - callStartTime,
            inputTokens,
            outputTokens,
            totalTokens,
            estimatedCostUSD: estimatedCost,
            status: "success",
            retryCount: attempt,
          });
        }

        return result;
      } catch (e) {
        const isLastAttempt = attempt === maxRetries - 1;
        const error = e instanceof Error ? e : new Error(String(e));

        // eslint-disable-next-line no-console
        console.error(`[Agent][LLM Error] ${ctx} - Attempt ${attempt + 1} failed: ${error.message}`);

        if (isLastAttempt) {
          // HU-AGENT-OPT-004: Registrar métrica de erro
          if (this.metricsTracker) {
            const callEndTime = performance.now();
            const isTimeout = error.message.includes("timeout") || error.message.includes("Timeout");

            this.metricsTracker.addCall({
              context: ctx,
              tier,
              provider: this.provider,
              model: selectedModel,
              startTime: callStartTime,
              endTime: callEndTime,
              durationMs: callEndTime - callStartTime,
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              estimatedCostUSD: 0,
              status: isTimeout ? "timeout" : "error",
              errorMessage: error.message,
              retryCount: attempt,
            });
          }

          // eslint-disable-next-line no-console
          console.error(`[Agent][LLM Fatal] ${ctx} - Todas as tentativas falharam`);
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        // eslint-disable-next-line no-console
        console.warn(`[Agent][Retry] ${ctx} - Aguardando ${delay}ms antes de retry...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    // eslint-disable-next-line no-console
    console.error(`[Agent][Fallback] ${ctx} - Usando dados vazios como último recurso`);
    return sch.parse(san({}));
  }

  // ============================================================================
  // HU-AGENT-OPT-002: Geração Paralela de Código
  // ============================================================================

  /**
   * Determina o tier de um arquivo baseado em seu spec
   */
  private determineFileTier(spec: ManifestItem): ModelTier {
    const context = `File: ${spec.path} (purpose: ${spec.purpose}, criticality: ${spec.criticality}, category: ${spec.category || "UNKNOWN"})`;
    return determineTierFromContext(context);
  }

  /**
   * Gera todos os arquivos em paralelo, agrupados por tier
   */
  private async generateAllFilesParallel(
    manifest: ManifestItem[],
    stack: string,
    userPrompt: string
  ): Promise<GeneratedFile[]> {
    // eslint-disable-next-line no-console
    console.info(`[Agent] Iniciando geração paralela de ${manifest.length} arquivos...`);

    // Separar arquivos por tier
    const premiumFiles: ManifestItem[] = [];
    const standardFiles: ManifestItem[] = [];

    for (const spec of manifest) {
      const tier = this.determineFileTier(spec);
      if (tier === ModelTier.PREMIUM) {
        premiumFiles.push(spec);
      } else {
        standardFiles.push(spec);
      }
    }

    // eslint-disable-next-line no-console
    console.info(`[Agent] Arquivos PREMIUM (complexos): ${premiumFiles.length}`);
    // eslint-disable-next-line no-console
    console.info(`[Agent] Arquivos STANDARD (simples): ${standardFiles.length}`);

    const allFiles: GeneratedFile[] = [];

    // Processar arquivos PREMIUM em batches de 5
    if (premiumFiles.length > 0) {
      // eslint-disable-next-line no-console
      console.info(`[Agent] Processando ${premiumFiles.length} arquivos PREMIUM em batches de ${FILE_BATCH_SIZES.COMPLEX}...`);
      const premiumResults = await processBatches(
        premiumFiles,
        FILE_BATCH_SIZES.COMPLEX,
        async (spec) => this.generateFileContent(spec, stack, userPrompt)
      );
      allFiles.push(...premiumResults);
    }

    // Processar arquivos STANDARD em batches de 12
    if (standardFiles.length > 0) {
      // eslint-disable-next-line no-console
      console.info(`[Agent] Processando ${standardFiles.length} arquivos STANDARD em batches de ${FILE_BATCH_SIZES.SIMPLE}...`);
      const standardResults = await processBatches(
        standardFiles,
        FILE_BATCH_SIZES.SIMPLE,
        async (spec) => this.generateFileContent(spec, stack, userPrompt)
      );
      allFiles.push(...standardResults);
    }

    // eslint-disable-next-line no-console
    console.info(`[Agent] Geração paralela completa: ${allFiles.length} arquivos gerados`);
    return allFiles;
  }

  // ============================================================================
  // HU-AGENT-OPT-001: Seleção de Modelo por Tier
  // ============================================================================

  /**
   * Seleciona o modelo apropriado baseado no tipo de tarefa
   */
  private selectModelForTask(context: string): string {
    const tier = determineTierFromContext(context);
    const modelForTier = getModelForTier(this.provider, tier);

    if (!modelForTier) {
      // eslint-disable-next-line no-console
      console.warn(`[Agent] Modelo não encontrado para provider="${this.provider}" tier="${tier}" - usando modelo padrão "${this.model}"`);
      return this.model;
    }

    // eslint-disable-next-line no-console
    console.info(`[Agent][Model] ${context} → ${tier} (${this.provider}:${modelForTier})`);
    return modelForTier;
  }

  // ============================================================================
  // HU-AGENT-OPT-004: Rastreamento de Métricas
  // ============================================================================

  /**
   * Cria um rastreador de métricas para o projeto
   */
  private createMetricsTracker(projectId: string, projectName: string): MetricsTracker {
    const startTime = performance.now();
    const calls: LLMCallMetrics[] = [];

    return {
      projectId,
      projectName,
      startTime,
      calls,

      addCall(metrics: LLMCallMetrics) {
        this.calls.push(metrics);
      },

      finalize(): ProjectGenerationMetrics {
        const endTime = performance.now();
        const totalDurationMs = endTime - this.startTime;

        // Agregar por tier
        const byTier: Record<ModelTier, any> = {
          [ModelTier.PREMIUM]: { callCount: 0, totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, estimatedCostUSD: 0, totalDurationMs: 0 },
          [ModelTier.STANDARD]: { callCount: 0, totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, estimatedCostUSD: 0, totalDurationMs: 0 },
          [ModelTier.LOCAL]: { callCount: 0, totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, estimatedCostUSD: 0, totalDurationMs: 0 },
        };

        const byTask: Record<string, any> = {};
        let successCount = 0;
        let errorCount = 0;
        let timeoutCount = 0;
        let totalRetries = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalCost = 0;

        for (const call of this.calls) {
          const tierStats = byTier[call.tier];
          tierStats.callCount++;
          tierStats.totalInputTokens += call.inputTokens;
          tierStats.totalOutputTokens += call.outputTokens;
          tierStats.totalTokens += call.totalTokens;
          tierStats.estimatedCostUSD += call.estimatedCostUSD || 0;
          tierStats.totalDurationMs += call.durationMs;

          if (!byTask[call.context]) {
            byTask[call.context] = { callCount: 0, totalTokens: 0, estimatedCostUSD: 0, totalDurationMs: 0 };
          }
          const taskStats = byTask[call.context];
          taskStats.callCount++;
          taskStats.totalTokens += call.totalTokens;
          taskStats.estimatedCostUSD += call.estimatedCostUSD || 0;
          taskStats.totalDurationMs += call.durationMs;

          totalInputTokens += call.inputTokens;
          totalOutputTokens += call.outputTokens;
          totalCost += call.estimatedCostUSD || 0;
          totalRetries += call.retryCount;

          if (call.status === "success") successCount++;
          else if (call.status === "error") errorCount++;
          else if (call.status === "timeout") timeoutCount++;
        }

        const totalTokens = totalInputTokens + totalOutputTokens;
        const callCount = this.calls.length;
        const successRate = callCount > 0 ? successCount / callCount : 0;

        return {
          projectId: this.projectId,
          projectName: this.projectName,
          startTime: this.startTime,
          endTime,
          totalDurationMs,
          calls: this.calls,
          byTier: byTier as any,
          byTask,
          totals: {
            callCount,
            successCount,
            errorCount,
            timeoutCount,
            totalInputTokens,
            totalOutputTokens,
            totalTokens,
            estimatedTotalCostUSD: totalCost,
            successRate,
            totalRetries,
          },
        };
      },

      getSummary() {
        const duration = `${((performance.now() - this.startTime) / 1000 / 60).toFixed(1)} min`;
        const tokens = formatTokens(this.calls.reduce((sum, c) => sum + c.totalTokens, 0));
        const cost = formatCost(this.calls.reduce((sum, c) => sum + (c.estimatedCostUSD || 0), 0));
        const successCount = this.calls.filter(c => c.status === "success").length;
        const successRate = this.calls.length > 0 ? `${((successCount / this.calls.length) * 100).toFixed(1)}%` : "0%";

        return { duration, tokens, cost, successRate, byTier: [] };
      },

      getPartialMetrics() {
        const totalInputTokens = this.calls.reduce((sum, c) => sum + c.inputTokens, 0);
        const totalOutputTokens = this.calls.reduce((sum, c) => sum + c.outputTokens, 0);
        const totalCost = this.calls.reduce((sum, c) => sum + (c.estimatedCostUSD || 0), 0);
        const successCount = this.calls.filter(c => c.status === "success").length;

        return {
          projectId: this.projectId,
          projectName: this.projectName,
          startTime: this.startTime,
          totalDurationMs: performance.now() - this.startTime,
          calls: this.calls,
          totals: {
            callCount: this.calls.length,
            successCount,
            errorCount: this.calls.filter(c => c.status === "error").length,
            timeoutCount: this.calls.filter(c => c.status === "timeout").length,
            totalInputTokens,
            totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
            estimatedTotalCostUSD: totalCost,
            successRate: this.calls.length > 0 ? successCount / this.calls.length : 0,
            totalRetries: this.calls.reduce((sum, c) => sum + c.retryCount, 0),
          },
        };
      },
    };
  }

  /**
   * Loga as métricas finais do projeto
   */
  private logMetrics(metrics: ProjectGenerationMetrics): void {
    // eslint-disable-next-line no-console
    console.info("\n" + "=".repeat(70));
    // eslint-disable-next-line no-console
    console.info("📊 MÉTRICAS DE GERAÇÃO DO PROJETO");
    // eslint-disable-next-line no-console
    console.info("=".repeat(70));
    // eslint-disable-next-line no-console
    console.info(`Projeto: ${metrics.projectName}`);
    // eslint-disable-next-line no-console
    console.info(`Duração total: ${(metrics.totalDurationMs / 1000 / 60).toFixed(2)} minutos`);
    // eslint-disable-next-line no-console
    console.info("");
    // eslint-disable-next-line no-console
    console.info("Totais:");
    // eslint-disable-next-line no-console
    console.info(`  - Chamadas LLM: ${metrics.totals.callCount}`);
    // eslint-disable-next-line no-console
    console.info(`  - Sucesso: ${metrics.totals.successCount} (${(metrics.totals.successRate * 100).toFixed(1)}%)`);
    // eslint-disable-next-line no-console
    console.info(`  - Erros: ${metrics.totals.errorCount}`);
    // eslint-disable-next-line no-console
    console.info(`  - Timeouts: ${metrics.totals.timeoutCount}`);
    // eslint-disable-next-line no-console
    console.info(`  - Retries: ${metrics.totals.totalRetries}`);
    // eslint-disable-next-line no-console
    console.info("");
    // eslint-disable-next-line no-console
    console.info("Tokens:");
    // eslint-disable-next-line no-console
    console.info(`  - Input: ${formatTokens(metrics.totals.totalInputTokens)}`);
    // eslint-disable-next-line no-console
    console.info(`  - Output: ${formatTokens(metrics.totals.totalOutputTokens)}`);
    // eslint-disable-next-line no-console
    console.info(`  - Total: ${formatTokens(metrics.totals.totalTokens)}`);
    // eslint-disable-next-line no-console
    console.info("");
    // eslint-disable-next-line no-console
    console.info("Custo estimado:");
    // eslint-disable-next-line no-console
    console.info(`  - Total: ${formatCost(metrics.totals.estimatedTotalCostUSD)}`);

    if (metrics.savings) {
      // eslint-disable-next-line no-console
      console.info("");
      // eslint-disable-next-line no-console
      console.info("💰 Economia vs. usar apenas PREMIUM:");
      // eslint-disable-next-line no-console
      console.info(`  - Custo com PREMIUM apenas: ${formatCost(metrics.savings.costWithOnlyPremium)}`);
      // eslint-disable-next-line no-console
      console.info(`  - Custo real: ${formatCost(metrics.savings.actualCost)}`);
      // eslint-disable-next-line no-console
      console.info(`  - Economizado: ${formatCost(metrics.savings.savedUSD)} (${metrics.savings.savedPercentage.toFixed(1)}%)`);
    }

    // eslint-disable-next-line no-console
    console.info("=".repeat(70) + "\n");
  }

  private detectLanguage(path: string): string {
    if (/\.(ts|tsx)$/.test(path)) return "typescript";
    if (path.endsWith(".json")) return "json";
    return "plaintext";
  }
}
