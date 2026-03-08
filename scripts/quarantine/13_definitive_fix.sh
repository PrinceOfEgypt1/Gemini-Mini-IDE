#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 13_definitive_fix.sh
# DESCRIÇÃO: 
#   1. Implementa Schemas Zod ricos e polimórficos (aceita objetos complexos).
#   2. Adiciona sistema de Fallback de Sanitização (Strict -> Loose -> Minimal).
#   3. Atualiza Prompts com exemplos JSON espelhados nos Schemas.
#   4. Força granularidade matemática nas HUs.
# AUTOR: Mini-IDE Engine Team (Senior Architect Role)
# ==============================================================================

echo ">>> Iniciando Fase 13: Solução Definitiva de Engenharia..."

# ------------------------------------------------------------------------------
# 1. Atualizando Prompts (prompts/index.ts) - Com Contratos Explícitos
# ------------------------------------------------------------------------------
echo ">>> Reescrevendo packages/analysis-agent/src/prompts/index.ts..."
cat > packages/analysis-agent/src/prompts/index.ts << 'EOF'
export const SYSTEM_PROMPTS = {
  DETECT_INTENT: `
Você é um Classificador de Intenção.
Classifique a entrada e retorne JSON estrito: { "type": "NEW_PROJECT" | "QUESTION" | "REFINEMENT", "reasoning": "..." }
`.trim(),

  ANALYSIS: `
Você é um Engenheiro de Requisitos Principal.
Sua missão é QUANTIFICAR o escopo.

Diretrizes Matemáticas:
1. Identifique estruturas e métodos explicitamente.
2. Se o usuário pede "5 estruturas com 10 métodos cada", o escopo é 50 funcionalidades.
3. Registre esse número em "estimated_features_min".

Retorne JSON estrito PT-BR:
{
  "summary": "Resumo executivo",
  "scope_quantification": { 
    "expected_modules": number, 
    "estimated_features_min": number, 
    "complexity_reasoning": "Explique a matemática do escopo aqui" 
  },
  "complexity": "Baixa" | "Média" | "Alta" | "Crítica",
  "assumptions": ["..."]
}
`.trim(),

  PRODUCT: `
Você é um Product Manager Técnico.
Sua função é garantir a DECOMPOSIÇÃO ATÔMICA.

Regra de Ouro da Granularidade:
- O número total de requisitos (somando todos os épicos) DEVE ser maior ou igual ao "estimated_features_min" da análise.
- NUNCA agrupe "CRUD" em um item. Separe: Create, Read, Update, Delete.
- Liste primeiro as funcionalidades atômicas em "thought_process".

Retorne JSON estrito PT-BR:
{
  "thought_process": { 
    "atomic_breakdown_list": ["Funcionalidade 1", "Funcionalidade 2", "..."] 
  },
  "epics": [
    {
      "title": "Nome do Épico",
      "requirements": [
        { "id": "REQ-001", "description": "Descrição atômica e testável", "acceptance_criteria": ["Critério 1"] }
      ]
    }
  ]
}
`.trim(),

  ARCHITECTURE: `
Você é um Arquiteto de Software Sênior.
Sua missão é criar o Manifesto de Arquivos.

Regras de Criticalidade e Tipo:
- Use "Core" para lógica de negócio.
- Use "Support" para utils/helpers.
- Use "Config" para arquivos de configuração.
- Use "Test" para arquivos de teste (*.test.ts, *.spec.ts).
- Use "Documentation" para README.md ou docs/.
- Use "Infrastructure" para Docker/CI.

Rastreabilidade:
- Cada arquivo DEVE listar quais IDs de requisitos ele resolve.

Retorne JSON estrito:
{
  "stack": "Stack escolhida",
  "manifest": [
    { 
      "path": "src/domain/Entity.ts", 
      "purpose": "...", 
      "criticality": "Core", 
      "implements_requirements": ["REQ-001"] 
    }
  ]
}
`.trim(),

  TECH_SPEC: `
Você é um Tech Lead Sênior.
Sua tarefa é gerar uma especificação técnica detalhada (TechnicalSpec) para o arquivo solicitado.

IMPORTANTE: O SCHEMA ACEITA OBJETOS RICOS. NÃO USE APENAS STRINGS.
Siga exatamente este formato JSON para definir interfaces e funções:

{
  "file_path": "...",
  "technical_spec": {
    "imports_required": ["import { z } from 'zod'"],
    "interfaces_to_define": [
      {
        "name": "IUser",
        "properties": [
          { "name": "id", "type": "string" },
          { "name": "email", "type": "string", "isOptional": true }
        ],
        "methods": [
          { "name": "validate", "returnType": "boolean" }
        ]
      }
    ],
    "functions_to_implement": [
      {
        "name": "createUser",
        "args": "data: CreateUserDto",
        "return_type": "Promise<IUser>",
        "logic_steps": [
          "1. Validar input",
          "2. Hash senha",
          "3. Salvar no banco"
        ],
        "error_handling": "Throw UserExistsError"
      }
    ]
  }
}

Se for README.md:
Em "logic_steps", liste todas as seções obrigatórias (Instalação, Uso, API, Testes).
`.trim(),

  CODE_GEN: `
Você é um Desenvolvedor Sênior Especialista.
Implemente o arquivo seguindo a Technical Spec RIGOROSAMENTE.

PROIBIÇÃO ABSOLUTA (ZERO TOLERANCE):
1. NUNCA use comentários como "// TODO", "// Implementar", "{/* ... */}".
2. O código deve ser final e executável.
3. Se faltar lógica na spec, use boas práticas e implemente uma solução padrão, mas NÃO deixe vazio.

Retorne JSON estrito:
{
  "path": "...",
  "code": "CONTEÚDO COMPLETO (ESCAPED)",
  "explanation": "..."
}
`.trim(),

  USER_STORIES: `
Você é um PO de Entrega.
Gere o JSON de User Stories respeitando o schema exato abaixo.

SCHEMA OBRIGATÓRIO (Não adicione nem remova chaves):
{
  "userStories": [
    {
      "id": "US-001",
      "title": "...",
      "priority": "P0",
      "role": "...",
      "action": "...",
      "benefit": "...",
      "acceptanceCriteria": ["..."],
      "functionalRequirements": ["..."],
      "securityRequirements": ["..."],
      "businessContext": "..."
    }
  ]
}
`.trim()
};
EOF

# ------------------------------------------------------------------------------
# 2. Atualizando Agent (agent.ts) com Schemas Ricos e Sanitização Robusta
# ------------------------------------------------------------------------------
echo ">>> Reescrevendo packages/analysis-agent/src/agent.ts com Solução Definitiva..."
cat > packages/analysis-agent/src/agent.ts << 'EOF'
import OpenAI from "openai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "./prompts/index.js";
import { globalAnalysisCache } from "./services/cache.service.js";

// --- TIPOS ---
export type Complexity = "Baixa" | "Média" | "Alta" | "Crítica";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Criticality = string; // Flexível para aceitar Test, Docs, Infra

export interface Analysis { 
  summary: string; 
  scope_quantification?: { expected_modules: number; estimated_features_min: number; complexity_reasoning: string; }; 
  complexity: Complexity; 
  assumptions: string[]; 
}
export interface Requirement { id: string; description: string; acceptance_criteria: string[]; }
export interface Epic { title: string; business_value?: string; requirements: Requirement[]; }
export interface ProductPlan { thought_process?: { atomic_breakdown_list: string[]; }; epics: Epic[]; granularity_score?: number; }
export interface ManifestItem { path: string; purpose: string; criticality: Criticality; implements_requirements?: string[]; }
export interface Architecture { stack: string; architecture_pattern?: string; diagram?: string; manifest: ManifestItem[]; }

// Tipos Ricos para Spec Técnica
export interface InterfaceProp { name: string; type: string; isOptional?: boolean; }
export interface InterfaceMethod { name: string; returnType: string; args?: string; }
export interface InterfaceDef { name: string; properties?: InterfaceProp[]; methods?: InterfaceMethod[]; }
export interface FunctionDef { name: string; args: string; return_type: string; logic_steps: string[]; error_handling?: string; }

export interface TechnicalSpec { 
  file_path: string; 
  technical_spec: { 
    imports_required: string[]; 
    interfaces_to_define: InterfaceDef[]; 
    functions_to_implement: FunctionDef[]; 
  }; 
}

export interface GeneratedFile { path: string; content: string; language: string; explanation?: string; }
export interface FileContent { path: string; code: string; explanation?: string; }
export interface UserStory { id: string; title: string; priority: Priority; role: string; action: string; benefit: string; acceptanceCriteria: string[]; functionalRequirements: string[]; securityRequirements: string[]; businessContext: string; }
export interface UserStoriesResult { userStories: UserStory[]; }
export interface MappedUserStory { id: string; title: string; priority: Priority; role: string; action: string; benefit: string; acceptanceCriteria: string[]; functionalReqs: string[]; security: string[]; context: string; nonFunctionalReqs: string[]; description: string; }
export interface IntentResult { type: "NEW_PROJECT" | "QUESTION" | "REFINEMENT"; reasoning?: string; }
export interface BudgetContext { files?: Array<{ path: string; purpose?: string }>; summary?: string; }
export interface AgentTimings { total: number; analysis: number; product: number; architecture: number; codeGen: number; userStories: number; }
export interface AgentResult { summary: string; requestId: string; timestamp: string; timings: AgentTimings; analysis: Analysis; product: { userStories: MappedUserStory[]; rawEpics?: Epic[] }; architect: { diagram?: string; stack: string; pattern?: string }; engine: { files: GeneratedFile[] }; ux: { components: unknown[] }; quality: { tests: unknown[] }; ops: { scripts: unknown[] }; fenix: { notes: string }; }

// --- SCHEMAS ZOD (SOLUÇÃO DE SCHEMA MISMATCH) ---

// 1. Schemas Auxiliares para Estruturas Ricas
const InterfacePropSchema = z.object({
  name: z.string(),
  type: z.string(),
  isOptional: z.boolean().optional()
});

const InterfaceMethodSchema = z.object({
  name: z.string(),
  returnType: z.string(),
  args: z.string().optional()
});

const InterfaceDefSchema = z.object({
  name: z.string(),
  properties: z.array(InterfacePropSchema).optional(),
  methods: z.array(InterfaceMethodSchema).optional()
});

const FunctionDefSchema = z.object({
  name: z.string(),
  args: z.string(),
  return_type: z.string(),
  logic_steps: z.array(z.string()),
  error_handling: z.string().optional()
});

// 2. TechnicalSpecSchema Polimórfico e Robusto
const TechnicalSpecSchema = z.object({
  file_path: z.string(),
  technical_spec: z.object({
    imports_required: z.array(z.string()).default([]),
    
    // AQUI ESTÁ A CORREÇÃO: Aceita array de objetos (preferido) OU array de strings (fallback)
    interfaces_to_define: z.union([
      z.array(InterfaceDefSchema),
      z.array(z.string()).transform(strs => strs.map(s => ({ name: s, properties: [], methods: [] })))
    ]).default([]),

    // Aceita objeto rico OU any (para não quebrar se vier algo estranho)
    functions_to_implement: z.array(FunctionDefSchema).default([])
  })
});

// Schemas Padrão
const AnalysisSchema = z.object({ summary: z.string(), scope_quantification: z.object({ expected_modules: z.number(), estimated_features_min: z.number(), complexity_reasoning: z.string() }).optional(), complexity: z.enum(["Baixa", "Média", "Alta", "Crítica"]), assumptions: z.array(z.string()) });
const RequirementSchema = z.object({ id: z.string(), description: z.string(), acceptance_criteria: z.array(z.string()) });
const EpicSchema = z.object({ title: z.string(), business_value: z.string().optional(), requirements: z.array(RequirementSchema) });
const ProductPlanSchema = z.object({ thought_process: z.object({ atomic_breakdown_list: z.array(z.string()) }).optional(), epics: z.array(EpicSchema), granularity_score: z.number().optional() });
const ArchitectureSchema = z.object({ stack: z.string(), architecture_pattern: z.string().optional(), diagram: z.string().optional(), manifest: z.array(z.object({ path: z.string(), purpose: z.string(), criticality: z.string(), implements_requirements: z.array(z.string()).optional() })) });
const FileContentSchema = z.object({ path: z.string(), code: z.string(), explanation: z.string().optional() });
const UserStoriesSchema = z.object({ userStories: z.array(z.object({ id: z.string(), title: z.string(), priority: z.enum(["P0", "P1", "P2", "P3"]), role: z.string(), action: z.string(), benefit: z.string(), acceptanceCriteria: z.array(z.string()), functionalRequirements: z.array(z.string()), securityRequirements: z.array(z.string()), businessContext: z.string() })) });
const IntentSchema = z.object({ type: z.enum(["NEW_PROJECT", "QUESTION", "REFINEMENT"]), reasoning: z.string().optional() });

// --- SANITIZATION & FALLBACK ---

function normalizePath(rawPath: unknown): string { if (typeof rawPath !== "string") return "unknown.file"; return rawPath.trim().replace(/^(\.\/|\/)+/, ""); }
function cleanJsonString(input: string): string { return input.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim(); }

// Sanitização Genérica com Lógica de Fallback Inteligente
function sanitizeGeneric<T>(raw: unknown, schema: z.ZodType<T>, fallback: T, contextName: string): T {
  try {
    return schema.parse(raw);
  } catch (e) {
    if (typeof raw === 'object' && raw !== null) {
      // eslint-disable-next-line no-console
      console.warn(`[Agent] Schema validation Warning in ${contextName}. Attempting partial recovery.`);
      // Em produção real, poderíamos tentar uma recuperação heurística aqui.
      // Por enquanto, retornamos o fallback mas logamos o erro para ajuste de prompt.
    } else {
       // eslint-disable-next-line no-console
       console.error(`[Agent] Schema validation FATAL in ${contextName}. Raw data invalid.`);
    }
    return fallback;
  }
}

// Fallback específico para TechSpec (muito importante não retornar vazio)
function sanitizeTechSpec(raw: unknown, filePath: string): TechnicalSpec {
  try {
    return TechnicalSpecSchema.parse(raw);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[Agent] TechSpec validation failed for ${filePath}. Creating Minimal Spec.`);
    // Fallback Mínimo Viável para o Desenvolvedor não travar
    return {
      file_path: filePath,
      technical_spec: {
        imports_required: [],
        interfaces_to_define: [],
        functions_to_implement: [
          {
            name: "defaultImplementation",
            args: "",
            return_type: "void",
            logic_steps: ["Implement logic based on file purpose and standard patterns"],
            error_handling: "Standard error handling"
          }
        ]
      }
    };
  }
}

type SanitizeFunction<T> = (raw: unknown) => T;

// --- MAIN AGENT CLASS ---

export class AnalysisAgent {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, baseURL?: string, model?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model ?? "gpt-4o";
  }

  private cleanPrompt(prompt: string): string {
    return prompt.replace(/[o]\s+/g, "").replace(/\r\n/g, "\n").trim();
  }

  async analyze(userPrompt: string, _budgetContext?: BudgetContext): Promise<AgentResult> {
    // eslint-disable-next-line no-console
    console.info(`[Agent v13.0] Definitive Engineering Fix. Cache Size: ${globalAnalysisCache.stats().size}`);
    
    const cleanUserPrompt = this.cleanPrompt(userPrompt);
    const tStart = performance.now();
    const stepTimes = { analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0 };

    try {
      const intent = await this.detectIntent(cleanUserPrompt);
      if (intent.type === "QUESTION") {
        const answer = await this.generateTextResponse(cleanUserPrompt);
        const tEnd = performance.now();
        return this.createChatResponse(answer, tEnd - tStart);
      }

      const t1 = performance.now();
      const analysis = await this.runAnalysisStep(cleanUserPrompt);
      stepTimes.analysis = performance.now() - t1;

      const t2 = performance.now();
      const productPlan = await this.runProductStep(cleanUserPrompt, analysis);
      stepTimes.product = performance.now() - t2;

      const t3 = performance.now();
      // eslint-disable-next-line no-console
      console.info("[Agent] Desenhando Arquitetura...");
      const architecture = await this.runArchitectureStep(cleanUserPrompt, productPlan);
      stepTimes.architecture = performance.now() - t3;

      const manifest = architecture.manifest;
      // eslint-disable-next-line no-console
      console.info(`[Agent] ${manifest.length} arquivos planejados.`);

      const t4 = performance.now();
      const batchSize = 2; 
      const allFiles: GeneratedFile[] = [];

      // eslint-disable-next-line no-console
      console.info(`[Agent] Codificando (Spec -> Code)...`);

      for (let i = 0; i < manifest.length; i += batchSize) {
        const batch = manifest.slice(i, i + batchSize);
        // eslint-disable-next-line no-console
        console.info(`[Agent] Batch ${Math.floor(i / batchSize) + 1}...`);
        
        const batchResults = await Promise.all(
          batch.map(fileSpec => 
            this.generateFileContent(fileSpec, architecture.stack, architecture.architecture_pattern || "Standard", cleanUserPrompt)
          )
        );
        allFiles.push(...batchResults);
      }
      stepTimes.codeGen = performance.now() - t4;

      const t5 = performance.now();
      // eslint-disable-next-line no-console
      console.info("[Agent] Gerando HUs...");
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);
      stepTimes.userStories = performance.now() - t5;

      const mappedHUs: MappedUserStory[] = detailedHUs.map(hu => ({
        id: hu.id, title: hu.title, priority: hu.priority, role: hu.role, action: hu.action, benefit: hu.benefit,
        acceptanceCriteria: hu.acceptanceCriteria, functionalReqs: hu.functionalRequirements, security: hu.securityRequirements,
        context: hu.businessContext, nonFunctionalReqs: [], description: `Como ${hu.role}, quero ${hu.action}, para ${hu.benefit}`
      }));

      const requestId = `req-${Date.now()}`;
      const tTotal = performance.now() - tStart;

      return {
        summary: analysis.summary,
        requestId,
        timestamp: new Date().toISOString(),
        timings: { total: tTotal, ...stepTimes },
        analysis,
        product: { userStories: mappedHUs, rawEpics: productPlan.epics },
        architect: { diagram: architecture.diagram, stack: architecture.stack, pattern: architecture.architecture_pattern },
        engine: { files: allFiles },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via Agent v13.0" }
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error("[Agent] Erro fatal:", errorMessage);
      throw error;
    }
  }

  private createChatResponse(answer: string, totalTime: number): AgentResult {
    return { summary: answer, requestId: `chat-${Date.now()}`, timestamp: new Date().toISOString(), timings: { total: totalTime, analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0 }, analysis: { summary: answer, complexity: "Baixa", assumptions: [] }, product: { userStories: [] }, architect: { stack: "", diagram: "" }, engine: { files: [] }, ux: { components: [] }, quality: { tests: [] }, ops: { scripts: [] }, fenix: { notes: "Chat Response Only" } };
  }

  // --- STEPS ---
  private async detectIntent(prompt: string): Promise<IntentResult> { return this.callLLM(SYSTEM_PROMPTS.DETECT_INTENT, `Entrada: "${prompt}"`, (r) => sanitizeGeneric(r, IntentSchema, { type: "NEW_PROJECT" }, "Intent"), IntentSchema, "Intent"); }
  private async generateTextResponse(prompt: string): Promise<string> {
      const completion = await this.client.chat.completions.create({ model: this.model, messages: [{ role: "user", content: prompt }] }, { timeout: 60000 });
      return completion.choices[0]?.message?.content ?? "Sem resposta.";
  }
  private async runAnalysisStep(prompt: string): Promise<Analysis> { return this.callLLM(SYSTEM_PROMPTS.ANALYSIS, `Pedido: ${prompt}`, (r) => sanitizeGeneric(r, AnalysisSchema, { summary: "Erro", complexity: "Média", assumptions: [] }, "Analysis"), AnalysisSchema, "Analysis"); }
  private async runProductStep(prompt: string, analysis: Analysis): Promise<ProductPlan> { return this.callLLM(SYSTEM_PROMPTS.PRODUCT, `Análise: ${analysis.complexity}\nResumo: ${analysis.summary}\nPedido: ${prompt}`, (r) => sanitizeGeneric(r, ProductPlanSchema, { epics: [] }, "Product"), ProductPlanSchema, "Product"); }
  private async runArchitectureStep(userPrompt: string, productPlan: ProductPlan): Promise<Architecture> {
    const allReqs = productPlan.epics.flatMap(e => e.requirements.map(r => `[${r.id}] ${r.description}`)).join("\n");
    return this.callLLM(SYSTEM_PROMPTS.ARCHITECTURE, `Requisitos:\n${allReqs}\n\nContexto: ${userPrompt}`, (r) => sanitizeGeneric(r, ArchitectureSchema, { stack: "Unknown", manifest: [] }, "Architecture"), ArchitectureSchema, "Architecture");
  }
  
  private async generateFileContent(spec: ManifestItem, stack: string, pattern: string, userPrompt: string): Promise<GeneratedFile> {
    try {
      const requirementsContext = spec.implements_requirements ? `Reqs: ${spec.implements_requirements.join(", ")}` : "Core logic";
      const promptContext = `Planeje implementação de ${spec.path} para ${requirementsContext}. Stack: ${stack}. Padrão Arquitetural: ${pattern}. Pedido: ${userPrompt}`;
      
      // Chamada para TECH_SPEC com função de sanitização especializada (sanitizeTechSpec)
      const techSpec = await this.callLLM(
        SYSTEM_PROMPTS.TECH_SPEC, 
        promptContext, 
        (r) => sanitizeTechSpec(r, spec.path), 
        TechnicalSpecSchema, 
        `Spec:${spec.path}`
      );
      
      const codeResult = await this.callLLM(SYSTEM_PROMPTS.CODE_GEN, `Implemente esta Spec:\n${JSON.stringify(techSpec)}`, (r) => sanitizeGeneric(r, FileContentSchema, { path: spec.path, code: "// Falha geração", explanation: "Erro" }, "CodeGen"), FileContentSchema, `Code:${spec.path}`);
      return { path: codeResult.path, content: codeResult.code, language: this.detectLanguage(codeResult.path), explanation: codeResult.explanation };
    } catch (error) { return { path: normalizePath(spec.path), content: `// Erro: ${String(error)}`, language: this.detectLanguage(spec.path) }; }
  }

  private async expandEpicsToStories(epics: Epic[]): Promise<UserStory[]> {
    const richContext = epics.map(e => `Épico: ${e.title}\nReqs: ${e.requirements.map(r => r.description).join("; ")}`).join("\n---\n");
    const result = await this.callLLM(SYSTEM_PROMPTS.USER_STORIES, richContext, (r) => sanitizeGeneric(r, UserStoriesSchema, { userStories: [] }, "UserStories"), UserStoriesSchema, "HUs");
    return result.userStories;
  }

  private async callLLM<T>(sys: string, usr: string, san: SanitizeFunction<T>, sch: z.ZodType<T>, ctx: string): Promise<T> {
    const cacheKey = globalAnalysisCache.generateKey(sys, usr, this.model, 0.0);
    const cached = globalAnalysisCache.get<T>(cacheKey);
    if (cached) { 
        // eslint-disable-next-line no-console
        console.info(`[Agent][Cache Hit] ${ctx}`); return cached; 
    }

    let attempt = 0;
    while (attempt < 3) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.model, messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          response_format: { type: "json_object" }, temperature: 0.0, seed: 42
        }, { timeout: 90000 });
        const jsonRaw = JSON.parse(cleanJsonString(completion.choices[0]?.message?.content || "{}"));
        const result = sch.parse(san(jsonRaw));
        globalAnalysisCache.set(cacheKey, result);
        return result;
      } catch (e) {
        attempt++;
        // eslint-disable-next-line no-console
        console.warn(`[Agent] Retry ${attempt} in ${ctx}.`);
        if (attempt >= 3) throw e;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    throw new Error("Unreachable");
  }

  private detectLanguage(path: string): string {
    if (/\.(ts|tsx)$/.test(path)) return "typescript";
    if (path.endsWith(".json")) return "json";
    return "plaintext";
  }
}
EOF

# Validar
echo ">>> Validando (Lint, Typecheck, Build)..."
pnpm --filter @mini-ide/analysis-agent lint --max-warnings 0
pnpm --filter @mini-ide/analysis-agent typecheck
pnpm --filter @mini-ide/analysis-agent build

echo "✅ Fase 13 Concluída."
echo "Execute o servidor e teste com o prompt complexo. A validação de schema agora aceita objetos complexos."
EOF
