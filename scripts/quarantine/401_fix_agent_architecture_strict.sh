#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

BASE_DIR="packages/analysis-agent/src"
AGENT_FILE="$BASE_DIR/agent.ts"
INDEX_FILE="$BASE_DIR/index.ts"

log_info "Iniciando correção de tipagem e arquitetura do Agent..."

# 1. Reescrevendo agent.ts com implementação 'Rock Solid' (JSON Mode + Zod Parse manual)
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

// Inferência de tipos para uso no código (evita 'any')
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
const UserStoriesSchema = z.object({
  userStories: z.array(z.object({
    id: z.string(),
    title: z.string(),
    gherkin: z.string(),
    priority: z.enum(["P0", "P1", "P2"])
  }))
});
type UserStories = z.infer<typeof UserStoriesSchema>;

/**
 * AnalysisAgent (v2.1 - Blueprint Architecture - Strict Implementation)
 * 
 * Implementação robusta que não depende de tipos experimentais do SDK da OpenAI.
 * Usa 'response_format: { type: "json_object" }' e validação manual Zod.
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
    console.log("🚀 [Agent] Iniciando Fase 17: Blueprint Strategy (Safe Mode)");

    // Etapa 1: O Arquiteto (Gera o Plano)
    const blueprint = await this.generateBlueprint(userPrompt);
    console.log(`📋 [Agent] Blueprint gerado: ${blueprint.engine.manifest.length} arquivos planejados.`);

    // Etapa 2: A Fábrica (Gera o Código)
    // Filtragem tipada explicitamente para evitar erro TS7006
    const criticalFiles: ManifestItem[] = blueprint.engine.manifest
        .filter((f: ManifestItem) => f.criticality === "Core" || f.criticality === "Config")
        .slice(0, 8); // Hard limit MVP

    console.log(`🏭 [Agent] Iniciando geração de ${criticalFiles.length} arquivos críticos...`);
    
    // Execução paralela
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
        objectives: ["Blueprint Strategy Applied", "Strict Typing"],
        risks: ["Limited file generation (MVP limit 8)"]
      },
      product: {
        userStories: detailedHUs
      },
      architect: {
        diagram: "Gerado via Blueprint Strategy (v0.16.1)",
        stack: blueprint.engine.stack
      },
      engine: {
        files: generatedFiles
      },
      // Mocks de compatibilidade
      ux: { components: [] },
      quality: { tests: [] },
      ops: { scripts: [] },
      fenix: { notes: "Generated via v0.16.1 Strict Architecture" }
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
    // Validação Zod lança erro se o JSON estiver incorreto
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
          { "id": "HU-001", "title": "...", "gherkin": "Dado... Quando... Então...", "priority": "P0" }
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
log_ok "agent.ts reescrito com tipagem estrita e JSON Mode."

# 2. Corrigindo index.ts para refletir as mudanças (Remover AgentConfig)
cat > "$INDEX_FILE" << 'EOF'
export { AnalysisAgent } from "./agent";
// AgentConfig removido pois não é mais exportado pelo agent.ts
EOF
log_ok "index.ts corrigido."

# 3. Executando apenas o typecheck do pacote analysis-agent para validação rápida
log_info "Verificando compilação do pacote analysis-agent..."
cd packages/analysis-agent
if ../../node_modules/.bin/tsc --noEmit; then
    log_ok "Compilação do analysis-agent BEM SUCEDIDA!"
else
    echo -e "${RED}[FAIL] Erro de compilação ainda persiste.${NC}"
    exit 1
fi

# 4. Executando o pipeline completo para garantir que não quebramos o resto
log_info "Executando pipeline de integração..."
cd ../..
bash ./42_pipeline_checklist.sh
