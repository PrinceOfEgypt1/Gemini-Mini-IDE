import { describe, it, expect, vi } from "vitest";
import { InteractiveExperienceDesignerAgent } from "./interactive-experience-designer.js";
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
    currentPhase: "strategic_layer_experience",
    accumulatedData: {},
    originalUserPrompt: "Criar um app de receitas",
    ...overrides,
  };
}

describe("InteractiveExperienceDesignerAgent", () => {
  describe("constructor", () => {
    it("should set agent type", () => {
      const client = createMockOpenAI("{}");
      const agent = new InteractiveExperienceDesignerAgent(client);
      expect(agent.agentType).toBe("experience_designer");
    });
  });

  describe("initiateConversation()", () => {
    it("should present experience with presentationMessage", async () => {
      const resp = JSON.stringify({
        experienceVision: "Visão",
        keyFeatures: ["Busca inteligente", "Favoritos"],
        presentationMessage: "Aqui está a experiência do seu app!",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveExperienceDesignerAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.type).toBe("statement");
      expect(result.content).toBe("Aqui está a experiência do seu app!");
    });

    it("should format features when presentationMessage is missing", async () => {
      const resp = JSON.stringify({
        summary: "Resumo da experiência",
        keyFeatures: ["Feature A", "Feature B"],
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveExperienceDesignerAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.content).toContain("Resumo da experiência");
      expect(result.content).toContain("1. Feature A");
      expect(result.content).toContain("2. Feature B");
    });

    it("should handle non-array keyFeatures gracefully", async () => {
      const resp = JSON.stringify({
        summary: "Resumo",
        keyFeatures: "not-an-array",
      });
      const client = createMockOpenAI(resp);
      const agent = new InteractiveExperienceDesignerAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.content).toBe("Resumo");
    });

    it("should use fallback presentation on API error", async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockRejectedValueOnce(new Error("fail"))
              .mockResolvedValueOnce({ choices: [{ message: { content: "Fallback experience" } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveExperienceDesignerAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.content).toBe("Fallback experience");
    });

    it("should use hardcoded fallback when all calls fail", async () => {
      const client = createFailingOpenAI();
      const agent = new InteractiveExperienceDesignerAgent(client);
      const result = await agent.initiateConversation(makeContext());

      expect(result.content).toBe("Preparei uma experiência baseada nas suas necessidades. Posso gerar o projeto?");
    });

    it("should reset approved state", async () => {
      const client = createMockOpenAI(JSON.stringify({ presentationMessage: "msg" }));
      const agent = new InteractiveExperienceDesignerAgent(client);
      await agent.initiateConversation(makeContext());
      expect(agent.canProceedToNext()).toBe(false);
    });

    it("should include all accumulated data in prompt", async () => {
      const client = createMockOpenAI(JSON.stringify({ presentationMessage: "m" }));
      const agent = new InteractiveExperienceDesignerAgent(client);
      const ctx = makeContext({
        accumulatedData: {
          userProfileData: { knowledgeLevel: "beginner" },
          emotionalData: { primaryEmotion: "happy" },
          interactionData: { tone: "casual" },
          decisionsData: { stack: "React" },
        },
      });
      await agent.initiateConversation(ctx);

      const call = (client.chat.completions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.messages[1].content).toContain("beginner");
      expect(call.messages[1].content).toContain("happy");
      expect(call.messages[1].content).toContain("casual");
      expect(call.messages[1].content).toContain("React");
    });
  });

  describe("processUserResponse() — approval path", () => {
    it("should detect approval with high confidence", async () => {
      const approvalResp = JSON.stringify({
        isApproval: true,
        confidence: 0.9,
        feedback: "Gerando o projeto!",
      });
      const client = createMockOpenAI(approvalResp);
      const agent = new InteractiveExperienceDesignerAgent(client);
      const result = await agent.processUserResponse("Sim, pode gerar!", makeContext());

      expect(result.nextAction).toBe("proceed_to_next");
      expect(result.dataExtracted).toEqual({ experienceApproved: true });
      expect(agent.canProceedToNext()).toBe(true);
    });

    it("should reject approval with low confidence and process adjustment", async () => {
      const approvalResp = JSON.stringify({ isApproval: true, confidence: 0.4, feedback: "" });
      const adjustResp = JSON.stringify({
        feedback: "Ajustando...",
        adjustments: { features: ["new"] },
        readyToGenerate: false,
        followUpQuestion: "O que mudar?",
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

      const agent = new InteractiveExperienceDesignerAgent(client);
      const result = await agent.processUserResponse("hmm, talvez", makeContext());

      expect(result.nextAction).toBe("continue");
      expect(result.agentMessage?.content).toBe("O que mudar?");
    });

    it("should use keyword fallback when approval check fails — matching", async () => {
      const adjustResp = JSON.stringify({
        feedback: "ok",
        adjustments: {},
        readyToGenerate: false,
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

      const agent = new InteractiveExperienceDesignerAgent(client);
      const result = await agent.processUserResponse("sim, gerar agora", makeContext());

      // "sim" + "gerar" match keywords
      expect(result.dataExtracted).toEqual({ experienceApproved: true });
    });

    it("should use keyword fallback — no match", async () => {
      const adjustResp = JSON.stringify({
        feedback: "Entendi",
        adjustments: {},
        readyToGenerate: false,
        followUpQuestion: "Quer mudar algo?",
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

      const agent = new InteractiveExperienceDesignerAgent(client);
      const result = await agent.processUserResponse("quero mudar", makeContext());

      expect(result.nextAction).toBe("continue");
    });
  });

  describe("processUserResponse() — adjustment path", () => {
    it("should auto-approve when readyToGenerate=true", async () => {
      const approvalResp = JSON.stringify({ isApproval: false, confidence: 0.1, feedback: "" });
      const adjustResp = JSON.stringify({
        feedback: "Tudo pronto!",
        adjustments: { added: "dark mode" },
        readyToGenerate: true,
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

      const agent = new InteractiveExperienceDesignerAgent(client);
      const result = await agent.processUserResponse("adicione dark mode", makeContext());

      expect(result.nextAction).toBe("proceed_to_next");
      expect(result.agentMessage?.type).toBe("feedback");
      expect(agent.canProceedToNext()).toBe(true);
    });

    it("should use fallback adjustment on API error", async () => {
      const approvalResp = JSON.stringify({ isApproval: false, confidence: 0.1, feedback: "" });
      const client = {
        chat: {
          completions: {
            create: vi.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: approvalResp } }] })
              .mockRejectedValueOnce(new Error("fail"))
              .mockResolvedValueOnce({ choices: [{ message: { content: "Incorporei" } }] }),
          },
        },
      } as unknown as import("openai").default;

      const agent = new InteractiveExperienceDesignerAgent(client);
      const result = await agent.processUserResponse("mude tudo", makeContext());

      expect(result.nextAction).toBe("proceed_to_next");
      expect(result.feedback).toBe("Incorporei");
    });

    it("should use hardcoded fallback when all adjustment calls fail", async () => {
      const client = createFailingOpenAI();
      const agent = new InteractiveExperienceDesignerAgent(client);
      // keyword doesn't match so we go to adjustment path which also fails
      const result = await agent.processUserResponse("quero diferente", makeContext());

      expect(result.feedback).toBe("Incorporei suas sugestões. Iniciando a geração...");
    });
  });

  describe("canProceedToNext()", () => {
    it("should return false initially", () => {
      const client = createMockOpenAI("{}");
      const agent = new InteractiveExperienceDesignerAgent(client);
      expect(agent.canProceedToNext()).toBe(false);
    });
  });

  describe("generateSummary()", () => {
    it("should return approved message when approved", () => {
      const client = createMockOpenAI("{}");
      const agent = new InteractiveExperienceDesignerAgent(client);
      const ctx = makeContext({ accumulatedData: { experienceApproved: true } });
      expect(agent.generateSummary(ctx)).toBe("Design aprovado.");
    });

    it("should return automatic message when not approved", () => {
      const client = createMockOpenAI("{}");
      const agent = new InteractiveExperienceDesignerAgent(client);
      expect(agent.generateSummary(makeContext())).toBe("Design definido automaticamente.");
    });
  });
});
