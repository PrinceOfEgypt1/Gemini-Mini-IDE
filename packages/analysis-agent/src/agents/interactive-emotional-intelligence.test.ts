import { describe, it, expect, vi } from "vitest";
import { InteractiveEmotionalIntelligenceAgent } from "./interactive-emotional-intelligence.js";
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
    currentPhase: "human_layer_emotions",
    accumulatedData: {},
    originalUserPrompt: "Criar um app de meditação",
    ...overrides,
  };
}

describe("InteractiveEmotionalIntelligenceAgent", () => {
  describe("constructor", () => {
    it("should set agent type", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      expect(agent.agentType).toBe("emotional_intelligence");
    });
  });

  describe("initiateConversation()", () => {
    it("should return empathetic question from LLM", async () => {
      const client = createMockOpenAI("Como você se sente sobre este projeto?");
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.type).toBe("question");
      expect(result.content).toBe("Como você se sente sobre este projeto?");
    });

    it("should use fallback when LLM returns empty", async () => {
      const client = createMockOpenAI("");
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.content).toBe("Como você está se sentindo em relação a esse projeto?");
    });

    it("should use fallback on API error", async () => {
      const client = createFailingOpenAI();
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.content).toBe("Como você está se sentindo em relação a esse projeto?");
    });

    it("should reset interaction count", async () => {
      const client = createMockOpenAI("Q");
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      await agent.initiateConversation(makeContext());
      expect(agent.canProceedToNext(makeContext())).toBe(false);
    });
  });

  describe("processUserResponse()", () => {
    it("should extract emotional data with continue action", async () => {
      const resp = JSON.stringify({
        understood: true,
        feedback: "Entendo sua empolgação!",
        dataExtracted: {
          primaryEmotion: "excited",
          emotionalIntensity: 0.8,
          motivationalDrivers: ["creativity"],
          fears: [],
          needsEncouragement: false,
          suggestedTone: "enthusiastic",
        },
        nextAction: "continue",
        nextQuestion: "O que mais te motiva?",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const result = await agent.processUserResponse("Estou animado!", makeContext());

      expect(result.understood).toBe(true);
      expect(result.feedback).toBe("Entendo sua empolgação!");
      expect(result.nextAction).toBe("continue");
      expect(result.agentMessage?.type).toBe("question");
      expect(result.agentMessage?.content).toBe("O que mais te motiva?");
    });

    it("should proceed when LLM says proceed_to_next", async () => {
      const resp = JSON.stringify({
        understood: true,
        feedback: "Mapeamento completo",
        dataExtracted: { primaryEmotion: "calm" },
        nextAction: "proceed_to_next",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const result = await agent.processUserResponse("estou tranquilo", makeContext());

      expect(result.nextAction).toBe("proceed_to_next");
      expect(result.agentMessage?.type).toBe("statement");
    });

    it("should merge emotional data with existing accumulated data", async () => {
      const resp = JSON.stringify({
        understood: true,
        feedback: "ok",
        dataExtracted: { primaryEmotion: "happy", suggestedTone: "warm" },
        nextAction: "continue",
        nextQuestion: "next?",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const ctx = makeContext({
        accumulatedData: { emotionalData: { fears: ["failure"] } },
      });
      const result = await agent.processUserResponse("estou feliz", ctx);

      const data = result.dataExtracted["emotionalData"] as Record<string, unknown>;
      expect(data["fears"]).toEqual(["failure"]);
      expect(data["primaryEmotion"]).toBe("happy");
    });

    it("should force proceed_to_next after max interactions", async () => {
      const resp = JSON.stringify({
        understood: true,
        feedback: "ok",
        dataExtracted: {},
        nextAction: "continue",
        nextQuestion: "more?",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveEmotionalIntelligenceAgent(client);

      // Process 3 responses (max interactions)
      await agent.processUserResponse("1", makeContext());
      await agent.processUserResponse("2", makeContext());
      const result = await agent.processUserResponse("3", makeContext());

      expect(result.nextAction).toBe("proceed_to_next");
    });

    it("should include conversation history in LLM prompt", async () => {
      const resp = JSON.stringify({
        understood: true,
        feedback: "ok",
        dataExtracted: {},
        nextAction: "continue",
        nextQuestion: "next",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const ctx = makeContext({
        previousMessages: [
          { id: "m1", sessionId: "session-1", role: "agent" as const, content: "Como se sente?", timestamp: new Date().toISOString() },
          { id: "m2", sessionId: "session-1", role: "user" as const, content: "Bem", timestamp: new Date().toISOString() },
        ],
      });
      await agent.processUserResponse("animado", ctx);

      const call = (client.chat.completions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.messages[1].content).toContain("Agente: Como se sente?");
      expect(call.messages[1].content).toContain("Usuário: Bem");
    });

    it("should use fallback on parse error with continue", async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: "bad json" } }] })
              .mockResolvedValueOnce({ choices: [{ message: { content: "Entendi, vamos lá" } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const result = await agent.processUserResponse("resposta", makeContext());

      expect(result.understood).toBe(true);
      expect(result.feedback).toBe("Entendi, vamos lá");
      expect(result.nextAction).toBe("continue");
    });

    it("should handle understood=false in response", async () => {
      const resp = JSON.stringify({
        understood: false,
        feedback: "Não entendi bem",
        dataExtracted: {},
        nextAction: "continue",
        nextQuestion: "Pode repetir?",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const result = await agent.processUserResponse("...", makeContext());

      expect(result.understood).toBe(false);
    });

    it("should use hardcoded fallback when all calls fail", async () => {
      const client = createFailingOpenAI();
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const result = await agent.processUserResponse("resposta", makeContext());

      expect(result.feedback).toBe("Entendi, vamos continuar.");
    });
  });

  describe("canProceedToNext()", () => {
    it("should return true when emotionalData exists", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const ctx = makeContext({ accumulatedData: { emotionalData: { primaryEmotion: "happy" } } });
      expect(agent.canProceedToNext(ctx)).toBe(true);
    });

    it("should return false without data and below max interactions", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      expect(agent.canProceedToNext(makeContext())).toBe(false);
    });
  });

  describe("generateSummary()", () => {
    it("should format emotional summary", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const ctx = makeContext({
        accumulatedData: {
          emotionalData: { primaryEmotion: "excited", suggestedTone: "enthusiastic" },
        },
      });
      expect(agent.generateSummary(ctx)).toBe("Emoção: excited, Tom: enthusiastic");
    });

    it("should return default when no data", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      expect(agent.generateSummary(makeContext())).toBe("Contexto emocional não mapeado.");
    });

    it("should handle partial data", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveEmotionalIntelligenceAgent(client);
      const ctx = makeContext({
        accumulatedData: { emotionalData: {} },
      });
      expect(agent.generateSummary(ctx)).toBe("Emoção: não identificada, Tom: neutro");
    });
  });
});
