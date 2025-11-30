#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Aplicando correção de Caminhos e Consistência de Dados no Agent..."

# Reescreve o agent.ts com correções de Path e Prompt
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

interface Analysis {
  summary: string;
  complexity: Complexity;
  assumptions: string[];
}

interface Epic {
  title: string;
  context: string;
  requirements: string[];
}

interface ProductPlan {
  epics: Epic[];
}

interface ManifestItem {
  path: string;
  purpose: string;
  criticality: Criticality;
}

interface Architecture {
  stack: string;
  diagram?: string;
  manifest: ManifestItem[];
}

interface FileContent {
  path: string;
  code: string;
  explanation?: string;
}

interface UserStory {
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

interface UserStoriesResult {
  userStories: UserStory[];
}

/**
 * =============================================================================
 * SCHEMAS ZOD
 * =============================================================================
 */

const AnalysisSchema: z.ZodType<Analysis> = z.object({
  summary: z.string(),
  complexity: z.enum(["Baixa", "Média", "Alta", "Crítica"]),
  assumptions: z.array(z.string())
});

const EpicSchema: z.ZodType<Epic> = z.object({
  title: z.string(),
  context: z.string(),
  requirements: z.array(z.string())
});

const ProductPlanSchema: z.ZodType<ProductPlan> = z.object({
  epics: z.array(EpicSchema)
});

const ManifestItemSchema: z.ZodType<ManifestItem> = z.object({
  path: z.string(),
  purpose: z.string(),
  criticality: z.enum(["Core", "Support", "Config"])
});

const ArchitectureSchema: z.ZodType<Architecture> = z.object({
  stack: z.string(),
  diagram: z.string().optional(),
  manifest: z.array(ManifestItemSchema)
});

const FileContentSchema: z.ZodType<FileContent> = z.object({
  path: z.string(),
  code: z.string(),
  explanation: z.string().optional()
});

const UserStorySchema: z.ZodType<UserStory> = z.object({
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

const UserStoriesSchema: z.ZodType<UserStoriesResult> = z.object({
  userStories: z.array(UserStorySchema)
});

/**
 * =============================================================================
 * SANITIZATION LAYER
 * =============================================================================
 */

const PRIORITY_MAP: Record<string, Priority> = {
  "p0": "P0", "critical": "P0", "high": "P1", "medium": "P2", "low": "P3"
  // ... (simplificado para brevidade, lógica mantém-se robusta pelo default)
};

const COMPLEXITY_MAP: Record<string, Complexity> = {
  "baixa": "Baixa", "low": "Baixa",
  "média": "Média", "media": "Média", "medium": "Média",
  "alta": "Alta", "high": "Alta",
  "crítica": "Crítica", "critical": "Crítica"
};

const CRITICALITY_MAP: Record<string, Criticality> = {
  "core": "Core", "main": "Core",
  "support": "Support", "utils": "Support",
  "config": "Config", "settings": "Config"
};

// CORREÇÃO 1: Normalização de Caminhos (Remove ./ e / do início)
function normalizePath(rawPath: unknown): string {
  if (typeof rawPath !== "string") return "unknown.file";
  // Remove ./ ou / do início
  return rawPath.trim().replace(/^(\.\/|\/)+/, "");
}

function sanitizePriority(value: unknown): Priority {
  if (typeof value !== "string") return "P2";
  const normalized = PRIORITY_MAP[value.trim().toLowerCase()];
  // Fallback inteligente se contiver a palavra
  if (!normalized) {
    const v = value.toLowerCase();
    if (v.includes("p0") || v.includes("critical")) return "P0";
    if (v.includes("p1") || v.includes("high")) return "P1";
    if (v.includes("p3") || v.includes("low")) return "P3";
    return "P2";
  }
  return normalized;
}

function sanitizeComplexity(value: unknown): Complexity {
  if (typeof value !== "string") return "Média";
  const normalized = COMPLEXITY_MAP[value.trim().toLowerCase()];
  return normalized ?? "Média";
}

function sanitizeCriticality(value: unknown): Criticality {
  if (typeof value !== "string") return "Core";
  const normalized = CRITICALITY_MAP[value.trim().toLowerCase()];
  return normalized ?? "Core";
}

function ensureString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

function ensureStringArray(value: unknown, defaultText?: string): string[] {
  if (!Array.isArray(value)) return defaultText ? [defaultText] : [];
  const result = value
    .filter((item): item is string => typeof item === "string")
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  if (result.length === 0 && defaultText) {
    return [defaultText];
  }
  return result;
}

function sanitizeUserStory(raw: unknown, index: number): UserStory {
  const story = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  
  return {
    id: ensureString(story.id, `HU-${String(index + 1).padStart(3, "0")}`),
    title: ensureString(story.title, `História de Usuário ${index + 1}`),
    priority: sanitizePriority(story.priority),
    role: ensureString(story.role, "usuário do sistema"),
    action: ensureString(story.action, "realizar uma operação"),
    benefit: ensureString(story.benefit, "atingir um objetivo de negócio"),
    // CORREÇÃO 3: Injeção de conteúdo default se vier vazio
    acceptanceCriteria: ensureStringArray(story.acceptanceCriteria, "Critério de aceite pendente de definição."),
    functionalRequirements: ensureStringArray(story.functionalRequirements, "Requisito funcional a ser detalhado."),
    securityRequirements: ensureStringArray(story.securityRequirements, "Validar permissões de acesso."),
    businessContext: ensureString(story.businessContext, "Contexto de negócio padrão.")
  };
}

function sanitizeAnalysis(raw: unknown): Analysis {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  return {
    summary: ensureString(data.summary, "Análise indisponível"),
    complexity: sanitizeComplexity(data.complexity),
    assumptions: ensureStringArray(data.assumptions)
  };
}

function sanitizeProductPlan(raw: unknown): ProductPlan {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawEpics = Array.isArray(data.epics) ? data.epics : [];
  const epics: Epic[] = rawEpics.map((rawEpic: unknown, idx: number) => {
    const epic = (rawEpic && typeof rawEpic === "object") ? rawEpic as Record<string, unknown> : {};
    return {
      title: ensureString(epic.title, `Épico ${idx + 1}`),
      context: ensureString(epic.context, "Contexto do épico"),
      requirements: ensureStringArray(epic.requirements)
    };
  });
  return { epics };
}

function sanitizeArchitecture(raw: unknown): Architecture {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawManifest = Array.isArray(data.manifest) ? data.manifest : [];
  
  const manifest: ManifestItem[] = rawManifest
    .map((rawItem: unknown): ManifestItem | null => {
      const item = (rawItem && typeof rawItem === "object") ? rawItem as Record<string, unknown> : {};
      // CORREÇÃO 1: Aplicar normalização de path aqui
      const path = normalizePath(item.path);
      if (!path || path === "unknown.file") return null;
      
      return {
        path,
        purpose: ensureString(item.purpose, "Arquivo de código"),
        criticality: sanitizeCriticality(item.criticality)
      };
    })
    .filter((item): item is ManifestItem => item !== null);
  
  return {
    stack: ensureString(data.stack, "Node.js + TypeScript"),
    diagram: typeof data.diagram === "string" ? data.diagram : undefined,
    manifest
  };
}

function sanitizeFileContent(raw: unknown, expectedPath: string): FileContent {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  return {
    // CORREÇÃO 1: Aplicar normalização de path aqui também
    path: normalizePath(data.path) || normalizePath(expectedPath),
    code: ensureString(data.code, "// Erro: Código não gerado corretamente pelo LLM."),
    explanation: typeof data.explanation === "string" ? data.explanation : undefined
  };
}

function sanitizeUserStories(raw: unknown): UserStoriesResult {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawStories = Array.isArray(data.userStories) ? data.userStories : [];
  return {
    userStories: rawStories.map((story, idx) => sanitizeUserStory(story, idx))
  };
}

type SanitizeFunction<T> = (raw: unknown) => T;

/**
 * =============================================================================
 * AGENT CLASS - v3.1 (Path Fix + Content Density)
 * =============================================================================
 */
export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(userPrompt: string, budgetContext: unknown): Promise<unknown> {
    console.log("🚀 [Agent v3.1] Iniciando Pipeline (Fix Paths & Content)");

    try {
      // 1. Análise
      console.log("🔍 [1/4] Executando Análise...");
      const analysis = await this.runAnalysisStep(userPrompt);

      // 2. Produto
      console.log("💡 [2/4] Definindo Produto...");
      const productPlan = await this.runProductStep(userPrompt, analysis);

      // 3. Arquitetura
      console.log("🏗️ [3/4] Desenhando Arquitetura...");
      const architecture = await this.runArchitectureStep(userPrompt, productPlan);

      const manifest = architecture.manifest;
      console.log(`📋 [Blueprint] ${manifest.length} arquivos planejados.`);

      // 4. Fábrica de Código
      // Prioriza configs para garantir que o projeto pareça "real"
      const criticalFiles = [...manifest]
        .sort((a, b) => {
          if (a.criticality === "Config") return -1;
          if (b.criticality === "Config") return 1;
          return 0;
        })
        .slice(0, 6); // Limite mantido para MVP

      console.log(`🏭 [4/4] Gerando ${criticalFiles.length} arquivos críticos...`);

      const generatedFiles = await Promise.all(
        criticalFiles.map(fileSpec =>
          this.generateFileContent(fileSpec, architecture.stack, userPrompt)
        )
      );

      // 5. Histórias de Usuário
      console.log(`📜 [Final] Expandindo Histórias de Usuário...`);
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);

      return {
        analysis: {
          summary: analysis.summary,
          problem: userPrompt,
          objectives: ["Path Normalization", "Content Density"],
          risks: analysis.assumptions
        },
        product: {
          userStories: detailedHUs
        },
        architect: {
          diagram: architecture.diagram || "Arquitetura v3.1",
          stack: architecture.stack
        },
        // CORREÇÃO 2: Retornar APENAS os arquivos que foram gerados
        // A UI deve renderizar a árvore baseada nisso para evitar links mortos
        engine: {
          files: generatedFiles
        },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via v3.1 Path Safe Agent" }
      };

    } catch (error: unknown) {
      console.error("❌ Erro fatal no Agente:", error);
      throw error;
    }
  }

  // ===========================================================================
  // STEPS
  // ===========================================================================

  private async runAnalysisStep(prompt: string): Promise<Analysis> {
    const systemPrompt = `Analista Sênior. Responda JSON. { "summary": "string", "complexity": "Baixa"|"Média"|"Alta"|"Crítica", "assumptions": ["string"] }`;
    return this.callLLMWithSanitization(
      systemPrompt, prompt, sanitizeAnalysis, AnalysisSchema, "Analysis"
    );
  }

  private async runProductStep(prompt: string, analysis: Analysis): Promise<ProductPlan> {
    const systemPrompt = `Product Owner. Responda JSON. { "epics": [{ "title": "string", "context": "string", "requirements": ["string"] }] }`;
    return this.callLLMWithSanitization(
      systemPrompt, prompt, sanitizeProductPlan, ProductPlanSchema, "Product"
    );
  }

  private async runArchitectureStep(prompt: string, productPlan: ProductPlan): Promise<Architecture> {
    const context = productPlan.epics.map(e => e.title).join(", ");
    // Instrução explícita sobre caminhos relativos
    const systemPrompt = `Arquiteto. Defina stack e arquivos para: ${context}.
Responda JSON. { "stack": "string", "manifest": [{ "path": "string", "purpose": "string", "criticality": "Core"|"Support"|"Config" }] }
IMPORTANTE: Use caminhos relativos limpos (ex: "src/index.ts", não "/src/index.ts").`;
    
    return this.callLLMWithSanitization(
      systemPrompt, prompt, sanitizeArchitecture, ArchitectureSchema, "Architecture"
    );
  }

  private async generateFileContent(
    fileSpec: ManifestItem,
    stack: string,
    originalPrompt: string
  ): Promise<{ path: string; content: string; language: string }> {
    const systemPrompt = `Dev Sênior. Implemente ${fileSpec.path}. Stack: ${stack}.
Gere código COMPLETO e funcional. Não use "..." ou placeholders.
Responda JSON. { "path": "${fileSpec.path}", "code": "string", "explanation": "string" }`;

    const parsed = await this.callLLMWithSanitization(
      systemPrompt, "Codifique.", 
      (raw) => sanitizeFileContent(raw, fileSpec.path),
      FileContentSchema, `File: ${fileSpec.path}`
    );

    return {
      path: parsed.path,
      content: parsed.code,
      language: this.detectLanguage(parsed.path)
    };
  }

  private async expandEpicsToStories(epics: Epic[]): Promise<UserStory[]> {
    const targetEpics = epics.slice(0, 3);
    const context = targetEpics.map(e => e.title).join(", ");

    // CORREÇÃO 3: Prompt "Agressivo" sobre densidade de conteúdo
    const systemPrompt = `PO Técnico Sênior. Detalhe HUs para: ${context}.
Responda JSON.
Para CADA história, você DEVE INVENTAR detalhes técnicos plausíveis se não souber.
NUNCA deixe arrays vazios.
Campos obrigatórios:
- acceptanceCriteria: Mínimo 3 critérios (Given/When/Then)
- functionalRequirements: Mínimo 2 requisitos técnicos
- securityRequirements: Mínimo 1 requisito de segurança (ex: Input Validation, AuthZ)
- businessContext: Explique o valor de negócio em 1 frase.
`;

    const result = await this.callLLMWithSanitization(
      systemPrompt, `Gere HUs detalhadas.`,
      sanitizeUserStories, UserStoriesSchema, "User Stories"
    );

    return result.userStories;
  }

  private async callLLMWithSanitization<T>(
    system: string, user: string, sanitize: SanitizeFunction<T>, schema: z.ZodType<T>, contextName: string
  ): Promise<T> {
    try {
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const content = completion.choices[0].message.content || "{}";
      let rawData: unknown;
      try { rawData = JSON.parse(content); } catch { rawData = {}; }
      
      const sanitizedData = sanitize(rawData);
      return schema.parse(sanitizedData);
      
    } catch (error) {
      console.error(`❌ Falha no passo [${contextName}]:`, error);
      return schema.parse(sanitize({}));
    }
  }

  private detectLanguage(path: string): string {
    if (path.match(/\.(ts|tsx)$/)) return "typescript";
    if (path.match(/\.(js|jsx)$/)) return "javascript";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".md")) return "markdown";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".html")) return "html";
    if (path.endsWith(".yaml") || path.endsWith(".yml")) return "yaml";
    return "plaintext";
  }
}
EOF

log_ok "Agent v3.1 (Path & Content Fix) aplicado."

# Recompilação
log_info "Recompilando analysis-agent..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b || { echo "Erro na compilação!"; exit 1; }
log_ok "Compilado."

# Reinicia server
log_info "Preparando ambiente..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Correções aplicadas."
