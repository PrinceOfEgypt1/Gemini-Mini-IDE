import { describe, it, expect } from "vitest";
import { UserStoriesPlanner } from "./user-stories-planner.js";
import { RichAnalysis, RichProductPlan, RichArchitecture } from "../types/rich-schemas.js";

describe("UserStoriesPlanner", () => {
  const planner = new UserStoriesPlanner();

  describe("plan() - Derivação de artefatos estruturados com clamps", () => {
    it("INVARIANTE 1: Prompts curtos/simples → minStories pequeno e estável (sem explosão)", () => {
      const simplePrompt = "Criar uma calculadora simples";

      const plan = planner.plan(simplePrompt);

      // Sem ProductPlan, deve usar fallback limitado
      expect(plan.minStories).toBeGreaterThanOrEqual(3); // Mínimo absoluto
      expect(plan.minStories).toBeLessThanOrEqual(10); // Fallback cap

      // Rationale deve mencionar fallback
      expect(plan.rationale.some(r => r.includes("Fallback"))).toBe(true);
    });

    it("INVARIANTE 2: Prompts longos/repetitivos → NÃO explode sem ProductPlan estruturado", () => {
      const repetitivePrompt = `
        Criar produto produto produto produto produto produto produto produto
        Listar listar listar listar listar listar listar listar listar listar
        Editar editar editar editar editar editar editar editar editar editar
        Excluir excluir excluir excluir excluir excluir excluir excluir excluir
        ${Array(100).fill("usuário cliente produto pedido pagamento").join(" ")}
      `;

      const plan = planner.plan(repetitivePrompt);

      // Mesmo com prompt enorme, fallback tem cap
      expect(plan.minStories).toBeGreaterThanOrEqual(3);
      expect(plan.minStories).toBeLessThanOrEqual(10); // Fallback cap = 10

      // Não deve explodir para centenas
      expect(plan.minStories).toBeLessThan(20);
    });

    it("INVARIANTE 3: ProductPlan com épicos/requirements → minStories proporcional", () => {
      const prompt = "Sistema de gestão";

      // ProductPlan com 1 épico, 3 requirements
      const smallProduct: RichProductPlan = {
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

      // ProductPlan com 3 épicos, 15 requirements total
      const largeProduct: RichProductPlan = {
        productVision: "Visão",
        epics: [
          {
            id: "EPIC-001",
            title: "Core",
            category: "CORE",
            context: "Ctx",
            requirements: ["R1", "R2", "R3", "R4", "R5"],
            acceptanceCriteria: [],
            priority: "P0",
            estimatedComplexity: "HIGH"
          },
          {
            id: "EPIC-002",
            title: "Auth",
            category: "AUTH & SECURITY",
            context: "Ctx",
            requirements: ["R1", "R2", "R3", "R4", "R5"],
            acceptanceCriteria: [],
            priority: "P0",
            estimatedComplexity: "MEDIUM"
          },
          {
            id: "EPIC-003",
            title: "Observability",
            category: "OBSERVABILITY",
            context: "Ctx",
            requirements: ["R1", "R2", "R3", "R4", "R5"],
            acceptanceCriteria: [],
            priority: "P1",
            estimatedComplexity: "MEDIUM"
          }
        ],
        outOfScope: [],
        risks: []
      };

      const smallPlan = planner.plan(prompt, undefined, smallProduct);
      const largePlan = planner.plan(prompt, undefined, largeProduct);

      // Deve derivar de ProductPlan (não fallback)
      expect(smallPlan.rationale.some(r => r.includes("ProductPlan"))).toBe(true);
      expect(largePlan.rationale.some(r => r.includes("ProductPlan"))).toBe(true);

      // Proporcionalidade: 3x mais épicos e 5x mais requirements → mais histórias
      expect(largePlan.minStories).toBeGreaterThan(smallPlan.minStories);

      // Fórmula: base (3) + (reqs * 0.8), cap 20 por épico
      // SmallProduct: 1 épico com 3 reqs → 3 + (3 * 0.8) = 3 + 2.4 = 5-6 histórias
      expect(smallPlan.minStories).toBeGreaterThanOrEqual(5);
      expect(smallPlan.minStories).toBeLessThanOrEqual(20); // Per-epic cap

      // LargeProduct: 3 épicos com 5 reqs cada → 3 * (3 + (5 * 0.8)) = 3 * 7 = 21 histórias
      expect(largePlan.minStories).toBeGreaterThanOrEqual(18);
      expect(largePlan.minStories).toBeLessThanOrEqual(100); // Global cap
    });

    it("INVARIANTE 4: Clamps aplicados corretamente - multiplicadores limitados", () => {
      const prompt = "Sistema complexo";

      // ProductPlan com análise de complexidade CRITICAL
      const product: RichProductPlan = {
        productVision: "Visão",
        epics: [
          {
            id: "EPIC-001",
            title: "Epic",
            category: "CORE",
            context: "Ctx",
            requirements: ["R1", "R2", "R3", "R4", "R5"],
            acceptanceCriteria: [],
            priority: "P0",
            estimatedComplexity: "HIGH"
          }
        ],
        outOfScope: [],
        risks: []
      };

      const criticalAnalysis: RichAnalysis = {
        summary: "Crítico",
        complexity: { level: "CRITICAL", score: 10, justification: "Crítico" },
        coreEntities: [],
        implicitRequirements: [],
        assumptions: []
      };

      const plan = planner.plan(prompt, criticalAnalysis, product);

      // Rationale deve mencionar multiplicador clamped
      const hasClampedMultiplier = plan.rationale.some(r => r.includes("clamped"));
      expect(hasClampedMultiplier).toBe(true);

      // Mesmo com CRITICAL, não deve explodir (multiplier max é 1.4x)
      // 1 épico com 5 reqs: base 3 + (5 * 0.8) = 7 * 1.4 = ~10 histórias
      expect(plan.minStories).toBeLessThanOrEqual(15);
    });

    it("INVARIANTE 5: Clamps aplicados - per-epic cap (nenhum épico explode)", () => {
      const prompt = "Sistema";

      // ProductPlan com 1 épico com MUITOS requirements (30)
      const product: RichProductPlan = {
        productVision: "Visão",
        epics: [
          {
            id: "EPIC-001",
            title: "Mega Epic",
            category: "CORE",
            context: "Ctx",
            requirements: Array.from({ length: 30 }, (_, i) => `Req${i + 1}`),
            acceptanceCriteria: [],
            priority: "P0",
            estimatedComplexity: "CRITICAL"
          }
        ],
        outOfScope: [],
        risks: []
      };

      const plan = planner.plan(prompt, undefined, product);

      // Mesmo com 30 requirements, per-epic cap limita a 20 histórias por épico
      expect(plan.minStories).toBeLessThanOrEqual(20);

      // Rationale deve mencionar cap
      const hasCap = plan.rationale.some(r => r.includes("cap:"));
      expect(hasCap).toBe(true);
    });

    it("INVARIANTE 6: Clamps aplicados - global cap (nunca explode além de 100)", () => {
      const prompt = "Sistema gigante";

      // ProductPlan com 20 épicos, cada um com 15 requirements
      const product: RichProductPlan = {
        productVision: "Visão",
        epics: Array.from({ length: 20 }, (_, i) => ({
          id: `EPIC-${String(i + 1).padStart(3, "0")}`,
          title: `Epic ${i + 1}`,
          category: "CORE" as const,
          context: "Ctx",
          requirements: Array.from({ length: 15 }, (_, j) => `Req${j + 1}`),
          acceptanceCriteria: [],
          priority: "P0" as const,
          estimatedComplexity: "HIGH" as const
        })),
        outOfScope: [],
        risks: []
      };

      const plan = planner.plan(prompt, undefined, product);

      // Global cap limita a 100 histórias, mesmo com 20 épicos
      expect(plan.minStories).toBeLessThanOrEqual(100);

      // Rationale deve mencionar global cap
      const hasGlobalCap = plan.rationale.some(r => r.includes("clamp global"));
      expect(hasGlobalCap).toBe(true);
    });

    it("INVARIANTE 7: Observabilidade - rationale explicativo mostra derivação", () => {
      const prompt = "Sistema";

      const product: RichProductPlan = {
        productVision: "Visão",
        epics: [
          {
            id: "EPIC-001",
            title: "Core",
            category: "CORE",
            context: "Ctx",
            requirements: ["R1", "R2", "R3"],
            acceptanceCriteria: [],
            priority: "P0",
            estimatedComplexity: "MEDIUM"
          }
        ],
        outOfScope: [],
        risks: []
      };

      const plan = planner.plan(prompt, undefined, product);

      // Rationale deve ter múltiplas entradas explicativas
      expect(plan.rationale.length).toBeGreaterThanOrEqual(3);

      // Deve mencionar ProductPlan (fonte primária)
      expect(plan.rationale.some(r => r.includes("ProductPlan"))).toBe(true);

      // Deve mencionar épicos
      expect(plan.rationale.some(r => r.includes("épicos"))).toBe(true);

      // Deve mencionar mínimo final
      expect(plan.rationale.some(r => r.includes("Mínimo final"))).toBe(true);
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
