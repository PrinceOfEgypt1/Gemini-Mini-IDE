#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

SHARED_REQ="packages/shared/src/types/analyze-request.ts"
AGENT_FILE="packages/analysis-agent/src/agent.ts"
SERVER_FILE="packages/server/src/index.ts"
API_FILE="packages/ui/src/services/api.ts"
APP_FILE="packages/ui/src/App.tsx"

log_info "Iniciando implementação de Refinamento Contextual (Fase 18)..."

# 1. ATUALIZAR CONTRATO (SHARED)
# Adiciona campo 'currentContext' para enviar o estado atual do projeto
cat > "$SHARED_REQ" << 'EOF'
export interface AnalyzeRequest {
  text: string;
  maxLen?: number;
  /** 
   * Contexto do projeto atual para refinamentos.
   * Envia apenas nomes de arquivos e propósitos para economizar tokens.
   */
  currentContext?: {
    files: Array<{ path: string; purpose?: string }>;
    summary?: string;
  };
}
EOF
log_ok "Contrato atualizado."

# 2. ATUALIZAR AGENTE (AGENT)
# Modifica o analyze para usar o contexto no prompt se disponível
cat > "$AGENT_FILE" << 'EOF'
import { OpenAI } from "openai";
import { z } from "zod";

// --- TIPOS & SCHEMAS (Mantidos) ---
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
    acceptanceCriteria: ensureStringArray(story.acceptanceCriteria, "Critério pendente"),
    functionalRequirements: ensureStringArray(story.functionalRequirements, "Requisito pendente"),
    securityRequirements: ensureStringArray(story.securityRequirements, "Requisito de segurança padrão"),
    businessContext: ensureString(story.businessContext, "Contexto de negócio")
  };
}

function sanitizeAnalysis(raw: unknown): Analysis { const data = (raw as any) || {}; return { summary: ensureString(data.summary, "N/A"), complexity: sanitizeComplexity(data.complexity), assumptions: ensureStringArray(data.assumptions) }; }
function sanitizeProductPlan(raw: unknown): ProductPlan { const data = (raw as any) || {}; const rawEpics = Array.isArray(data.epics) ? data.epics : []; return { epics: rawEpics.map((e: any, i: number) => ({ title: ensureString(e.title, `Epic ${i}`), context: ensureString(e.context, ""), requirements: ensureStringArray(e.requirements) })) }; }
function sanitizeArchitecture(raw: unknown): Architecture { const data = (raw as any) || {}; const rawManifest = Array.isArray(data.manifest) ? data.manifest : []; return { stack: ensureString(data.stack, "TS"), diagram: data.diagram, manifest: rawManifest.map((m: any) => ({ path: normalizePath(m.path), purpose: ensureString(m.purpose, "Code"), criticality: sanitizeCriticality(m.criticality) })).filter((m: any) => m.path !== "unknown.file") }; }
function sanitizeFileContent(raw: unknown, path: string): FileContent { const data = (raw as any) || {}; return { path: normalizePath(data.path || path), code: ensureString(data.code, "// Error"), explanation: data.explanation }; }
function sanitizeUserStories(raw: unknown): UserStoriesResult { const data = (raw as any) || {}; const stories = Array.isArray(data.userStories) ? data.userStories : []; return { userStories: stories.map((s: any, i: number) => sanitizeUserStory(s, i)) }; }

type SanitizeFunction<T> = (raw: unknown) => T;
function cleanJsonString(input: string): string { return input.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim(); }

// Interfaces do Contexto
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
    console.log("🚀 [Agent v6.0] Iniciando Análise Contextual...");

    try {
      const intent = await this.detectIntent(userPrompt);
      console.log(`🎯 Intenção: ${intent.type} (${intent.reasoning})`);

      // MODO CHAT: Responde e sai
      if (intent.type === "QUESTION") {
        const answer = await this.generateTextResponse(userPrompt, context?.summary);
        return this.buildEmptyResponse(answer, "Chat Response");
      }

      // MODO REFINAMENTO: Usa o contexto para gerar DELTA
      if (intent.type === "REFINEMENT" && context && context.files.length > 0) {
          console.log("🔄 [Refinement] Usando contexto existente...");
          return this.runRefinementPipeline(userPrompt, context);
      }

      // MODO NOVO PROJETO: Pipeline completo do zero
      console.log("✨ [New Project] Iniciando do zero...");
      return this.runFullPipeline(userPrompt);

    } catch (error: unknown) {
      console.error("❌ Erro fatal no Agente:", error);
      throw error;
    }
  }

  private async runRefinementPipeline(prompt: string, context: ProjectContext) {
      // 1. Planejar alterações (Quais arquivos criar/modificar?)
      const fileList = context.files.map(f => f.path).join(", ");
      const systemPrompt = `Arquiteto Sênior. O usuário quer alterar um projeto existente.
      Arquivos atuais: ${fileList}.
      Pedido: ${prompt}.
      
      Defina o MANIFESTO DE ARQUIVOS que precisam ser CRIADOS ou MODIFICADOS.
      NÃO liste arquivos que não precisam ser alterados.
      Responda JSON: { "stack": "manter", "manifest": [{ "path": "...", "purpose": "...", "criticality": "Core" }] }`;
      
      const changes = await this.callLLM(systemPrompt, "Planeje as alterações.", sanitizeArchitecture, ArchitectureSchema, "Refinement Arch");
      
      console.log(`📋 [Refinement] ${changes.manifest.length} arquivos para alterar.`);

      // 2. Gerar apenas os arquivos alterados
      const batchSize = 5;
      const allFiles: any[] = [];

      for (let i = 0; i < changes.manifest.length; i += batchSize) {
        const batch = changes.manifest.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(fileSpec => this.generateFileContent(fileSpec, changes.stack, prompt))
        );
        allFiles.push(...results);
        if (global.gc) global.gc();
      }

      // Retorna apenas o delta (Frontend fará o merge)
      return {
          summary: `Refinamento aplicado: ${prompt}`,
          requestId: `ref-${Date.now()}`,
          timestamp: new Date().toISOString(),
          analysis: { summary: "Refinamento", complexity: "Média", assumptions: [] },
          product: { userStories: [] }, // Pode gerar HUs novas se quiser, mas simplificamos aqui
          architect: { stack: changes.stack, diagram: "" },
          engine: { files: allFiles }, // APENAS ARQUIVOS NOVOS/MODIFICADOS
          ux: { components: [] },
          quality: { tests: [] },
          ops: { scripts: [] },
          fenix: { notes: "Refinement Delta" }
      };
  }

  private async runFullPipeline(userPrompt: string) {
      const analysis = await this.runAnalysisStep(userPrompt);
      const productPlan = await this.runProductStep(userPrompt, analysis);
      const architecture = await this.runArchitectureStep(userPrompt, productPlan);
      
      console.log(`📋 [Blueprint] ${architecture.manifest.length} arquivos.`);

      const batchSize = 5;
      const allFiles: any[] = [];

      for (let i = 0; i < architecture.manifest.length; i += batchSize) {
        const batch = architecture.manifest.slice(i, i + batchSize);
        console.log(`   Batch ${Math.floor(i/batchSize) + 1}...`);
        const results = await Promise.all(batch.map(f => this.generateFileContent(f, architecture.stack, userPrompt)));
        allFiles.push(...results);
        if (global.gc) global.gc();
        await new Promise(r => setTimeout(r, 100));
      }

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
        fenix: { notes: "Full Generation" }
      };
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

  // --- AUXILIARES ---
  private async detectIntent(prompt: string) {
    const systemPrompt = `Classifique a intenção.
    - NEW_PROJECT: "Crie um app", "Gere uma API".
    - QUESTION: "Como funciona?", "Explique o código".
    - REFINEMENT: "Adicione testes", "Crie a documentação", "Mude para azul".
    JSON: { "type": "NEW_PROJECT"|"QUESTION"|"REFINEMENT", "reasoning": "string" }`;
    
    const IntentZod = z.object({ type: z.enum(["NEW_PROJECT", "QUESTION", "REFINEMENT"]), reasoning: z.string() });
    return this.callLLM(systemPrompt, prompt, (r: any) => r, IntentZod, "Intent");
  }

  private async generateTextResponse(prompt: string, contextSummary?: string) {
    const ctx = contextSummary ? `Contexto do Projeto Atual: ${contextSummary}` : "Sem contexto prévio.";
    const completion = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Assistente técnico." },
          { role: "user", content: `${ctx}\nPergunta: ${prompt}` }
        ],
        temperature: 0.7
    });
    return completion.choices[0].message.content || "Sem resposta.";
  }

  // --- STEPS ORIGINAIS (Mantidos) ---
  private async runAnalysisStep(prompt: string) {
    return this.callLLM(`Analista Sênior. PT-BR. JSON: {summary, complexity, assumptions[]}`, prompt, sanitizeAnalysis, AnalysisSchema, "Analysis");
  }
  private async runProductStep(prompt: string, analysis: any) {
    return this.callLLM(`PO. PT-BR. JSON: {epics:[{title, context, requirements[]}]}`, prompt, sanitizeProductPlan, ProductPlanSchema, "Product");
  }
  private async runArchitectureStep(prompt: string, productPlan: any) {
    const context = productPlan.epics.map((e:any)=>e.title).join(", ");
    const systemPrompt = `Arquiteto. Defina stack e arquivos. Contexto: ${context}.
    JSON: { "stack": "string", "manifest": [{ "path": "string", "purpose": "string", "criticality": "Core"|"Support"|"Config" }] }`;
    return this.callLLM(systemPrompt, "Arquitetura.", sanitizeArchitecture, ArchitectureSchema, "Architecture");
  }
  private async generateFileContent(spec: ManifestItem, stack: string, prompt: string) {
    try {
        const systemPrompt = `Dev. Codifique ${spec.path}. Stack: ${stack}. JSON: { "path": "${spec.path}", "code": "...", "explanation": "..." }`;
        const parsed = await this.callLLM(systemPrompt, "Code.", (r) => sanitizeFileContent(r, spec.path), FileContentSchema, `File:${spec.path}`);
        return { path: parsed.path, content: parsed.code, language: this.detectLanguage(parsed.path) };
    } catch (e: any) { return { path: normalizePath(spec.path), content: "// Error", language: "plaintext" }; }
  }
  private async expandEpicsToStories(epics: any[]) {
    const ctx = epics.slice(0,10).map((e:any)=>e.title).join(",");
    const res = await this.callLLM(`PO. HUs Detalhadas. PT-BR. JSON: {userStories:[...]}`, `Context: ${ctx}`, sanitizeUserStories, UserStoriesSchema, "HUs");
    return res.userStories;
  }

  private async callLLM<T>(sys: string, usr: string, san: SanitizeFunction<T>, sch: z.ZodType<T>, ctx: string): Promise<T> {
    try {
      const c = await this.client.chat.completions.create({ model: "gpt-4o", messages: [{role:"system",content:sys},{role:"user",content:usr}], response_format:{type:"json_object"}, temperature:0.2 });
      return sch.parse(san(JSON.parse(cleanJsonString(c.choices[0].message.content||"{}"))));
    } catch (e) { console.error(`Error ${ctx}`, e); return sch.parse(san({})); }
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
log_ok "Agent atualizado com Refinamento Contextual."

# 3. ATUALIZAR SERVIDOR (SERVER)
# Passar o contexto recebido do frontend para o agente
cat > "$SERVER_FILE" << 'EOF'
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { z } from "zod";
import { AnalysisAgent } from "@mini-ide/analysis-agent";
import { exportController } from "./controllers/export.controller";

dotenv.config({ path: "../../.env" });
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3200;
const DEFAULT_API_KEY = process.env.OPENAI_API_KEY || "";

// Schema de Requisição ATUALIZADO com 'currentContext'
const AnalyzeRequestSchema = z.object({
  text: z.string().min(1),
  maxLen: z.number().optional(),
  currentContext: z.object({
    files: z.array(z.object({ path: z.string(), purpose: z.string().optional() })),
    summary: z.string().optional()
  }).optional()
});

const app: FastifyInstance = Fastify({ logger: true });
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.status(500).send({ error: "Internal Server Error", details: error.message });
});

const start = async () => {
  await app.register(cors, { origin: true, methods: ["GET","POST"], allowedHeaders: ["Content-Type","Authorization","X-LLM-Base-URL"] });

  app.get("/healthz", async () => ({ status: "ok" }));

  app.post("/analyze", async (request, reply) => {
    const parseResult = AnalyzeRequestSchema.safeParse(request.body);
    if (!parseResult.success) return reply.status(400).send({ error: "Dados inválidos" });
    
    const { text, currentContext } = parseResult.data;
    const authHeader = request.headers.authorization;
    const apiKey = (authHeader && authHeader.startsWith("Bearer ")) ? authHeader.substring(7) : DEFAULT_API_KEY;

    try {
      const agent = new AnalysisAgent(apiKey);
      // Passa o contexto para o método analyze
      const result = await agent.analyze(text, currentContext);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(502).send({ error: "Falha no Agente", details: err.message });
    }
  });

  app.post("/export", exportController);

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`🚀 Server running at http://localhost:${PORT}`);
};
start();
EOF
log_ok "Servidor atualizado para receber contexto."

# 4. ATUALIZAR FRONTEND (API SERVICE)
cat > "$API_FILE" << 'EOF'
const API_BASE_URL = import.meta.env.VITE_MINI_IDE_SERVER_URL || 'http://localhost:3200';

// Interface do Contexto
interface ProjectContext {
  files: Array<{ path: string; purpose?: string }>;
  summary?: string;
}

const getAuthHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = localStorage.getItem('mini-ide-api-key');
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  return headers;
};

export const api = {
  exportProjectZip: async (projectData: unknown) => {
    const response = await fetch(`${API_BASE_URL}/export`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ project: projectData })
    });
    if (!response.ok) throw new Error('Erro exportação');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'project.zip'; document.body.appendChild(a); a.click();
    return true;
  },

  // Agora aceita contexto opcional
  analyze: async (text: string, currentContext?: ProjectContext) => {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
          text, 
          maxLen: 2000,
          currentContext: currentContext // Envia o estado atual
      }),
    });
    if (!response.ok) {
       const err = await response.json().catch(() => ({}));
       throw new Error(err.error || 'Erro no servidor');
    }
    return await response.json();
  }
};
EOF
log_ok "API Frontend atualizada."

# 5. ATUALIZAR FRONTEND (APP.TSX)
# Modificar a chamada api.analyze para passar o generatedProject atual
log_info "Ajustando chamada no App.tsx..."

# Como o App.tsx é grande, vamos usar sed cirúrgico na função handleSendMessage
sed -i 's/const response = await api.analyze(userMsg);/const context = generatedProject ? { files: generatedProject.engine?.files?.map(f => ({ path: f.path })) || [], summary: generatedProject.summary } : undefined; const response = await api.analyze(userMsg, context);/g' "$APP_FILE"

log_ok "App.tsx conectado com contexto."

# Recompilação
log_info "Recompilando..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b
cd ../server
../../node_modules/.bin/tsc -b
cd ../ui
../../node_modules/.bin/tsc -b && ../../node_modules/.bin/vite build

log_ok "Correção completa. Reinicie o servidor."
