#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_INDEX="packages/analysis-agent/src/index.ts"
SERVER_INDEX="packages/server/src/index.ts"

log_info "Iniciando reparo de integração Server <-> Agent..."

# 1. Corrigir exports do analysis-agent
# O servidor precisa do ConsolidatorService para a funcionalidade de exportação ZIP
log_info "Restaurando exports em $AGENT_INDEX..."
cat > "$AGENT_INDEX" << 'EOF'
/**
 * Ponto de entrada do pacote Analysis Agent.
 * Exporta o Agente Principal e Serviços Auxiliares.
 */
export { AnalysisAgent } from "./agent";
export { ConsolidatorService } from "./services/consolidator-service";
export { GeneratorService } from "./services/generator-service";
EOF
log_ok "Exports do analysis-agent corrigidos."

# 2. Atualizar o Server para usar a nova API do Agente
# O construtor agora pede (apiKey: string), não um objeto.
# O método agora é .analyze(), não .execute().
log_info "Atualizando implementação do servidor em $SERVER_INDEX..."
cat > "$SERVER_INDEX" << 'EOF'
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { z } from "zod";
import { AnalysisAgent } from "@mini-ide/analysis-agent";
import { exportController } from "./controllers/export.controller";

// Carrega variáveis de ambiente
dotenv.config({ path: "../../.env" });

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3200;
const API_KEY = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || "";

// Validação de Schema da Requisição
const AnalyzeRequestSchema = z.object({
  text: z.string().min(1, "Texto é obrigatório"),
  maxLen: z.number().optional().default(2000),
});

/**
 * Inicializa e configura o servidor Fastify.
 */
const app: FastifyInstance = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
    },
  },
});

// Middleware de Tratamento de Erros Global
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.status(500).send({ error: "Internal Server Error", details: error.message });
});

/**
 * Configuração principal do servidor.
 */
const start = async () => {
  try {
    // 1. Plugins
    await app.register(cors, { 
      origin: true, // Em produção, restringir para domínio do frontend
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Dry-Run"]
    });

    // 2. Rotas de Saúde
    app.get("/healthz", async () => {
      return { status: "ok", timestamp: new Date().toISOString(), component: "mini-ide-server" };
    });

    // 3. Rota de Análise (Core)
    app.post("/analyze", async (request, reply) => {
      // Dry Run Check (para testes de pipeline)
      const dryRun = request.headers["x-dry-run"] === "true";
      
      // Validação Zod
      const parseResult = AnalyzeRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Dados inválidos", details: parseResult.error.format() });
      }

      const { text } = parseResult.data;

      // Mock para Dry Run (Testes de Fumaça)
      if (dryRun) {
        app.log.info("[DryRun] Simulando resposta de análise");
        return reply.send({
          summary: "Dry Run Successful",
          requestId: "dry-run-id",
          timestamp: new Date().toISOString(),
          engine: { files: [] },
          product: { userStories: [] }
        });
      }

      if (!API_KEY) {
        return reply.status(500).send({ error: "API Key não configurada no servidor." });
      }

      try {
        // Instanciação CORRETA para Fase 17 (Blueprint Strategy)
        // Agora passamos a string direta, não um objeto de config
        const agent = new AnalysisAgent(API_KEY, process.env.LLM_BASE_URL);
        
        // Chamada CORRETA do método (analyze ao invés de execute)
        const result = await agent.analyze(text, {});
        
        return reply.send(result);
      } catch (err: any) {
        request.log.error(err);
        return reply.status(502).send({ 
          error: "Falha na comunicação com o Agente de IA", 
          details: err.message 
        });
      }
    });

    // 4. Rota de Exportação
    app.post("/export", exportController);

    // Start
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
EOF
log_ok "Servidor atualizado para compatibilidade com Fase 17."

# 3. Recompilar pacotes afetados para garantir integridade
log_info "Recompilando analysis-agent e server..."

cd packages/analysis-agent
if ../../node_modules/.bin/tsc -b; then
    log_ok "Analysis Agent compilado."
else
    echo "Erro ao compilar Analysis Agent"
    exit 1
fi

cd ../server
if ../../node_modules/.bin/tsc -b; then
    log_ok "Server compilado."
else
    echo "Erro ao compilar Server"
    exit 1
fi

cd ../..

# 4. Rodar Pipeline Final
log_info "Executando pipeline final de verificação..."
bash ./42_pipeline_checklist.sh
