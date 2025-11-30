#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

BASE_DIR="packages/analysis-agent/src"

log_info "Iniciando Passo 3: Implementação do ProjectBuilder..."

# 1. Criar o ProjectBuilder (O motor de engenharia)
cat > "$BASE_DIR/core/project-builder.ts" << 'EOF'
import { LLMService } from "../services/llm/llm-service";
import { SmartParser } from "../modules/parser/smart-parser";
import { TemplateEngine } from "../modules/templates/template-engine";
import { 
  AnalysisSchema, ProductPlanSchema, ArchitectureSchema, 
  FileContentSchema, UserStoriesSchema,
  ManifestItem, Architecture, UserStory
} from "./definitions/schemas";

export class ProjectBuilder {
  private llm: LLMService;

  constructor(llm: LLMService) {
    this.llm = llm;
  }

  /**
   * Executa o pipeline completo de engenharia de software.
   */
  async build(userPrompt: string) {
    // 1. Análise
    console.log("🔍 [Builder] Analisando requisitos...");
    const analysis = await this.stepAnalysis(userPrompt);

    // 2. Produto
    console.log("💡 [Builder] Definindo produto...");
    const productPlan = await this.stepProduct(userPrompt, analysis);

    // 3. Arquitetura (Híbrida)
    console.log("🏗️ [Builder] Projetando arquitetura...");
    const architecture = await this.stepArchitecture(userPrompt, productPlan);
    
    // MERGE: Template Estático + Sugestões da IA
    const baseFiles = TemplateEngine.getBaseFiles(architecture.stack);
    const aiFiles = architecture.manifest;
    
    // Prioriza a IA se houver conflito de caminho, mas garante que a base exista
    const finalManifest: ManifestItem[] = [...baseFiles];
    aiFiles.forEach(aiFile => {
      if (!finalManifest.some(base => base.path === aiFile.path)) {
        finalManifest.push(aiFile);
      }
    });

    console.log(`📋 [Builder] Manifesto Final: ${finalManifest.length} arquivos.`);

    // 4. Engenharia (Geração de Código em Lotes)
    const files = await this.stepCodeGeneration(finalManifest, architecture.stack, userPrompt);

    // 5. Detalhamento (HUs)
    console.log("📜 [Builder] Detalhando Histórias de Usuário...");
    const userStories = await this.stepUserStories(productPlan.epics);

    return {
      analysis,
      product: { userStories },
      architect: { diagram: architecture.diagram, stack: architecture.stack },
      engine: { files },
      // Metadados para o frontend não quebrar
      ux: { components: [] },
      quality: { tests: [] },
      ops: { scripts: [] },
      fenix: { notes: "Refactored Architecture v2.0" }
    };
  }

  // --- STEPS INDIVIDUAIS ---

  private async stepAnalysis(prompt: string) {
    const sys = `Analista Sênior. Responda JSON. { "summary": "string", "complexity": "Baixa"|"Média"|"Alta"|"Crítica", "assumptions": ["string"] }`;
    const raw = await this.llm.generateJSON(sys, prompt, 0.0);
    return SmartParser.parse(raw, AnalysisSchema, { summary: "Erro na análise", complexity: "Média", assumptions: [] });
  }

  private async stepProduct(prompt: string, analysis: any) {
    const sys = `Product Owner. Responda JSON. { "epics": [{ "title": "string", "context": "string", "requirements": ["string"] }] }`;
    const raw = await this.llm.generateJSON(sys, `Contexto: ${analysis.summary}. Pedido: ${prompt}`, 0.0);
    return SmartParser.parse(raw, ProductPlanSchema, { epics: [] });
  }

  private async stepArchitecture(prompt: string, plan: any) {
    const context = plan.epics.map((e: any) => e.title).join(", ");
    const sys = `Arquiteto. Responda JSON. { "stack": "string", "manifest": [{ "path": "string", "purpose": "string", "criticality": "Core"|"Support"|"Config" }] }`;
    const raw = await this.llm.generateJSON(sys, `Defina arquivos para: ${context}.`, 0.0);
    return SmartParser.parse(raw, ArchitectureSchema, { stack: "Node.js", manifest: [] });
  }

  private async stepCodeGeneration(manifest: ManifestItem[], stack: string, prompt: string) {
    const batchSize = 5; // Rate Limit Protection
    const results: any[] = [];

    console.log(`🏭 [Factory] Iniciando geração de ${manifest.length} arquivos...`);

    for (let i = 0; i < manifest.length; i += batchSize) {
      const batch = manifest.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        // Se for template com conteúdo estático já definido, usa ele
        // (Feature futura do TemplateEngine, por enquanto gera tudo via IA)
        
        const sys = `Dev Sênior. Stack: ${stack}. Implemente ${item.path}.
        Responda JSON: { "path": "${item.path}", "code": "...", "explanation": "..." }`;
        
        try {
          const raw = await this.llm.generateJSON(sys, "Codifique.", 0.0);
          return SmartParser.parse(raw, FileContentSchema, { 
            path: item.path, 
            code: "// Erro na geração", 
            explanation: "Falha no parse" 
          });
        } catch (e) {
          return { path: item.path, code: "// Erro na API LLM", explanation: String(e) };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // GC Manual para evitar OOM em projetos grandes
      if (global.gc) global.gc();
      await new Promise(r => setTimeout(r, 200)); // Throttle
    }

    return results;
  }

  private async stepUserStories(epics: any[]) {
    const context = epics.slice(0, 10).map((e: any) => e.title).join(", ");
    const sys = `PO Técnico. Detalhe HUs. JSON: { "userStories": [...] }. Preencha todos os campos obrigatórios.`;
    
    const raw = await this.llm.generateJSON(sys, `Contexto: ${context}`, 0.2); // Temp um pouco maior para criatividade
    const result = SmartParser.parse(raw, UserStoriesSchema, { userStories: [] });

    // Sanitização final para garantir que Arrays não sejam null (Defensive Coding)
    return result.userStories.map(s => ({
      ...s,
      securityRequirements: s.securityRequirements || [],
      functionalRequirements: s.functionalRequirements || [],
      acceptanceCriteria: s.acceptanceCriteria || [],
      businessContext: s.businessContext || ""
    }));
  }
}
EOF

log_ok "ProjectBuilder implementado com sucesso."
