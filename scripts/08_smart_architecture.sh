#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 08_smart_architecture.sh
# DESCRIÇÃO: 
#   1. Remove limites artificiais de quantidade (arquivos/HUs).
#   2. Instrui a IA a agir como Senior: Adotar padrões de mercado (Clean Arch/MVC).
#   3. Garante que "Sistema Completo" gere estrutura completa (Docker, CI, Tests).
#   4. Reativa o Cache Global em disco para eficiência operacional.
# AUTOR: Mini-IDE Engine Team
# ==============================================================================

echo ">>> Iniciando Fase 8: Arquitetura Inteligente e Abrangente..."

# ------------------------------------------------------------------------------
# 1. Prompts Profissionais (Baseados em Contexto)
# ------------------------------------------------------------------------------
echo ">>> Atualizando packages/analysis-agent/src/prompts/index.ts..."
cat > packages/analysis-agent/src/prompts/index.ts << 'EOF'
export const SYSTEM_PROMPTS = {
  DETECT_INTENT: `
Você é um Classificador de Intenção.
Classifique a entrada.
Retorne JSON estrito: { "type": "NEW_PROJECT" | "QUESTION" | "REFINEMENT", "reasoning": "..." }
`.trim(),

  ANALYSIS: `
Você é um Engenheiro de Requisitos Principal (Principal Requirements Engineer).
Sua tarefa é destilar a complexidade do pedido do usuário.

Entrada: Pode conter texto formatado, bullets de PDF ou descrições longas.
Ação:
1. Ignore ruído de formatação.
2. Identifique o "Core Domain" (O que é o negócio?).
3. Estime a complexidade real baseada nos requisitos funcionais.

Retorne JSON estrito PT-BR:
{
  "summary": "Resumo técnico profissional do escopo",
  "complexity": "Baixa" | "Média" | "Alta" | "Crítica",
  "assumptions": ["Premissa técnica 1", "Premissa de negócio 1"]
}
`.trim(),

  PRODUCT: `
Você é um Product Manager Sênior.
Sua missão é cobrir 100% do escopo funcional identificado na análise.

Diretrizes:
1. Não limite artificialmente o número de Épicos. Crie quantos forem necessários para cobrir o sistema.
2. Se o sistema é "Completo", espere-se épicos para: Configuração/Infra, Autenticação, Funcionalidades Core, Relatórios/Gestão.
3. Priorize lógica de negócio sobre CRUD simples.

Retorne JSON estrito PT-BR:
{
  "epics": [
    {
      "title": "Nome profissional do Épico",
      "context": "Valor de negócio",
      "requirements": ["Requisito funcional detalhado"]
    }
  ]
}
`.trim(),

  ARCHITECTURE: `
Você é um Arquiteto de Software Sênior (Staff Engineer).
Sua responsabilidade é desenhar uma solução robusta, escalável e manutenível.

Regras de Decisão:
1. **Escopo**: Se o pedido for "Sistema Completo" ou "SaaS", utilize padrões como Clean Architecture ou MVC Modular.
2. **Estrutura**: Separe claramente responsabilidades.
   - Não coloque tudo em 'app.ts'.
   - Crie pastas: src/controllers, src/services, src/models, src/routes, src/utils, src/config.
3. **Qualidade Industrial**:
   - Inclua sempre: README.md detalhado.
   - Inclua: Configuração de Testes (vitest.config.ts / jest.config.js).
   - Inclua: Arquivos de teste unitário (*.test.ts) para os serviços principais.
   - Inclua: CI/CD básico (.github/workflows/ci.yml) se for um projeto novo.
4. **Volume**: Não tenha medo de gerar 20, 30 ou 40 arquivos se isso for necessário para uma arquitetura desacoplada.

Retorne JSON estrito:
{
  "stack": "Definição precisa da stack (ex: React 18 + Vite + Fastify + Prisma)",
  "diagram": "Descrição textual de alto nível dos módulos",
  "manifest": [
    { "path": "package.json", "purpose": "Dependências e Scripts", "criticality": "Config" },
    { "path": "src/server.ts", "purpose": "Entrypoint", "criticality": "Core" },
    ... (liste todos os arquivos necessários para a aplicação rodar e ser testada)
  ]
}
`.trim(),

  CODE_GEN: `
Você é um Desenvolvedor Full-Stack Sênior (10x Engineer).
Implemente o arquivo solicitado com excelência técnica.

Diretrizes:
1. **Código Completo**: Jamais use "// ...implementar depois". Escreva a lógica real.
2. **Robustez**: Trate erros (try/catch), valide entradas (zod/joi se aplicável), use tipagem forte (TypeScript).
3. **Testes**: Se for um arquivo de teste, cubra os casos de sucesso e falha.
4. **Docs**: Se for README, use Markdown rico com seções de Instalação, Uso e Decisões.

Retorne JSON estrito:
{
  "path": "caminho/do/arquivo",
  "code": "Conteúdo escapado",
  "explanation": "Breve justificativa técnica"
}
`.trim(),

  USER_STORIES: `
Você é um PO Técnico focado em Entrega.
Para cada Épico, gere as Histórias de Usuário (HUs) necessárias para que um time de desenvolvimento possa trabalhar.

Diretrizes:
1. Seja abrangente. Se um épico é complexo, quebre em múltiplas HUs.
2. Siga o formato: "Como [ator], quero [ação], para [valor]".
3. Critérios de Aceite devem ser GWT (Given/When/Then) sempre que possível.

Retorne JSON estrito PT-BR:
{
  "userStories": [
    {
      "id": "HU-001",
      "title": "Título Profissional",
      "priority": "P0" | "P1" | "P2",
      "role": "Ator",
      "action": "Ação",
      "benefit": "Valor",
      "acceptanceCriteria": ["Dado ... Quando ... Então ..."],
      "functionalRequirements": ["O sistema deve..."],
      "securityRequirements": ["Deve validar token..."],
      "businessContext": "Contexto"
    }
  ]
}
`.trim()
};
EOF

# ------------------------------------------------------------------------------
# 2. Restaurar Cache em Disco e Resiliência
# ------------------------------------------------------------------------------
echo ">>> Revertendo packages/analysis-agent/src/agent.ts para usar Cache em Disco (Fase 6)..."
# O arquivo abaixo restaura a lógica da Fase 6 (persistência), mas usa os Prompts novos (Fase 8)

cat > packages/analysis-agent/src/agent.ts << 'EOF'
import OpenAI from "openai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "./prompts/index.js";
import { globalAnalysisCache } from "./services/cache.service.js";

// --- TIPOS (Mantidos) ---
export type Complexity = "Baixa" | "Média" | "Alta" | "Crítica";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Criticality = "Core" | "Support" | "Config";
export interface Analysis { summary: string; complexity: Complexity; assumptions: string[]; }
export interface Epic { title: string; context: string; requirements: string[]; }
export interface ProductPlan { epics: Epic[]; }
export interface ManifestItem { path: string; purpose: string; criticality: Criticality; }
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
const ManifestItemSchema = z.object({ path: z.string(), purpose: z.string(), criticality: z.enum(["Core", "Support", "Config"]) });
const ArchitectureSchema = z.object({ stack: z.string(), diagram: z.string().optional(), manifest: z.array(ManifestItemSchema) });
const FileContentSchema = z.object({ path: z.string(), code: z.string(), explanation: z.string().optional() });
const UserStorySchema = z.object({ id: z.string(), title: z.string(), priority: z.enum(["P0", "P1", "P2", "P3"]), role: z.string(), action: z.string(), benefit: z.string(), acceptanceCriteria: z.array(z.string()), functionalRequirements: z.array(z.string()), securityRequirements: z.array(z.string()), businessContext: z.string() });
const UserStoriesSchema = z.object({ userStories: z.array(UserStorySchema) });
const IntentSchema = z.object({ type: z.enum(["NEW_PROJECT", "QUESTION", "REFINEMENT"]), reasoning: z.string().optional() });

// --- SANITIZATION ---
const PRIORITY_MAP: Record<string, Priority> = { "p0": "P0", "critical": "P0", "p1": "P1", "high": "P1", "p2": "P2", "medium": "P2", "p3": "P3", "low": "P3" };
const COMPLEXITY_MAP: Record<string, Complexity> = { "baixa": "Baixa", "low": "Baixa", "média": "Média", "media": "Média", "medium": "Média", "alta": "Alta", "high": "Alta", "crítica": "Crítica", "critica": "Crítica", "critical": "Crítica" };
const CRITICALITY_MAP: Record<string, Criticality> = { "core": "Core", "main": "Core", "support": "Support", "utils": "Support", "config": "Config", "settings": "Config" };
function normalizePath(rawPath: unknown): string { if (typeof rawPath !== "string") return "unknown.file"; return rawPath.trim().replace(/^(\.\/|\/)+/, ""); }
function sanitizePriority(value: unknown): Priority { if (typeof value !== "string") return "P2"; const normalized = PRIORITY_MAP[value.trim().toLowerCase()]; return normalized || "P2"; }
function sanitizeComplexity(value: unknown): Complexity { if (typeof value !== "string") return "Média"; return COMPLEXITY_MAP[value.trim().toLowerCase()] ?? "Média"; }
function sanitizeCriticality(value: unknown): Criticality { if (typeof value !== "string") return "Core"; return CRITICALITY_MAP[value.trim().toLowerCase()] ?? "Core"; }
function ensureString(value: unknown, fallback: string): string { return (typeof value === "string" && value.trim().length > 0) ? value.trim() : fallback; }
function ensureStringArray(value: unknown, defaultText?: string): string[] { if (!Array.isArray(value)) return defaultText ? [defaultText] : []; return value.filter((item): item is string => typeof item === "string").map(s => s.trim()).filter(s => s.length > 0); }
function sanitizeUserStory(raw: unknown, index: number): UserStory { const story = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; return { id: ensureString(story["id"], `HU-${String(index + 1).padStart(3, "0")}`), title: ensureString(story["title"], `História de Usuário ${index + 1}`), priority: sanitizePriority(story["priority"]), role: ensureString(story["role"], "usuário"), action: ensureString(story["action"], "realizar ação"), benefit: ensureString(story["benefit"], "obter valor"), acceptanceCriteria: ensureStringArray(story["acceptanceCriteria"], "Critério pendente"), functionalRequirements: ensureStringArray(story["functionalRequirements"], "Requisito pendente"), securityRequirements: ensureStringArray(story["securityRequirements"], "Requisito de segurança padrão"), businessContext: ensureString(story["businessContext"], "Contexto de negócio") }; }
function sanitizeAnalysis(raw: unknown): Analysis { const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; return { summary: ensureString(data["summary"], "N/A"), complexity: sanitizeComplexity(data["complexity"]), assumptions: ensureStringArray(data["assumptions"]) }; }
function sanitizeProductPlan(raw: unknown): ProductPlan { const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; const rawEpics = Array.isArray(data["epics"]) ? data["epics"] : []; return { epics: rawEpics.map((e: unknown, i: number) => { const epic = (e && typeof e === "object") ? e as Record<string, unknown> : {}; return { title: ensureString(epic["title"], `Epic ${i}`), context: ensureString(epic["context"], ""), requirements: ensureStringArray(epic["requirements"]) }; }) }; }
function sanitizeArchitecture(raw: unknown): Architecture { const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; const rawManifest = Array.isArray(data["manifest"]) ? data["manifest"] : []; return { stack: ensureString(data["stack"], "TypeScript"), diagram: typeof data["diagram"] === "string" ? data["diagram"] : undefined, manifest: rawManifest.map((m: unknown) => { const item = (m && typeof m === "object") ? m as Record<string, unknown> : {}; return { path: normalizePath(item["path"]), purpose: ensureString(item["purpose"], "Code"), criticality: sanitizeCriticality(item["criticality"]) }; }).filter(m => m.path !== "unknown.file") }; }
function sanitizeFileContent(raw: unknown, path: string): FileContent { const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; return { path: normalizePath(data["path"] ?? path), code: ensureString(data["code"], "// Error generating code"), explanation: typeof data["explanation"] === "string" ? data["explanation"] : undefined }; }
function sanitizeUserStories(raw: unknown): UserStoriesResult { const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; const stories = Array.isArray(data["userStories"]) ? data["userStories"] : []; return { userStories: stories.map((s: unknown, i: number) => sanitizeUserStory(s, i)) }; }
function sanitizeIntent(raw: unknown): IntentResult { const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {}; const typeValue = data["type"]; let type: IntentResult["type"] = "NEW_PROJECT"; if (typeof typeValue === "string" && ["QUESTION", "REFINEMENT", "NEW_PROJECT"].includes(typeValue)) { type = typeValue as IntentResult["type"]; } return { type, reasoning: typeof data["reasoning"] === "string" ? data["reasoning"] : undefined }; }
function cleanJsonString(input: string): string { return input.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim(); }
type SanitizeFunction<T> = (raw: unknown) => T;

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
    const logger = console;
    logger.info(`[Agent v8.0] Smart Architecture & Contextual Scope. Cache Size: ${globalAnalysisCache.stats().size}`);
    
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

      const t1 = performance.now();
      const analysis = await this.runAnalysisStep(cleanUserPrompt);
      stepTimes.analysis = performance.now() - t1;

      const t2 = performance.now();
      const productPlan = await this.runProductStep(cleanUserPrompt, analysis);
      stepTimes.product = performance.now() - t2;

      const t3 = performance.now();
      const architecture = await this.runArchitectureStep(cleanUserPrompt, productPlan);
      stepTimes.architecture = performance.now() - t3;

      const manifest = architecture.manifest;
      logger.info(`[Agent] ${manifest.length} arquivos planejados (Abrangente).`);

      const t4 = performance.now();
      const batchSize = 3; 
      const allFiles: GeneratedFile[] = [];

      for (let i = 0; i < manifest.length; i += batchSize) {
        const batch = manifest.slice(i, i + batchSize);
        logger.info(`[Agent] Batch ${Math.floor(i / batchSize) + 1}...`);
        const batchResults = await Promise.all(
          batch.map(fileSpec => this.generateFileContent(fileSpec, architecture.stack, cleanUserPrompt))
        );
        allFiles.push(...batchResults);
      }
      stepTimes.codeGen = performance.now() - t4;

      const t5 = performance.now();
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);
      stepTimes.userStories = performance.now() - t5;

      const mappedHUs: MappedUserStory[] = detailedHUs.map(hu => ({
        id: hu.id, title: hu.title, priority: hu.priority, role: hu.role, action: hu.action, benefit: hu.benefit,
        acceptanceCriteria: hu.acceptanceCriteria, functionalReqs: hu.functionalRequirements, security: hu.securityRequirements,
        context: hu.businessContext, nonFunctionalReqs: [], description: `Como ${hu.role}, quero ${hu.action}, para ${hu.benefit}`
      }));

      const requestId = `req-${Date.now()}`;
      const tTotal = performance.now() - tStart;

      return {
        summary: analysis.summary, requestId, timestamp: new Date().toISOString(), timings: { total: tTotal, ...stepTimes },
        analysis, product: { userStories: mappedHUs }, architect: { diagram: architecture.diagram, stack: architecture.stack },
        engine: { files: allFiles }, ux: { components: [] }, quality: { tests: [] }, ops: { scripts: [] },
        fenix: { notes: "Generated via Agent v8.0 (Smart Scope)" }
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[Agent] Erro fatal:", errorMessage);
      throw error;
    }
  }

  private createChatResponse(answer: string, totalTime: number): AgentResult {
    return { summary: answer, requestId: `chat-${Date.now()}`, timestamp: new Date().toISOString(), timings: { total: totalTime, analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0 }, analysis: { summary: answer, complexity: "Baixa", assumptions: [] }, product: { userStories: [] }, architect: { stack: "", diagram: "" }, engine: { files: [] }, ux: { components: [] }, quality: { tests: [] }, ops: { scripts: [] }, fenix: { notes: "Chat Response Only" } };
  }

  // --- CALL LLM COM CACHE EM DISCO ---
  private async detectIntent(prompt: string): Promise<IntentResult> { return this.callLLM(SYSTEM_PROMPTS.DETECT_INTENT, `Entrada: "${prompt}"`, sanitizeIntent, IntentSchema, "Intent"); }
  private async generateTextResponse(prompt: string): Promise<string> {
      const completion = await this.client.chat.completions.create({ model: this.model, messages: [{ role: "user", content: prompt }] }, { timeout: 60000 });
      return completion.choices[0]?.message?.content ?? "Sem resposta.";
  }
  private async runAnalysisStep(prompt: string): Promise<Analysis> { return this.callLLM(SYSTEM_PROMPTS.ANALYSIS, `Pedido: ${prompt}`, sanitizeAnalysis, AnalysisSchema, "Analysis"); }
  private async runProductStep(prompt: string, analysis: Analysis): Promise<ProductPlan> { return this.callLLM(SYSTEM_PROMPTS.PRODUCT, `Análise: ${analysis.summary}\nPrompt: ${prompt}`, sanitizeProductPlan, ProductPlanSchema, "Product"); }
  private async runArchitectureStep(userPrompt: string, productPlan: ProductPlan): Promise<Architecture> { return this.callLLM(SYSTEM_PROMPTS.ARCHITECTURE, `Prompt: ${userPrompt}`, sanitizeArchitecture, ArchitectureSchema, "Architecture"); }
  private async generateFileContent(spec: ManifestItem, stack: string, userPrompt: string): Promise<GeneratedFile> {
    try {
      const parsed = await this.callLLM(SYSTEM_PROMPTS.CODE_GEN, `File: ${spec.path}\nStack: ${stack}\nContext: ${userPrompt}`, (r) => sanitizeFileContent(r, spec.path), FileContentSchema, `File:${spec.path}`);
      return { path: parsed.path, content: parsed.code, language: this.detectLanguage(parsed.path) };
    } catch (error) { return { path: normalizePath(spec.path), content: "// Error", language: "plaintext" }; }
  }
  private async expandEpicsToStories(epics: Epic[]): Promise<UserStory[]> {
    const richContext = epics.map(e => `Épico: ${e.title}`).join("\n");
    return (await this.callLLM(SYSTEM_PROMPTS.USER_STORIES, richContext, sanitizeUserStories, UserStoriesSchema, "HUs")).userStories;
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
    while (attempt < 3) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          response_format: { type: "json_object" },
          temperature: 0.0,
          seed: 42
        }, { timeout: 60000 });

        const rawContent = completion.choices[0]?.message?.content || "{}";
        const result = sch.parse(san(JSON.parse(cleanJsonString(rawContent))));
        
        globalAnalysisCache.set(cacheKey, result);
        return result;
      } catch (e) {
        attempt++;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    return sch.parse(san({}));
  }

  private detectLanguage(path: string): string {
    if (/\.(ts|tsx)$/.test(path)) return "typescript";
    if (path.endsWith(".json")) return "json";
    return "plaintext";
  }
}
EOF

# Validar (Sem warnings)
echo ">>> Validando..."
pnpm --filter @mini-ide/analysis-agent lint --max-warnings 0
pnpm --filter @mini-ide/analysis-agent build

echo "✅ Fase 8 (Inteligência Real) concluída."
echo "Prompt 1 agora deve gerar um resultado abrangente, sem limites artificiais."
EOF
