import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import dotenv from "dotenv";
import { z } from "zod";
import { AnalysisAgent } from "@mini-ide/analysis-agent";
import { exportController } from "./controllers/export.controller.js";

dotenv.config({ path: "../../.env" });

const PORT = process.env["PORT"] ? parseInt(process.env["PORT"]) : 3200;
const DEFAULT_API_KEY = process.env["OPENAI_API_KEY"] ?? "";

// HU-MINI-IDE-PERF-001: Instância Global para Singleton
// Evita recriar conexão TCP/TLS se a chave for a mesma
let defaultAgentInstance: AnalysisAgent | null = null;
if (DEFAULT_API_KEY) {
  defaultAgentInstance = new AnalysisAgent(DEFAULT_API_KEY);
}

// Schema de Requisição
const AnalyzeRequestSchema = z.object({
  text: z.string().min(1),
  maxLen: z.number().optional(),
  currentContext: z
    .object({
      files: z.array(
        z.object({
          path: z.string(),
          purpose: z.string().optional()
        })
      ),
      summary: z.string().optional()
    })
    .optional()
});

const app: FastifyInstance = Fastify({
  logger: {
    level: process.env["LOG_LEVEL"] ?? "info",
    transport: {
      target: "pino-pretty",
      options: { colorize: true }
    }
  }
});

// Error handler global
app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  reply.status(500).send({
    error: "Internal Server Error",
    details: error.message
  });
});

const start = async (): Promise<void> => {
  // Registra plugins
  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "X-LLM-Base-URL", "X-Dry-Run"]
  });

  // Rate limiting: 100 requests por minuto por IP
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: "Limite de requisições excedido. Tente novamente em 1 minuto."
    })
  });

  // Health check
  app.get("/healthz", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Endpoint principal de análise
  app.post("/analyze", async (request, reply) => {
    // Lógica de Dry Run para testes
    const dryRun = request.headers["x-dry-run"] === "true";

    // Validação
    const parseResult = AnalyzeRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Dados inválidos",
        details: parseResult.error.issues
      });
    }

    // Bypass para testes automatizados
    if (dryRun) {
      request.log.info("[DryRun] Skipping Agent execution");
      return reply.send({
        summary: "Dry Run Successful",
        requestId: "dry-run-id",
        timestamp: new Date().toISOString(),
        analysis: { summary: "Dry Run", complexity: "Baixa", assumptions: [] },
        product: { userStories: [] },
        architect: { stack: "Test", diagram: "" },
        engine: { files: [] },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Dry Run Mode" }
      });
    }

    const { text } = parseResult.data;

    // Extrai API key do header Authorization
    const authHeader = request.headers["authorization"];
    const apiKey =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : DEFAULT_API_KEY;

    if (!apiKey) {
      return reply.status(401).send({
        error: "API Key não configurada",
        message: "Configure a variável OPENAI_API_KEY ou envie via header Authorization"
      });
    }

    try {
      // HU-MINI-IDE-PERF-001: Lógica Singleton
      let agent: AnalysisAgent;

      if (apiKey === DEFAULT_API_KEY && defaultAgentInstance) {
        // Reusa instância global
        agent = defaultAgentInstance;
        request.log.info("Reusing Global AnalysisAgent Instance");
      } else {
        // Cria nova instância (chave customizada)
        agent = new AnalysisAgent(apiKey);
        request.log.info("Creating New AnalysisAgent Instance (Custom Key)");
      }

      const result = await agent.analyze(text);
      return reply.send(result);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      request.log.error({ err }, "Falha no Agente");
      return reply.status(502).send({
        error: "Falha no Agente",
        details: errorMessage
      });
    }
  });

  // Endpoint de exportação
  app.post("/export", exportController);

  // Inicia o servidor
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`🚀 Server running at http://localhost:${PORT}`);
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
