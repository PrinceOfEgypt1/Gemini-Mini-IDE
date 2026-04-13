import type { FastifyInstance } from "fastify";
import { analyzeImpact, formatImpactReport } from "@gemini-mini-ide/shared";
import { extractLLMConfig, AnalyzeRequestSchema, ImpactAnalysisSchema } from "../helpers.js";
import { exportController } from "../controllers/export.controller.js";
import { getAgent } from "../services/agent-manager.js";

/**
 * @fileoverview ANALYSIS ROUTES — core HTTP surface of the server.
 *
 * Endpoints registered by this module:
 * - `GET  /healthz` — liveness probe, returns `{ status, timestamp }`.
 * - `POST /impact-analysis` — wraps `analyzeImpact` from `@gemini-mini-ide/shared`
 *   and returns `{ report, formatted }`. Body validated against
 *   {@link ImpactAnalysisSchema}.
 * - `GET  /impact-analysis` — self-description endpoint (not the analyzer).
 * - `POST /analyze` — runs the analysis agent. Body validated against
 *   {@link AnalyzeRequestSchema}. Supports two special modes:
 *   - `X-Dry-Run: true` — skips agent execution and returns a canned
 *     response (used by smoke tests and the integration pipeline);
 *   - LLM config is derived from request headers via {@link extractLLMConfig}
 *     (Bearer token, `X-LLM-Model`, `X-LLM-Base-URL`). A missing API key
 *     yields `401`; any agent error is wrapped as `502 Falha no Agente`.
 * - `POST /export` — delegates to {@link exportController} (ZIP export).
 *
 * Previously inlined in `index.ts`; extracted in Round 16.
 *
 * @module server/routes/analysis
 */

/**
 * Registers the core analysis routes on a Fastify instance.
 *
 * @param app Fastify instance to register the routes on.
 * @param defaultApiKey Server-level fallback API key used when the request
 *                      does not carry an `Authorization: Bearer` header.
 */
export async function registerAnalysisRoutes(
  app: FastifyInstance,
  defaultApiKey: string
): Promise<void> {
  // Health check
  app.get("/healthz", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Impact analysis endpoint
  app.post("/impact-analysis", async (request, reply) => {
    const parseResult = ImpactAnalysisSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid request",
        details: parseResult.error.issues
      });
    }

    const { files } = parseResult.data;
    const report = analyzeImpact(files);
    const formatted = formatImpactReport(report);

    return reply.send({ report, formatted });
  });

  app.get("/impact-analysis", async () => ({
    description: "Impact analysis service",
    usage: "POST /impact-analysis with { files: string[] }",
    source: "@gemini-mini-ide/shared/impact-analysis",
  }));

  // Main analysis endpoint
  app.post("/analyze", async (request, reply) => {
    const dryRun = request.headers["x-dry-run"] === "true";

    const parseResult = AnalyzeRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Dados inválidos",
        details: parseResult.error.issues
      });
    }

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

    const llmConfig = extractLLMConfig(request.headers as Record<string, string | string[] | undefined>, defaultApiKey);
    if (!llmConfig.apiKey) {
      return reply.status(401).send({
        error: "API Key não configurada",
        message: "Configure a variável OPENAI_API_KEY ou envie via header Authorization"
      });
    }

    try {
      const agent = getAgent(llmConfig.apiKey);
      const isReused = llmConfig.apiKey === defaultApiKey;
      request.log.info(isReused ? "Reusing Global AnalysisAgent Instance" : "Creating New AnalysisAgent Instance (Custom Key)");

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

  // Export endpoint
  app.post("/export", exportController);
}
