#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Atualizando Schema do Agente para suportar prioridade P3..."

# Reescreve o agent.ts com o Schema expandido
cat > "$AGENT_FILE" << 'EOF'
import { OpenAI } from "openai";
import { z } from "zod";

/**
 * DEFINIÇÃO DE SCHEMAS E TIPOS
 * Usamos Zod para garantir que o JSON retornado pela IA siga a estrutura estrita.
 */

// 1. Schema do Blueprint (Planejamento)
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

// Inferência de tipos para uso no código
type Blueprint = z.infer<typeof BlueprintSchema>;
type ManifestItem = Blueprint['engine']['manifest'][number];

// 2. Schema do Conteúdo de Arquivo (Execução)
const FileContentSchema = z.object({
  path: z.string(),
  code: z.string(),
  explanation: z.string().optional()
});
type FileContent = z.infer<typeof FileContentSchema>;

// 3. Schema de HUs Detalhadas (Produto)
// CORREÇÃO: Adicionado "P3" ao enum de prioridade para evitar crash
const UserStoriesSchema = z.object({
  userStories: z.array(z.object({
    id: z.string(),
    title: z.string(),
    gherkin: z.string(),
    priority: z.enum(["P0", "P1", "P2", "P3"]) 
  }))
});
type UserStories = z.infer<typeof UserStoriesSchema>;

/**
 * AnalysisAgent (v2.2 - Blueprint Architecture - Robust Schema)
 */
export class AnalysisAgent {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  /**
   * Executa a cadeia de pensamento: Blueprint -> Code Generation -> User Stories
   */
  async analyze(userPrompt: string, budgetContext: any): Promise<any> {
    console.log("🚀 [Agent] Iniciando Fase 17: Blueprint Strategy (Robust Mode)");

    // Etapa 1: O Arquiteto (Gera o Plano)
    const blueprint = await this.generateBlueprint(userPrompt);
    console.log(`📋 [Agent] Blueprint gerado: ${blueprint.engine.manifest.length} arquivos planejados.`);

    // Etapa 2: A Fábrica (Gera o Código)
    const criticalFiles: ManifestItem[] = blueprint.engine.manifest
        .filter((f: ManifestItem) => f.criticality === "Core" || f.criticality === "Config")
        .slice(0, 8); // Hard limit MVP

    console.log(`🏭 [Agent] Iniciando geração de ${criticalFiles.length} arquivos críticos...`);
    
    const generatedFiles = await Promise.all(
      criticalFiles.map((fileSpec: ManifestItem) => 
        this.generateFileContent(fileSpec, blueprint.engine.stack, userPrompt)
      )
    );

    // Etapa 3: O PO (Gera HUs Detalhadas)
    console.log(`Product [Agent] Refinando Backlog a partir dos épicos...`);
    const detailedHUs = await this.expandEpicsToStories(blueprint.product.epics);

    // Consolidação Final
    return {
      analysis: {
        summary: blueprint.analysis.summary,
        problem: userPrompt,
        objectives: ["Blueprint Strategy Applied", "Robust Schema P3"],
        risks: ["Limited file generation (MVP limit 8)"]
      },
      product: {
        userStories: detailedHUs
      },
      architect: {
        diagram: "Gerado via Blueprint Strategy (v0.16.2)",
        stack: blueprint.engine.stack
      },
      engine: {
        files: generatedFiles
      },
      ux: { components: [] },
      quality: { tests: [] },
      ops: { scripts: [] },
      fenix: { notes: "Generated via v0.16.2 Robust Architecture" }
    };
  }

  // --- Métodos Privados (Helpers de IA) ---

  private async generateBlueprint(prompt: string): Promise<Blueprint> {
    const systemPrompt = `
      VOCÊ É O ARQUITETO SÊNIOR DO MINI-IDE.
      SUA MISSÃO: Planejar a estrutura de um projeto de software complexo.
      
      Responda APENAS com um JSON válido seguindo esta estrutura estrita.
      NÃO GERE CÓDIGO AINDA. Apenas o manifesto de arquivos.
      
      Estrutura JSON esperada:
      {
        "analysis": { "summary": "...", "complexity": "Baixa"|"Média"|"Alta" },
        "product": { "epics": [ { "title": "...", "context": "...", "requirements": ["..."] } ] },
        "engine": { 
          "stack": "...", 
          "manifest": [ { "path": "src/index.ts", "purpose": "...", "criticality": "Core"|"Support"|"Config" } ] 
        }
      }
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

    const content = completion.choices[0].message.content || "{}";
    return BlueprintSchema.parse(JSON.parse(content));
  }

  private async generateFileContent(fileSpec: ManifestItem, stack: string, originalPrompt: string) {
    const systemPrompt = `
      VOCÊ É A PERSONA ENGINE (DESENVOLVEDOR SENIOR).
      Sua tarefa: Implementar UM ÚNICO arquivo com perfeição.
      Responda APENAS JSON.
      
      Contexto: ${stack}
      Arquivo: ${fileSpec.path}
      Objetivo: ${fileSpec.purpose}
      
      JSON Esperado:
      {
        "path": "${fileSpec.path}",
        "code": "... string com o código completo ...",
        "explanation": "..."
      }
    `;

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Gere o JSON do arquivo." }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content || "{}";
    const parsed = FileContentSchema.parse(JSON.parse(content));

    return {
      path: parsed.path,
      content: parsed.code,
      language: this.detectLanguage(parsed.path)
    };
  }

  private async expandEpicsToStories(epics: any[]): Promise<UserStories['userStories']> {
    if (epics.length === 0) return [];
    const mainEpic = epics[0];

    const systemPrompt = `
      VOCÊ É O PRODUCT OWNER.
      Converta o Épico em Histórias de Usuário. Responda APENAS JSON.
      
      Épico: ${mainEpic.title}
      Contexto: ${mainEpic.context}
      
      JSON Esperado:
      {
        "userStories": [
          { "id": "HU-001", "title": "...", "gherkin": "Dado... Quando... Então...", "priority": "P0"|"P1"|"P2"|"P3" }
        ]
      }
    `;

    const completion = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Gere as HUs." }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content || "{}";
    return UserStoriesSchema.parse(JSON.parse(content)).userStories;
  }

  private detectLanguage(path: string): string {
    if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
    if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
    if (path.endsWith(".json")) return "json";
    if (path.endsWith(".md")) return "markdown";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".html")) return "html";
    if (path.endsWith(".sh")) return "bash";
    return "plaintext";
  }
}
EOF
log_ok "Agent Schema atualizado (P3 support)."

# Recompilação rápida do analysis-agent
log_info "Recompilando analysis-agent..."
cd packages/analysis-agent
if ../../node_modules/.bin/tsc -b; then
    log_ok "Analysis Agent recompilado."
else
    echo "Erro na compilação do Analysis Agent"
    exit 1
fi
cd ../..

# Apenas restartar o processo do servidor se necessário (se estiver rodando via script externo, precisa matar e subir de novo)
log_info "Matando servidor antigo na porta 3200..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

# Validação (Smoke Test)
log_info "Validando com Pipeline..."
bash ./42_pipeline_checklist.sh
