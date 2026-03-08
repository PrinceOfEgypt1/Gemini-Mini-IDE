#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Aplicando 'Split Strategy' no Analysis Agent para evitar timeouts..."

# Reescreve o agent.ts com lógica dividida
cat > "$AGENT_FILE" << 'EOF'
import { OpenAI } from "openai";
import { z } from "zod";

/**
 * SCHEMAS SEGREGADOS (Split Strategy)
 * Cada etapa tem seu próprio schema pequeno e focado.
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

// Schemas de Execução (Mantidos)
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
    securityRequirements: z.array(z.string()).default([]),
    businessContext: z.string().optional()
  }))
});

type UserStories = z.infer<typeof UserStoriesSchema>;
type ManifestItem = z.infer<typeof ArchitectureSchema>['manifest'][number];

/**
 * AnalysisAgent (v2.4 - Split Pipeline Architecture)
 * Resolve o problema de "Unexpected end of JSON input" dividindo a carga.
 */
export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(userPrompt: string, budgetContext: any): Promise<any> {
    console.log("🚀 [Agent v2.4] Iniciando Pipeline Sequencial (Split Strategy)");

    try {
      // 1. Análise Inicial (Rápida)
      console.log("🔍 [1/4] Executando Análise de Requisitos...");
      const analysis = await this.runAnalysisStep(userPrompt);

      // 2. Planejamento de Produto (Épicos)
      console.log("💡 [2/4] Definindo Estratégia de Produto...");
      const productPlan = await this.runProductStep(userPrompt, analysis);

      // 3. Arquitetura Técnica (Manifesto)
      console.log("🏗️ [3/4] Desenhando Arquitetura e Manifesto...");
      const architecture = await this.runArchitectureStep(userPrompt, productPlan);

      console.log(`📋 [Blueprint Completo] ${architecture.manifest.length} arquivos planejados.`);

      // 4. Fábrica de Código (Execução)
      // Filtra e limita para evitar timeout global, priorizando Config e Core
      const criticalFiles = architecture.manifest
          .sort((a, b) => (a.criticality === 'Config' ? -1 : 1))
          .slice(0, 6); // Reduzido para 6 para garantir sucesso no MVP

      console.log(`🏭 [4/4] Gerando ${criticalFiles.length} arquivos críticos...`);
      const generatedFiles = await Promise.all(
        criticalFiles.map(fileSpec => this.generateFileContent(fileSpec, architecture.stack, userPrompt))
      );

      // 5. Detalhamento de HUs (Paralelo ao código ou sequencial)
      console.log(`📜 [Final] Expandindo Histórias de Usuário...`);
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);

      // Consolidação Final
      return {
        analysis: {
          summary: analysis.summary,
          problem: userPrompt,
          objectives: ["Split Pipeline Success", "No JSON Truncation"],
          risks: analysis.assumptions
        },
        product: {
          userStories: detailedHUs
        },
        architect: {
          diagram: architecture.diagram || "Arquitetura definida via Pipeline v2.4",
          stack: architecture.stack
        },
        engine: {
          files: generatedFiles
        },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via v2.4 Split Architecture" }
      };

    } catch (error: any) {
      console.error("❌ Erro fatal no Agente:", error);
      throw new Error(`Falha no pipeline do Agente: ${error.message}`);
    }
  }

  // --- PASSOS DO PIPELINE (Micro-Tasks) ---

  private async runAnalysisStep(prompt: string) {
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Você é um Analista de Sistemas Sênior. Resuma o pedido técnica e funcionalmente." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    return AnalysisSchema.parse(JSON.parse(completion.choices[0].message.content || "{}"));
  }

  private async runProductStep(prompt: string, analysis: any) {
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Você é um Product Owner. Defina os Épicos principais baseados na análise." },
        { role: "user", content: `Pedido: ${prompt}\nResumo Analista: ${analysis.summary}` }
      ],
      response_format: { type: "json_object" }
    });
    return ProductPlanSchema.parse(JSON.parse(completion.choices[0].message.content || "{}"));
  }

  private async runArchitectureStep(prompt: string, productPlan: any) {
    const epicsSummary = productPlan.epics.map((e: any) => e.title).join(", ");
    const systemPrompt = `
      VOCÊ É O ARQUITETO DE SOFTWARE.
      Defina a stack e a lista de arquivos (manifesto) necessária para entregar os épicos: ${epicsSummary}.
      
      IMPORTANTE:
      1. Inclua arquivos de configuração (package.json, tsconfig, etc) como 'Config'.
      2. Inclua arquivos essenciais de domínio como 'Core'.
      3. Seja pragmático. Não crie arquivos vazios ou desnecessários.
    `;

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    return ArchitectureSchema.parse(JSON.parse(completion.choices[0].message.content || "{}"));
  }

  private async generateFileContent(fileSpec: ManifestItem, stack: string, originalPrompt: string) {
    const systemPrompt = `
      VOCÊ É O DESENVOLVEDOR (Engine Persona).
      Gere o código para: ${fileSpec.path} (${fileSpec.purpose}).
      Stack: ${stack}.
      
      Retorne JSON estrito: { "path": "...", "code": "...", "explanation": "..." }
      O código deve ser completo, com imports e lógica real.
    `;

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Codifique." }
      ],
      response_format: { type: "json_object" }
    });

    const parsed = FileContentSchema.parse(JSON.parse(completion.choices[0].message.content || "{}"));
    return {
      path: parsed.path,
      content: parsed.code,
      language: this.detectLanguage(parsed.path)
    };
  }

  private async expandEpicsToStories(epics: any[]): Promise<UserStories['userStories']> {
    // Seleciona apenas os 3 primeiros épicos para detalhar (Economia de tokens)
    const targetEpics = epics.slice(0, 3);
    const context = targetEpics.map((e: any) => `${e.title}: ${e.context}`).join("\n");

    const systemPrompt = `
      VOCÊ É O PO TÉCNICO.
      Gere HUs detalhadas para os épicos fornecidos.
      A UI EXIGE estes campos separados: role, action, benefit, acceptanceCriteria (lista), functionalRequirements (lista).
      Prioridades: P0, P1, P2 ou P3.
    `;

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context }
      ],
      response_format: { type: "json_object" }
    });

    return UserStoriesSchema.parse(JSON.parse(completion.choices[0].message.content || "{}")).userStories;
  }

  private detectLanguage(path: string): string {
    if (path.match(/\.(ts|tsx)$/)) return "typescript";
    if (path.match(/\.(js|jsx)$/)) return "javascript";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".md")) return "markdown";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".html")) return "html";
    if (path.endsWith(".sh")) return "bash";
    return "plaintext";
  }
}
EOF
log_ok "Analysis Agent refatorado para Split Pipeline."

# Recompilação
log_info "Recompilando analysis-agent..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b || { echo "Erro na compilação!"; exit 1; }
log_ok "Compilado."

# Reinicia server
log_info "Reiniciando servidor..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Pronto! Reinicie o servidor: 'pnpm --filter @mini-ide/server start'"
