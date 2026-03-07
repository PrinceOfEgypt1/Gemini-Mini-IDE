#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Injetando inteligência contextual na geração de HUs..."

# Reescreve agent.ts com prompt de HUs enriquecido e passagem de contexto total
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

// --- SANITIZATION ---
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
  
  // Melhoria na sanitização: defaults mais genéricos apenas se realmente vazio
  return {
    id: ensureString(story.id, `HU-${String(index + 1).padStart(3, "0")}`),
    title: ensureString(story.title, `História de Usuário ${index + 1}`),
    priority: sanitizePriority(story.priority),
    role: ensureString(story.role, "usuário"),
    action: ensureString(story.action, "realizar ação"),
    benefit: ensureString(story.benefit, "obter valor"),
    // Aqui garantimos arrays, mas deixamos o conteúdo vir da IA se existir
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

export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(userPrompt: string, budgetContext: unknown): Promise<unknown> {
    console.log("🚀 [Agent v4.1] Iniciando Pipeline (Quality + Heavy Duty)");

    try {
      const analysis = await this.runAnalysisStep(userPrompt);
      const productPlan = await this.runProductStep(userPrompt, analysis);
      
      console.log("🏗️ [3/4] Desenhando Arquitetura...");
      const architecture = await this.runArchitectureStep(userPrompt, productPlan);

      const manifest = architecture.manifest;
      console.log(`📋 [Blueprint] ${manifest.length} arquivos planejados.`);

      const batchSize = 5;
      const allFiles: any[] = [];

      console.log(`🏭 [4/4] Iniciando geração de ${manifest.length} arquivos...`);

      for (let i = 0; i < manifest.length; i += batchSize) {
        const batch = manifest.slice(i, i + batchSize);
        const currentCount = i + batch.length;
        
        console.log(`   ⚡ Batch ${Math.floor(i/batchSize) + 1}: Arquivos ${i + 1}-${currentCount}...`);
        
        const batchResults = await Promise.all(
          batch.map(fileSpec =>
            this.generateFileContent(fileSpec, architecture.stack, userPrompt)
          )
        );
        
        allFiles.push(...batchResults);
        
        if (global.gc) { global.gc(); }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // AQUI ESTÁ A MUDANÇA PRINCIPAL: CONTEXTO RICO
      console.log("📜 [Final] Gerando HUs detalhadas com contexto completo...");
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);
      
      const mappedHUs = detailedHUs.map(hu => ({
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
        fenix: { notes: "Generated via v4.1 High Quality Content Agent" }
      };

    } catch (error: unknown) {
      console.error("❌ Erro fatal no Agente:", error);
      throw error;
    }
  }

  // --- STEPS ---

  private async runAnalysisStep(prompt: string) {
    return this.callLLM(
        `Analista Sênior. Responda SEMPRE em PORTUGUÊS DO BRASIL. JSON: {summary, complexity, assumptions[]}`, 
        prompt, sanitizeAnalysis, AnalysisSchema, "Analysis"
    );
  }
  
  private async runProductStep(prompt: string, analysis: any) {
    return this.callLLM(
        `Product Owner. Responda SEMPRE em PORTUGUÊS DO BRASIL. JSON: {epics:[{title, context, requirements[]}]}`, 
        prompt, sanitizeProductPlan, ProductPlanSchema, "Product"
    );
  }
  
  private async runArchitectureStep(prompt: string, productPlan: any) {
    const context = productPlan.epics.map((e:any)=>e.title).join(", ");
    const systemPrompt = `Arquiteto Sênior.
Defina a stack e a lista COMPLETA de arquivos.
Contexto: ${context}.

REGRAS:
1. NÃO ECONOMIZE ARQUIVOS.
2. Inclua src/controllers, src/services, src/models, src/utils, tests/, config/.
3. Use caminhos relativos (ex: "src/index.ts").
Responda JSON: { "stack": "string", "manifest": [{ "path": "string", "purpose": "string", "criticality": "Core"|"Support"|"Config" }] }`;
    
    return this.callLLM(systemPrompt, `Gere a arquitetura.`, sanitizeArchitecture, ArchitectureSchema, "Architecture");
  }

  private async generateFileContent(spec: ManifestItem, stack: string, prompt: string) {
    try {
        const systemPrompt = `Dev Sênior. Implemente ${spec.path}. Stack: ${stack}.
Gere código COMPLETO, profissional e pronto para produção.
Inclua comentários JSDoc em PT-BR.
Responda JSON: { "path": "${spec.path}", "code": "...", "explanation": "..." }`;

        const parsed = await this.callLLM(
            systemPrompt, 
            "Codifique.", 
            (r) => sanitizeFileContent(r, spec.path), 
            FileContentSchema, 
            `File:${spec.path}`
        );
        return { 
            path: parsed.path, 
            content: parsed.code, 
            language: this.detectLanguage(parsed.path) 
        };
    } catch (error: any) {
        console.error(`⚠️ Falha ao gerar ${spec.path}:`, error.message);
        return {
            path: normalizePath(spec.path),
            content: `// ERRO NA GERAÇÃO: ${error.message}`,
            language: this.detectLanguage(spec.path)
        };
    }
  }
  
  private async expandEpicsToStories(epics: any[]) {
    // CORREÇÃO: Passar o objeto completo do épico no contexto, não apenas o título
    // Limitamos a 10 para não estourar o prompt, mas passamos DADOS RICOS
    const targetEpics = epics.slice(0, 10);
    
    const richContext = targetEpics.map((e: any, idx: number) => 
        `ÉPICO ${idx+1}: ${e.title}
         CONTEXTO: ${e.context}
         REQUISITOS BRUTOS: ${e.requirements.join("; ")}`
    ).join("\n----------------\n");

    const systemPrompt = `PO Técnico Sênior. Responda em PORTUGUÊS DO BRASIL.
    
    TAREFA:
    Transforme os épicos fornecidos em Histórias de Usuário detalhadas e específicas para o projeto.
    NÃO GERE TEXTO GENÉRICO (ex: evite "Fazer login", use "Fazer login com JWT e refresh token").
    
    FORMATO DE RESPOSTA (JSON):
    { 
      "userStories": [
        {
          "id": "HU-001", 
          "title": "Título Técnico", 
          "priority": "P0"|"P1"|"P2"|"P3", 
          "role": "ator", 
          "action": "ação", 
          "benefit": "valor", 
          "acceptanceCriteria": ["Critério específico 1", "Critério específico 2"], 
          "functionalRequirements": ["O sistema deve..."], 
          "securityRequirements": ["Validar...", "Encriptar..."], 
          "businessContext": "Explicação do porquê isso é vital."
        }
      ]
    }
    
    IMPORTANTE: Preencha TODOS os campos. Invente detalhes técnicos plausíveis baseados na arquitetura.`;

    const result = await this.callLLM(systemPrompt, `DETALHAR ESTES ÉPICOS:\n${richContext}`, sanitizeUserStories, UserStoriesSchema, "HUs");
    return result.userStories;
  }

  private async callLLM<T>(sys: string, usr: string, san: SanitizeFunction<T>, sch: z.ZodType<T>, ctx: string): Promise<T> {
    try {
      const c = await this.client.chat.completions.create({ 
          model: "gpt-4o", 
          messages: [{role:"system",content:sys},{role:"user",content:usr}], 
          response_format:{type:"json_object"}, 
          temperature: 0.3 // Aumentado levemente para criatividade nas HUs
      });
      
      const rawContent = c.choices[0].message.content || "{}";
      let rawData: unknown;
      try { rawData = JSON.parse(cleanJsonString(rawContent)); } 
      catch { rawData = {}; }
      return sch.parse(san(rawData));
    } catch (e) { 
        console.error(`Error ${ctx}`, e); 
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

log_ok "Agent v4.1 (Content Quality Fix) aplicado."

# Recompilação
log_info "Recompilando..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b
log_ok "Compilado."

# Restart
log_info "Reiniciando servidor..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Pronto. Pode testar novamente."
