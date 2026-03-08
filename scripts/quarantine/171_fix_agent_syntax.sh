#!/usr/bin/env bash
set -e

echo "🚑 [Phase 14] Corrigindo erro de sintaxe no Agente (Escaping de crases)..."

AGENT_FILE="packages/analysis-agent/src/agent.ts"

# ==============================================================================
# 1. Reescrever agent.ts usando 'EOF' (com aspas)
# Isso impede que o Bash tente executar as crases do código
# ==============================================================================
echo "📝 Reescrevendo $AGENT_FILE..."

cat > "$AGENT_FILE" <<'EOF'
import OpenAI from 'openai';
import { z } from 'zod';
import { ConsolidatorService } from './services/consolidator-service';

export interface AgentConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// Schema de Resposta Esperado do LLM (Formato JSON estrito)
const ResponseSchema = z.object({
  summary: z.string(),
  product: z.object({
    userStories: z.array(z.object({
      id: z.string(),
      description: z.string(),
      acceptanceCriteria: z.array(z.string()),
      priority: z.string()
    }))
  }),
  engine: z.object({
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
      language: z.string().optional()
    }))
  })
});

export class AnalysisAgent {
  private openai: OpenAI;
  private model: string;
  private consolidator: ConsolidatorService;

  constructor(config: AgentConfig, tempDir: string) {
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
    });
    this.model = config.model;
    this.consolidator = new ConsolidatorService(tempDir);
  }

  async execute(userPrompt: string) {
    // eslint-disable-next-line no-console
    console.log(`🤖 Agente iniciando análise com modelo: ${this.model}`);

    const systemPrompt = `
      Você é a Mini-IDE, um arquiteto de software sênior e gerador de código.
      Sua missão é receber uma ideia de software e gerar:
      1. Histórias de Usuário (Product).
      2. Código funcional completo (Engine).
      
      Regras:
      - Responda APENAS com um JSON válido.
      - Não inclua markdown code blocks (\`\`\`) no início ou fim.
      - O JSON deve seguir estritamente esta estrutura:
      {
        "summary": "Resumo executivo do que foi feito",
        "product": { "userStories": [...] },
        "engine": { "files": [{ "path": "src/index.js", "content": "..." }] }
      }
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: this.model,
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("LLM retornou resposta vazia.");

      // Parse e Validação
      const rawJson = JSON.parse(content);
      const parsedData = ResponseSchema.parse(rawJson);

      // Materialização (Salvar arquivos no tempDir para o servidor zipar)
      await this.consolidator.saveArtifacts(parsedData);

      return {
        ...parsedData,
        requestId: completion.id,
        timestamp: new Date().toISOString(),
        // Estimativa simples
        inputLength: userPrompt.length,
        outputLength: content.length
      };

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("❌ Erro no Agente:", error);
      throw error;
    }
  }
}
EOF

# ==============================================================================
# 2. Validação
# ==============================================================================
echo "🏗️  Tentando compilar o Agente novamente..."
pnpm --filter @mini-ide/analysis-agent build

echo "✅ Sintaxe do Agente corrigida com sucesso."
