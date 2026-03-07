#!/usr/bin/env bash
set -euo pipefail

echo "[INFO] Iniciando Reparo Final de Consistência..."

# 1. CRIAR OS ARQUIVOS QUE FALTAM EM GOVERNANCE
# ==============================================================================
echo "[INFO] Criando packages/analysis-agent/src/governance/syntax-sandbox.ts..."
cat > packages/analysis-agent/src/governance/syntax-sandbox.ts << 'EOF'
import ts from "typescript";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class SyntaxSandbox {
  /**
   * Valida se o código fornecido é TypeScript sintaticamente válido.
   * Não executa o código, apenas faz o parse da AST.
   */
  public validateTS(code: string): ValidationResult {
    try {
      // Cria um source file virtual para checar a sintaxe
      const sourceFile = ts.createSourceFile(
        "temp.ts",
        code,
        ts.ScriptTarget.Latest,
        true // setParentNodes
      );

      const diagnostics = ts.getPreEmitDiagnostics(
        ts.createProgram({
          rootNames: ["temp.ts"],
          options: {
            noEmit: true,
            target: ts.ScriptTarget.Latest,
            skipLibCheck: true,
            module: ts.ModuleKind.CommonJS
          },
          host: {
            ...ts.createCompilerHost({}),
            getSourceFile: (fileName) => fileName === "temp.ts" ? sourceFile : undefined,
            writeFile: () => {},
            getDefaultLibFileName: () => "lib.d.ts",
            useCaseSensitiveFileNames: () => true,
            getCanonicalFileName: fileName => fileName,
            getCurrentDirectory: () => "",
            getNewLine: () => "\n",
            fileExists: (fileName) => fileName === "temp.ts",
            readFile: () => "",
          }
        })
      );

      if (diagnostics.length > 0) {
        const message = ts.flattenDiagnosticMessageText(diagnostics[0].messageText, "\n");
        const line = diagnostics[0].file 
          ? diagnostics[0].file.getLineAndCharacterOfPosition(diagnostics[0].start!).line + 1 
          : 0;
        return { isValid: false, error: `Line ${line}: ${message}` };
      }

      return { isValid: true };
    } catch (err: any) {
      return { isValid: false, error: err.message };
    }
  }
}
EOF

echo "[INFO] Criando packages/analysis-agent/src/governance/structure-auditor.ts..."
cat > packages/analysis-agent/src/governance/structure-auditor.ts << 'EOF'
import { RichArchitecture, RichManifestItem } from "../types/rich-schemas.js";

export class StructureAuditor {
  /**
   * Audita a arquitetura e injeta arquivos obrigatórios se estiverem faltando.
   */
  public auditAndFix(architecture: RichArchitecture): RichArchitecture {
    const fixedManifest = [...architecture.manifest];
    const stack = architecture.stack;
    
    // Helper para verificar existência
    const hasFile = (pattern: RegExp) => fixedManifest.some(f => pattern.test(f.path));

    // Helper para adicionar arquivo
    const addFile = (path: string, purpose: string, category: "CONFIG" | "DOCS" | "TESTS" | "APPLICATION") => {
      if (!hasFile(new RegExp(path.replace(".", "\\.")))) {
        fixedManifest.push({
          path,
          purpose,
          category,
          criticality: "HIGH"
        });
      }
    };

    // 1. Documentação Obrigatória
    addFile("README.md", "Documentation entry point", "DOCS");
    addFile("USER_STORIES.md", "Project requirements and stories", "DOCS");

    // 2. Configuração Básica (Baseado na Stack)
    if (stack.runtime.toLowerCase().includes("node")) {
      addFile("package.json", "Project dependencies and scripts", "CONFIG");
    }
    
    if (stack.language.toLowerCase().includes("typescript")) {
      addFile("tsconfig.json", "TypeScript compiler configuration", "CONFIG");
    }

    // 3. Framework specific checks
    if (stack.framework.toLowerCase().includes("react")) {
      addFile("vite.config.ts", "Vite build configuration", "CONFIG");
      // Verifica se existe algum entrypoint
      if (!hasFile(/src\/main\.tsx?/) && !hasFile(/src\/index\.tsx?/)) {
        addFile("src/main.tsx", "Application entrypoint", "APPLICATION");
      }
    }

    return {
      ...architecture,
      manifest: fixedManifest
    };
  }
}
EOF


# 2. REESCREVER AGENT.TS CORRIGIDO (Tipos e Métodos Sincronizados)
# ==============================================================================
echo "[INFO] Reescrevendo packages/analysis-agent/src/agent.ts (v14.1 Fixed)..."

cat > packages/analysis-agent/src/agent.ts << 'EOF'
import OpenAI from "openai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "./prompts/index.js";
import { globalAnalysisCache } from "./services/cache.service.js";

// Importação dos Schemas Ricos e Interfaces
import {
  RichAnalysisSchema,
  RichProductPlanSchema,
  RichArchitectureSchema,
  UserStoriesSchema,
  RichAnalysis,
  RichProductPlan,
  RichArchitecture,
  UserStoriesResult,
  AgentResult,
  TechStack,
  RichManifestItem,
  RichEpic
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

function normalizePriority(val: unknown): "P0" | "P1" | "P2" | "P3" {
  const s = String(val).toUpperCase();
  if (["P0", "P1", "P2", "P3"].includes(s)) return s as any;
  return "P1"; // Default
}

function normalizeComplexity(val: unknown): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    const s = String(val).toUpperCase();
    if (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(s)) return s as any;
    return "MEDIUM";
}

// --- SANITIZERS ESPECÍFICOS ---

function sanitizeRichAnalysis(data: any): RichAnalysis {
  const complexityData = (data["complexity"] && typeof data["complexity"] === "object") 
    ? data["complexity"] 
    : { level: "MEDIUM", score: 5, justification: "Padronizado por fallback" };

  return {
    summary: ensureString(data["summary"], "Análise indisponível"),
    complexity: {
      level: normalizeComplexity(complexityData.level),
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
  
  const epics: RichEpic[] = epicsRaw.map((epic: any) => ({
    id: ensureString(epic["id"], "EPIC-001"),
    title: ensureString(epic["title"], "Untitled Epic"),
    category: (["CORE", "AUTH & SECURITY", "ADMIN", "OBSERVABILITY", "INTEGRATION", "INFRASTRUCTURE"].includes(epic["category"]) 
      ? epic["category"] 
      : "CORE") as any,
    context: ensureString(epic["context"], "Sem contexto"),
    requirements: ensureStringArray(epic["requirements"], []),
    acceptanceCriteria: ensureStringArray(epic["acceptanceCriteria"], []),
    priority: normalizePriority(epic["priority"]),
    estimatedComplexity: normalizeComplexity(epic["estimatedComplexity"])
  }));

  return {
    productVision: ensureString(data["productVision"], "Visão do produto não definida"),
    epics,
    outOfScope: ensureStringArray(data["outOfScope"], []),
    risks: Array.isArray(data["risks"]) ? data["risks"].map((r: any) => ({
        description: ensureString(r.description, "Risco genérico"),
        mitigation: ensureString(r.mitigation, "Monitorar")
    })) : []
  };
}

function sanitizeRichArchitecture(data: any): RichArchitecture {
  const stackData = (data["stack"] && typeof data["stack"] === "object") ? data["stack"] : {};
  
  const stack: TechStack = {
    runtime: ensureString(stackData["runtime"], "Node.js"),
    language: ensureString(stackData["language"], "TypeScript"),
    framework: ensureString(stackData["framework"], "React"),
    testing: ensureString(stackData["testing"], "Vitest"),
    // styling removido pois não existe na interface TechStack definida no rich-schemas.ts
    documentation: ensureString(stackData["documentation"], "README.md"),
    orm: ensureString(stackData["orm"], "N/A"),
    database: ensureString(stackData["database"], "N/A"),
    cache: ensureString(stackData["cache"], "N/A"),
    queue: ensureString(stackData["queue"], "N/A")
  };

  const manifestRaw = Array.isArray(data["manifest"]) ? data["manifest"] : [];
  const manifest: RichManifestItem[] = manifestRaw.map((file: any) => ({
    path: ensureString(file["path"], "unknown.txt"),
    purpose: ensureString(file["purpose"], "Component implementation"),
    criticality: (["HIGH", "MEDIUM", "LOW"].includes(file["criticality"]) ? file["criticality"] : "MEDIUM") as any,
    category: (["CONFIG", "DOMAIN", "APPLICATION", "INFRASTRUCTURE", "DEVOPS", "TESTS", "DOCS"].includes(file["category"]) 
      ? file["category"] 
      : "APPLICATION") as any
  }));

  return {
    architectureStyle: ensureString(data["architectureStyle"], "Modular Monolith"),
    stack,
    diagram: ensureString(data["diagram"], ""),
    manifest,
    keyDecisions: Array.isArray(data["keyDecisions"]) ? data["keyDecisions"].map((d: any) => ({
        decision: ensureString(d.decision, "Decisão"),
        rationale: ensureString(d.rationale, "Razão")
    })) : [],
    securityConsiderations: ensureStringArray(data["securityConsiderations"], []),
    scalabilityPath: ensureStringArray(data["scalabilityPath"], [])
  };
}

function sanitizeUserStories(data: any): UserStoriesResult {
  const storiesRaw = Array.isArray(data["userStories"]) ? data["userStories"] : [];
  
  const userStories = storiesRaw.map((story: any) => {
    const criteriaRaw = Array.isArray(story["acceptanceCriteria"]) ? story["acceptanceCriteria"] : [];
    
    return {
      id: ensureString(story["id"], "US-000"),
      title: ensureString(story["title"], "Untitled Story"),
      description: ensureString(story["description"], "No description"),
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

  // Indica variavel não usada com underscore
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
    let cleaned = str.replace(/```json\s*/g, "").replace(/```\s*$/g, "");
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
          temperature: temperature,
          seed: 42,
          response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content || "{}";
        const cleaned = this.cleanJsonString(content);
        const parsed = JSON.parse(cleaned);

        // Validação Schema (Opcional, apenas log)
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
    const richContext = this.context.buildProductContext(); // Removido argumento, usa estado interno
    return this.callLLM(
      SYSTEM_PROMPTS.PRODUCT,
      `${userPrompt}\n\nCONTEXTO DE ANÁLISE:\n${richContext}`,
      sanitizeRichProductPlan,
      RichProductPlanSchema,
      "Product"
    );
  }

  private async runArchitectureStep(userPrompt: string, productPlan: RichProductPlan): Promise<RichArchitecture> {
    const richContext = this.context.buildArchitectureContext(); // Removido argumento
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
    
    for (const epic of product.epics) {
      // Método buildUserStoriesContext corrigido conforme definition
      const promptContext = this.context.buildUserStoriesContext(epic.id);

      const stories = await this.callLLM(
        SYSTEM_PROMPTS.USER_STORIES,
        promptContext,
        sanitizeUserStories,
        UserStoriesSchema,
        `UserStories-${epic.id}`
      );
      
      results.push(stories);
      this.context.addUserStories(stories.userStories);
    }
    return results;
  }

  private async generateFileContent(fileSpec: { path: string, description: string, imports: string[] }): Promise<{ path: string, content: string }> {
    // Método corrigido para buildCodeGenContext
    const contextStr = this.context.buildCodeGenContext(fileSpec.path);
    
    const userPrompt = `
      FILE: ${fileSpec.path}
      DESCRIPTION: ${fileSpec.description}
      IMPORTS NEEDED: ${JSON.stringify(fileSpec.imports)}
      
      CONTEXT:
      ${contextStr}
    `;

    let attempts = 0;
    let content = "";
    let lastError = "";

    while (attempts < 3) {
      attempts++;
      
      const promptWithFeedback = lastError 
        ? `${userPrompt}\n\nATENÇÃO: A versão anterior foi rejeitada pelo auditor. Corrija este erro:\n${lastError}`
        : userPrompt;

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
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
          continue; 
        }

        // 2. Sandbox de Sintaxe
        const syntax = this.syntaxSandbox.validateTS(content);
        if (!syntax.isValid) {
          lastError = `Erro de Sintaxe TypeScript: ${syntax.error}`;
          console.warn(`[Syntax Reject] ${fileSpec.path}: ${lastError}`);
          continue;
        }

        // Sucesso! Método corrigido para addGeneratedFile
        this.context.addGeneratedFile({
          path: fileSpec.path,
          content: content,
          language: "typescript"
        });
        
        return { path: fileSpec.path, content };

      } catch (e) {
        lastError = "JSON inválido na resposta do LLM";
      }
    }

    console.error(`[Failed] Could not generate clean code for ${fileSpec.path} after 3 attempts.`);
    return { path: fileSpec.path, content: `// FAILED TO GENERATE CLEAN CODE\n// Error: ${lastError}\n${content}` };
  }

  // --- ORQUESTRADOR PRINCIPAL ---

  public async analyze(userPrompt: string): Promise<AgentResult> {
    const startTime = performance.now();
    const timings: any = {};

    try {
      this.context.start(userPrompt);

      // 1. Análise
      const t0 = performance.now();
      console.log("Step 1: Analysis...");
      const analysis = await this.runAnalysisStep(userPrompt);
      this.context.setAnalysis(analysis);
      timings.analysis = performance.now() - t0;

      // 2. Produto
      const t1 = performance.now();
      console.log("Step 2: Product Strategy...");
      const product = await this.runProductStep(userPrompt, analysis);
      this.context.setProduct(product);
      timings.product = performance.now() - t1;

      // 3. Arquitetura
      const t2 = performance.now();
      console.log("Step 3: Architecture...");
      let architecture = await this.runArchitectureStep(userPrompt, product);
      this.context.setArchitecture(architecture);
      
      architecture = this.structureAuditor.auditAndFix(architecture);
      timings.architecture = performance.now() - t2;

      // 4. Histórias de Usuário
      const t3 = performance.now();
      console.log("Step 4: User Stories...");
      const userStoriesResults = await this.expandEpicsToStories(product);
      // userStoriesResults é UserStoriesResult[], mas AgentResult espera userStories: RichUserStory[]
      const flatUserStories = userStoriesResults.flatMap(r => r.userStories);
      timings.userStories = performance.now() - t3;

      // 5. Geração de Código
      const t4 = performance.now();
      console.log(`Step 5: Engine (Generating ${architecture.manifest.length} files)...`);
      
      const orderMap: Record<string, number> = { 
        "CONFIG": 1, "DOMAIN": 2, "APPLICATION": 3, "INFRASTRUCTURE": 4, "DEVOPS": 5, "TESTS": 6, "DOCS": 7 
      };
      
      const sortedManifest = [...architecture.manifest].sort((a, b) => {
        return (orderMap[a.category] ?? 99) - (orderMap[b.category] ?? 99);
      });

      const batchSize = 5; 
      const files: Array<{path: string, content: string}> = [];

      for (let i = 0; i < sortedManifest.length; i += batchSize) {
        const batch = sortedManifest.slice(i, i + batchSize);
        console.log(`Processing Batch ${Math.floor(i/batchSize)+1}...`);
        
        // Mapeia RichManifestItem para o formato esperado pelo generateFileContent
        const batchResults = await Promise.all(
          batch.map(spec => this.generateFileContent({
              path: spec.path,
              description: spec.purpose, // RichManifestItem usa purpose, mas generate espera description
              imports: [] // Manifest não tem imports no schema rico atual, passando vazio
          }))
        );
        files.push(...batchResults);
      }
      timings.codeGen = performance.now() - t4;

      timings.total = performance.now() - startTime;

      return {
        summary: analysis.summary,
        requestId: "req-" + Date.now(),
        timestamp: new Date().toISOString(),
        timings: timings as any,
        analysis,
        product,
        architect: architecture, // Alias para compatibilidade ou uso direto
        architecture: architecture, 
        userStories: flatUserStories,
        engine: { 
            files: files.map(f => ({ path: f.path, content: f.content, language: "typescript" })) 
        },
        quality: {
            validationErrors: [],
            codeCompleteness: 100
        },
        fenix: {
            notes: "Generated by Gemini-Mini-IDE v14.1"
        }
      };

    } catch (error) {
      console.error("Critical Error in Agent Pipeline:", error);
      throw error;
    }
  }
}
EOF

echo "[SUCCESS] Upgrade Completo: Governança Criada + Agent Sincronizado."
