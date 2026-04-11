import { describe, it, expect, vi } from "vitest";
import { InteractiveAdaptiveInteractionAgent } from "./interactive-adaptive-interaction.js";
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
    currentPhase: "human_layer_adaptation",
    accumulatedData: {},
    originalUserPrompt: "Criar um jogo de plataforma",
    ...overrides,
  };
}

describe("InteractiveAdaptiveInteractionAgent", () => {
  describe("constructor", () => {
    it("should use default model when none provided", () => {
      const client = createMockOpenAI("question");
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      expect(agent.agentType).toBe("adaptive_interaction");
    });

    it("should accept custom model", () => {
      const client = createMockOpenAI("question");
      const agent = new InteractiveAdaptiveInteractionAgent(client, "custom-model");
      expect(agent.agentType).toBe("adaptive_interaction");
    });
  });

  describe("initiateConversation()", () => {
    it("should return a question from LLM response", async () => {
      const client = createMockOpenAI("Como você prefere interagir?");
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.type).toBe("question");
      expect(result.content).toBe("Como você prefere interagir?");
    });

    it("should use fallback when LLM returns empty", async () => {
      const client = createMockOpenAI("");
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.type).toBe("question");
      expect(result.content).toBe("Como você prefere que eu te ajude neste projeto?");
    });

    it("should use fallback on API error", async () => {
      const client = createFailingOpenAI();
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.type).toBe("question");
      expect(result.content).toBe("Como você prefere que eu te ajude neste projeto?");
    });

    it("should include accumulated data in LLM prompt", async () => {
      const client = createMockOpenAI("Pergunta personalizada");
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      const ctx = makeContext({
        accumulatedData: {
          userProfileData: { knowledgeLevel: "beginner" },
          emotionalData: { primaryEmotion: "excited" },
        },
      });
      await agent.initiateConversation(ctx);

      const call = (client.chat.completions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.messages[1].content).toContain("beginner");
      expect(call.messages[1].content).toContain("excited");
    });

    it("should reset answered state on each call", async () => {
      const client = createMockOpenAI("Q");
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      // Process a response first to set answered=true
      const jsonResp = JSON.stringify({
        feedback: "ok",
        dataExtracted: { autonomyLevel: 0.5, tone: "tech" },
      });
      (client.chat.completions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        choices: [{ message: { content: "Q" } }],
      }).mockResolvedValueOnce({
        choices: [{ message: { content: jsonResp } }],
      });

      await agent.initiateConversation(makeContext());
      expect(agent.canProceedToNext()).toBe(false);
    });
  });

  describe("processUserResponse()", () => {
    it("should extract interaction data from valid JSON response", async () => {
      const jsonResp = JSON.stringify({
        feedback: "Entendi suas preferências!",
        dataExtracted: { autonomyLevel: 0.8, tone: "técnico", useEmojis: false },
      });
      const client = createMockOpenAI(jsonResp);
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      const result = await agent.processUserResponse("Prefiro autonomia total", makeContext());

      expect(result.understood).toBe(true);
      expect(result.feedback).toBe("Entendi suas preferências!");
      expect(result.nextAction).toBe("proceed_to_next");
      expect(result.dataExtracted).toHaveProperty("interactionData");
      expect((result.dataExtracted["interactionData"] as Record<string, unknown>)["autonomyLevel"]).toBe(0.8);
    });

    it("should handle JSON with markdown fences", async () => {
      const jsonResp = "```json\n" + JSON.stringify({
        feedback: "Ok",
        dataExtracted: { autonomyLevel: 0.3, tone: "casual" },
      }) + "\n```";
      const client = createMockOpenAI(jsonResp);
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      const result = await agent.processUserResponse("quero ser guiado", makeContext());

      expect(result.understood).toBe(true);
      expect(result.nextAction).toBe("proceed_to_next");
    });

    it("should use fallback on parse error", async () => {
      // First call for processUserResponse fails (bad JSON), second for fallback
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: "invalid json" } }] })
              .mockResolvedValueOnce({ choices: [{ message: { content: "Fallback msg" } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveAdaptiveInteractionAgent(client);
      const result = await agent.processUserResponse("alguma resposta", makeContext());

      expect(result.understood).toBe(true);
      expect(result.feedback).toBe("Fallback msg");
      expect(result.dataExtracted).toHaveProperty("interactionData");
      expect((result.dataExtracted["interactionData"] as Record<string, unknown>)["autonomyLevel"]).toBe(0.5);
      expect(result.nextAction).toBe("proceed_to_next");
    });

    it("should use hardcoded fallback when both LLM calls fail", async () => {
      const client = createFailingOpenAI();
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      const result = await agent.processUserResponse("resposta", makeContext());

      expect(result.feedback).toBe("Entendi suas preferências.");
      expect(result.nextAction).toBe("proceed_to_next");
    });

    it("should set answered flag after processing", async () => {
      const jsonResp = JSON.stringify({
        feedback: "ok",
        dataExtracted: { autonomyLevel: 0.5 },
      });
      const client = createMockOpenAI(jsonResp);
      const agent = new InteractiveAdaptiveInteractionAgent(client);

      expect(agent.canProceedToNext()).toBe(false);
      await agent.processUserResponse("resposta", makeContext());
      expect(agent.canProceedToNext()).toBe(true);
    });

    it("should include agentMessage in success response", async () => {
      const jsonResp = JSON.stringify({
        feedback: "Perfeito!",
        dataExtracted: { autonomyLevel: 0.7, tone: "formal" },
      });
      const client = createMockOpenAI(jsonResp);
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      const result = await agent.processUserResponse("formal", makeContext());

      expect(result.agentMessage).toBeDefined();
      expect(result.agentMessage?.type).toBe("statement");
      expect(result.agentMessage?.content).toBe("Perfeito!");
    });

    it("should handle response with missing dataExtracted", async () => {
      const jsonResp = JSON.stringify({
        feedback: "Ok entendi",
      });
      const client = createMockOpenAI(jsonResp);
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      const result = await agent.processUserResponse("resposta", makeContext());

      expect(result.dataExtracted).toHaveProperty("interactionData");
      expect(result.dataExtracted["interactionData"]).toEqual({});
    });
  });

  describe("canProceedToNext()", () => {
    it("should return false initially", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      expect(agent.canProceedToNext()).toBe(false);
    });
  });

  describe("generateSummary()", () => {
    it("should return formatted summary with interaction data", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      const ctx = makeContext({
        accumulatedData: { interactionData: { autonomyLevel: 0.8, tone: "técnico" } },
      });

      expect(agent.generateSummary(ctx)).toBe("Autonomia: 0.8, Tom: técnico");
    });

    it("should return default summary without interaction data", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveAdaptiveInteractionAgent(client);
      expect(agent.generateSummary(makeContext())).toBe("Estratégia padrão.");
    });
  });
});
