import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import dotenv from "dotenv";
import { getGlobalESAAOrchestrator } from "@gemini-mini-ide/analysis-agent";
import { registerAnalysisRoutes } from "./routes/analysis.routes.js";
import { registerConversationRoutes } from "./routes/conversation.routes.js";
import { registerESAARoutes } from "./routes/esaa.routes.js";
import { getDefaultApiKey } from "./services/agent-manager.js";

dotenv.config({ path: "../../.env" });

const PORT = process.env["PORT"] ? parseInt(process.env["PORT"]) : 3200;

/**
 * Builds and configures the Fastify app with all routes and plugins.
 * Exported for testability — tests can use app.inject() without starting a listener.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app: FastifyInstance = Fastify({
    logger: {
      level: process.env["LOG_LEVEL"] ?? "info",
      transport: {
        target: "pino-pretty",
        options: { colorize: true }
      }
    }
  });

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(500).send({
      error: "Internal Server Error",
      details: error.message
    });
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "X-LLM-Model", "X-LLM-Base-URL", "X-Dry-Run", "X-Session-Id"]
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: "Limite de requisições excedido. Tente novamente em 1 minuto."
    })
  });

  // Register route modules
  const defaultApiKey = getDefaultApiKey();
  await registerAnalysisRoutes(app, defaultApiKey);
  await registerConversationRoutes(app, defaultApiKey);
  await registerESAARoutes(app, getGlobalESAAOrchestrator());

  return app;
}

const start = async (): Promise<void> => {
  const app = await buildApp();
  await app.listen({ port: PORT, host: "0.0.0.0" });
  app.log.info(`🚀 Server running at http://localhost:${PORT}`);
};

// Only auto-start when running as main entry, not when imported by tests
if (!process.env["VITEST"]) {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
