import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { z } from "zod";
import { AnalysisAgent } from "@mini-ide/analysis-agent";
import { exportController } from "./controllers/export.controller";

dotenv.config({ path: "../../.env" });
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3200;
const DEFAULT_API_KEY = process.env.OPENAI_API_KEY || "";

// Schema de Requisição (Mantendo suporte a contexto)
const AnalyzeRequestSchema = z.object({
  text: z.string().min(1),
  maxLen: z.number().optional(),
  currentContext: z.object({
    files: z.array(z.object({ path: z.string(), purpose: z.string().optional() })),
    summary: z.string().optional()
  }).optional()
});

const app: FastifyInstance = Fastify({ logger: true });
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.status(500).send({ error: "Internal Server Error", details: error.message });
});

const start = async () => {
  await app.register(cors, { 
    origin: true, 
    methods: ["GET","POST"], 
    allowedHeaders: ["Content-Type","Authorization","X-LLM-Base-URL","X-Dry-Run"] 
  });

  app.get("/healthz", async () => ({ status: "ok" }));

  app.post("/analyze", async (request, reply) => {
    // 1. Lógica de Dry Run (Restaurada)
    const dryRun = request.headers["x-dry-run"] === "true";
    
    // 2. Validação
    const parseResult = AnalyzeRequestSchema.safeParse(request.body);
    if (!parseResult.success) return reply.status(400).send({ error: "Dados inválidos" });
    
    // 3. Bypass para testes automatizados
    if (dryRun) {
      request.log.info("[DryRun] Skipping Agent execution");
      return reply.send({
        summary: "Dry Run Successful",
        requestId: "dry-run-id",
        timestamp: new Date().toISOString(),
        analysis: { summary: "Dry Run", complexity: "Baixa", assumptions: [] },
        product: { userStories: [] },
        architect: { stack: "Test", diagram: "" },
        engine: { files: [] }
      });
    }

    const { text, currentContext } = parseResult.data;
    const authHeader = request.headers.authorization;
    const apiKey = (authHeader && authHeader.startsWith("Bearer ")) ? authHeader.substring(7) : DEFAULT_API_KEY;

    try {
      const agent = new AnalysisAgent(apiKey);
      const result = await agent.analyze(text, currentContext);
      return reply.send(result);
    } catch (err: unknown) {
      return reply.status(502).send({ error: "Falha no Agente", details: (err instanceof Error ? err.message : String(err)) });
    }
  });

  app.post("/export", exportController);

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`🚀 Server running at http://localhost:${PORT}`);
};
start();
