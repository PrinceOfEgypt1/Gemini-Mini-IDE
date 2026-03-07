#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Aplicando correção de tipagem estrita no Analysis Agent..."

# Reescreve o agent.ts com a correção de tipos
cat > "$AGENT_FILE" << 'EOF'
import { OpenAI } from "openai";
import { z } from "zod";

/**
 * SCHEMAS (Split Strategy - v2.6 Type Safe)
 */

// Passo 1: Análise
const AnalysisSchema = z.object({
  summary: z.string(),
  complexity: z.enum(["Baixa", "Média", "Alta", "Crítica"]),
  assumptions: z.array(z.string()).default([])
});

// Passo 2: Produto (Épicos)
const ProductPlanSchema = z.object({
  epics: z.array(z.object({
    title: z.string(),
    context: z.string(),
    requirements: z.array(z.string())
  }))
});

// Passo 3: Arquitetura (Manifesto)
const ArchitectureSchema = z.object({
  stack: z.string(),
  diagram: z.string().optional(),
  manifest: z.array(z.object({
    path: z.string(),
    purpose: z.string(),
    criticality: z.enum(["Core", "Support", "Config"]),
  }))
});

// Schemas de Execução
const FileContentSchema = z.object({
  path: z.string(),
  code: z.string(),
  explanation: z.string().optional()
});

// Schema de HUs Detalhadas
// CORREÇÃO: securityRequirements agora é optional() no schema para evitar erro de inferência TS
// Tratamos o default no código.
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
    securityRequirements: z.array(z.string()).optional(),
    businessContext: z.string().optional()
  }))
});

// Tipo inferido (com optional)
type UserStoriesData = z.infer<typeof UserStoriesSchema>;
type ManifestItem = z.infer<typeof ArchitectureSchema>['manifest'][number];

export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(userPrompt: string, budgetContext: any): Promise<any> {
    console.log("🚀 [Agent v2.6] Iniciando Pipeline Sequencial (Type Safe)");

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

      console.log(`📋 [Blueprint] ${architecture.manifest.length} arquivos planejados.`);

      // 4. Fábrica (Limitada a 6 para MVP)
      const criticalFiles = architecture.manifest
          .sort((a, b) => (a.criticality === 'Config' ? -1 : 1))
          .slice(0, 6); 

      console.log(`🏭 [4/4] Gerando ${criticalFiles.length} arquivos críticos...`);
      const generatedFiles = await Promise.all(
        criticalFiles.map(fileSpec => this.generateFileContent(fileSpec, architecture.stack, userPrompt))
      );

      // 5. HUs
      console.log(`📜 [Final] Expandindo Histórias de Usuário...`);
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);

      return {
        analysis: {
          summary: analysis.summary,
          problem: userPrompt,
          objectives: ["Type Safe Pipeline"],
          risks: analysis.assumptions
        },
        product: {
          userStories: detailedHUs
        },
        architect: {
          diagram: architecture.diagram || "Arquitetura v2.6",
          stack: architecture.stack
        },
        engine: {
          files: generatedFiles
        },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via v2.6 Type Safe Agent" }
      };

    } catch (error: any) {
      console.error("❌ Erro fatal no Agente:", error);
      throw error;
    }
  }

  // --- STEPS ---

  private async runAnalysisStep(prompt: string) {
    const systemPrompt = `
      Analista Sênior. Responda JSON.
      { "summary": "string", "complexity": "Baixa"|"Média"|"Alta"|"Crítica", "assumptions": ["string"] }
    `;
    return this.callLLM(systemPrompt, prompt, AnalysisSchema, "Analysis");
  }

  private async runProductStep(prompt: string, analysis: any) {
    const systemPrompt = `
      Product Owner. Responda JSON.
      { "epics": [{ "title": "string", "context": "string", "requirements": ["string"] }] }
    `;
    return this.callLLM(systemPrompt, prompt, ProductPlanSchema, "Product");
  }

  private async runArchitectureStep(prompt: string, productPlan: any) {
    const context = productPlan.epics.map((e: any) => e.title).join(", ");
    const systemPrompt = `
      Arquiteto. Defina stack e arquivos para: ${context}. Responda JSON.
      { "stack": "string", "manifest": [{ "path": "string", "purpose": "string", "criticality": "Core"|"Support"|"Config" }] }
    `;
    return this.callLLM(systemPrompt, prompt, ArchitectureSchema, "Architecture");
  }

  private async generateFileContent(fileSpec: ManifestItem, stack: string, originalPrompt: string) {
    const systemPrompt = `
      Dev Sênior. Implemente ${fileSpec.path}. Stack: ${stack}. Responda JSON.
      { "path": "${fileSpec.path}", "code": "string", "explanation": "string" }
    `;
    const parsed = await this.callLLM(systemPrompt, "Codifique.", FileContentSchema, `File: ${fileSpec.path}`);
    return {
      path: parsed.path,
      content: parsed.code,
      language: this.detectLanguage(parsed.path)
    };
  }

  private async expandEpicsToStories(epics: any[]) {
    const targetEpics = epics.slice(0, 3);
    const context = targetEpics.map((e: any) => e.title).join(", ");

    const systemPrompt = `
      PO Técnico. Detalhe HUs.
      Campos Obrigatórios: role, action, benefit, acceptanceCriteria[], functionalRequirements[], securityRequirements[].
      Prioridade: P0, P1, P2 ou P3.
      Responda JSON no formato: { "userStories": [...] }
    `;

    const result = await this.callLLM(systemPrompt, context, UserStoriesSchema, "User Stories");
    
    // CORREÇÃO DE TIPO: Garantir que arrays opcionais sejam inicializados
    return result.userStories.map(story => ({
      ...story,
      securityRequirements: story.securityRequirements ?? [],
      businessContext: story.businessContext ?? ""
    }));
  }

  private async callLLM<T>(system: string, user: string, schema: z.ZodType<T>, contextName: string): Promise<T> {
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
      return schema.parse(JSON.parse(content));
    } catch (error) {
      console.error(`❌ Falha no passo [${contextName}]:`, error);
      throw error;
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
log_ok "Agent corrigido (v2.6)."

# Recompilação
log_info "Recompilando analysis-agent..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b || { echo "Erro na compilação!"; exit 1; }
log_ok "Compilado com sucesso."

# Reinicia server
log_info "Preparando ambiente..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Pronto. Reinicie o servidor e teste."
