#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

SERVER_INDEX="packages/server/src/index.ts"

log_info "Iniciando correção de CORS no Servidor..."

# Reescrevendo o index.ts do servidor com a lista de headers expandida
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
// API Key padrão (fallback). Em produção, o ideal é vir sempre pelo Header.
const DEFAULT_API_KEY = process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || "";

// Validação de Schema da Requisição
const AnalyzeRequestSchema = z.object({
  text: z.string().min(1, "Texto é obrigatório"),
  maxLen: z.number().optional().default(2000),
});

const app: FastifyInstance = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
    },
  },
});

app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.status(500).send({ error: "Internal Server Error", details: error.message });
});

const start = async () => {
  try {
    // 1. Configuração de CORS Permissiva para Headers de LLM
    await app.register(cors, { 
      origin: true, 
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      // ADICIONADO: Headers específicos para controle dinâmico de LLM
      allowedHeaders: [
        "Content-Type", 
        "Authorization", 
        "X-Dry-Run", 
        "X-LLM-Base-URL", 
        "X-LLM-Provider", 
        "X-LLM-Model"
      ]
    });

    // 2. Health Check
    app.get("/healthz", async () => {
      return { status: "ok", timestamp: new Date().toISOString(), component: "mini-ide-server" };
    });

    // 3. Rota de Análise
    app.post("/analyze", async (request, reply) => {
      const dryRun = request.headers["x-dry-run"] === "true";
      
      // Extração de configurações dinâmicas dos headers
      // O frontend envia headers em lowercase (padrão HTTP/2), mas acessamos de forma segura
      const customBaseUrl = request.headers["x-llm-base-url"] as string | undefined;
      // const customProvider = request.headers["x-llm-provider"]; // Futuro uso
      
      // Validação de Payload
      const parseResult = AnalyzeRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Dados inválidos", details: parseResult.error.format() });
      }
      const { text } = parseResult.data;

      if (dryRun) {
        app.log.info("[DryRun] Simulando resposta");
        return reply.send({
          summary: "Dry Run Successful",
          requestId: "dry-run-id",
          timestamp: new Date().toISOString(),
          engine: { files: [] },
          product: { userStories: [] }
        });
      }

      // Resolução da API Key: Header > Env Var
      // O header Authorization vem como "Bearer <key>"
      const authHeader = request.headers.authorization;
      let apiKey = DEFAULT_API_KEY;
      
      if (authHeader && authHeader.startsWith("Bearer ")) {
        apiKey = authHeader.substring(7);
      }

      if (!apiKey && !customBaseUrl) {
        // Se tiver customBaseUrl (ex: localhost do Ollama), pode não precisar de key.
        // Mas se for OpenAI/Deepseek padrão, precisa.
        // Por segurança, alertamos se não tiver key e não for local.
        return reply.status(401).send({ error: "API Key não fornecida." });
      }

      try {
        // Instancia o agente com a configuração dinâmica da requisição
        const agent = new AnalysisAgent(apiKey, customBaseUrl);
        const result = await agent.analyze(text, {});
        return reply.send(result);
      } catch (err: any) {
        request.log.error(err);
        return reply.status(502).send({ 
          error: "Falha no Agente de IA", 
          details: err.message 
        });
      }
    });

    // 4. Exportação
    app.post("/export", exportController);

    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
EOF
log_ok "Configuração de CORS atualizada com sucesso."

# 2. Recompilar Server
log_info "Recompilando servidor..."
cd packages/server
if ../../node_modules/.bin/tsc -b; then
    log_ok "Server compilado."
else
    echo "Erro na compilação do servidor"
    exit 1
fi
cd ../..

# 3. Reiniciar processos (Kill server atual para garantir reload)
log_info "Matando processo do servidor na porta 3200..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

# 4. Validação (Pipeline)
log_info "Validando integridade..."
bash ./42_pipeline_checklist.sh
