#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

BASE_DIR="packages/analysis-agent/src"

log_info "Iniciando Passo 2/4: Isolamento de LLM e Schemas..."

# 1. Criar diretório de Definições
mkdir -p "$BASE_DIR/core/definitions"

# 2. Centralizar Schemas (A Verdade Única dos Dados)
log_info "Extraindo Schemas Zod..."
cat > "$BASE_DIR/core/definitions/schemas.ts" << 'EOF'
import { z } from "zod";

// --- Enum Types ---
export const ComplexityEnum = z.enum(["Baixa", "Média", "Alta", "Crítica"]);
export const PriorityEnum = z.enum(["P0", "P1", "P2", "P3"]);
export const CriticalityEnum = z.enum(["Core", "Support", "Config"]);

// --- Analysis Schemas ---
export const AnalysisSchema = z.object({ 
  summary: z.string().default("Análise indisponível"), 
  complexity: ComplexityEnum.default("Média"), 
  assumptions: z.array(z.string()).default([]) 
});

// --- Product Schemas ---
export const EpicSchema = z.object({ 
  title: z.string().default("Épico Genérico"), 
  context: z.string().default(""), 
  requirements: z.array(z.string()).default([]) 
});

export const ProductPlanSchema = z.object({ 
  epics: z.array(EpicSchema).default([]) 
});

// --- Architecture Schemas ---
export const ManifestItemSchema = z.object({ 
  path: z.string(), 
  purpose: z.string().default("Arquivo de código"), 
  criticality: CriticalityEnum.default("Core") 
});

export const ArchitectureSchema = z.object({ 
  stack: z.string().default("Node.js + TypeScript"), 
  diagram: z.string().optional(), 
  manifest: z.array(ManifestItemSchema).default([]) 
});

// --- Execution Schemas ---
export const FileContentSchema = z.object({ 
  path: z.string(), 
  code: z.string().default("// Código não gerado corretamente"), 
  explanation: z.string().optional() 
});

export const UserStorySchema = z.object({ 
  id: z.string().default("HU-000"), 
  title: z.string().default("História de Usuário"), 
  priority: PriorityEnum.default("P2"), 
  role: z.string().default("usuário"), 
  action: z.string().default("realizar ação"), 
  benefit: z.string().default("obter benefício"), 
  acceptanceCriteria: z.array(z.string()).default([]), 
  functionalRequirements: z.array(z.string()).default([]), 
  securityRequirements: z.array(z.string()).default([]), 
  businessContext: z.string().default("") 
});

export const UserStoriesSchema = z.object({ 
  userStories: z.array(UserStorySchema).default([]) 
});

// Types Inference
export type Analysis = z.infer<typeof AnalysisSchema>;
export type ProductPlan = z.infer<typeof ProductPlanSchema>;
export type Architecture = z.infer<typeof ArchitectureSchema>;
export type ManifestItem = z.infer<typeof ManifestItemSchema>;
export type FileContent = z.infer<typeof FileContentSchema>;
export type UserStory = z.infer<typeof UserStorySchema>;
EOF

# 3. Implementar LLM Service (O Adaptador)
log_info "Criando LLM Service..."
cat > "$BASE_DIR/services/llm/llm-service.ts" << 'EOF'
import { OpenAI } from "openai";

export interface LLMConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
}

export class LLMService {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig) {
    this.client = new OpenAI({ 
      apiKey: config.apiKey, 
      baseURL: config.baseURL 
    });
    this.model = config.model || "gpt-4o";
  }

  /**
   * Gera uma resposta em formato JSON forçado.
   * @param systemPrompt O "cérebro" da operação (quem é você).
   * @param userPrompt A tarefa específica.
   * @param temperature Determinismo (0.0 = robô, 0.7 = criativo).
   */
  async generateJSON(systemPrompt: string, userPrompt: string, temperature: number = 0.2): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: temperature
      });

      return response.choices[0].message.content || "{}";
    } catch (error: any) {
      // Tratamento unificado de erros de API
      if (error.status === 401) throw new Error("LLM Authentication Failed: Check API Key");
      if (error.status === 429) throw new Error("LLM Rate Limit Exceeded");
      throw error;
    }
  }

  /**
   * Gera uma resposta de texto livre (Chat).
   */
  async generateText(systemPrompt: string, userPrompt: string, temperature: number = 0.7): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: temperature
    });

    return response.choices[0].message.content || "";
  }
}
EOF

# 4. Atualizar index.ts do pacote para exportar os novos módulos (facilita testes)
log_info "Atualizando exports..."
cat >> "$BASE_DIR/index.ts" << 'EOF'
export { LLMService } from "./services/llm/llm-service";
export * from "./core/definitions/schemas";
EOF

log_ok "Passo 2 concluído: Schemas e LLM Service criados."
echo "Próximo passo: Implementar o ProjectBuilder (O Maestro)."
