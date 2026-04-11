import { describe, it, expect, vi } from "vitest";
import { InteractiveUserProfilerAgent } from "./interactive-user-profiler.js";
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
    currentPhase: "human_layer_profiling",
    accumulatedData: {},
    originalUserPrompt: "Criar um chat bot",
    ...overrides,
  };
}

describe("InteractiveUserProfilerAgent", () => {
  describe("constructor", () => {
    it("should set agent type", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveUserProfilerAgent(client);
      expect(agent.agentType).toBe("user_profiler");
    });

    it("should accept custom model", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveUserProfilerAgent(client, "gpt-4");
      expect(agent.agentType).toBe("user_profiler");
    });
  });

  describe("initiateConversation()", () => {
    it("should return question from LLM", async () => {
      const client = createMockOpenAI("Qual sua experiência?");
      const agent = new InteractiveUserProfilerAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.type).toBe("question");
      expect(result.content).toBe("Qual sua experiência?");
    });

    it("should use fallback when LLM returns empty", async () => {
      const client = createMockOpenAI("");
      const agent = new InteractiveUserProfilerAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.content).toBe("Para te ajudar melhor, qual seu nível de experiência com tecnologia?");
    });

    it("should use fallback on API error", async () => {
      const client = createFailingOpenAI();
      const agent = new InteractiveUserProfilerAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.content).toBe("Para te ajudar melhor, qual seu nível de experiência com tecnologia?");
    });

    it("should reset interaction count", async () => {
      const client = createMockOpenAI("Q");
      const agent = new InteractiveUserProfilerAgent(client);
      await agent.initiateConversation(makeContext());
      expect(agent.canProceedToNext(makeContext())).toBe(false);
    });
  });

  describe("processUserResponse()", () => {
    it("should extract profile data and continue", async () => {
      const resp = JSON.stringify({
        understood: true,
        feedback: "Legal, você é iniciante!",
        dataExtracted: {
          knowledgeLevel: "beginner",
          ageGroup: "adult",
          communicationStyle: "casual",
          autonomyPreference: "guided",
        },
        nextAction: "continue",
        nextQuestion: "E qual sua experiência com programação?",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveUserProfilerAgent(client);
      const result = await agent.processUserResponse("Sou iniciante", makeContext());

      expect(result.understood).toBe(true);
      expect(result.nextAction).toBe("continue");
      expect(result.agentMessage?.type).toBe("question");
      expect(result.agentMessage?.content).toBe("E qual sua experiência com programação?");
      const data = result.dataExtracted["userProfileData"] as Record<string, unknown>;
      expect(data["knowledgeLevel"]).toBe("beginner");
    });

    it("should merge with existing profile data", async () => {
      const resp = JSON.stringify({
        understood: true,
        feedback: "ok",
        dataExtracted: { communicationStyle: "technical" },
        nextAction: "continue",
        nextQuestion: "more?",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveUserProfilerAgent(client);
      const ctx = makeContext({
        accumulatedData: { userProfileData: { knowledgeLevel: "advanced" } },
      });
      const result = await agent.processUserResponse("sou técnico", ctx);

      const data = result.dataExtracted["userProfileData"] as Record<string, unknown>;
      expect(data["knowledgeLevel"]).toBe("advanced");
      expect(data["communicationStyle"]).toBe("technical");
    });

    it("should proceed when LLM says proceed_to_next", async () => {
      const resp = JSON.stringify({
        understood: true,
        feedback: "Perfil completo!",
        dataExtracted: { knowledgeLevel: "expert" },
        nextAction: "proceed_to_next",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveUserProfilerAgent(client);
      const result = await agent.processUserResponse("expert dev", makeContext());

      expect(result.nextAction).toBe("proceed_to_next");
      expect(result.agentMessage).toBeUndefined();
    });

    it("should force proceed_to_next after max interactions (4)", async () => {
      const resp = JSON.stringify({
        understood: true,
        feedback: "ok",
        dataExtracted: {},
        nextAction: "continue",
        nextQuestion: "more?",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveUserProfilerAgent(client);

      await agent.processUserResponse("1", makeContext());
      await agent.processUserResponse("2", makeContext());
      await agent.processUserResponse("3", makeContext());
      const result = await agent.processUserResponse("4", makeContext());

      expect(result.nextAction).toBe("proceed_to_next");
    });

    it("should include conversation history in LLM prompt", async () => {
      const resp = JSON.stringify({
        understood: true,
        feedback: "ok",
        dataExtracted: {},
        nextAction: "continue",
        nextQuestion: "next?",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveUserProfilerAgent(client);
      const ctx = makeContext({
        previousMessages: [
          { id: "m1", sessionId: "session-1", role: "agent" as const, content: "Qual nível?", timestamp: new Date().toISOString() },
          { id: "m2", sessionId: "session-1", role: "user" as const, content: "Intermediário", timestamp: new Date().toISOString() },
        ],
      });
      await agent.processUserResponse("mais info", ctx);

      const call = (client.chat.completions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.messages[1].content).toContain("Agente: Qual nível?");
      expect(call.messages[1].content).toContain("Usuário: Intermediário");
    });

    it("should use fallback on parse error", async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: "invalid" } }] })
              .mockResolvedValueOnce({ choices: [{ message: { content: "Fallback ok" } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveUserProfilerAgent(client);
      const result = await agent.processUserResponse("resposta", makeContext());

      expect(result.understood).toBe(true);
      expect(result.feedback).toBe("Fallback ok");
      expect(result.nextAction).toBe("continue");
    });

    it("should use hardcoded fallback when all calls fail", async () => {
      const client = createFailingOpenAI();
      const agent = new InteractiveUserProfilerAgent(client);
      const result = await agent.processUserResponse("resposta", makeContext());

      expect(result.feedback).toBe("Entendi, vamos continuar.");
    });

    it("should handle understood=false in response", async () => {
      const resp = JSON.stringify({
        understood: false,
        feedback: "Não entendi",
        dataExtracted: {},
        nextAction: "continue",
        nextQuestion: "Pode repetir?",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveUserProfilerAgent(client);
      const result = await agent.processUserResponse("xyz", makeContext());

      expect(result.understood).toBe(false);
    });
  });

  describe("canProceedToNext()", () => {
    it("should return true when userProfileData exists", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveUserProfilerAgent(client);
      const ctx = makeContext({ accumulatedData: { userProfileData: { knowledgeLevel: "beginner" } } });
      expect(agent.canProceedToNext(ctx)).toBe(true);
    });

    it("should return false without data", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveUserProfilerAgent(client);
      expect(agent.canProceedToNext(makeContext())).toBe(false);
    });
  });

  describe("generateSummary()", () => {
    it("should format valid profile summary", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveUserProfilerAgent(client);
      const ctx = makeContext({
        accumulatedData: {
          userProfileData: {
            knowledgeLevel: "intermediate",
            estimatedAge: "adult_31_55",
            communicationStyle: "technical",
            domain: "web",
            language: "pt-BR",
            culturalContext: "Brazil",
            urgency: "medium",
            accessibilityNeeds: [],
            autonomyPreference: "collaborate",
            confidence: 0.7,
          },
        },
      });
      const summary = agent.generateSummary(ctx);
      expect(summary).toContain("intermediate");
      expect(summary).toContain("technical");
      expect(summary).toContain("collaborate");
    });

    it("should return partial message for invalid profile", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveUserProfilerAgent(client);
      const ctx = makeContext({
        accumulatedData: { userProfileData: { knowledgeLevel: "beginner" } },
      });
      expect(agent.generateSummary(ctx)).toBe("Perfil parcial coletado.");
    });

    it("should return not-mapped message when no data", () => {
      const client = createMockOpenAI("q");
      const agent = new InteractiveUserProfilerAgent(client);
      expect(agent.generateSummary(makeContext())).toBe("Perfil não mapeado.");
    });
  });
});
