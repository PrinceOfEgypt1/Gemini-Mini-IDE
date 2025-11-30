#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Iniciando blindagem do Analysis Agent (Fase 17.4 - Robustez Extrema)..."

# Backup de segurança
cp "$AGENT_FILE" "${AGENT_FILE}.bak_422"

cat > "$AGENT_FILE" << 'EOF'
import { OpenAI } from "openai";
import { z } from "zod";

/**
 * =============================================================================
 * TIPOS & INTERFACES
 * =============================================================================
 */

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

/**
 * =============================================================================
 * SCHEMAS ZOD (Validadores Runtime)
 * =============================================================================
 */

const AnalysisSchema = z.object({ 
  summary: z.string(), 
  complexity: z.enum(["Baixa", "Média", "Alta", "Crítica"]), 
  assumptions: z.array(z.string()) 
});

const ProductPlanSchema = z.object({ 
  epics: z.array(z.object({ 
    title: z.string(), 
    context: z.string(), 
    requirements: z.array(z.string()) 
  })) 
});

const ArchitectureSchema = z.object({ 
  stack: z.string(), 
  diagram: z.string().optional(), 
  manifest: z.array(z.object({ 
    path: z.string(), 
    purpose: z.string(), 
    criticality: z.enum(["Core", "Support", "Config"]) 
  })) 
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

/**
 * =============================================================================
 * HELPER FUNCTIONS (Sanitization & Robustness)
 * =============================================================================
 */

// Remove markdown wrappers (```json ... ```) que o LLM adora colocar
function cleanJsonString(input: string): string {
  // Remove code blocks markdown
  let cleaned = input.replace(/^```(?:json)?/i, "").replace(/```$/, "");
  return cleaned.trim();
}

// Garante string válida, convertendo objetos se necessário
function ensureString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && value !== null) {
    try { return JSON.stringify(value); } catch { return fallback; }
  }
  return fallback;
}

function ensureStringArray(value: unknown, defaultText?: string): string[] { 
  if (!Array.isArray(value)) return defaultText ? [defaultText] : []; 
  const result = value.filter((item): item is string => typeof item === "string").map(s => s.trim()).filter(s => s.length > 0); 
  if (result.length === 0 && defaultText) return [defaultText]; 
  return result; 
}

function normalizePath(rawPath: unknown): string { 
  if (typeof rawPath !== "string") return "unknown.file"; 
  return rawPath.trim().replace(/^(\.\/|\/)+/, ""); 
}

// Mapas de normalização
const PRIORITY_MAP: Record<string, Priority> = { "p0": "P0", "critical": "P0", "high": "P1", "medium": "P2", "low": "P3" };
const COMPLEXITY_MAP: Record<string, Complexity> = { "baixa": "Baixa", "low": "Baixa", "medium": "Média", "high": "Alta", "critical": "Crítica" };
const CRITICALITY_MAP: Record<string, Criticality> = { "core": "Core", "main": "Core", "config": "Config", "utils": "Support" };

function sanitizePriority(value: unknown): Priority {
  if (typeof value !== "string") return "P2";
  const v = value.trim().toLowerCase();
  if (PRIORITY_MAP[v]) return PRIORITY_MAP[v];
  if (v.includes("p0") || v.includes("crit")) return "P0";
  if (v.includes("p1") || v.includes("high")) return "P1";
  if (v.includes("p3") || v.includes("low")) return "P3";
  return "P2";
}

// Sanitizers específicos por tipo
function sanitizeAnalysis(raw: unknown): Analysis {
  const data = (raw as any) || {};
  return {
    summary: ensureString(data.summary, "Análise indisponível"),
    complexity: COMPLEXITY_MAP[String(data.complexity).toLowerCase()] || "Média",
    assumptions: ensureStringArray(data.assumptions)
  };
}

function sanitizeProductPlan(raw: unknown): ProductPlan {
  const data = (raw as any) || {};
  const rawEpics = Array.isArray(data.epics) ? data.epics : [];
  return {
    epics: rawEpics.map((e: any, i: number) => ({
      title: ensureString(e.title, `Épico ${i + 1}`),
      context: ensureString(e.context, ""),
      requirements: ensureStringArray(e.requirements)
    }))
  };
}

function sanitizeArchitecture(raw: unknown): Architecture {
  const data = (raw as any) || {};
  const rawManifest = Array.isArray(data.manifest) ? data.manifest : [];
  return {
    stack: ensureString(data.stack, "Node.js + TypeScript"),
    diagram: typeof data.diagram === "string" ? data.diagram : undefined,
    manifest: rawManifest.map((m: any) => ({
      path: normalizePath(m.path),
      purpose: ensureString(m.purpose, "Code"),
      criticality: CRITICALITY_MAP[String(m.criticality).toLowerCase()] || "Core"
    })).filter((m: any) => m.path !== "unknown.file")
  };
}

function sanitizeUserStories(raw: unknown): UserStoriesResult {
  const data = (raw as any) || {};
  const stories = Array.isArray(data.userStories) ? data.userStories : [];
  return {
    userStories: stories.map((s: any, i: number) => ({
      id: ensureString(s.id, `HU-${String(i + 1).padStart(3, "0")}`),
      title: ensureString(s.title, `História ${i + 1}`),
      priority: sanitizePriority(s.priority),
      role: ensureString(s.role, "usuário"),
      action: ensureString(s.action, "ação"),
      benefit: ensureString(s.benefit, "benefício"),
      acceptanceCriteria: ensureStringArray(s.acceptanceCriteria, "Critério pendente"),
      functionalRequirements: ensureStringArray(s.functionalRequirements, "Req funcional pendente"),
      securityRequirements: ensureStringArray(s.securityRequirements, "Req segurança pendente"),
      businessContext: ensureString(s.businessContext, "Contexto de negócio")
    }))
  };
}

/**
 * Sanitiza o conteúdo do arquivo para evitar ZodErrors.
 * Trata o caso onde 'explanation' vem como objeto.
 */
function sanitizeFileContent(raw: unknown, expectedPath: string): FileContent {
  const data = (raw as any) || {};
  
  // Tratamento especial para 'explanation' que pode vir sujo
  let explanation: string | undefined = undefined;
  if (data.explanation) {
    if (typeof data.explanation === "string") explanation = data.explanation;
    else if (typeof data.explanation === "object") explanation = JSON.stringify(data.explanation);
    else explanation = String(data.explanation);
  }

  return {
    path: normalizePath(data.path || expectedPath),
    code: ensureString(data.code, `// Erro: Conteúdo não gerado para ${expectedPath}`),
    explanation
  };
}

type SanitizeFunction<T> = (raw: unknown) => T;

/**
 * =============================================================================
 * AGENT CLASS - v3.4 (Deep Robustness)
 * =============================================================================
 */
export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(userPrompt: string, budgetContext: unknown): Promise<unknown> {
    console.log("🚀 [Agent v3.4] Iniciando Pipeline (Deep Robustness)");

    try {
      const analysis = await this.runAnalysisStep(userPrompt);
      const productPlan = await this.runProductStep(userPrompt, analysis);
      
      console.log("🏗️ [3/4] Desenhando Arquitetura...");
      let architecture = await this.runArchitectureStep(userPrompt, productPlan);

      // Fallback para 0 arquivos
      if (architecture.manifest.length === 0) {
          console.warn("⚠️ [Agent] Alerta: IA retornou 0 arquivos. Injetando Scaffold.");
          architecture.manifest = [
              { path: "README.md", purpose: "Docs", criticality: "Config" },
              { path: "package.json", purpose: "Deps", criticality: "Config" },
              { path: "src/index.ts", purpose: "Entry", criticality: "Core" }
          ];
      }

      const manifest = architecture.manifest;
      console.log(`📋 [Blueprint] ${manifest.length} arquivos planejados.`);

      // Separação e Limite
      const criticalFiles = manifest
        .sort((a, b) => (a.criticality === "Config" ? -1 : 1))
        .slice(0, 6);

      const stubFiles = manifest.filter(m => !criticalFiles.includes(m));

      console.log(`🏭 [4/4] Gerando ${criticalFiles.length} arquivos reais...`);

      const generatedFiles = await Promise.all(
        criticalFiles.map(fileSpec =>
          this.generateFileContent(fileSpec, architecture.stack, userPrompt)
        )
      );

      const stubs = stubFiles.map(fileSpec => ({
        path: fileSpec.path,
        code: `// ARQUIVO: ${fileSpec.path}\n// TODO: Implementação pendente.\n// Gerado pelo Mini-IDE (Stub).`,
        language: this.detectLanguage(fileSpec.path)
      }));

      const allFiles = [...generatedFiles, ...stubs];
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);

      // Mapeamento Final para Frontend
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
        fenix: { notes: "Generated via v3.4 Deep Robustness Agent" }
      };

    } catch (error: unknown) {
      console.error("❌ Erro fatal no Agente:", error);
      throw error;
    }
  }

  // --- STEPS ---

  private async runAnalysisStep(prompt: string) {
    return this.callLLM(`Analista Sênior. JSON: {summary, complexity, assumptions[]}`, prompt, sanitizeAnalysis, AnalysisSchema, "Analysis");
  }
  private async runProductStep(prompt: string, analysis: any) {
    return this.callLLM(`Product Owner. JSON: {epics:[{title, context, requirements[]}]}`, prompt, sanitizeProductPlan, ProductPlanSchema, "Product");
  }
  private async runArchitectureStep(prompt: string, productPlan: any) {
    const context = productPlan.epics.map((e:any)=>e.title).join(", ");
    return this.callLLM(
      `Arquiteto. JSON: {stack, manifest:[{path, purpose, criticality}]}. Use paths relativos limpos.`, 
      `Arquitetura para: ${context}`, 
      sanitizeArchitecture, ArchitectureSchema, "Architecture"
    );
  }

  /**
   * GERAÇÃO DE ARQUIVO BLINDADA
   * Usa try/catch interno para garantir que um arquivo ruim não quebre o processo todo.
   */
  private async generateFileContent(spec: ManifestItem, stack: string, prompt: string) {
    try {
        // Prompt otimizado para evitar verbosidade excessiva em configs
        let instruction = "Gere o código completo.";
        if (spec.criticality === "Config") instruction = "Gere apenas o essencial. Seja conciso.";

        const systemPrompt = `Dev Sênior. Implemente ${spec.path}. Stack: ${stack}. ${instruction}
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
        console.error(`⚠️ Falha ao gerar arquivo ${spec.path}:`, error.message);
        // Fallback File Return - O Segredo para a UI não ficar branca
        return {
            path: normalizePath(spec.path),
            content: `// ERRO NA GERAÇÃO DO ARQUIVO\n// O Agente falhou ao gerar este conteúdo.\n// Detalhe: ${error.message}`,
            language: this.detectLanguage(spec.path)
        };
    }
  }
  
  private async expandEpicsToStories(epics: Epic[]) {
    const ctx = epics.slice(0,3).map(e=>e.title).join(",");
    const res = await this.callLLM(`PO Técnico. Detalhe HUs. JSON: {userStories:[{id, title, priority, role, action, benefit, acceptanceCriteria[], functionalRequirements[], securityRequirements[], businessContext}]}`, `Context: ${ctx}`, sanitizeUserStories, UserStoriesSchema, "HUs");
    return res.userStories;
  }

  private async callLLM<T>(sys: string, usr: string, san: SanitizeFunction<T>, sch: z.ZodType<T>, ctx: string): Promise<T> {
    try {
      const c = await this.client.chat.completions.create({ model: "gpt-4o", messages: [{role:"system",content:sys},{role:"user",content:usr}], response_format:{type:"json_object"}, temperature:0.2 });
      
      const rawContent = c.choices[0].message.content || "{}";
      let rawData: unknown;
      
      try {
        // Limpeza de Markdown antes do Parse
        const cleanContent = cleanJsonString(rawContent);
        rawData = JSON.parse(cleanContent);
      } catch (e) {
        console.warn(`⚠️ [${ctx}] JSON Parse Error. Tentando recuperação básica...`);
        rawData = {}; // Em v3.5 poderíamos usar um parser mais agressivo (jsonrepair)
      }
      
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

log_ok "Agent v3.4 (Deep Robustness) aplicado."

# Recompilação
log_info "Recompilando pacotes..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b || { echo "Erro build agent"; exit 1; }
cd ../server
../../node_modules/.bin/tsc -b || { echo "Erro build server"; exit 1; }
cd ../..

# Restart
log_info "Reiniciando servidor..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Correções aplicadas com sucesso. Reinicie o servidor."
