#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Aplicando correção para o bug de '0 arquivos planejados'..."

# Backup
cp "$AGENT_FILE" "${AGENT_FILE}.bak_421"

# Reescreve o agent.ts com Fallback de Arquitetura
cat > "$AGENT_FILE" << 'EOF'
import { OpenAI } from "openai";
import { z } from "zod";

// ... (TIPOS e SCHEMAS mantidos idênticos à v3.2 para brevidade)
// Reaproveitando toda a estrutura de tipos já definida anteriormente
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

// SANITIZATION (Idêntico)
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
// CORREÇÃO: Fallback na sanitização de arquitetura
function sanitizeArchitecture(raw: unknown): Architecture { 
    const data = (raw as any) || {}; 
    const rawManifest = Array.isArray(data.manifest) ? data.manifest : []; 
    
    let manifest = rawManifest.map((m: any) => ({ 
        path: normalizePath(m.path), 
        purpose: ensureString(m.purpose, "Code"), 
        criticality: sanitizeCriticality(m.criticality) 
    })).filter((m: any) => m.path !== "unknown.file");

    return { 
        stack: ensureString(data.stack, "Node.js + TypeScript"), 
        diagram: data.diagram, 
        manifest 
    }; 
}
function sanitizeFileContent(raw: unknown, path: string): FileContent { const data = (raw as any) || {}; return { path: normalizePath(data.path || path), code: ensureString(data.code, "// Error"), explanation: data.explanation }; }
function sanitizeUserStories(raw: unknown): UserStoriesResult { const data = (raw as any) || {}; const stories = Array.isArray(data.userStories) ? data.userStories : []; return { userStories: stories.map((s: any, i: number) => sanitizeUserStory(s, i)) }; }

type SanitizeFunction<T> = (raw: unknown) => T;

// =============================================================================
// AGENT CLASS - v3.3 (Architecture Enforcement)
// =============================================================================
export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(userPrompt: string, budgetContext: unknown): Promise<unknown> {
    console.log("🚀 [Agent v3.3] Iniciando Pipeline (Architecture Enforcement)");

    try {
      const analysis = await this.runAnalysisStep(userPrompt);
      const productPlan = await this.runProductStep(userPrompt, analysis);
      
      // PASSO CRÍTICO: Arquitetura
      console.log("🏗️ [3/4] Desenhando Arquitetura...");
      let architecture = await this.runArchitectureStep(userPrompt, productPlan);

      // FALLBACK DE SEGURANÇA: Se a IA retornar 0 arquivos, injetamos um scaffold básico
      if (architecture.manifest.length === 0) {
          console.warn("⚠️ [Agent] Alerta: IA retornou 0 arquivos. Injetando Scaffold de Emergência.");
          architecture.manifest = [
              { path: "README.md", purpose: "Documentação do projeto", criticality: "Config" },
              { path: "package.json", purpose: "Gerenciamento de dependências", criticality: "Config" },
              { path: "src/index.ts", purpose: "Ponto de entrada da aplicação", criticality: "Core" },
              { path: ".gitignore", purpose: "Configuração do Git", criticality: "Config" }
          ];
          architecture.stack = "Node.js (Fallback)";
      }

      const manifest = architecture.manifest;
      console.log(`📋 [Blueprint] ${manifest.length} arquivos planejados.`);

      const criticalFiles = manifest
        .sort((a, b) => (a.criticality === "Config" ? -1 : 1))
        .slice(0, 6);

      const stubFiles = manifest.filter(m => !criticalFiles.includes(m));

      console.log(`🏭 [4/4] Gerando ${criticalFiles.length} arquivos reais e ${stubFiles.length} stubs...`);

      const generatedFiles = await Promise.all(
        criticalFiles.map(fileSpec =>
          this.generateFileContent(fileSpec, architecture.stack, userPrompt)
        )
      );

      const stubs = stubFiles.map(fileSpec => ({
        path: fileSpec.path,
        code: `// ARQUIVO: ${fileSpec.path}\n// TODO: Implementação pendente.`,
        language: this.detectLanguage(fileSpec.path)
      }));

      const allFiles = [...generatedFiles, ...stubs];
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);

      // MAPEAMENTO DE CONTRATO (Backend -> Frontend)
      // Garante que o frontend receba exatamente o que espera na v0.15
      const mappedHUs = detailedHUs.map(hu => ({
        id: hu.id,
        title: hu.title,
        priority: hu.priority,
        role: hu.role,
        action: hu.action,
        benefit: hu.benefit,
        acceptanceCriteria: hu.acceptanceCriteria,
        functionalReqs: hu.functionalRequirements, // Mapeia para prop do frontend
        security: hu.securityRequirements,         // Mapeia para prop do frontend
        context: hu.businessContext,               // Mapeia para prop do frontend
        nonFunctionalReqs: [] as string[],
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
        fenix: { notes: "Generated via v3.3 Architecture Enforced Agent" }
      };

    } catch (error: unknown) {
      console.error("❌ Erro fatal no Agente:", error);
      throw error;
    }
  }

  // --- STEPS ---

  private async runAnalysisStep(prompt: string) {
    return this.callLLM(`Analista Sênior. Responda JSON. { "summary": "string", "complexity": "Baixa"|"Média"|"Alta"|"Crítica", "assumptions": ["string"] }`, prompt, sanitizeAnalysis, AnalysisSchema, "Analysis");
  }
  private async runProductStep(prompt: string, analysis: any) {
    return this.callLLM(`Product Owner. Responda JSON. { "epics": [{ "title": "string", "context": "string", "requirements": ["string"] }] }`, prompt, sanitizeProductPlan, ProductPlanSchema, "Product");
  }
  
  private async runArchitectureStep(prompt: string, productPlan: any) {
    // Prompt Simplificado para Focar na Lista de Arquivos
    const systemPrompt = `Arquiteto de Software Sênior.
Sua ÚNICA tarefa é definir a estrutura de pastas e arquivos para o projeto.
Stack: Node.js + TypeScript + React (Padrão).

OBRIGATÓRIO: Retorne um JSON com pelo menos 10 arquivos essenciais.
Inclua: package.json, tsconfig.json, src/index.ts, src/App.tsx, README.md.

Formato JSON:
{
  "stack": "Node.js + React",
  "manifest": [
    { "path": "package.json", "purpose": "Deps", "criticality": "Config" },
    { "path": "src/server.ts", "purpose": "API", "criticality": "Core" }
  ]
}`;
    // Removemos o prompt do usuário daqui para evitar que o LLM se distraia com regras de negócio
    // Passamos apenas o contexto dos épicos
    const context = productPlan.epics.map((e:any)=>e.title).join(", ");
    return this.callLLM(systemPrompt, `Gere a arquitetura para: ${context}`, sanitizeArchitecture, ArchitectureSchema, "Architecture");
  }

  private async generateFileContent(spec: any, stack: string, prompt: string) {
    const parsed = await this.callLLM(`Dev. Codifique ${spec.path}. JSON: {path, code, explanation}`, "Code.", (r)=>sanitizeFileContent(r, spec.path), FileContentSchema, `File:${spec.path}`);
    return { path: parsed.path, content: parsed.code, language: this.detectLanguage(parsed.path) };
  }
  
  private async expandEpicsToStories(epics: any[]) {
    const ctx = epics.slice(0,3).map((e:any)=>e.title).join(",");
    const res = await this.callLLM(`PO Técnico. HUs Detalhadas. JSON: {userStories:[{id, title, priority, role, action, benefit, acceptanceCriteria[], functionalRequirements[], securityRequirements[], businessContext}]}`, `Context: ${ctx}`, sanitizeUserStories, UserStoriesSchema, "HUs");
    return res.userStories;
  }

  private async callLLM<T>(sys: string, usr: string, san: SanitizeFunction<T>, sch: z.ZodType<T>, ctx: string): Promise<T> {
    try {
      const c = await this.client.chat.completions.create({ model: "gpt-4o", messages: [{role:"system",content:sys},{role:"user",content:usr}], response_format:{type:"json_object"}, temperature:0.2 });
      return sch.parse(san(JSON.parse(c.choices[0].message.content||"{}")));
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
log_ok "Agent v3.3 (Architecture Enforced) aplicado."

# Recompilação
log_info "Recompilando..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b || { echo "Erro build agent"; exit 1; }
log_ok "Compilado."

# Restart
log_info "Reiniciando servidor..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Pronto. Reinicie com 'pnpm --filter @mini-ide/server start'."
