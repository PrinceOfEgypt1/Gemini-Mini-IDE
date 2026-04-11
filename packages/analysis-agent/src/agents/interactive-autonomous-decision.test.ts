import { describe, it, expect, vi } from "vitest";
import { InteractiveAutonomousDecisionAgent } from "./interactive-autonomous-decision.js";
import type { ConversationContext } from "./interactive-agent.js";

function createMockOpenAI(responseContent: string) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: responseContent } }],
        }),
      },
    },
  } as unknown as import("openai").default;
}

function createFailingOpenAI() {
  return {
    chat: {
      completions: {
        create: vi.fn().mockRejectedValue(new Error("API Error")),
      },
    },
  } as unknown as import("openai").default;
}

function makeContext(overrides: Partial<ConversationContext> = {}): ConversationContext {
  return {
    sessionId: "session-1",
    userProfile: null,
    emotionalContext: null,
    interactionStrategy: null,
    previousMessages: [],
    currentPhase: "strategic_layer_decisions",
    accumulatedData: {},
    originalUserPrompt: "Criar um e-commerce",
    ...overrides,
  };
}

describe("InteractiveAutonomousDecisionAgent", () => {
  describe("constructor", () => {
    it("should set agent type to autonomous_decision", () => {
      const client = createMockOpenAI("{}");
      const agent = new InteractiveAutonomousDecisionAgent(client);
      expect(agent.agentType).toBe("autonomous_decision");
    });

    it("should accept custom model", () => {
      const client = createMockOpenAI("{}");
      const agent = new InteractiveAutonomousDecisionAgent(client, "gpt-4");
      expect(agent.agentType).toBe("autonomous_decision");
    });
  });

  describe("initiateConversation()", () => {
    it("should return decision from LLM with presentationMessage", async () => {
      const resp = JSON.stringify({
        decisions: [{ category: "stack", decision: "React", rationale: "Popular" }],
        summary: "Resumo",
        presentationMessage: "Proposta técnica personalizada",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveAutonomousDecisionAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.type).toBe("decision");
      expect(result.content).toBe("Proposta técnica personalizada");
    });

    it("should fall back to summary when presentationMessage is missing", async () => {
      const resp = JSON.stringify({
        decisions: [],
        summary: "Resumo das decisões",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveAutonomousDecisionAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.content).toBe("Resumo das decisões");
    });

    it("should use hardcoded fallback when both fields missing", async () => {
      const client = createMockOpenAI("{}");
      const agent = new InteractiveAutonomousDecisionAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.content).toBe("Preparei algumas decisões técnicas para o seu projeto.");
    });

    it("should use fallback decisions on API error", async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockRejectedValueOnce(new Error("fail"))
              .mockResolvedValueOnce({ choices: [{ message: { content: "Fallback decisions" } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveAutonomousDecisionAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.type).toBe("decision");
      expect(result.content).toBe("Fallback decisions");
    });

    it("should use hardcoded fallback when all LLM calls fail", async () => {
      const client = createFailingOpenAI();
      const agent = new InteractiveAutonomousDecisionAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.content).toBe("Preparei as melhores tecnologias para seu projeto. Posso prosseguir?");
    });

    it("should reset confirmed state", async () => {
      const client = createMockOpenAI(JSON.stringify({ presentationMessage: "msg" }));
      const agent = new InteractiveAutonomousDecisionAgent(client);
      await agent.initiateConversation(makeContext());
      expect(agent.canProceedToNext()).toBe(false);
    });
  });

  describe("processUserResponse() — approval path", () => {
    it("should detect approval with high confidence", async () => {
      const approvalResp = JSON.stringify({
        isApproval: true,
        confidence: 0.9,
        feedback: "Ótimo, prosseguindo!",
      });
      const client = createMockOpenAI(approvalResp);
      const agent = new InteractiveAutonomousDecisionAgent(client);
      const result = await agent.processUserResponse("Sim, concordo!", makeContext());

      expect(result.understood).toBe(true);
      expect(result.feedback).toBe("Ótimo, prosseguindo!");
      expect(result.nextAction).toBe("proceed_to_next");
      expect(result.dataExtracted).toEqual({ decisionsConfirmed: true });
      expect(agent.canProceedToNext()).toBe(true);
    });

    it("should NOT detect approval with low confidence", async () => {
      const approvalResp = JSON.stringify({
        isApproval: true,
        confidence: 0.3,
        feedback: "Hmm...",
      });
      // First call: checkApproval, second call: adjustment
      const adjustResp = JSON.stringify({
        feedback: "Ajustando...",
        adjustedDecisions: {},
        needsMoreInput: false,
      });
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: approvalResp } }] })
              .mockResolvedValueOnce({ choices: [{ message: { content: adjustResp } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveAutonomousDecisionAgent(client);
      const result = await agent.processUserResponse("talvez", makeContext());

      // Low confidence = not approval, goes to adjustment path
      expect(result.nextAction).toBe("proceed_to_next"); // needsMoreInput=false => confirmed
    });

    it("should use keyword fallback when approval check fails", async () => {
      const adjustResp = JSON.stringify({
        feedback: "Ajustado",
        adjustedDecisions: {},
        needsMoreInput: false,
      });
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockRejectedValueOnce(new Error("fail")) // checkApproval fails
              .mockResolvedValueOnce({ choices: [{ message: { content: adjustResp } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveAutonomousDecisionAgent(client);
      // "sim" keyword should trigger approval via fallback
      const result = await agent.processUserResponse("sim, pode seguir", makeContext());

      expect(result.nextAction).toBe("proceed_to_next");
      expect(result.dataExtracted).toEqual({ decisionsConfirmed: true });
    });

    it("should NOT approve via keyword fallback for non-matching message", async () => {
      const adjustResp = JSON.stringify({
        feedback: "Entendi",
        adjustedDecisions: {},
        needsMoreInput: true,
        followUpQuestion: "O que mudar?",
      });
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockRejectedValueOnce(new Error("fail"))
              .mockResolvedValueOnce({ choices: [{ message: { content: adjustResp } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveAutonomousDecisionAgent(client);
      const result = await agent.processUserResponse("quero mudar a stack", makeContext());

      expect(result.nextAction).toBe("continue");
      expect(result.agentMessage?.type).toBe("question");
    });
  });

  describe("processUserResponse() — adjustment path", () => {
    it("should process adjustment with needsMoreInput=true", async () => {
      const approvalResp = JSON.stringify({ isApproval: false, confidence: 0.1, feedback: "" });
      const adjustResp = JSON.stringify({
        feedback: "Entendi, vou ajustar",
        adjustedDecisions: { stack: "Vue" },
        needsMoreInput: true,
        followUpQuestion: "Prefere Vue 2 ou 3?",
      });
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: approvalResp } }] })
              .mockResolvedValueOnce({ choices: [{ message: { content: adjustResp } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveAutonomousDecisionAgent(client);
      const result = await agent.processUserResponse("prefiro Vue", makeContext());

      expect(result.understood).toBe(true);
      expect(result.nextAction).toBe("continue");
      expect(result.agentMessage?.type).toBe("question");
      expect(result.agentMessage?.content).toBe("Prefere Vue 2 ou 3?");
      expect(agent.canProceedToNext()).toBe(false);
    });

    it("should auto-confirm when needsMoreInput=false", async () => {
      const approvalResp = JSON.stringify({ isApproval: false, confidence: 0.2, feedback: "" });
      const adjustResp = JSON.stringify({
        feedback: "Ajustes prontos",
        adjustedDecisions: { stack: "Angular" },
        needsMoreInput: false,
      });
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: approvalResp } }] })
              .mockResolvedValueOnce({ choices: [{ message: { content: adjustResp } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveAutonomousDecisionAgent(client);
      const result = await agent.processUserResponse("use Angular", makeContext());

      expect(result.nextAction).toBe("proceed_to_next");
      expect(result.agentMessage?.type).toBe("feedback");
      expect(agent.canProceedToNext()).toBe(true);
    });

    it("should use fallback adjustment on adjustment API error", async () => {
      const approvalResp = JSON.stringify({ isApproval: false, confidence: 0.1, feedback: "" });
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: approvalResp } }] })
              .mockRejectedValueOnce(new Error("fail")) // adjustment fails
              .mockResolvedValueOnce({ choices: [{ message: { content: "Ajustes incorporados" } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveAutonomousDecisionAgent(client);
      const result = await agent.processUserResponse("mude tudo", makeContext());

      expect(result.understood).toBe(true);
      expect(result.nextAction).toBe("proceed_to_next");
      expect(agent.canProceedToNext()).toBe(true);
    });

    it("should use hardcoded fallback when all calls fail during adjustment", async () => {
      const client = createFailingOpenAI();
      const agent = new InteractiveAutonomousDecisionAgent(client);
      // keyword "sim" triggers approval even in fallback
      const result = await agent.processUserResponse("não gostei", makeContext());

      // checkApproval fails, keyword fallback doesn't match, adjustment also fails, fallback adjustment also fails
      expect(result.feedback).toBe("Ajustes incorporados.");
      expect(result.nextAction).toBe("proceed_to_next");
    });
  });

  describe("canProceedToNext()", () => {
    it("should return false initially", () => {
      const client = createMockOpenAI("{}");
      const agent = new InteractiveAutonomousDecisionAgent(client);
      expect(agent.canProceedToNext()).toBe(false);
    });
  });

  describe("generateSummary()", () => {
    it("should return confirmed message when decisions confirmed", () => {
      const client = createMockOpenAI("{}");
      const agent = new InteractiveAutonomousDecisionAgent(client);
      const ctx = makeContext({ accumulatedData: { decisionsConfirmed: true } });
      expect(agent.generateSummary(ctx)).toBe("Decisões técnicas confirmadas.");
    });

    it("should return automatic message when not confirmed", () => {
      const client = createMockOpenAI("{}");
      const agent = new InteractiveAutonomousDecisionAgent(client);
      expect(agent.generateSummary(makeContext())).toBe("Decisões definidas automaticamente.");
    });
  });
});
