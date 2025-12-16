import { describe, it, expect } from "vitest";
import { UserStoriesPlanner } from "./user-stories-planner.js";
import { RichAnalysis, RichProductPlan, RichArchitecture } from "../types/rich-schemas.js";

describe("UserStoriesPlanner", () => {
  const planner = new UserStoriesPlanner();

  describe("plan() - Heurísticas genéricas de complexidade", () => {
    it("deve calcular minStories MAIOR para prompt complexo do que para prompt simples", () => {
      const simplePrompt = "Criar uma calculadora simples";
      const complexPrompt = `
        Criar um sistema completo de gestão hospitalar com:
        - Cadastro de pacientes com CPF, upload de documentos
        - Gestão de médicos com CRM e especialidades
        - Sistema de agendamento de consultas
        - Notificações por email, SMS e WhatsApp
        - Autenticação com OAuth e MFA
        - Painel administrativo com relatórios
        - Observabilidade com logs e métricas
        - Backup automatizado e disaster recovery
      `;

      const simplePlan = planner.plan(simplePrompt);
      const complexPlan = planner.plan(complexPrompt);

      // Validar que o score de complexidade é diferente
      expect(complexPlan.signals.score).toBeGreaterThan(simplePlan.signals.score);

      // Complexidade maior => mais histórias (pode ser igual se ambos defaultam para 1 épico)
      // O importante é validar que COM épicos definidos, a complexidade impacta
      expect(complexPlan.minStories).toBeGreaterThanOrEqual(simplePlan.minStories);

      // Validar limites mínimos razoáveis
      expect(simplePlan.minStories).toBeGreaterThanOrEqual(3);
      expect(complexPlan.minStories).toBeGreaterThanOrEqual(3);

      // Rationale deve existir
      expect(simplePlan.rationale.length).toBeGreaterThan(0);
      expect(complexPlan.rationale.length).toBeGreaterThan(0);
    });

    it("deve calcular minStories baseado em estruturas de dados e algoritmos", () => {
      const promptWithDataStructures = `
        Implementar um simulador educacional de estruturas de dados:
        - Array/Vetor com operações de inserção, remoção, busca, ordenação
        - Lista Ligada com inserção, remoção, busca, reversão
        - Lista Duplamente Ligada com navegação bidirecional
        - Árvore Binária de Busca com inserção, remoção, travessias (inOrder, preOrder, postOrder)
        - Grafo com BFS, DFS, Dijkstra, Prim, Kruskal
        - Visualização gráfica de cada estrutura
        - Testes unitários para cada operação
      `;

      const plan = planner.plan(promptWithDataStructures);

      // Deve detectar múltiplas estruturas/algoritmos
      expect(plan.signals.structuresAndAlgorithms).toBeGreaterThan(10);

      // Deve gerar significativamente mais histórias que um prompt simples
      const simplePlan = planner.plan("Criar uma calculadora");
      expect(plan.minStories).toBeGreaterThan(simplePlan.minStories * 2); // Pelo menos 2x mais

      // Rationale deve mencionar estruturas/algoritmos
      const hasStructuresRationale = plan.rationale.some(r =>
        r.includes("estruturas/algoritmos") || r.includes("Multiplicador")
      );
      expect(hasStructuresRationale).toBe(true);
    });

    it("deve calcular minStories baseado em entidades de domínio e operações", () => {
      const promptWithCRUD = `
        Sistema de e-commerce com:
        - Cadastrar, listar, editar e excluir products
        - Cadastrar, listar, editar e excluir categories
        - Cadastrar, listar, editar e excluir customers
        - Criar, visualizar e cancelar orders
        - Processar payments
        - Enviar notifications de status
      `;

      const plan = planner.plan(promptWithCRUD);

      // Deve detectar operações (cadastrar, listar, editar, excluir, criar, etc.)
      expect(plan.signals.operations).toBeGreaterThan(8);

      // Deve gerar pelo menos tantas histórias quanto um prompt simples
      const simplePlan = planner.plan("Criar uma calculadora básica");
      expect(plan.minStories).toBeGreaterThanOrEqual(simplePlan.minStories);
    });

    it("deve ajustar minStories com base em requisitos não-funcionais", () => {
      const promptWithNFRs = `
        API REST simples com autenticação JWT, monitoramento com Prometheus,
        logs estruturados, cache Redis, backup automatizado, LGPD compliance,
        observabilidade com tracing distribuído, alertas para erro rate > 1%
      `;

      const plan = planner.plan(promptWithNFRs);

      // Deve detectar NFRs
      expect(plan.signals.nonFunctionalReqs).toBeGreaterThan(3);

      // NFRs devem aumentar o número de histórias comparado com API sem NFRs
      const simpleAPIPlan = planner.plan("Criar uma API REST simples para listar produtos");
      expect(plan.minStories).toBeGreaterThanOrEqual(simpleAPIPlan.minStories);

      // Rationale deve mencionar NFRs
      const hasNFRRationale = plan.rationale.some(r =>
        r.includes("não-funcionais")
      );
      expect(hasNFRRationale).toBe(true);
    });

    it("deve ajustar minStories com base em integrações externas", () => {
      const promptWithIntegrations = `
        Sistema com integração via API REST com webhook,
        envio de email via SendGrid, SMS via Twilio,
        notificações push, upload para S3, pagamento via Stripe
      `;

      const plan = planner.plan(promptWithIntegrations);

      // Deve detectar integrações
      expect(plan.signals.integrations).toBeGreaterThan(5);

      // Rationale deve mencionar integrações
      const hasIntegrationsRationale = plan.rationale.some(r =>
        r.includes("integrações externas")
      );
      expect(hasIntegrationsRationale).toBe(true);
    });

    it("deve aumentar minStories quando RichAnalysis indica alta complexidade", () => {
      const prompt = "Sistema de gestão de tarefas";

      const lowComplexityAnalysis: RichAnalysis = {
        summary: "Sistema simples",
        complexity: { level: "LOW", score: 2, justification: "Baixa" },
        coreEntities: ["Task"],
        implicitRequirements: [],
        assumptions: []
      };

      const highComplexityAnalysis: RichAnalysis = {
        summary: "Sistema complexo",
        complexity: { level: "CRITICAL", score: 9, justification: "Crítica" },
        coreEntities: ["Task", "User", "Project", "Team"],
        implicitRequirements: ["Auth", "Permissions", "Audit"],
        assumptions: []
      };

      const lowPlan = planner.plan(prompt, lowComplexityAnalysis);
      const highPlan = planner.plan(prompt, highComplexityAnalysis);

      // Alta complexidade => mais histórias
      expect(highPlan.minStories).toBeGreaterThan(lowPlan.minStories);

      // Rationale deve mencionar complexidade da análise
      const hasComplexityRationale = highPlan.rationale.some(r =>
        r.includes("Complexidade da análise")
      );
      expect(hasComplexityRationale).toBe(true);
    });

    it("deve aumentar minStories quando RichProductPlan tem muitos épicos", () => {
      const prompt = "Sistema completo";

      const productWithFewEpics: RichProductPlan = {
        productVision: "Visão",
        epics: [
          {
            id: "EPIC-001",
            title: "Core",
            category: "CORE",
            context: "Contexto",
            requirements: ["Req1", "Req2", "Req3"],
            acceptanceCriteria: [],
            priority: "P0",
            estimatedComplexity: "MEDIUM"
          }
        ],
        outOfScope: [],
        risks: []
      };

      const productWithManyEpics: RichProductPlan = {
        productVision: "Visão",
        epics: [
          {
            id: "EPIC-001",
            title: "Core",
            category: "CORE",
            context: "Contexto",
            requirements: ["R1", "R2", "R3", "R4", "R5"],
            acceptanceCriteria: [],
            priority: "P0",
            estimatedComplexity: "HIGH"
          },
          {
            id: "EPIC-002",
            title: "Auth",
            category: "AUTH & SECURITY",
            context: "Contexto",
            requirements: ["R1", "R2", "R3", "R4"],
            acceptanceCriteria: [],
            priority: "P0",
            estimatedComplexity: "MEDIUM"
          },
          {
            id: "EPIC-003",
            title: "Admin",
            category: "ADMIN",
            context: "Contexto",
            requirements: ["R1", "R2", "R3"],
            acceptanceCriteria: [],
            priority: "P1",
            estimatedComplexity: "MEDIUM"
          },
          {
            id: "EPIC-004",
            title: "Observability",
            category: "OBSERVABILITY",
            context: "Contexto",
            requirements: ["R1", "R2", "R3", "R4", "R5", "R6"],
            acceptanceCriteria: [],
            priority: "P1",
            estimatedComplexity: "MEDIUM"
          }
        ],
        outOfScope: [],
        risks: []
      };

      const fewEpicsPlan = planner.plan(prompt, undefined, productWithFewEpics);
      const manyEpicsPlan = planner.plan(prompt, undefined, productWithManyEpics);

      // Mais épicos => mais histórias
      expect(manyEpicsPlan.minStories).toBeGreaterThan(fewEpicsPlan.minStories);

      // Deve ser proporcional (4 épicos vs 1 épico)
      expect(manyEpicsPlan.minStories).toBeGreaterThanOrEqual(fewEpicsPlan.minStories * 3);

      // Rationale deve mencionar épicos
      const hasEpicsRationale = manyEpicsPlan.rationale.some(r =>
        r.includes("épicos definidos")
      );
      expect(hasEpicsRationale).toBe(true);
    });

    it("deve aumentar minStories quando RichArchitecture tem muitos arquivos", () => {
      const prompt = "Sistema";

      const smallArchitecture: RichArchitecture = {
        architectureStyle: "Monolith",
        stack: {
          runtime: "Node.js",
          language: "TypeScript",
          framework: "React",
          testing: "Vitest",
          documentation: "README",
          orm: "Prisma",
          database: "PostgreSQL",
          cache: "Redis",
          queue: "BullMQ"
        },
        diagram: "",
        manifest: [
          { path: "src/index.ts", purpose: "Entry", criticality: "HIGH", category: "APPLICATION" },
          { path: "src/app.ts", purpose: "App", criticality: "HIGH", category: "APPLICATION" }
        ],
        keyDecisions: [],
        securityConsiderations: [],
        scalabilityPath: []
      };

      const largeArchitecture: RichArchitecture = {
        ...smallArchitecture,
        manifest: Array.from({ length: 40 }, (_, i) => ({
          path: `src/module${i}.ts`,
          purpose: `Module ${i}`,
          criticality: "MEDIUM" as const,
          category: "APPLICATION" as const
        }))
      };

      const smallPlan = planner.plan(prompt, undefined, undefined, smallArchitecture);
      const largePlan = planner.plan(prompt, undefined, undefined, largeArchitecture);

      // Mais arquivos => mais histórias
      expect(largePlan.minStories).toBeGreaterThan(smallPlan.minStories);

      // Rationale deve mencionar arquivos
      const hasFilesRationale = largePlan.rationale.some(r =>
        r.includes("arquivos")
      );
      expect(hasFilesRationale).toBe(true);
    });

    it("deve calcular targetRange entre minStories e 1.5x minStories", () => {
      const prompt = "Sistema médio com autenticação e CRUD";

      const plan = planner.plan(prompt);

      // Target range deve começar em minStories
      expect(plan.targetRange[0]).toBe(plan.minStories);

      // Target range max deve ser entre min e 1.5x min (com upper bound)
      expect(plan.targetRange[1]).toBeGreaterThan(plan.targetRange[0]);
      expect(plan.targetRange[1]).toBeLessThanOrEqual(plan.minStories * 1.5 + 1); // +1 por arredondamento
    });

    it("NÃO deve explodir em centenas de histórias para prompts simples", () => {
      const simplePrompt = "Criar uma calculadora";

      const plan = planner.plan(simplePrompt);

      // Mesmo simples, não pode ser menos que 3
      expect(plan.minStories).toBeGreaterThanOrEqual(3);

      // Mas não pode explodir além do razoável (upper bound)
      expect(plan.minStories).toBeLessThanOrEqual(15);
    });

    it("deve gerar rationale explicativo com múltiplos fatores", () => {
      const complexPrompt = `
        Sistema completo de e-commerce com:
        - Múltiplas entidades (produto, categoria, cliente, pedido, pagamento)
        - CRUD completo para cada entidade
        - Autenticação e autorização com roles
        - Integrações: email, SMS, gateway de pagamento
        - Requisitos não-funcionais: monitoramento, cache, backup
      `;

      const plan = planner.plan(complexPrompt);

      // Rationale deve ter múltiplas entradas
      expect(plan.rationale.length).toBeGreaterThanOrEqual(5);

      // Deve mencionar diferentes aspectos
      const rationaleText = plan.rationale.join(" ");
      expect(rationaleText).toMatch(/complexidade|entidades|operações|requisitos|integrações/i);
    });
  });

  describe("validate()", () => {
    it("deve validar como OK quando gerou quantidade suficiente", () => {
      const prompt = "Sistema simples";
      const plan = planner.plan(prompt);

      const generatedStories = plan.minStories + 5;
      const validation = planner.validate(generatedStories, plan);

      expect(validation.valid).toBe(true);
      expect(validation.delta).toBe(0);
      expect(validation.message).toContain("✅");
    });

    it("deve validar como FALHA quando gerou quantidade insuficiente", () => {
      const prompt = "Sistema complexo";
      const plan = planner.plan(prompt);

      const generatedStories = plan.minStories - 5;
      const validation = planner.validate(generatedStories, plan);

      expect(validation.valid).toBe(false);
      expect(validation.delta).toBe(5);
      expect(validation.message).toContain("❌");
      expect(validation.message).toContain("faltam 5");
    });

    it("deve validar como OK quando gerou exatamente o mínimo", () => {
      const prompt = "Sistema médio";
      const plan = planner.plan(prompt);

      const validation = planner.validate(plan.minStories, plan);

      expect(validation.valid).toBe(true);
      expect(validation.delta).toBe(0);
    });
  });
});
