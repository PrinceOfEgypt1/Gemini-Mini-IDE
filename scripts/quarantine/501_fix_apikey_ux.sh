#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

APP_FILE="packages/ui/src/App.tsx"
AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Corrigindo UX de API Key e tratamento de erro do Agente..."

# 1. FRONTEND: Bloquear envio sem chave
log_info "Adicionando validação de chave no App.tsx..."

# Injeta a verificação antes do envio
# Usamos perl para inserção multiline segura
perl -i -0777 -pe 's/if \(!chatInput.trim\(\)\) return;/if (!chatInput.trim()) return;\n\n    const apiKey = sessionStorage.getItem("mini-ide-api-key");\n    if (!apiKey) {\n      showToast("Configure sua API Key nas Preferências para continuar.", "warning");\n      setIsSettingsOpen(true);\n      return;\n    }/' "$APP_FILE"

log_ok "App.tsx protegido."

# 2. BACKEND: Melhorar tratamento de erro no callLLM
log_info "Blindando callLLM no agent.ts..."

# Substitui o catch genérico por um que relança erros de API (401, 429, 500)
# para que o servidor possa retornar o status correto, em vez de tentar parsear lixo
cat > "$AGENT_FILE" << 'EOF'
import { OpenAI } from "openai";
import { z } from "zod";

// ... (TIPOS e SCHEMAS mantidos iguais ao v4.1 - Copie o conteúdo anterior se necessário, 
// mas para o script ser idempotente e seguro, vamos focar na alteração do método callLLM 
// e manter o resto. Como o cat > sobrescreve, vou reinserir o código completo atualizado da v6.0)

// REINSERINDO CÓDIGO DO AGENT (v6.1 - Error Handling Fix)
// (Mesmos tipos e schemas da v6.0...)
type Complexity = "Baixa" | "Média" | "Alta" | "Crítica";
type Priority = "P0" | "P1" | "P2" | "P3";
type Criticality = "Core" | "Support" | "Config";

interface Analysis { summary: string; complexity: Complexity; assumptions: string[]; }
interface Epic { title: string; context: string; requirements: string[]; }
interface ProductPlan { epics: Epic[]; }
interface ManifestItem { path: string; purpose: string; criticality: Criticality; }
interface Architecture { stack: string; diagram?: string; manifest: ManifestItem[]; }
interface FileContent { path: string; code: string; explanation?: string; }
interface UserStory { id: string; title: string; priority: Priority; role: string; action: string; benefit: string; acceptanceCriteria: string[]; functionalRequirements: string[]; securityRequirements: string[]; businessContext: string; }
interface UserStoriesResult { userStories: UserStory[]; }

const AnalysisSchema = z.object({ summary: z.string(), complexity: z.enum(["Baixa", "Média", "Alta", "Crítica"]), assumptions: z.array(z.string()) });
const EpicSchema = z.object({ title: z.string(), context: z.string(), requirements: z.array(z.string()) });
const ProductPlanSchema = z.object({ epics: z.array(EpicSchema) });
const ManifestItemSchema = z.object({ path: z.string(), purpose: z.string(), criticality: z.enum(["Core", "Support", "Config"]) });
const ArchitectureSchema = z.object({ stack: z.string(), diagram: z.string().optional(), manifest: z.array(ManifestItemSchema) });
const FileContentSchema = z.object({ path: z.string(), code: z.string(), explanation: z.string().optional() });
const UserStorySchema = z.object({ id: z.string(), title: z.string(), priority: z.enum(["P0", "P1", "P2", "P3"]), role: z.string(), action: z.string(), benefit: z.string(), acceptanceCriteria: z.array(z.string()), functionalRequirements: z.array(z.string()), securityRequirements: z.array(z.string()), businessContext: z.string() });
const UserStoriesSchema = z.object({ userStories: z.array(UserStorySchema) });

const PRIORITY_MAP: Record<string, Priority> = { "p0": "P0", "critical": "P0", "high": "P1", "medium": "P2", "low": "P3" };
const COMPLEXITY_MAP: Record<string, Complexity> = { "baixa": "Baixa", "média": "Média", "alta": "Alta", "crítica": "Crítica", "low": "Baixa", "medium": "Média", "high": "Alta", "critical": "Crítica" };
const CRITICALITY_MAP: Record<string, Criticality> = { "core": "Core", "support": "Support", "config": "Config", "main": "Core", "utils": "Support", "settings": "Config" };

function normalizePath(rawPath: unknown): string { if (typeof rawPath !== "string") return "unknown.file"; return rawPath.trim().replace(/^(\.\/|\/)+/, ""); }
function sanitizePriority(value: unknown): Priority { if (typeof value !== "string") return "P2"; const normalized = PRIORITY_MAP[value.trim().toLowerCase()]; if (!normalized) { const v = value.toLowerCase(); if (v.includes("p0") || v.includes("critical")) return "P0"; if (v.includes("p1") || v.includes("high")) return "P1"; if (v.includes("p3") || v.includes("low")) return "P3"; return "P2"; } return normalized; }
function sanitizeComplexity(value: unknown): Complexity { if (typeof value !== "string") return "Média"; return COMPLEXITY_MAP[value.trim().toLowerCase()] ?? "Média"; }
function sanitizeCriticality(value: unknown): Criticality { if (typeof value !== "string") return "Core"; return CRITICALITY_MAP[value.trim().toLowerCase()] ?? "Core"; }
function ensureString(value: unknown, fallback: string): string { return (typeof value === "string" && value.trim().length > 0) ? value.trim() : fallback; }
function ensureStringArray(value: unknown, defaultText?: string): string[] { if (!Array.isArray(value)) return defaultText ? [defaultText] : []; const result = value.filter((item): item is string => typeof item === "string").map(s => s.trim()).filter(s => s.length > 0); if (result.length === 0 && defaultText) return [defaultText]; return result; }

function sanitizeUserStory(raw: unknown, index: number): UserStory {
  const story = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  return {
    id: ensureString(story.id, `HU-${String(index + 1).padStart(3, "0")}`),
    title: ensureString(story.title, `História de Usuário ${index + 1}`),
    priority: sanitizePriority(story.priority),
    role: ensureString(story.role, "usuário"),
    action: ensureString(story.action, "realizar ação"),
    benefit: ensureString(story.benefit, "obter valor"),
    acceptanceCriteria: ensureStringArray(story.acceptanceCriteria, "Critério a definir"),
    functionalRequirements: ensureStringArray(story.functionalRequirements, "Requisito funcional a definir"),
    securityRequirements: ensureStringArray(story.securityRequirements, "Requisito de segurança a definir"),
    businessContext: ensureString(story.businessContext, "Contexto do negócio.")
  };
}

function sanitizeAnalysis(raw: unknown): Analysis { const data = (raw as any) || {}; return { summary: ensureString(data.summary, "N/A"), complexity: sanitizeComplexity(data.complexity), assumptions: ensureStringArray(data.assumptions) }; }
function sanitizeProductPlan(raw: unknown): ProductPlan { const data = (raw as any) || {}; const rawEpics = Array.isArray(data.epics) ? data.epics : []; return { epics: rawEpics.map((e: any, i: number) => ({ title: ensureString(e.title, `Epic ${i}`), context: ensureString(e.context, ""), requirements: ensureStringArray(e.requirements) })) }; }
function sanitizeArchitecture(raw: unknown): Architecture { const data = (raw as any) || {}; const rawManifest = Array.isArray(data.manifest) ? data.manifest : []; return { stack: ensureString(data.stack, "TS"), diagram: data.diagram, manifest: rawManifest.map((m: any) => ({ path: normalizePath(m.path), purpose: ensureString(m.purpose, "Code"), criticality: sanitizeCriticality(m.criticality) })).filter((m: any) => m.path !== "unknown.file") }; }
function sanitizeFileContent(raw: unknown, path: string): FileContent { const data = (raw as any) || {}; return { path: normalizePath(data.path || path), code: ensureString(data.code, "// Error"), explanation: data.explanation }; }
function sanitizeUserStories(raw: unknown): UserStoriesResult { const data = (raw as any) || {}; const stories = Array.isArray(data.userStories) ? data.userStories : []; return { userStories: stories.map((s: any, i: number) => sanitizeUserStory(s, i)) }; }

type SanitizeFunction<T> = (raw: unknown) => T;
function cleanJsonString(input: string): string { return input.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim(); }

// Contexto vindo do Frontend
interface ProjectContext {
    files: Array<{ path: string; purpose?: string }>;
    summary?: string;
}

export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(userPrompt: string, context?: ProjectContext): Promise<unknown> {
    console.log("🚀 [Agent v6.1] Iniciando Análise (Safe Mode)");

    try {
      const intent = await this.detectIntent(userPrompt);
      console.log(`🎯 Intenção: ${intent.type}`);

      if (intent.type === "QUESTION") {
        const answer = await this.generateTextResponse(userPrompt, context);
        return this.buildEmptyResponse(answer, "Chat Response");
      }

      if (intent.type === "REFINEMENT" && context && context.files.length > 0) {
          console.log("🔄 [Refinement] Contexto carregado.");
          return this.runRefinementPipeline(userPrompt, context);
      }

      console.log("✨ [New Project] Geração Total...");
      return this.runFullPipeline(userPrompt);

    } catch (error: any) {
      console.error("❌ Erro fatal no Agente:", error.message);
      // Propaga erro de autenticação ou rate limit para o servidor tratar (401/429)
      if (error.status === 401 || error.status === 429) throw error;
      
      throw new Error(`Falha interna do agente: ${error.message}`);
    }
  }

  private buildEmptyResponse(summary: string, notes: string) {
      return {
           summary,
           requestId: `chat-${Date.now()}`,
           timestamp: new Date().toISOString(),
           analysis: { summary, complexity: "Baixa", assumptions: [] },
           product: { userStories: [] },
           architect: { stack: "", diagram: "" },
           engine: { files: [] },
           ux: { components: [] },
           quality: { tests: [] },
           ops: { scripts: [] },
           fenix: { notes }
        };
  }

  private async runFullPipeline(userPrompt: string) {
      const analysis = await this.runAnalysisStep(userPrompt);
      const productPlan = await this.runProductStep(userPrompt, analysis);
      const architecture = await this.runArchitectureStep(userPrompt, productPlan);
      
      const manifest = architecture.manifest;
      console.log(`📋 [Blueprint] ${manifest.length} arquivos planejados.`);

      const batchSize = 5;
      const allFiles: any[] = [];

      for (let i = 0; i < manifest.length; i += batchSize) {
        const batch = manifest.slice(i, i + batchSize);
        console.log(`   Batch ${Math.floor(i/batchSize) + 1}...`);
        const results = await Promise.all(batch.map(f => this.generateFileContent(f, architecture.stack, userPrompt)));
        allFiles.push(...results);
        if (global.gc) global.gc();
        await new Promise(r => setTimeout(r, 100));
      }

      console.log("📜 [Final] Gerando HUs detalhadas...");
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);
      
      const mappedHUs = detailedHUs.map(hu => ({
        id: hu.id, title: hu.title, priority: hu.priority, role: hu.role, action: hu.action, benefit: hu.benefit,
        acceptanceCriteria: hu.acceptanceCriteria, functionalReqs: hu.functionalRequirements,
        security: hu.securityRequirements, context: hu.businessContext,
        nonFunctionalReqs: [] as string[], description: ""
      }));

      return {
        summary: analysis.summary,
        requestId: `req-${Date.now()}`,
        timestamp: new Date().toISOString(),
        analysis,
        product: { userStories: mappedHUs },
        architect: { diagram: architecture.diagram, stack: architecture.stack },
        engine: { files: allFiles },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Full Generation v6.1" }
      };
  }

  private async runRefinementPipeline(prompt: string, context: ProjectContext) {
      const fileList = context.files.map(f => f.path).join(", ");
      const systemPrompt = `Arquiteto. Refinamento.
      Arquivos Atuais: ${fileList}.
      Pedido: ${prompt}.
      Gere APENAS arquivos novos ou alterados.
      Responda JSON: { "stack": "keep", "manifest": [{ "path": "...", "purpose": "...", "criticality": "Core" }] }`;
      
      const changes = await this.callLLM(systemPrompt, "Planeje.", sanitizeArchitecture, ArchitectureSchema, "Refinement");
      
      const batchSize = 5;
      const allFiles: any[] = [];
      for (let i = 0; i < changes.manifest.length; i += batchSize) {
        const batch = changes.manifest.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(f => this.generateFileContent(f, changes.stack, prompt)));
        allFiles.push(...results);
        if (global.gc) global.gc();
      }

      return {
          summary: `Refinamento: ${prompt}`,
          requestId: `ref-${Date.now()}`,
          timestamp: new Date().toISOString(),
          analysis: { summary: "Refinamento", complexity: "Média", assumptions: [] },
          product: { userStories: [] },
          architect: { stack: changes.stack, diagram: "" },
          engine: { files: allFiles },
          ux: { components: [] },
          quality: { tests: [] },
          ops: { scripts: [] },
          fenix: { notes: "Refinement Delta" }
      };
  }

  private async detectIntent(prompt: string) {
    const systemPrompt = `Classifique a intenção.
    - NEW_PROJECT: "Crie um app", "Gere um sistema".
    - QUESTION: "Como funciona?", "Mostre o arquivo X".
    - REFINEMENT: "Adicione testes", "Mude a cor".
    JSON: { "type": "NEW_PROJECT"|"QUESTION"|"REFINEMENT", "reasoning": "string" }`;
    const IntentZod = z.object({ type: z.enum(["NEW_PROJECT", "QUESTION", "REFINEMENT"]), reasoning: z.string() });
    return this.callLLM(systemPrompt, prompt, (r: any) => r, IntentZod, "Intent");
  }

  private async generateTextResponse(prompt: string, context?: ProjectContext) {
    let sys = "Assistente técnico Mini-IDE.";
    if (context && context.files && context.files.length > 0) {
        const filesList = context.files.map(f => f.path).join("\n");
        sys += `\nCONTEXTO ATUAL:\n${filesList}\nResponda com base nisso.`;
    }
    const c = await this.client.chat.completions.create({ model: "gpt-4o", messages: [{role:"system",content:sys},{role:"user",content:prompt}], temperature:0.7 });
    return c.choices[0].message.content || "Sem resposta.";
  }

  private async runAnalysisStep(prompt: string) {
    return this.callLLM(`Analista Sênior. PT-BR. JSON: {summary, complexity, assumptions[]}`, prompt, sanitizeAnalysis, AnalysisSchema, "Analysis");
  }
  private async runProductStep(prompt: string, analysis: any) {
    return this.callLLM(`PO. PT-BR. JSON: {epics:[{title, context, requirements[]}]}`, prompt, sanitizeProductPlan, ProductPlanSchema, "Product");
  }
  private async runArchitectureStep(prompt: string, productPlan: any) {
    const context = productPlan.epics.map((e:any)=>e.title).join(", ");
    const systemPrompt = `Arquiteto Sênior.
    Defina stack e arquivos. Contexto: ${context}.
    REGRAS:
    1. Use caminhos REAIS (ex: "src/index.ts"). NUNCA nomes vazios.
    2. Cubra todas as camadas.
    JSON: { "stack": "string", "manifest": [{ "path": "string", "purpose": "string", "criticality": "Core"|"Support"|"Config" }] }`;
    return this.callLLM(systemPrompt, "Arquitetura.", sanitizeArchitecture, ArchitectureSchema, "Architecture");
  }
  private async generateFileContent(spec: ManifestItem, stack: string, prompt: string) {
    try {
        const systemPrompt = `Dev. Codifique ${spec.path}. Stack: ${stack}. Completo. PT-BR.
        JSON: { "path": "${spec.path}", "code": "...", "explanation": "..." }`;
        const parsed = await this.callLLM(systemPrompt, "Code.", (r) => sanitizeFileContent(r, spec.path), FileContentSchema, `File:${spec.path}`);
        return { path: parsed.path, content: parsed.code, language: this.detectLanguage(parsed.path) };
    } catch (e: any) { return { path: normalizePath(spec.path), content: "// Error", language: "plaintext" }; }
  }
  
  private async expandEpicsToStories(epics: any[]) {
    const ctx = epics.slice(0,10).map((e:any)=>e.title).join(",");
    const systemPrompt = `PO Técnico. HUs Detalhadas. PT-BR.
    JSON: { "userStories": [...] }.
    Preencha TODOS os campos (id, title, priority, role, action, benefit, acceptanceCriteria[], functionalRequirements[], securityRequirements[], businessContext).`;

    const result = await this.callLLM(systemPrompt, `DETALHAR:\n${ctx}`, sanitizeUserStories, UserStoriesSchema, "HUs");
    return result.userStories;
  }

  private async callLLM<T>(sys: string, usr: string, san: SanitizeFunction<T>, sch: z.ZodType<T>, ctx: string): Promise<T> {
    try {
      const c = await this.client.chat.completions.create({ model: "gpt-4o", messages: [{role:"system",content:sys},{role:"user",content:usr}], response_format:{type:"json_object"}, temperature:0.2 });
      return sch.parse(san(JSON.parse(cleanJsonString(c.choices[0].message.content||"{}"))));
    } catch (error: any) {
        // Se for erro de API (401, 429, etc), propaga para o nível superior
        if (error.status && error.status >= 400) {
            throw error;
        }
        // Se for erro de Parse/Zod, usa fallback sanitizado
        console.error(`Error ${ctx}`, error); 
        return sch.parse(san({})); 
    }
  }

  private detectLanguage(path: string): string {
    if (path.match(/\.(ts|tsx)$/)) return "typescript";
    if (path.match(/\.(js|jsx)$/)) return "javascript";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".md")) return "markdown";
    return "plaintext";
  }
}
EOF
log_ok "Agent v6.1 (Security & Error Handling) aplicado."

# Recompilação
log_info "Recompilando pacotes..."
cd packages/ui
../../node_modules/.bin/tsc -b && ../../node_modules/.bin/vite build
cd ../analysis-agent
../../node_modules/.bin/tsc -b
cd ../..

log_ok "Correções aplicadas. Recarregue a página."
