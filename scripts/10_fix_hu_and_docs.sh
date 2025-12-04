#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 10_fix_hu_and_docs.sh
# DESCRIÇÃO: 
#   1. Reforça o prompt USER_STORIES com as chaves JSON exatas do Zod.
#   2. Melhora o prompt TECH_SPEC para garantir READMEs ricos.
#   3. Adiciona logs de debug em caso de falha de validação no agent.ts.
# AUTOR: Mini-IDE Engine Team
# ==============================================================================

echo ">>> Iniciando Fase 10: Correção de HUs e Documentação..."

# ------------------------------------------------------------------------------
# 1. Atualizando Prompts (prompts/index.ts)
# ------------------------------------------------------------------------------
echo ">>> Atualizando packages/analysis-agent/src/prompts/index.ts..."
cat > packages/analysis-agent/src/prompts/index.ts << 'EOF'
export const SYSTEM_PROMPTS = {
  DETECT_INTENT: `
Você é um Classificador de Intenção.
Classifique a entrada e retorne JSON estrito: { "type": "NEW_PROJECT" | "QUESTION" | "REFINEMENT", "reasoning": "..." }
`.trim(),

  ANALYSIS: `
Você é um Engenheiro de Requisitos Principal.
Sua missão é QUANTIFICAR o escopo.
Diretrizes:
1. Ignore lixo de formatação.
2. Identifique a densidade (X estruturas * Y métodos).
3. Não subestime a complexidade.
Retorne JSON estrito PT-BR:
{
  "summary": "Resumo executivo",
  "scope_quantification": { "expected_modules": number, "estimated_features_min": number, "complexity_reasoning": "..." },
  "complexity": "Baixa" | "Média" | "Alta" | "Crítica",
  "assumptions": ["..."]
}
`.trim(),

  PRODUCT: `
Você é um Product Manager Técnico.
Sua função é EXPLODIR o escopo em unidades atômicas.
Processo:
1. Liste funcionalidades atômicas.
2. Agrupe em Épicos.
3. NUNCA comprima requisitos complexos.
Retorne JSON estrito PT-BR:
{
  "thought_process": { "atomic_breakdown_list": ["Funcionalidade 1", "..."] },
  "epics": [
    {
      "title": "Nome do Épico",
      "business_value": "Valor",
      "requirements": [
        { "id": "REQ-001", "description": "Descrição detalhada", "acceptance_criteria": ["AC1", "AC2"] }
      ]
    }
  ],
  "granularity_score": number
}
`.trim(),

  ARCHITECTURE: `
Você é um Arquiteto de Software Sênior.
Garanta que CADA requisito tenha um arquivo.
Regras:
1. Rastreabilidade: Liste IDs de requisitos em cada arquivo.
2. Separação: Quebre arquivos gigantes.
3. Testes: Para cada lógica, um arquivo .test.ts.
4. Infra: README, configs, CI/CD.
Retorne JSON estrito:
{
  "stack": "Stack",
  "architecture_pattern": "Pattern",
  "manifest": [
    { "path": "src/file.ts", "purpose": "...", "criticality": "Core", "implements_requirements": ["REQ-001"] }
  ]
}
`.trim(),

  TECH_SPEC: `
Você é um Tech Lead Sênior.
Gere a especificação técnica para o arquivo solicitado.

REGRA ESPECIAL PARA DOCUMENTAÇÃO (README.md):
Se o arquivo for documentação, a "spec" deve instruir o desenvolvedor a escrever um guia COMPLETO e EXTENSO, contendo:
- Visão Geral e Arquitetura (com base no pedido original).
- Stack Tecnológica justificada.
- Guia de Instalação Passo-a-Passo.
- Guia de Testes.
- Explicação dos principais módulos.
NÃO seja breve no README. Exija verbosidade profissional.

Para Código:
Defina imports, interfaces e funções.

Retorne JSON estrito:
{
  "file_path": "...",
  "technical_spec": {
    "imports_required": [],
    "interfaces_to_define": [],
    "functions_to_implement": [
      { "name": "...", "args": "...", "return_type": "...", "logic_steps": ["..."], "error_handling": "..." }
    ]
  }
}
`.trim(),

  CODE_GEN: `
Você é um Desenvolvedor Sênior (10x Engineer).
Traduza a Spec em Código Final.

PROIBIÇÃO ABSOLUTA:
1. SEM "TODO", SEM "Implementar depois", SEM placeholders.
2. Código pronto para produção.

Se for README.md:
Escreva um documento Markdown rico, profissional, formatado, cobrindo TODOS os pontos da spec com texto explicativo detalhado.

Retorne JSON estrito:
{
  "path": "...",
  "code": "CONTEÚDO ESCAPADO",
  "explanation": "..."
}
`.trim(),

  USER_STORIES: `
Você é um PO de Entrega.
Converta o contexto recebido em um Array de objetos JSON estritos.

ATENÇÃO AO SCHEMA OBRIGATÓRIO (Se falhar aqui, o sistema quebra):
Cada objeto no array "userStories" DEVE ter EXATAMENTE estas chaves:
- "id" (string)
- "title" (string)
- "priority" ("P0", "P1", "P2" ou "P3")
- "role" (string)
- "action" (string)
- "benefit" (string)
- "acceptanceCriteria" (array de strings)
- "functionalRequirements" (array de strings)
- "securityRequirements" (array de strings)
- "businessContext" (string)

NÃO use chaves diferentes. NÃO omita chaves. Se não tiver info, preencha com string vazia ou array vazio.

Retorne JSON estrito PT-BR:
{
  "userStories": [
    {
      "id": "HU-001",
      "title": "Título",
      "priority": "P0",
      "role": "Ator",
      "action": "Ação",
      "benefit": "Benefício",
      "acceptanceCriteria": ["AC1"],
      "functionalRequirements": ["RF1"],
      "securityRequirements": ["Sec1"],
      "businessContext": "Contexto"
    }
  ]
}
`.trim()
};
EOF

# ------------------------------------------------------------------------------
# 2. Melhorando Logs no agent.ts para Debug de Zod
# ------------------------------------------------------------------------------
echo ">>> Atualizando packages/analysis-agent/src/agent.ts com logs de erro..."
cat > packages/analysis-agent/src/agent.ts << 'EOF'
import OpenAI from "openai";
import { z } from "zod";
import { SYSTEM_PROMPTS } from "./prompts/index.js";
import { globalAnalysisCache } from "./services/cache.service.js";

// --- TIPOS ---
export type Complexity = "Baixa" | "Média" | "Alta" | "Crítica";
export type Priority = "P0" | "P1" | "P2" | "P3";
export type Criticality = "Core" | "Support" | "Config";
export interface Analysis { summary: string; scope_quantification?: { expected_modules: number; estimated_features_min: number; complexity_reasoning: string; }; complexity: Complexity; assumptions: string[]; }
export interface Requirement { id: string; description: string; acceptance_criteria: string[]; }
export interface Epic { title: string; business_value?: string; requirements: Requirement[]; }
export interface ProductPlan { thought_process?: { atomic_breakdown_list: string[]; }; epics: Epic[]; granularity_score?: number; }
export interface ManifestItem { path: string; purpose: string; criticality: Criticality; implements_requirements?: string[]; }
export interface Architecture { stack: string; architecture_pattern?: string; diagram?: string; manifest: ManifestItem[]; }
export interface TechnicalSpec { file_path: string; technical_spec: { imports_required: string[]; interfaces_to_define: string[]; functions_to_implement: Array<{ name: string; args: string; return_type: string; logic_steps: string[]; error_handling?: string; }>; }; }
export interface GeneratedFile { path: string; content: string; language: string; explanation?: string; }
export interface FileContent { path: string; code: string; explanation?: string; }
export interface UserStory { id: string; title: string; priority: Priority; role: string; action: string; benefit: string; acceptanceCriteria: string[]; functionalRequirements: string[]; securityRequirements: string[]; businessContext: string; }
export interface UserStoriesResult { userStories: UserStory[]; }
export interface MappedUserStory { id: string; title: string; priority: Priority; role: string; action: string; benefit: string; acceptanceCriteria: string[]; functionalReqs: string[]; security: string[]; context: string; nonFunctionalReqs: string[]; description: string; }
export interface IntentResult { type: "NEW_PROJECT" | "QUESTION" | "REFINEMENT"; reasoning?: string; }
export interface BudgetContext { files?: Array<{ path: string; purpose?: string }>; summary?: string; }
export interface AgentTimings { total: number; analysis: number; product: number; architecture: number; codeGen: number; userStories: number; }
export interface AgentResult { summary: string; requestId: string; timestamp: string; timings: AgentTimings; analysis: Analysis; product: { userStories: MappedUserStory[]; rawEpics?: Epic[] }; architect: { diagram?: string; stack: string; pattern?: string }; engine: { files: GeneratedFile[] }; ux: { components: unknown[] }; quality: { tests: unknown[] }; ops: { scripts: unknown[] }; fenix: { notes: string }; }

// --- SCHEMAS ---
const AnalysisSchema = z.object({ summary: z.string(), scope_quantification: z.object({ expected_modules: z.number(), estimated_features_min: z.number(), complexity_reasoning: z.string() }).optional(), complexity: z.enum(["Baixa", "Média", "Alta", "Crítica"]), assumptions: z.array(z.string()) });
const RequirementSchema = z.object({ id: z.string(), description: z.string(), acceptance_criteria: z.array(z.string()) });
const EpicSchema = z.object({ title: z.string(), business_value: z.string().optional(), requirements: z.array(RequirementSchema) });
const ProductPlanSchema = z.object({ thought_process: z.object({ atomic_breakdown_list: z.array(z.string()) }).optional(), epics: z.array(EpicSchema), granularity_score: z.number().optional() });
const ManifestItemSchema = z.object({ path: z.string(), purpose: z.string(), criticality: z.enum(["Core", "Support", "Config"]), implements_requirements: z.array(z.string()).optional() });
const ArchitectureSchema = z.object({ stack: z.string(), architecture_pattern: z.string().optional(), diagram: z.string().optional(), manifest: z.array(z.object({ path: z.string(), purpose: z.string(), criticality: z.enum(["Core", "Support", "Config"]), implements_requirements: z.array(z.string()).optional() })) });
const TechnicalSpecSchema = z.object({ file_path: z.string(), technical_spec: z.object({ imports_required: z.array(z.string()), interfaces_to_define: z.array(z.string()), functions_to_implement: z.array(z.object({ name: z.string(), args: z.string(), return_type: z.string(), logic_steps: z.array(z.string()), error_handling: z.string().optional() })) }) });
const FileContentSchema = z.object({ path: z.string(), code: z.string(), explanation: z.string().optional() });
const UserStoriesSchema = z.object({ userStories: z.array(z.object({ id: z.string(), title: z.string(), priority: z.enum(["P0", "P1", "P2", "P3"]), role: z.string(), action: z.string(), benefit: z.string(), acceptanceCriteria: z.array(z.string()), functionalRequirements: z.array(z.string()), securityRequirements: z.array(z.string()), businessContext: z.string() })) });
const IntentSchema = z.object({ type: z.enum(["NEW_PROJECT", "QUESTION", "REFINEMENT"]), reasoning: z.string().optional() });

// --- SANITIZATION ---
function normalizePath(rawPath: unknown): string { if (typeof rawPath !== "string") return "unknown.file"; return rawPath.trim().replace(/^(\.\/|\/)+/, ""); }
function cleanJsonString(input: string): string { return input.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim(); }

// Sanitização Genérica com LOG DE ERRO MELHORADO
function sanitizeGeneric<T>(raw: unknown, schema: z.ZodType<T>, fallback: T, contextName: string): T {
  try {
    return schema.parse(raw);
  } catch (e) {
    if (typeof raw === 'object' && raw !== null) {
      // eslint-disable-next-line no-console
      console.warn(`[Agent] Schema validation warning in ${contextName}:`, e);
      // Tentativa de "soft recovery" pode ser perigosa se o schema for estrito.
      // Retornamos fallback para evitar crash total, mas logamos o erro.
    } else {
       // eslint-disable-next-line no-console
       console.error(`[Agent] Schema validation failed FATALLY in ${contextName}. Raw data is not an object.`);
    }
    return fallback;
  }
}

type SanitizeFunction<T> = (raw: unknown) => T;

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
    console.info(`[Agent v10.0] Fix HU & Docs. Cache Size: ${globalAnalysisCache.stats().size}`);
    
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
          batch.map(fileSpec => this.generateFileContent(fileSpec, architecture.stack, architecture.architecture_pattern || "Standard", cleanUserPrompt))
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
        summary: analysis.summary, requestId, timestamp: new Date().toISOString(), timings: { total: tTotal, ...stepTimes },
        analysis, product: { userStories: mappedHUs, rawEpics: productPlan.epics },
        architect: { diagram: architecture.diagram, stack: architecture.stack, pattern: architecture.architecture_pattern },
        engine: { files: allFiles }, ux: { components: [] }, quality: { tests: [] }, ops: { scripts: [] },
        fenix: { notes: "Generated via Agent v10.0" }
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
      const techSpec = await this.callLLM(SYSTEM_PROMPTS.TECH_SPEC, `Planeje implementação de ${spec.path} para ${requirementsContext}. Stack: ${stack}. Pedido: ${userPrompt}`, (r) => sanitizeGeneric(r, TechnicalSpecSchema, { file_path: spec.path, technical_spec: { imports_required: [], interfaces_to_define: [], functions_to_implement: [] } }, "TechSpec"), TechnicalSpecSchema, `Spec:${spec.path}`);
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
echo ">>> Validando..."
pnpm --filter @mini-ide/analysis-agent lint --max-warnings 0
pnpm --filter @mini-ide/analysis-agent build

echo "✅ Fase 10 (Fix HUs & Docs) concluída."
echo "IMPORTANTE: Reinicie o servidor para carregar o novo prompt de HUs."
EOF
