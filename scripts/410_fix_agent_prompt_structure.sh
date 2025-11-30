#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Aplicando Correção de Prompt Estruturado (Explicit JSON Schemas)..."

# Reescreve o agent.ts com prompts explícitos e tratamento de erro melhorado
cat > "$AGENT_FILE" << 'EOF'
import { OpenAI } from "openai";
import { z } from "zod";

/**
 * SCHEMAS (Split Strategy)
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

export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(userPrompt: string, budgetContext: any): Promise<any> {
    console.log("🚀 [Agent v2.5] Iniciando Pipeline Sequencial com Prompts Estruturados");

    try {
      // 1. Análise Inicial
      console.log("🔍 [1/4] Executando Análise de Requisitos...");
      const analysis = await this.runAnalysisStep(userPrompt);

      // 2. Planejamento de Produto
      console.log("💡 [2/4] Definindo Estratégia de Produto...");
      const productPlan = await this.runProductStep(userPrompt, analysis);

      // 3. Arquitetura Técnica
      console.log("🏗️ [3/4] Desenhando Arquitetura...");
      const architecture = await this.runArchitectureStep(userPrompt, productPlan);

      console.log(`📋 [Blueprint] ${architecture.manifest.length} arquivos planejados.`);

      // 4. Fábrica de Código
      // Ordena por criticidade e limita a 6 arquivos para garantir resposta no tempo limite
      const criticalFiles = architecture.manifest
          .sort((a, b) => {
             if (a.criticality === 'Config') return -1;
             if (b.criticality === 'Config') return 1;
             return 0;
          })
          .slice(0, 6); 

      console.log(`🏭 [4/4] Gerando ${criticalFiles.length} arquivos críticos...`);
      const generatedFiles = await Promise.all(
        criticalFiles.map(fileSpec => this.generateFileContent(fileSpec, architecture.stack, userPrompt))
      );

      // 5. Detalhamento de HUs
      console.log(`📜 [Final] Expandindo Histórias de Usuário...`);
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);

      return {
        analysis: {
          summary: analysis.summary,
          problem: userPrompt,
          objectives: ["Structured Prompt Success"],
          risks: analysis.assumptions
        },
        product: {
          userStories: detailedHUs
        },
        architect: {
          diagram: architecture.diagram || "Arquitetura v2.5",
          stack: architecture.stack
        },
        engine: {
          files: generatedFiles
        },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via v2.5 Structured Prompts" }
      };

    } catch (error: any) {
      console.error("❌ Erro fatal no Agente:", error);
      throw error; // Repassa o erro para o servidor retornar 502 e mostrar no log
    }
  }

  // --- PASSOS DO PIPELINE (Com Prompts Explícitos) ---

  private async runAnalysisStep(prompt: string) {
    const systemPrompt = `
      Você é um Analista Sênior.
      Analise o pedido do usuário.
      
      OBRIGATÓRIO: Retorne APENAS um JSON com esta estrutura exata:
      {
        "summary": "Resumo técnico do pedido",
        "complexity": "Baixa" | "Média" | "Alta" | "Crítica",
        "assumptions": ["Suposição 1", "Suposição 2"]
      }
    `;
    return this.callLLM(systemPrompt, prompt, AnalysisSchema, "Analysis");
  }

  private async runProductStep(prompt: string, analysis: any) {
    const systemPrompt = `
      Você é um Product Owner. Defina os Épicos.
      Contexto: ${analysis.summary}
      
      OBRIGATÓRIO: Retorne APENAS um JSON com esta estrutura:
      {
        "epics": [
          {
            "title": "Nome do Épico",
            "context": "Por que este épico existe?",
            "requirements": ["Req 1", "Req 2"]
          }
        ]
      }
    `;
    return this.callLLM(systemPrompt, prompt, ProductPlanSchema, "Product");
  }

  private async runArchitectureStep(prompt: string, productPlan: any) {
    const epicsSummary = productPlan.epics.map((e: any) => e.title).join(", ");
    const systemPrompt = `
      Você é um Arquiteto de Software.
      Defina a stack e os arquivos necessários para: ${epicsSummary}.
      
      OBRIGATÓRIO: Retorne APENAS um JSON com esta estrutura:
      {
        "stack": "Ex: Node.js + React",
        "manifest": [
          {
            "path": "src/index.ts",
            "purpose": "Entrypoint da API",
            "criticality": "Config" | "Core" | "Support"
          }
        ]
      }
      Nota: Inclua package.json e tsconfig.json como 'Config'.
    `;
    return this.callLLM(systemPrompt, prompt, ArchitectureSchema, "Architecture");
  }

  private async generateFileContent(fileSpec: ManifestItem, stack: string, originalPrompt: string) {
    const systemPrompt = `
      Você é um Desenvolvedor Sênior.
      Implemente o arquivo: ${fileSpec.path}
      Propósito: ${fileSpec.purpose}
      Stack: ${stack}
      
      OBRIGATÓRIO: Retorne APENAS um JSON com esta estrutura:
      {
        "path": "${fileSpec.path}",
        "code": "código completo aqui...",
        "explanation": "breve explicação"
      }
    `;
    return this.callLLM(systemPrompt, "Codifique este arquivo.", FileContentSchema, `File: ${fileSpec.path}`);
  }

  private async expandEpicsToStories(epics: any[]): Promise<UserStories['userStories']> {
    const targetEpics = epics.slice(0, 3);
    const context = targetEpics.map((e: any) => "${e.title}: ${e.context}").join("\n");

    const systemPrompt = `
      Você é um PO Técnico. Detalhe as Histórias de Usuário.
      
      OBRIGATÓRIO: Retorne APENAS um JSON com esta estrutura para CADA história:
      {
        "userStories": [
          {
            "id": "HU-001",
            "title": "Título curto",
            "priority": "P0" | "P1" | "P2" | "P3",
            "role": "Como [ator]",
            "action": "Quero [ação]",
            "benefit": "Para [valor]",
            "acceptanceCriteria": ["Critério 1", "Critério 2"],
            "functionalRequirements": ["Req Funcional 1"],
            "securityRequirements": ["Req Segurança 1"]
          }
        ]
      }
    `;
    return (await this.callLLM(systemPrompt, context, UserStoriesSchema, "User Stories")).userStories;
  }

  // --- Helper Genérico de Chamada com Validação e Log ---
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
      
      // Tenta parsear. Se falhar, o Zod lança erro detalhado.
      return schema.parse(JSON.parse(content));

    } catch (error) {
      console.error(`❌ Falha no passo [${contextName}]:`);
      if (error instanceof z.ZodError) {
        console.error("Erro de Validação Zod:", JSON.stringify(error.format(), null, 2));
      } else {
        console.error("Erro desconhecido:", error);
      }
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
log_ok "Agent.ts atualizado com Prompt Engineering estrito."

# Recompilação
log_info "Recompilando analysis-agent..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b || { echo "Erro na compilação!"; exit 1; }
log_ok "Compilado."

# Reinicia server
log_info "Preparando ambiente..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Correção aplicada com sucesso. Reinicie o servidor."
