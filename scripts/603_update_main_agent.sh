#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Atualizando agent.ts para usar a Nova Arquitetura..."

cat > "$AGENT_FILE" << 'EOF'
import { LLMService } from "./services/llm/llm-service";
import { ProjectBuilder } from "./core/project-builder";
import { z } from "zod";
import { SmartParser } from "./modules/parser/smart-parser";

// Contexto vindo do Frontend (opcional)
interface ProjectContext {
  files: Array<{ path: string; purpose?: string }>;
  summary?: string;
}

/**
 * AnalysisAgent (v2.0 - Refactored Architecture)
 * Atua como fachada (Facade) para os serviços internos.
 * Responsável apenas pelo Roteamento de Intenção (Chat vs Projeto).
 */
export class AnalysisAgent {
  private llm: LLMService;
  private builder: ProjectBuilder;

  constructor(apiKey: string, baseURL?: string) {
    this.llm = new LLMService({ apiKey, baseURL });
    this.builder = new ProjectBuilder(this.llm);
  }

  async analyze(userPrompt: string, context?: ProjectContext): Promise<any> {
    try {
      // 1. Detectar Intenção
      const intent = await this.detectIntent(userPrompt);
      console.log(`🎯 Intenção: ${intent.type}`);

      // 2. Roteamento
      if (intent.type === "QUESTION") {
        return this.handleChat(userPrompt, context);
      }

      // 3. Execução de Engenharia (New Project ou Refinement)
      const projectResult = await this.builder.build(userPrompt);
      
      return {
        ...projectResult,
        summary: projectResult.analysis.summary,
        requestId: `req-${Date.now()}`,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error("❌ Erro no Agente:", error);
      throw error; // Servidor trata e devolve 500/502
    }
  }

  private async detectIntent(prompt: string) {
    const sys = `Classifique a intenção. JSON: { "type": "NEW_PROJECT"|"QUESTION"|"REFINEMENT", "reasoning": "string" }`;
    const raw = await this.llm.generateJSON(sys, prompt, 0.0);
    
    const Schema = z.object({ 
      type: z.enum(["NEW_PROJECT", "QUESTION", "REFINEMENT"]), 
      reasoning: z.string() 
    });
    
    return SmartParser.parse(raw, Schema, { type: "NEW_PROJECT", reasoning: "Fallback" });
  }

  private async handleChat(prompt: string, context?: ProjectContext) {
    let sys = "Assistente técnico Mini-IDE.";
    if (context?.files?.length) {
      const list = context.files.map(f => f.path).join("\n");
      sys += `\nContexto Arquivos:\n${list}`;
    }
    
    const answer = await this.llm.generateText(sys, prompt);
    
    // Retorna estrutura vazia para não apagar a UI
    return {
      summary: answer,
      requestId: `chat-${Date.now()}`,
      timestamp: new Date().toISOString(),
      engine: { files: [] }, // UI ignora array vazio
      product: { userStories: [] }
    };
  }
}
EOF

log_ok "Agente Refatorado com sucesso."
log_info "Arquitetura Limpa implementada."
