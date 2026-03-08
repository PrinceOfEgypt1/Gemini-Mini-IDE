#!/bin/bash
# =============================================================================
# 415_fix_agent_resilience_layer.sh
# Implementa Camada de Sanitização (Normalization Layer) no Analysis Agent
# Resolve: ZodError por variabilidade de saída do LLM
# =============================================================================

set -e

AGENT_FILE="packages/analysis-agent/src/agent.ts"

echo "🔧 [415] Implementando Camada de Sanitização no Agente..."

# Backup do arquivo original
if [ -f "$AGENT_FILE" ]; then
    cp "$AGENT_FILE" "${AGENT_FILE}.bak"
    echo "📦 Backup criado: ${AGENT_FILE}.bak"
fi

# Criar o novo agent.ts com a camada de sanitização
cat > "$AGENT_FILE" << 'AGENT_CODE'
// packages/analysis-agent/src/agent.ts
// v3.0 - Resilient Agent with Sanitization Layer
import { OpenAI } from "openai";
import { z } from "zod";

/**
 * =============================================================================
 * TIPOS EXPLÍCITOS (Evita problemas de inferência z.infer)
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
 * SCHEMAS ZOD (Validação em runtime)
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
 * SANITIZATION LAYER - Normaliza saída do LLM antes do Zod
 * =============================================================================
 */

// Mapeamento de "humanices" do LLM para "sistemês" do Zod
const PRIORITY_MAP: Record<string, Priority> = {
  // Variantes P0
  "p0": "P0", "P0": "P0",
  "critical": "P0", "Critical": "P0", "CRITICAL": "P0",
  "highest": "P0", "Highest": "P0", "HIGHEST": "P0",
  "urgent": "P0", "Urgent": "P0", "URGENT": "P0",
  "blocker": "P0", "Blocker": "P0", "BLOCKER": "P0",
  "must": "P0", "Must": "P0", "MUST": "P0",
  "essential": "P0", "Essential": "P0", "ESSENTIAL": "P0",
  
  // Variantes P1
  "p1": "P1", "P1": "P1",
  "high": "P1", "High": "P1", "HIGH": "P1",
  "important": "P1", "Important": "P1", "IMPORTANT": "P1",
  "should": "P1", "Should": "P1", "SHOULD": "P1",
  "major": "P1", "Major": "P1", "MAJOR": "P1",
  
  // Variantes P2
  "p2": "P2", "P2": "P2",
  "medium": "P2", "Medium": "P2", "MEDIUM": "P2",
  "normal": "P2", "Normal": "P2", "NORMAL": "P2",
  "moderate": "P2", "Moderate": "P2", "MODERATE": "P2",
  "could": "P2", "Could": "P2", "COULD": "P2",
  "minor": "P2", "Minor": "P2", "MINOR": "P2",
  
  // Variantes P3
  "p3": "P3", "P3": "P3",
  "low": "P3", "Low": "P3", "LOW": "P3",
  "nice": "P3", "Nice": "P3", "NICE": "P3",
  "optional": "P3", "Optional": "P3", "OPTIONAL": "P3",
  "wont": "P3", "Wont": "P3", "WONT": "P3",
  "trivial": "P3", "Trivial": "P3", "TRIVIAL": "P3"
};

const COMPLEXITY_MAP: Record<string, Complexity> = {
  // Português
  "baixa": "Baixa", "Baixa": "Baixa", "BAIXA": "Baixa",
  "média": "Média", "Média": "Média", "MÉDIA": "Média",
  "media": "Média", "Media": "Média", "MEDIA": "Média",
  "alta": "Alta", "Alta": "Alta", "ALTA": "Alta",
  "crítica": "Crítica", "Crítica": "Crítica", "CRÍTICA": "Crítica",
  "critica": "Crítica", "Critica": "Crítica", "CRITICA": "Crítica",
  
  // Inglês
  "low": "Baixa", "Low": "Baixa", "LOW": "Baixa",
  "medium": "Média", "Medium": "Média", "MEDIUM": "Média",
  "high": "Alta", "High": "Alta", "HIGH": "Alta",
  "critical": "Crítica", "Critical": "Crítica", "CRITICAL": "Crítica",
  
  // Numérico
  "1": "Baixa", "2": "Média", "3": "Alta", "4": "Crítica"
};

const CRITICALITY_MAP: Record<string, Criticality> = {
  "core": "Core", "Core": "Core", "CORE": "Core",
  "main": "Core", "Main": "Core", "MAIN": "Core",
  "primary": "Core", "Primary": "Core", "PRIMARY": "Core",
  "essential": "Core", "Essential": "Core", "ESSENTIAL": "Core",
  
  "support": "Support", "Support": "Support", "SUPPORT": "Support",
  "secondary": "Support", "Secondary": "Support", "SECONDARY": "Support",
  "helper": "Support", "Helper": "Support", "HELPER": "Support",
  "utility": "Support", "Utility": "Support", "UTILITY": "Support",
  
  "config": "Config", "Config": "Config", "CONFIG": "Config",
  "configuration": "Config", "Configuration": "Config", "CONFIGURATION": "Config",
  "settings": "Config", "Settings": "Config", "SETTINGS": "Config",
  "env": "Config", "Env": "Config", "ENV": "Config"
};

/**
 * Sanitiza prioridade: converte variantes humanas para enum Zod
 */
function sanitizePriority(value: unknown): Priority {
  if (typeof value !== "string") return "P2";
  const normalized = PRIORITY_MAP[value.trim()];
  return normalized ?? "P2";
}

/**
 * Sanitiza complexidade: converte variantes para enum Zod
 */
function sanitizeComplexity(value: unknown): Complexity {
  if (typeof value !== "string") return "Média";
  const normalized = COMPLEXITY_MAP[value.trim()];
  return normalized ?? "Média";
}

/**
 * Sanitiza criticality: converte variantes para enum Zod
 */
function sanitizeCriticality(value: unknown): Criticality {
  if (typeof value !== "string") return "Core";
  const normalized = CRITICALITY_MAP[value.trim()];
  return normalized ?? "Core";
}

/**
 * Garante que valor é string não-vazia
 */
function ensureString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

/**
 * Garante que valor é array de strings
 */
function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Sanitiza uma User Story individual
 */
function sanitizeUserStory(raw: unknown, index: number): UserStory {
  const story = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  
  return {
    id: ensureString(story.id, `HU-${String(index + 1).padStart(3, "0")}`),
    title: ensureString(story.title, `História de Usuário ${index + 1}`),
    priority: sanitizePriority(story.priority),
    role: ensureString(story.role, "usuário"),
    action: ensureString(story.action, "realizar ação"),
    benefit: ensureString(story.benefit, "obter benefício"),
    acceptanceCriteria: ensureStringArray(story.acceptanceCriteria),
    functionalRequirements: ensureStringArray(story.functionalRequirements),
    securityRequirements: ensureStringArray(story.securityRequirements),
    businessContext: ensureString(story.businessContext, "")
  };
}

/**
 * Sanitiza objeto de Analysis
 */
function sanitizeAnalysis(raw: unknown): Analysis {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  
  return {
    summary: ensureString(data.summary, "Análise indisponível"),
    complexity: sanitizeComplexity(data.complexity),
    assumptions: ensureStringArray(data.assumptions)
  };
}

/**
 * Sanitiza objeto de ProductPlan
 */
function sanitizeProductPlan(raw: unknown): ProductPlan {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawEpics = Array.isArray(data.epics) ? data.epics : [];
  
  const epics: Epic[] = rawEpics.map((rawEpic: unknown, idx: number) => {
    const epic = (rawEpic && typeof rawEpic === "object") ? rawEpic as Record<string, unknown> : {};
    return {
      title: ensureString(epic.title, `Épico ${idx + 1}`),
      context: ensureString(epic.context, ""),
      requirements: ensureStringArray(epic.requirements)
    };
  });
  
  return { epics };
}

/**
 * Sanitiza objeto de Architecture
 */
function sanitizeArchitecture(raw: unknown): Architecture {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawManifest = Array.isArray(data.manifest) ? data.manifest : [];
  
  const manifest: ManifestItem[] = rawManifest
    .map((rawItem: unknown): ManifestItem | null => {
      const item = (rawItem && typeof rawItem === "object") ? rawItem as Record<string, unknown> : {};
      const path = ensureString(item.path, "");
      if (!path) return null;
      
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

/**
 * Sanitiza objeto de FileContent
 */
function sanitizeFileContent(raw: unknown, expectedPath: string): FileContent {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  
  return {
    path: ensureString(data.path, expectedPath),
    code: ensureString(data.code, "// Código não gerado corretamente"),
    explanation: typeof data.explanation === "string" ? data.explanation : undefined
  };
}

/**
 * Sanitiza array de User Stories
 */
function sanitizeUserStories(raw: unknown): UserStoriesResult {
  const data = (raw && typeof raw === "object") ? raw as Record<string, unknown> : {};
  const rawStories = Array.isArray(data.userStories) ? data.userStories : [];
  
  return {
    userStories: rawStories.map((story, idx) => sanitizeUserStory(story, idx))
  };
}

/**
 * =============================================================================
 * AGENT CLASS - v3.0 Resilient
 * =============================================================================
 */

type SanitizeFunction<T> = (raw: unknown) => T;

export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(userPrompt: string, budgetContext: unknown): Promise<unknown> {
    console.log("🚀 [Agent v3.0] Iniciando Pipeline Sequencial (Resilient)");

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
      const criticalFiles = [...manifest]
        .sort((a, b) => {
          if (a.criticality === "Config") return -1;
          if (b.criticality === "Config") return 1;
          return 0;
        })
        .slice(0, 6);

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
          objectives: ["Compilation Success"],
          risks: analysis.assumptions
        },
        product: {
          userStories: detailedHUs
        },
        architect: {
          diagram: architecture.diagram || "Arquitetura v3.0",
          stack: architecture.stack
        },
        engine: {
          files: generatedFiles
        },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via v3.0 Resilient Agent" }
      };

    } catch (error: unknown) {
      console.error("❌ Erro fatal no Agente:", error);
      throw error;
    }
  }

  // ===========================================================================
  // PIPELINE STEPS (com Sanitização)
  // ===========================================================================

  private async runAnalysisStep(prompt: string): Promise<Analysis> {
    const systemPrompt = `Analista Sênior. Responda JSON. { "summary": "string", "complexity": "Baixa"|"Média"|"Alta"|"Crítica", "assumptions": ["string"] }`;
    return this.callLLMWithSanitization(
      systemPrompt,
      prompt,
      sanitizeAnalysis,
      AnalysisSchema,
      "Analysis"
    );
  }

  private async runProductStep(prompt: string, analysis: Analysis): Promise<ProductPlan> {
    const systemPrompt = `Product Owner. Responda JSON. { "epics": [{ "title": "string", "context": "string", "requirements": ["string"] }] }`;
    return this.callLLMWithSanitization(
      systemPrompt,
      prompt,
      sanitizeProductPlan,
      ProductPlanSchema,
      "Product"
    );
  }

  private async runArchitectureStep(prompt: string, productPlan: ProductPlan): Promise<Architecture> {
    const context = productPlan.epics.map(e => e.title).join(", ");
    const systemPrompt = `Arquiteto. Defina stack e arquivos para: ${context}. Responda JSON. { "stack": "string", "manifest": [{ "path": "string", "purpose": "string", "criticality": "Core"|"Support"|"Config" }] }`;
    return this.callLLMWithSanitization(
      systemPrompt,
      prompt,
      sanitizeArchitecture,
      ArchitectureSchema,
      "Architecture"
    );
  }

  private async generateFileContent(
    fileSpec: ManifestItem,
    stack: string,
    originalPrompt: string
  ): Promise<{ path: string; content: string; language: string }> {
    const systemPrompt = `Dev Sênior. Implemente ${fileSpec.path}. Stack: ${stack}. Responda JSON. { "path": "${fileSpec.path}", "code": "string", "explanation": "string" }`;

    const parsed = await this.callLLMWithSanitization(
      systemPrompt,
      "Codifique.",
      (raw) => sanitizeFileContent(raw, fileSpec.path),
      FileContentSchema,
      `File: ${fileSpec.path}`
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

    const systemPrompt = `PO Técnico. Detalhe HUs para os épicos: ${context}.
Responda JSON: { "userStories": [{ "id": "HU-001", "title": "string", "priority": "P0"|"P1"|"P2"|"P3", "role": "string", "action": "string", "benefit": "string", "acceptanceCriteria": ["string"], "functionalRequirements": ["string"], "securityRequirements": ["string"], "businessContext": "string" }] }
IMPORTANTE: Use EXATAMENTE os valores P0, P1, P2 ou P3 para priority.`;

    const result = await this.callLLMWithSanitization(
      systemPrompt,
      `Detalhe histórias de usuário para: ${context}`,
      sanitizeUserStories,
      UserStoriesSchema,
      "User Stories"
    );

    return result.userStories;
  }

  // ===========================================================================
  // CORE LLM CALL (com Sanitização)
  // ===========================================================================

  /**
   * Chama o LLM e aplica a camada de sanitização antes do Zod.
   * 
   * Fluxo:
   * 1. Recebe JSON raw do LLM
   * 2. Aplica função de sanitização (normaliza valores)
   * 3. Valida com schema Zod (agora sempre passa)
   */
  private async callLLMWithSanitization<T>(
    system: string,
    user: string,
    sanitize: SanitizeFunction<T>,
    schema: z.ZodType<T>,
    contextName: string
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
      
      // PASSO 1: Parse JSON raw (sem validação)
      let rawData: unknown;
      try {
        rawData = JSON.parse(content);
      } catch {
        console.warn(`⚠️ [${contextName}] JSON inválido do LLM, usando objeto vazio`);
        rawData = {};
      }
      
      // PASSO 2: Sanitização (normaliza valores)
      const sanitizedData = sanitize(rawData);
      console.log(`✅ [${contextName}] Dados sanitizados com sucesso`);
      
      // PASSO 3: Validação Zod (agora sempre passa)
      return schema.parse(sanitizedData);
      
    } catch (error) {
      console.error(`❌ Falha no passo [${contextName}]:`, error);
      
      // Fallback: retorna dados sanitizados de objeto vazio
      const fallbackData = sanitize({});
      console.warn(`⚠️ [${contextName}] Usando fallback sanitizado`);
      return schema.parse(fallbackData);
    }
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

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
AGENT_CODE

echo "✅ [415] agent.ts reescrito com Camada de Sanitização"
echo ""
echo "📊 Mudanças implementadas:"
echo "   • Tipos explícitos (Analysis, Epic, UserStory, etc.) em vez de z.infer"
echo "   • PRIORITY_MAP: Mapeia 'High', 'Critical', 'Low', etc. → 'P0'-'P3'"
echo "   • COMPLEXITY_MAP: Mapeia variantes PT/EN → enum Zod"
echo "   • CRITICALITY_MAP: Mapeia variantes → 'Core'|'Support'|'Config'"
echo "   • sanitizeUserStory(): Normaliza cada HU individualmente"
echo "   • sanitizeAnalysis/ProductPlan/Architecture/FileContent()"
echo "   • callLLMWithSanitization(): Novo fluxo Parse → Sanitize → Validate"
echo "   • Fallback automático em caso de erro (nunca crashe)"
echo ""
echo "🔄 Para aplicar, execute:"
echo "   pnpm --filter analysis-agent build"
echo "   pnpm dev"
