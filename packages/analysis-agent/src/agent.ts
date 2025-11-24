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
      acceptanceCriteria: z.array(z.string()).optional(), // Tornando opcional para flexibilidade
      priority: z.string().optional()
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
      Você é a Mini-IDE, um arquiteto de software sênior.
      Gere um projeto completo com base no pedido do usuário.
      
      FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
      {
        "summary": "Texto curto descrevendo a solução",
        "product": {
          "userStories": [
            {
              "id": "HU-001",
              "description": "Como usuário, quero fazer login...",
              "priority": "High",
              "acceptanceCriteria": ["Deve validar email", "Deve ter captcha"]
            }
          ]
        },
        "engine": {
          "files": [
            {
              "path": "README.md",
              "content": "# Título do Projeto..."
            },
            {
              "path": "src/index.js",
              "content": "console.log('Hello World');"
            }
          ]
        }
      }

      REGRAS CRÍTICAS:
      1. Responda APENAS o JSON cru. Sem markdown blocks.
      2. userStories DEVE ser uma lista de OBJETOS, nunca strings.
      3. Gere código real e funcional em 'engine.files'.
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        model: this.model,
        response_format: { type: "json_object" },
        temperature: 0.2, // Baixa temperatura para ser mais determinístico
      });

      const content = completion.choices[0].message.content;
      if (!content) throw new Error("LLM retornou resposta vazia.");

      // Parse e Validação
      const rawJson = JSON.parse(content);
      
      // Validação Zod (vai lançar erro se estrutura estiver errada)
      const parsedData = ResponseSchema.parse(rawJson);

      await this.consolidator.saveArtifacts(parsedData);

      return {
        ...parsedData,
        requestId: completion.id,
        timestamp: new Date().toISOString(),
        inputLength: userPrompt.length,
        outputLength: content.length
      };

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("❌ Erro no Agente:", error);
      throw error; // Repassa para o controller tratar (500)
    }
  }
}
