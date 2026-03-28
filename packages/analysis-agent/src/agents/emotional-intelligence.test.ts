import { describe, it, expect, vi } from "vitest";
import { EmotionalIntelligenceAgent } from "./emotional-intelligence.js";

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

const VALID_CONTEXT_JSON = JSON.stringify({
  primaryEmotion: "enthusiastic",
  emotionalIntensity: 0.8,
  motivationalDrivers: ["curiosity", "achievement"],
  fears: ["complexity"],
  needsEncouragement: false,
  needsSimplification: false,
  needsPatience: false,
  suggestedTone: "direct",
  emotionalStrategy: "Be enthusiastic and match energy",
});

describe("EmotionalIntelligenceAgent", () => {
  describe("analyze() with valid response", () => {
    it("should return parsed emotional context", async () => {
      const client = createMockOpenAI(VALID_CONTEXT_JSON);
      const agent = new EmotionalIntelligenceAgent(client);
      const result = await agent.analyze("I'm excited to build something!");
      expect(result.primaryEmotion).toBe("enthusiastic");
      expect(result.emotionalIntensity).toBe(0.8);
      expect(result.motivationalDrivers).toEqual(["curiosity", "achievement"]);
      expect(result.fears).toEqual(["complexity"]);
      expect(result.suggestedTone).toBe("direct");
    });
  });

  describe("analyze() with invalid values", () => {
    it("should sanitize invalid enum values to defaults", async () => {
      const invalid = JSON.stringify({
        primaryEmotion: "rage",
        emotionalIntensity: -5,
        motivationalDrivers: "not-array",
        fears: 42,
        needsEncouragement: "yes",
        needsSimplification: "no",
        needsPatience: "maybe",
        suggestedTone: "aggressive",
        emotionalStrategy: "",
      });
      const client = createMockOpenAI(invalid);
      const agent = new EmotionalIntelligenceAgent(client);
      const result = await agent.analyze("test");
      expect(result.primaryEmotion).toBe("neutral");
      expect(result.emotionalIntensity).toBe(0.3);
      expect(result.motivationalDrivers).toEqual(["resolver problema"]);
      expect(result.fears).toEqual([]);
      expect(result.needsEncouragement).toBe(false);
      expect(result.needsSimplification).toBe(false);
      expect(result.needsPatience).toBe(false);
      expect(result.suggestedTone).toBe("professional");
      expect(result.emotionalStrategy).toContain("Abordagem neutra");
    });
  });

  describe("analyze() with markdown wrapped JSON", () => {
    it("should strip code fences", async () => {
      const wrapped = "```json\n" + VALID_CONTEXT_JSON + "\n```";
      const client = createMockOpenAI(wrapped);
      const agent = new EmotionalIntelligenceAgent(client);
      const result = await agent.analyze("test");
      expect(result.primaryEmotion).toBe("enthusiastic");
    });
  });

  describe("analyze() on error", () => {
    it("should return default context on API error", async () => {
      const client = {
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error("Network error")),
          },
        },
      } as unknown as import("openai").default;
      const agent = new EmotionalIntelligenceAgent(client);
      const result = await agent.analyze("test");
      expect(result.primaryEmotion).toBe("neutral");
      expect(result.emotionalIntensity).toBe(0.3);
    });
  });

  describe("analyze() with mixed array types", () => {
    it("should filter non-string items from arrays", async () => {
      const json = JSON.stringify({
        primaryEmotion: "curious",
        emotionalIntensity: 0.5,
        motivationalDrivers: ["learn", 42, null, "grow"],
        fears: [true, "rejection", 0],
        needsEncouragement: true,
        needsSimplification: true,
        needsPatience: true,
        suggestedTone: "patient",
        emotionalStrategy: "Be patient",
      });
      const client = createMockOpenAI(json);
      const agent = new EmotionalIntelligenceAgent(client);
      const result = await agent.analyze("test");
      expect(result.motivationalDrivers).toEqual(["learn", "grow"]);
      expect(result.fears).toEqual(["rejection"]);
    });
  });
});
