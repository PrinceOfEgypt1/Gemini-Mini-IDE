#!/usr/bin/env bash
set -euo pipefail

# Cria o diretório scripts se não existir
mkdir -p scripts

echo "[INFO] Reescrevendo packages/analysis-agent/src/agent.ts (v14 Fixed)..."

cat > packages/analysis-agent/src/agent.ts << 'EOF'
import OpenAI from "openai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "./prompts/index.js";
import { globalAnalysisCache } from "./services/cache.service.js";

// Importação dos Schemas Ricos e Interfaces
import {
  AnalysisSchema,
  RichAnalysisSchema,
  RichProductPlanSchema,
  RichArchitectureSchema,
  UserStoriesSchema,
  RichAnalysis,
  RichProductPlan,
  RichArchitecture,
  UserStoriesResult,
  AgentResult,
  TechStack
} from "./types/rich-schemas.js";

// Importação de Contexto e Governança
import { GenerationContext } from "./context/generation-context.js";
import { CompletenessValidator } from "./governance/completeness-validator.js";
import { SyntaxSandbox } from "./governance/syntax-sandbox.js";
import { StructureAuditor } from "./governance/structure-auditor.js";

// --- HELPERS DE SANITIZAÇÃO ---
function ensureString(val: unknown, fallback: string): string {
  if (typeof val === "string" && val.trim().length > 0) return val;
  return fallback;
}

function ensureNumber(val: unknown, fallback: number): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

function ensureStringArray(val: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(val)) {
    return val.filter(item => typeof item === "string").map(item => item as string);
  }
  return fallback;
}

function normalizePriority(val: unknown): "P0" | "P1" | "P2" {
  const s = String(val).toUpperCase();
  if (s === "P0" || s === "P1" || s === "P2") return s;
  return "P1"; // Default
}

// --- SANITIZERS ESPECÍFICOS ---

function sanitizeRichAnalysis(data: any): RichAnalysis {
  const complexityData = (data["complexity"] && typeof data["complexity"] === "object") 
    ? data["complexity"] 
    : { level: "MEDIUM", score: 5, justification: "Padronizado por fallback" };

  return {
    summary: ensureString(data["summary"], "Análise indisponível"),
    complexity: {
      level: (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(complexityData.level) ? complexityData.level : "MEDIUM") as any,
      score: ensureNumber(complexityData.score, 5),
      justification: ensureString(complexityData.justification, "Sem justificativa")
    },
    coreEntities: ensureStringArray(data["coreEntities"], []),
    implicitRequirements: ensureStringArray(data["implicitRequirements"], []),
    assumptions: ensureStringArray(data["assumptions"], [])
  };
}

function sanitizeRichProductPlan(data: any): RichProductPlan {
  const epicsRaw = Array.isArray(data["epics"]) ? data["epics"] : [];
  
  const epics = epicsRaw.map((epic: any) => ({
    id: ensureString(epic["id"], "EPIC-001"),
    title: ensureString(epic["title"], "Untitled Epic"),
    category: (["CORE", "AUTH & SECURITY", "ADMIN", "OBSERVABILITY", "INTEGRATION", "INFRASTRUCTURE"].includes(epic["category"]) 
      ? epic["category"] 
      : "CORE") as any,
    context: ensureString(epic["context"], "Sem contexto"),
    requirements: ensureStringArray(epic["requirements"], []),
    businessValue: ensureString(epic["businessValue"], "Valor não especificado")
  }));

  return {
    productVision: ensureString(data["productVision"], "Visão do produto não definida"),
    epics,
    outOfScope: ensureStringArray(data["outOfScope"], []),
    risks: ensureStringArray(data["risks"], [])
  };
}

function sanitizeRichArchitecture(data: any): RichArchitecture {
  const stackData = (data["stack"] && typeof data["stack"] === "object") ? data["stack"] : {};
  
  const stack: TechStack = {
    runtime: ensureString(stackData["runtime"], "Node.js"),
    language: ensureString(stackData["language"], "TypeScript"),
    framework: ensureString(stackData["framework"], "React"),
    testing: ensureString(stackData["testing"], "Vitest"),
    styling: ensureString(stackData["styling"], "Tailwind"),
    documentation: ensureString(stackData["documentation"], "README.md"),
    orm: ensureString(stackData["orm"], "N/A"),
    database: ensureString(stackData["database"], "N/A"),
    cache: ensureString(stackData["cache"], "N/A"),
    queue: ensureString(stackData["queue"], "N/A")
  };

  const manifestRaw = Array.isArray(data["manifest"]) ? data["manifest"] : [];
  const manifest = manifestRaw.map((file: any) => ({
    path: ensureString(file["path"], "unknown.txt"),
    description: ensureString(file["description"], "Sem descrição"),
    category: (["CONFIG", "DOMAIN", "APPLICATION", "INFRASTRUCTURE", "DEVOPS", "TESTS", "DOCS"].includes(file["category"]) 
      ? file["category"] 
      : "APPLICATION") as any,
    imports: ensureStringArray(file["imports"], [])
  }));

  return {
    architectureStyle: ensureString(data["architectureStyle"], "Modular Monolith"),
    stack,
    manifest,
    keyDecisions: ensureStringArray(data["keyDecisions"], []),
    securityConsiderations: ensureStringArray(data["securityConsiderations"], []),
    scalabilityPath: ensureString(data["scalabilityPath"], "Horizontal scaling via containers")
  };
}

function sanitizeUserStories(data: any): UserStoriesResult {
  const storiesRaw = Array.isArray(data["userStories"]) ? data["userStories"] : [];
  
  const userStories = storiesRaw.map((story: any) => {
    const criteriaRaw = Array.isArray(story["acceptanceCriteria"]) ? story["acceptanceCriteria"] : [];
    
    return {
      id: ensureString(story["id"], "US-000"),
      title: ensureString(story["title"], "Untitled Story"),
      acceptanceCriteria: criteriaRaw.map((criterion: any, j: number) => ({
        id: ensureString(criterion["id"], `AC-${j+1}`),
        scenario: ensureString(criterion["scenario"], `Cenário ${j+1}`),
        given: ensureString(criterion["given"], "Dado que"),
        when: ensureString(criterion["when"], "Quando"),
        then: ensureString(criterion["then"], "Então")
      })),
      technicalNotes: ensureStringArray(story["technicalNotes"], []),
      dependencies: ensureStringArray(story["dependencies"], []),
      estimatedPoints: ensureNumber(story["estimatedPoints"], 3),
      priority: normalizePriority(story["priority"])
    };
  });

  // Utilizando underscore para indicar que a variável é intencionalmente não usada
  const _summaryData = (data["summary"] && typeof data["summary"] === "object")
    ? data["summary"] as Record<string, unknown>
    : {};

  return {
    epicId: ensureString(data["epicId"], "EPIC-000"),
    epicTitle: ensureString(data["epicTitle"], "Épico"),
    userStories,
    summary: {
      totalStories: userStories.length,
      totalPoints: userStories.reduce((sum, s) => sum + s.estimatedPoints, 0),
      p0Count: userStories.filter(s => s.priority === "P0").length,
      p1Count: userStories.filter(s => s.priority === "P1").length,
      p2Count: userStories.filter(s => s.priority === "P2").length
    }
  };
}

// --- CLASSE PRINCIPAL ---

export class AnalysisAgent {
  private client: OpenAI;
  private context: GenerationContext;
  private validator: CompletenessValidator;
  private syntaxSandbox: SyntaxSandbox;
  private structureAuditor: StructureAuditor;

  constructor(apiKey: string) {
    this.client = new OpenAI({ 
      apiKey,
      timeout: 60000 // 60s timeout
    });
    this.context = new GenerationContext();
    this.validator = new CompletenessValidator();
    this.syntaxSandbox = new SyntaxSandbox();
    this.structureAuditor = new StructureAuditor();
  }

  // Método auxiliar para parsing seguro de JSON
  private cleanJsonString(str: string): string {
    // Remove blocos markdown ```json ... ```
    let cleaned = str.replace(/```json\s*/g, "").replace(/```\s*$/g, "");
    // Remove comentários JS se houver (básico)
    cleaned = cleaned.replace(/\/\/.*/g, ""); 
    return cleaned.trim();
  }

  private async callLLM<T>(
    systemPrompt: string,
    userPrompt: string,
    sanitizer: (data: any) => T,
    schema: z.ZodType<any>,
    stepName: string,
    temperature: number = 0.0
  ): Promise<T> {
    const cacheKey = globalAnalysisCache.generateKey(systemPrompt, userPrompt, "gpt-4o-mini", temperature);
    const cached = globalAnalysisCache.get<T>(cacheKey);

    if (cached) {
      console.log(`[Cache Hit] Step: ${stepName}`);
      return cached;
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await this.client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: temperature, // Determinístico
          seed: 42,
          response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content || "{}";
        const cleaned = this.cleanJsonString(content);
        const parsed = JSON.parse(cleaned);

        // Validação Zod (Opcional, apenas log por enquanto se falhar muito feio)
        const validation = schema.safeParse(parsed);
        if (!validation.success) {
          console.warn(`[Validation Warning] ${stepName}:`, validation.error.message);
        }

        const sanitized = sanitizer(parsed);
        globalAnalysisCache.set(cacheKey, sanitized);
        return sanitized;

      } catch (error) {
        console.error(`[Error] ${stepName} (Attempt ${attempts}):`, error);
        if (attempts >= maxAttempts) throw error;
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }
    throw new Error(`Failed to execute step ${stepName}`);
  }

  // --- STEPS ---

  private async runAnalysisStep(userPrompt: string): Promise<RichAnalysis> {
    return this.callLLM(
      SYSTEM_PROMPTS.ANALYSIS,
      userPrompt,
      sanitizeRichAnalysis,
      RichAnalysisSchema,
      "Analysis"
    );
  }

  private async runProductStep(userPrompt: string, analysis: RichAnalysis): Promise<RichProductPlan> {
    // Injeta contexto da análise no prompt de produto
    const richContext = this.context.buildProductContext(analysis);
    return this.callLLM(
      SYSTEM_PROMPTS.PRODUCT,
      `${userPrompt}\n\nCONTEXTO DE ANÁLISE:\n${richContext}`,
      sanitizeRichProductPlan,
      RichProductPlanSchema,
      "Product"
    );
  }

  private async runArchitectureStep(userPrompt: string, productPlan: RichProductPlan): Promise<RichArchitecture> {
    // Injeta contexto acumulado
    const richContext = this.context.buildArchitectureContext(productPlan);
    return this.callLLM(
      SYSTEM_PROMPTS.ARCHITECTURE,
      `${userPrompt}\n\nCONTEXTO DE PRODUTO:\n${richContext}`,
      sanitizeRichArchitecture,
      RichArchitectureSchema,
      "Architecture"
    );
  }

  private async expandEpicsToStories(product: RichProductPlan): Promise<UserStoriesResult[]> {
    const results: UserStoriesResult[] = [];
    
    // Processa sequencialmente para garantir contexto ordenado
    for (const epic of product.epics) {
      const promptContext = `
        EPIC ID: ${epic.id}
        TITLE: ${epic.title}
        CONTEXT: ${epic.context}
        REQUIREMENTS: ${epic.requirements.join("; ")}
      `;

      const stories = await this.callLLM(
        SYSTEM_PROMPTS.USER_STORIES,
        promptContext,
        sanitizeUserStories,
        UserStoriesSchema,
        `UserStories-${epic.id}`
      );
      
      results.push(stories);
    }
    return results;
  }

  private async generateFileContent(fileSpec: { path: string, description: string, imports: string[] }): Promise<{ path: string, content: string }> {
    // Contexto rico para o gerador de código
    const contextStr = this.context.buildCodeGenerationContext(fileSpec.path, fileSpec.imports);
    
    const userPrompt = `
      FILE: ${fileSpec.path}
      DESCRIPTION: ${fileSpec.description}
      IMPORTS NEEDED: ${JSON.stringify(fileSpec.imports)}
      
      CONTEXT:
      ${contextStr}
    `;

    // Loop de Anti-Lazy Guard (Governança)
    let attempts = 0;
    let content = "";
    let lastError = "";

    while (attempts < 3) {
      attempts++;
      
      // Se houve erro anterior, injeta no prompt de correção
      const promptWithFeedback = lastError 
        ? `${userPrompt}\n\nATENÇÃO: A versão anterior foi rejeitada pelo auditor. Corrija este erro:\n${lastError}`
        : userPrompt;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini", // Pode alternar para GPT-4o em tasks complexas
        messages: [
          { role: "system", content: SYSTEM_PROMPTS.CODE_GEN },
          { role: "user", content: promptWithFeedback }
        ],
        temperature: 0.0,
        seed: 42,
        response_format: { type: "json_object" }
      });

      const raw = response.choices[0]?.message?.content || "{}";
      const cleaned = this.cleanJsonString(raw);
      
      try {
        const parsed = JSON.parse(cleaned);
        content = parsed.code || "";
        
        // 1. Validação de Completude (Anti-Lazy)
        const completeness = this.validator.validate(content, fileSpec.path);
        if (!completeness.isValid) {
          lastError = `Qualidade insuficiente: ${completeness.errors.join(", ")}`;
          console.warn(`[Governance Reject] ${fileSpec.path}: ${lastError}`);
          continue; // Tenta de novo
        }

        // 2. Sandbox de Sintaxe (Compilação Virtual)
        const syntax = this.syntaxSandbox.validateTS(content);
        if (!syntax.isValid) {
          lastError = `Erro de Sintaxe TypeScript: ${syntax.error}`;
          console.warn(`[Syntax Reject] ${fileSpec.path}: ${lastError}`);
          continue;
        }

        // Sucesso!
        this.context.registerGeneratedFile(fileSpec.path, content);
        return { path: fileSpec.path, content };

      } catch (e) {
        lastError = "JSON inválido na resposta do LLM";
      }
    }

    // Se falhar 3x, retorna o melhor esforço (ou erro)
    console.error(`[Failed] Could not generate clean code for ${fileSpec.path} after 3 attempts.`);
    return { path: fileSpec.path, content: `// FAILED TO GENERATE CLEAN CODE\n// Error: ${lastError}\n${content}` };
  }

  // --- ORQUESTRADOR PRINCIPAL ---

  public async analyze(userPrompt: string): Promise<AgentResult> {
    const startTime = performance.now();
    const timings: any = {};

    try {
      // 0. Reset Context
      this.context = new GenerationContext();

      // 1. Análise
      const t0 = performance.now();
      console.log("Step 1: Analysis...");
      const analysis = await this.runAnalysisStep(userPrompt);
      timings.analysis = performance.now() - t0;

      // 2. Produto
      const t1 = performance.now();
      console.log("Step 2: Product Strategy...");
      const product = await this.runProductStep(userPrompt, analysis);
      timings.product = performance.now() - t1;

      // 3. Arquitetura
      const t2 = performance.now();
      console.log("Step 3: Architecture...");
      let architecture = await this.runArchitectureStep(userPrompt, product);
      
      // Auditoria de Estrutura (Governança)
      architecture = this.structureAuditor.auditAndFix(architecture);
      timings.architecture = performance.now() - t2;

      // 4. Histórias de Usuário
      const t3 = performance.now();
      console.log("Step 4: User Stories...");
      const userStories = await this.expandEpicsToStories(product);
      timings.userStories = performance.now() - t3;

      // 5. Geração de Código (Engine)
      const t4 = performance.now();
      console.log(`Step 5: Engine (Generating ${architecture.manifest.length} files)...`);
      
      // Ordena manifesto para respeitar dependências (Types -> Utils -> Components)
      const orderMap = { 
        "CONFIG": 1, "DOMAIN": 2, "APPLICATION": 3, "INFRASTRUCTURE": 4, "DEVOPS": 5, "TESTS": 6, "DOCS": 7 
      };
      
      const sortedManifest = [...architecture.manifest].sort((a, b) => {
        return (orderMap[a.category] ?? 99) - (orderMap[b.category] ?? 99);
      });

      const batchSize = 5; // Paralelismo controlado
      const files: Array<{path: string, content: string}> = [];

      for (let i = 0; i < sortedManifest.length; i += batchSize) {
        const batch = sortedManifest.slice(i, i + batchSize);
        console.log(`Processing Batch ${Math.floor(i/batchSize)+1}...`);
        
        const batchResults = await Promise.all(
          batch.map(spec => this.generateFileContent(spec))
        );
        files.push(...batchResults);
      }
      timings.codeGen = performance.now() - t4;

      timings.total = performance.now() - startTime;

      return {
        analysis,
        product: product, // Mantendo compatibilidade com interface, mas o dado rico está aqui
        architecture,
        userStories, // Agora na raiz
        engine: { files },
        timings
      };

    } catch (error) {
      console.error("Critical Error in Agent Pipeline:", error);
      throw error;
    }
  }
}
EOF

echo "[SUCCESS] packages/analysis-agent/src/agent.ts reescrito com sucesso."
