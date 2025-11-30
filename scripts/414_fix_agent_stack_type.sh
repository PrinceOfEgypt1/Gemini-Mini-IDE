#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Aplicando correção de tipo 'stack' no Analysis Agent..."

# Reescreve o agent.ts com a correção na linha crítica
cat > "$AGENT_FILE" << 'EOF'
import { OpenAI } from "openai";
import { z } from "zod";

/**
 * SCHEMAS (v2.9 - Stack Type Safe)
 */

const AnalysisSchema = z.object({
  summary: z.string().default("Análise indisponível"),
  complexity: z.enum(["Baixa", "Média", "Alta", "Crítica"]).default("Média"),
  assumptions: z.array(z.string()).default([])
});

const ProductPlanSchema = z.object({
  epics: z.array(z.object({
    title: z.string().default("Épico Genérico"),
    context: z.string().default(""),
    requirements: z.array(z.string()).default([])
  })).default([])
});

const ArchitectureSchema = z.object({
  stack: z.string().default("Node.js + TypeScript"),
  diagram: z.string().optional(),
  manifest: z.array(z.object({
    path: z.string(),
    purpose: z.string().default("Arquivo de código"),
    criticality: z.enum(["Core", "Support", "Config"]).default("Core"),
  })).default([])
});

const FileContentSchema = z.object({
  path: z.string(),
  code: z.string().default("// Código não gerado corretamente"),
  explanation: z.string().optional()
});

const UserStoriesSchema = z.object({
  userStories: z.array(z.object({
    id: z.string().default("HU-000"),
    title: z.string().default("História de Usuário"),
    priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
    role: z.string().default("usuário"),
    action: z.string().default("realizar ação"),
    benefit: z.string().default("obter benefício"),
    acceptanceCriteria: z.array(z.string()).default([]),
    functionalRequirements: z.array(z.string()).default([]),
    securityRequirements: z.array(z.string()).optional(),
    businessContext: z.string().optional()
  })).default([])
});

// Interfaces Manuais
interface ManifestItemStrict {
  path: string;
  purpose: string;
  criticality: "Core" | "Support" | "Config";
}

export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(userPrompt: string, budgetContext: any): Promise<any> {
    console.log("🚀 [Agent v2.9] Iniciando Pipeline Sequencial (Stack Safe)");

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

      const manifest = architecture.manifest || [];
      console.log(`📋 [Blueprint] ${manifest.length} arquivos planejados.`);

      // 4. Fábrica
      const criticalFiles = manifest
          .sort((a, b) => {
             const critA = a.criticality || 'Core';
             const critB = b.criticality || 'Core';
             if (critA === 'Config') return -1;
             if (critB === 'Config') return 1;
             return 0;
          })
          .slice(0, 6);

      console.log(`🏭 [4/4] Gerando ${criticalFiles.length} arquivos críticos...`);
      
      const generatedFiles = await Promise.all(
        criticalFiles.map(fileSpec => 
          this.generateFileContent(
            { 
              path: fileSpec.path, 
              purpose: fileSpec.purpose || "Core Component", 
              criticality: fileSpec.criticality || "Core" 
            }, 
            // FIX: Coerção explícita para garantir string, mesmo se a inferência falhar
            architecture.stack || "Node.js + TypeScript", 
            userPrompt
          )
        )
      );

      // 5. HUs
      console.log(`📜 [Final] Expandindo Histórias de Usuário...`);
      const epicsList = productPlan.epics || [];
      const detailedHUs = await this.expandEpicsToStories(epicsList);

      return {
        analysis: {
          summary: analysis.summary,
          problem: userPrompt,
          objectives: ["Compilation Success"],
          risks: analysis.assumptions || []
        },
        product: {
          userStories: detailedHUs
        },
        architect: {
          diagram: architecture.diagram || "Arquitetura v2.9",
          stack: architecture.stack
        },
        engine: {
          files: generatedFiles
        },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via v2.9 Stack Safe Agent" }
      };

    } catch (error: any) {
      console.error("❌ Erro fatal no Agente:", error);
      throw error;
    }
  }

  // --- STEPS ---

  private async runAnalysisStep(prompt: string) {
    const systemPrompt = `Analista Sênior. Responda JSON. { "summary": "string", "complexity": "Baixa"|"Média"|"Alta"|"Crítica", "assumptions": ["string"] }`;
    return this.callLLM(systemPrompt, prompt, AnalysisSchema, "Analysis");
  }

  private async runProductStep(prompt: string, analysis: any) {
    const systemPrompt = `Product Owner. Responda JSON. { "epics": [{ "title": "string", "context": "string", "requirements": ["string"] }] }`;
    return this.callLLM(systemPrompt, prompt, ProductPlanSchema, "Product");
  }

  private async runArchitectureStep(prompt: string, productPlan: any) {
    const context = (productPlan.epics || []).map((e: any) => e.title).join(", ");
    const systemPrompt = `Arquiteto. Defina stack e arquivos para: ${context}. Responda JSON. { "stack": "string", "manifest": [{ "path": "string", "purpose": "string", "criticality": "Core"|"Support"|"Config" }] }`;
    return this.callLLM(systemPrompt, prompt, ArchitectureSchema, "Architecture");
  }

  private async generateFileContent(fileSpec: ManifestItemStrict, stack: string, originalPrompt: string) {
    const systemPrompt = `Dev Sênior. Implemente ${fileSpec.path}. Stack: ${stack}. Responda JSON. { "path": "${fileSpec.path}", "code": "string", "explanation": "string" }`;
    
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

    const systemPrompt = `PO Técnico. Detalhe HUs. Responda JSON: { "userStories": [...] }. Preencha todos os campos.`;

    const result = await this.callLLM(systemPrompt, context, UserStoriesSchema, "User Stories");
    
    return (result.userStories || []).map(story => ({
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
log_ok "Agent v2.9 (Stack Fix) aplicado."

# Recompilação
log_info "Recompilando analysis-agent..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b || { echo "Erro na compilação!"; exit 1; }
log_ok "Compilado com sucesso."

# Reinicia server
log_info "Reiniciando servidor..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Pronto. Execute 'pnpm --filter @mini-ide/server start'."
