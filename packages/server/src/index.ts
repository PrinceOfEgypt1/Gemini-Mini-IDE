import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import dotenv from "dotenv";
import { getGlobalESAAOrchestrator } from "@gemini-mini-ide/analysis-agent";
import { registerAnalysisRoutes } from "./routes/analysis.routes.js";
import { registerConversationRoutes } from "./routes/conversation.routes.js";
import { registerESAARoutes } from "./routes/esaa.routes.js";
import { getDefaultApiKey, shutdownAgentManager } from "./services/agent-manager.js";

/**
 * P27 — Containment gate for the ESAA HTTP surface.
 *
 * The ESAA subsystem is officially classified as EXPERIMENTAL and CONTAINED
 * (see `docs/ESAA_ARCHITECTURE.md`, README "Feature experimental: ESAA"
 * section, and DEVELOPMENT.md). Until P27 the `/esaa/*` routes were
 * registered unconditionally, which contradicted that classification —
 * the routes were part of the live HTTP surface even when the orchestrator
 * itself was disabled (`ESAA_ENABLED=false`, the default).
 *
 * To eliminate that ambiguity, the routes are now only registered when
 * `ESAA_ENABLED === "true"`. With the default configuration the entire
 * `/esaa/*` namespace returns 404, matching the "not part of stable API
 * surface" discourse in the docs.
 */
export function isESAAEnabled(): boolean {
  return process.env["ESAA_ENABLED"] === "true";
}

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

  // P27: ESAA routes are only registered when explicitly opted-in via
  // ESAA_ENABLED=true. With the default configuration the /esaa/* namespace
  // is not part of the stable HTTP surface and returns 404.
  if (isESAAEnabled()) {
    await registerESAARoutes(app, getGlobalESAAOrchestrator());
  }

  // BG-09: Deterministic cleanup of agent-manager resources on server shutdown
  app.addHook("onClose", () => {
    shutdownAgentManager();
  });

  return app;
}

const start = async (): Promise<void> => {
  dotenv.config({ path: "../../.env" });
  const PORT = process.env["PORT"] ? parseInt(process.env["PORT"]) : 3200;
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
