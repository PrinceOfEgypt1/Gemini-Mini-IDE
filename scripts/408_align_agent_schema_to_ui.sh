#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Iniciando Realinhamento de Schema (Agent -> UI Contract)..."

# Reescreve o agent.ts com o Schema Completo que a UI exige
cat > "$AGENT_FILE" << 'EOF'
import { OpenAI } from "openai";
import { z } from "zod";

/**
 * DEFINIÇÃO DE SCHEMAS E TIPOS (Fase 17.2 - UI Alignment)
 * O Schema agora reflete estritamente o que o Frontend espera para renderizar os cards ricos.
 */

// 1. Blueprint (Mantido, focado em arquitetura)
const BlueprintSchema = z.object({
  analysis: z.object({
    summary: z.string(),
    complexity: z.enum(["Baixa", "Média", "Alta", "Crítica"]),
  }),
  product: z.object({
    epics: z.array(z.object({
      title: z.string(),
      context: z.string(),
      requirements: z.array(z.string())
    }))
  }),
  engine: z.object({
    stack: z.string(),
    manifest: z.array(z.object({
      path: z.string(),
      purpose: z.string(),
      criticality: z.enum(["Core", "Support", "Config"]),
    }))
  })
});

type Blueprint = z.infer<typeof BlueprintSchema>;
type ManifestItem = Blueprint['engine']['manifest'][number];

// 2. Conteúdo de Arquivo (Mantido)
const FileContentSchema = z.object({
  path: z.string(),
  code: z.string(),
  explanation: z.string().optional()
});

// 3. HUs Detalhadas (EXPANDIDO PARA ATENDER A UI)
// A UI espera campos separados para renderizar os cards corretamente.
const UserStoriesSchema = z.object({
  userStories: z.array(z.object({
    id: z.string(), // Ex: HU-001
    title: z.string(),
    priority: z.enum(["P0", "P1", "P2", "P3"]),
    
    // Campos estruturados do formato "Como/Quero/Para"
    role: z.string(),   // "Como usuário..."
    action: z.string(), // "Quero visualizar..."
    benefit: z.string(),// "Para decidir..."
    
    // Listas detalhadas para os cards expandidos
    acceptanceCriteria: z.array(z.string()),
    functionalRequirements: z.array(z.string()),
    securityRequirements: z.array(z.string()).optional().default([]),
    
    // Contexto adicional
    businessContext: z.string().optional()
  }))
});
type UserStories = z.infer<typeof UserStoriesSchema>;

/**
 * AnalysisAgent (v2.3 - UI Aligned Architecture)
 */
export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(userPrompt: string, budgetContext: any): Promise<any> {
    console.log("🚀 [Agent] Iniciando Análise: UI Alignment Mode");

    // 1. Arquiteto
    const blueprint = await this.generateBlueprint(userPrompt);
    console.log(`📋 [Blueprint] ${blueprint.engine.manifest.length} arquivos, ${blueprint.product.epics.length} épicos.`);

    // 2. Fábrica (Código)
    // Prioriza Configuração e Core para garantir que o projeto "rode"
    const criticalFiles = blueprint.engine.manifest
        .sort((a, b) => {
            if (a.criticality === 'Config') return -1;
            if (b.criticality === 'Config') return 1;
            return 0;
        })
        .slice(0, 10); // Aumentado limite para 10 para tentar trazer mais contexto

    console.log(`🏭 [Factory] Gerando ${criticalFiles.length} arquivos...`);
    
    const generatedFiles = await Promise.all(
      criticalFiles.map(fileSpec => this.generateFileContent(fileSpec, blueprint.engine.stack, userPrompt))
    );

    // 3. Produto (HUs Ricas)
    console.log(`Product [Agent] Gerando HUs detalhadas para a UI...`);
    const detailedHUs = await this.expandEpicsToStories(blueprint.product.epics);

    // Consolidação
    return {
      analysis: {
        summary: blueprint.analysis.summary,
        problem: userPrompt,
        objectives: ["Full UI Compatibility", "Structured HUs"],
        risks: []
      },
      product: {
        userStories: detailedHUs
      },
      architect: {
        diagram: "Arquitetura definida via Blueprint v2.3",
        stack: blueprint.engine.stack
      },
      engine: {
        files: generatedFiles
      },
      ux: { components: [] },
      quality: { tests: [] },
      ops: { scripts: [] },
      fenix: { notes: "Output totalmente alinhado com UserStoryCard.tsx" }
    };
  }

  // --- Helpers ---

  private async generateBlueprint(prompt: string): Promise<Blueprint> {
    const systemPrompt = `
      VOCÊ É O ARQUITETO DE SOFTWARE (STAFF LEVEL).
      Analise o pedido e defina a estrutura técnica.
      
      REGRAS DE MANIFESTO:
      1. Inclua SEMPRE arquivos de configuração vitais: package.json, tsconfig.json, .env.example.
      2. Estruture pastas com padrão de mercado (src/, tests/, config/).
      3. Não alucine arquivos desnecessários. Foco no MVP funcional.
    `;

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    return BlueprintSchema.parse(JSON.parse(completion.choices[0].message.content || "{}"));
  }

  private async generateFileContent(fileSpec: ManifestItem, stack: string, originalPrompt: string) {
    const systemPrompt = `
      VOCÊ É O DESENVOLVEDOR SENIOR (PERSONA ENGINE).
      Contexto: ${stack}
      Arquivo: ${fileSpec.path}
      Propósito: ${fileSpec.purpose}
      
      Gere o código completo, funcional e pronto para produção.
      Inclua Imports, Tipagem (se TS) e Comentários JSDoc.
      Retorne JSON: { "path": "...", "code": "...", "explanation": "..." }
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
    if (epics.length === 0) return [];
    // Processa todos os épicos para ter backlog completo
    const context = epics.map(e => `${e.title}: ${e.context}`).join("\n");

    const systemPrompt = `
      VOCÊ É O PRODUCT OWNER TÉCNICO.
      Gere Histórias de Usuário DETALHADAS baseadas nos Épicos fornecidos.
      
      IMPORTANTE: A UI exige campos separados. Não agrupe tudo em string única.
      
      Preencha para cada HU:
      - role: Quem é o ator? (ex: "desenvolvedor", "admin")
      - action: O que ele quer fazer? (ex: "clicar no botão salvar")
      - benefit: Qual o valor? (ex: "para persistir os dados")
      - acceptanceCriteria: Lista de critérios Gherkin ou verificáveis.
      - functionalRequirements: O que o sistema deve fazer tecnicamente.
      - securityRequirements: Validações, auth, criptografia.
      
      IDs sequenciais: HU-001, HU-002...
    `;

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Contexto dos Épicos:\n${context}` }
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
    return "plaintext";
  }
}
EOF
log_ok "Schema do Agente realinhado com a UI."

# Recompilação obrigatória
log_info "Recompilando analysis-agent..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b || { echo "Erro na compilação!"; exit 1; }
log_ok "Compilado."

# Reinicia server se necessário
log_info "Preparando reinício..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Correção aplicada. Reinicie o servidor com 'pnpm --filter @mini-ide/server start'."
