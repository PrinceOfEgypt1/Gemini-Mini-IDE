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
    documentation: ensureString(stackData["documentation"], "README.md"),
    orm: ensureString(stackData["orm"], "N/A"),
    database: ensureString(stackData["database"], "N/A"),
    cache: ensureString(stackData["cache"], "N/A"),
    queue: ensureString(stackData["queue"], "N/A")
  };

  // Mapeamento de categorias inválidas para válidas
  const categoryMap: Record<string, string> = {
    "STYLES": "APPLICATION",
    "STYLE": "APPLICATION",
    "UI": "APPLICATION",
    "FRONTEND": "APPLICATION",
    "BACKEND": "INFRASTRUCTURE",
    "API": "INFRASTRUCTURE",
    "SERVICE": "APPLICATION",
    "MODEL": "DOMAIN",
    "ENTITY": "DOMAIN",
    "UTIL": "APPLICATION",
    "UTILS": "APPLICATION",
    "HELPER": "APPLICATION",
    "HELPERS": "APPLICATION",
    "TYPES": "DOMAIN",
    "INTERFACE": "DOMAIN",
    "TYPE": "DOMAIN",
    "HOOKS": "APPLICATION",
    "HOOK": "APPLICATION",
    "MIDDLEWARE": "APPLICATION"
  };

  const validCategories = ["DOMAIN", "APPLICATION", "INFRASTRUCTURE", "DEVOPS", "CONFIG", "TESTS", "DOCS"];

  const manifestRaw = Array.isArray(data["manifest"]) ? data["manifest"] : [];
  const manifest: RichManifestItem[] = manifestRaw.map((file: any) => {
    let category = file["category"];

    // Normalizar categoria
    if (typeof category === "string") {
      const upperCategory = category.toUpperCase().trim();

      // Verificar se está na lista válida
      if (validCategories.includes(upperCategory)) {
        category = upperCategory;
      } else if (categoryMap[upperCategory]) {
        // Mapear categoria inválida conhecida
        category = categoryMap[upperCategory];
      } else {
        // Tentar inferir categoria do path
        const path = ensureString(file["path"], "").toLowerCase();
        if (path.includes("test") || path.includes("spec")) {
          category = "TESTS";
        } else if (path.includes("config") || path.includes(".env") || path.includes("tsconfig")) {
          category = "CONFIG";
        } else if (path.includes("domain") || path.includes("entity") || path.includes("model")) {
          category = "DOMAIN";
        } else if (path.includes("infrastructure") || path.includes("database") || path.includes("http")) {
          category = "INFRASTRUCTURE";
        } else if (path.includes("docker") || path.includes("ci") || path.includes("deploy")) {
          category = "DEVOPS";
        } else if (path.includes("docs") || path.includes("readme") || path.includes(".md")) {
          category = "DOCS";
        } else {
          category = "APPLICATION"; // Fallback padrão
        }
      }
    } else {
      category = "APPLICATION"; // Fallback se não for string
    }

    return {
      path: ensureString(file["path"], "unknown.txt"),
      purpose: ensureString(file["purpose"], "Component implementation"),
      criticality: (["HIGH", "MEDIUM", "LOW"].includes(file["criticality"]) ? file["criticality"] : "MEDIUM") as any,
      category: category as any
    };
  });

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
      timeout: 600000 // 10 minutes timeout (large prompts can take time)
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

  // Detecta a linguagem do arquivo baseado na extensão
  private detectLanguage(filePath: string): string {
    if (filePath.match(/\.(ts|tsx)$/)) return "typescript";
    if (filePath.match(/\.(js|jsx)$/)) return "javascript";
    if (filePath.endsWith(".json")) return "json";
    if (filePath.endsWith(".md")) return "markdown";
    if (filePath.match(/\.(yml|yaml)$/)) return "yaml";
    if (filePath.endsWith(".css")) return "css";
    if (filePath.endsWith(".html")) return "html";
    return "plaintext";
  }

  private async callLLM<T>(
    systemPrompt: string,
    userPrompt: string,
    sanitizer: (data: any) => T,
    schema: z.ZodType<any>,
    stepName: string,
    temperature: number = 0.0,
    skipCache: boolean = false,
    retryAttempt: number = 0
  ): Promise<T> {
    // Incluir retryAttempt na chave do cache para diferenciar tentativas
    const cacheKey = globalAnalysisCache.generateKey(
      systemPrompt,
      userPrompt,
      "gpt-4o-mini",
      temperature,
      retryAttempt
    );

    // Pular cache se solicitado (útil para retries)
    if (!skipCache) {
      const cached = globalAnalysisCache.get<T>(cacheKey);
      if (cached) {
        // eslint-disable-next-line no-console
        console.log(`[Cache Hit] Step: ${stepName}`);
        return cached;
      }
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
          // eslint-disable-next-line no-console
          console.warn(`[Validation Warning] ${stepName}:`, validation.error.issues);
        }

        const sanitized = sanitizer(parsed);

        // Só cachear se não for skipCache
        if (!skipCache) {
          globalAnalysisCache.set(cacheKey, sanitized);
        }

        return sanitized;

      } catch (error) {
        // eslint-disable-next-line no-console
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

  private async runProductStep(userPrompt: string, _analysis: RichAnalysis): Promise<RichProductPlan> {
    const richContext = this.context.buildProductContext(); // Removido argumento, usa estado interno
    return this.callLLM(
      SYSTEM_PROMPTS.PRODUCT,
      `${userPrompt}\n\nCONTEXTO DE ANÁLISE:\n${richContext}`,
      sanitizeRichProductPlan,
      RichProductPlanSchema,
      "Product"
    );
  }

  private async runArchitectureStep(userPrompt: string, _productPlan: RichProductPlan): Promise<RichArchitecture> {
    const richContext = this.context.buildArchitectureContext();
    const fullContext = `${userPrompt}\n\nCONTEXTO DE PRODUTO:\n${richContext}`;

    // eslint-disable-next-line no-console
    console.log(`[Agent] Desenhando Arquitetura...`);
    // eslint-disable-next-line no-console
    console.log(`[Agent] runArchitectureStep - Context size: ${fullContext.length} chars, Epics: ${_productPlan.epics.length}`);

    // VALIDAÇÃO COM RETRY: Tentar até 3 vezes até obter manifest válido
    const MAX_ATTEMPTS = 3;
    let lastArchitecture: RichArchitecture | null = null;
    let lastValidation: { valid: boolean; errors: Array<{ structure: string; message: string }> } | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      // eslint-disable-next-line no-console
      console.log(`[Validator] Tentativa ${attempt}/${MAX_ATTEMPTS} de gerar manifest válido...`);

      // Adicionar feedback de erros da tentativa anterior (se houver)
      let contextWithFeedback = fullContext;
      if (lastValidation && !lastValidation.valid && attempt > 1) {
        const feedbackErrors = lastValidation.errors.map(e => `- ${e.structure}: ${e.message}`).join('\n');
        contextWithFeedback = `${fullContext}\n\n⚠️ ATENÇÃO: Sua resposta anterior foi REJEITADA pelos seguintes motivos:\n${feedbackErrors}\n\nGere novamente CORRIGINDO esses problemas.`;
        // eslint-disable-next-line no-console
        console.log(`[Validator] Feedback de erros:\n${feedbackErrors}`);
      }

      // Gerar arquitetura (skipar cache em retries para forçar regeneração)
      const skipCache = attempt > 1; // Desabilita cache da 2ª tentativa em diante
      const temperature = attempt > 1 ? 0.3 : 0.0; // Aumenta temperatura em retries
      const architecture = await this.callLLM(
        SYSTEM_PROMPTS.ARCHITECTURE,
        contextWithFeedback,
        sanitizeRichArchitecture,
        RichArchitectureSchema,
        "Architecture",
        temperature,
        skipCache,
        attempt // Passar attempt como retryAttempt
      );
      lastArchitecture = architecture;

      // Validar manifest
      const { validateManifest } = await import("./validators/manifest-validator.js");
      const validation = validateManifest(architecture.manifest, userPrompt);
      lastValidation = validation;

      if (validation.valid) {
        // eslint-disable-next-line no-console
        console.log(`[Validator] ✅ Manifest válido na tentativa ${attempt}`);
        if (validation.warnings.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(`[Validator] Avisos: ${validation.warnings.join(', ')}`);
        }
        return architecture;
      }

      // Manifest inválido
      // eslint-disable-next-line no-console
      console.error(`[Validator] ❌ Manifest inválido na tentativa ${attempt}:`);
      for (const error of validation.errors) {
        // eslint-disable-next-line no-console
        console.error(`  - ${error.structure}: ${error.message}`);
      }
    }

    // Falhou após MAX_ATTEMPTS tentativas
    // eslint-disable-next-line no-console
    console.error(`[Validator] ❌ Falha após ${MAX_ATTEMPTS} tentativas. Retornando última arquitetura (inválida).`);
    if (lastValidation) {
      // eslint-disable-next-line no-console
      console.error(`[Validator] Erros finais:`);
      for (const error of lastValidation.errors) {
        // eslint-disable-next-line no-console
        console.error(`  - ${error.structure}: ${error.message}`);
      }
    }

    // Retornar última tentativa mesmo inválida (para não quebrar o fluxo)
    return lastArchitecture!;
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

  /**
   * Gera o conteúdo de um arquivo com retry inteligente.
   * 
   * Estratégia de retry:
   * - Tentativa 1: temperature=0.0, seed=42 (determinístico, reprodutível)
   * - Tentativas 2+: temperature=0.7, sem seed (variação para escapar do "modo de falha")
   * 
   * Feedback aprimorado:
   * - Inclui exemplos concretos de JSDoc
   * - Cita os erros específicos detectados
   * - Fornece instruções passo-a-passo para correção
   */
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

    const maxAttempts = 5; // Aumentado de 3 para 5 (conforme relatório de auditoria)
    let attempts = 0;
    let content = "";
    let lastError = "";

    while (attempts < maxAttempts) {
      attempts++;
      
      // Configuração dinâmica de temperatura e seed
      let temperature = 0.0;
      let seed: number | undefined = 42;
      
      if (attempts > 1) {
        // Nas tentativas de retry (2+), aumenta a variação para escapar do "modo de falha"
        temperature = 0.7;
        seed = undefined; // Remove o seed para permitir variação
      }
      
      // Construção do prompt com feedback aprimorado
      let promptWithFeedback = userPrompt;
      if (lastError) {
        promptWithFeedback = `${userPrompt}

⚠️ TENTATIVA ${attempts}/${maxAttempts} - O CÓDIGO ANTERIOR FOI REJEITADO PELO AUDITOR.

❌ ERROS DETECTADOS:
${lastError}

✅ COMO CORRIGIR:
1. Corrija todos os erros listados acima.
2. **NÃO** use placeholders como '...' ou 'TODO'.
3. **ADICIONE JSDoc** (/** ... */) imediatamente antes de **TODAS** as declarações 'export class', 'export function', 'export interface', etc.
4. **EXEMPLO DE JSDOC CORRETO:**
\`\`\`typescript
/**
 * Classe que representa um Array dinâmico com operações genéricas.
 * @template T O tipo dos elementos armazenados no array.
 * @example
 * const arr = new Array<number>();
 * arr.push(1, 2, 3);
 */
export class Array<T> {
  // implementação aqui
}
\`\`\`
5. Garanta que todas as declarações públicas (export) tenham JSDoc.
6. Não use 'any' ou 'as any' - use tipos específicos.
7. Gere código completo e funcional, sem placeholders.`;
      }

      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPTS.CODE_GEN },
          { role: "user", content: promptWithFeedback }
        ],
        temperature: temperature,
        ...(seed !== undefined && { seed }), // Inclui seed apenas se definido
        response_format: { type: "json_object" }
      });

      const raw = response.choices[0]?.message?.content || "{}";
      const cleaned = this.cleanJsonString(raw);
      
      try {
        const parsed = JSON.parse(cleaned);
        content = parsed.code || "";

        // 1. Validação de Sintaxe (PRIMEIRO - bloqueia erros graves de gramática)
        const syntax = this.syntaxSandbox.validateTS(content, fileSpec.path);
        if (!syntax.isValid) {
          lastError = `Erro de Sintaxe TypeScript: ${syntax.error}`;
          // eslint-disable-next-line no-console
          console.warn(`[VALIDATION_FAIL_SYNTAX] ${fileSpec.path}: ${lastError}`);
          continue;
        }

        // 2. Validação de Completude (SEGUNDO - Anti-Lazy, força qualidade mínima)
        const completeness = this.validator.validate(content, fileSpec.path);
        if (!completeness.isValid) {
          lastError = `Governance Reject: ${fileSpec.path}\nReasons:\n${completeness.errors.map(e => `  - ${e}`).join('\n')}\n\nGere o arquivo novamente removendo os itens listados e adicionando JSDoc e exports apropriados.`;
          // eslint-disable-next-line no-console
          console.warn(`[VALIDATION_FAIL_COMPLETENESS] ${fileSpec.path}:\n${completeness.errors.map(e => `  - ${e}`).join('\n')}`);
          continue;
        }

        // eslint-disable-next-line no-console
        console.log(`[VALIDATION_OK] ${fileSpec.path}`);

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

    // eslint-disable-next-line no-console
    console.error(`[Failed] Could not generate clean code for ${fileSpec.path} after ${maxAttempts} attempts.`);
    // eslint-disable-next-line no-console
    console.error(`[Failed] Last error: ${lastError}`);
    return { path: fileSpec.path, content: `// FAILED TO GENERATE CLEAN CODE\n// Error: ${lastError}\n// Attempts: ${maxAttempts}\n${content}` };
  }

  // --- ORQUESTRADOR PRINCIPAL ---

  public async analyze(userPrompt: string, _options?: unknown): Promise<AgentResult> {
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

      // Validação de Integridade: Verifica se todos os arquivos do manifest foram gerados
      const { validateIntegrity, logIntegrityResults } = await import("./validators/integrity-validator.js");
      const integrityResult = validateIntegrity(architecture.manifest, files);
      logIntegrityResults(integrityResult);

      timings.total = performance.now() - startTime;

      return {
        summary: analysis.summary,
        requestId: "req-" + Date.now(),
        timestamp: new Date().toISOString(),
        timings: timings as any,
        analysis,
        product,
        architect: architecture, // Alias para compatibilidade ou uso direto
        userStories: flatUserStories,
        engine: {
            files: files.map(f => ({ path: f.path, content: f.content, language: this.detectLanguage(f.path) }))
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
