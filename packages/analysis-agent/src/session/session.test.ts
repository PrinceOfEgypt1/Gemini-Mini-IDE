import { describe, it, expect, beforeEach, vi } from "vitest";
import { SessionDatabase } from "./database.js";
import { SessionManager } from "./manager.js";

vi.mock("crypto", () => ({
  randomUUID: vi.fn()
    .mockReturnValueOnce("uuid-session-1")
    .mockReturnValueOnce("uuid-msg-1")
    .mockReturnValueOnce("uuid-session-2")
    .mockReturnValueOnce("uuid-msg-2")
    .mockReturnValueOnce("uuid-msg-3")
    .mockReturnValue("uuid-fallback"),
}));

describe("SessionDatabase", () => {
  it("should construct without error", () => {
    const db = new SessionDatabase("/tmp/test-sessions.db");
    expect(db).toBeDefined();
  });

  it("should construct with default path", () => {
    const db = new SessionDatabase();
    expect(db).toBeDefined();
  });

  it("should initialize without error", () => {
    const db = new SessionDatabase("/tmp/test-sessions.db");
    expect(() => db.initialize()).not.toThrow();
  });

  it("should execute query and return empty array", () => {
    const db = new SessionDatabase("/tmp/test-sessions.db");
    const result = db.query("SELECT * FROM sessions");
    expect(result).toEqual([]);
  });

  it("should execute queryOne and return undefined", () => {
    const db = new SessionDatabase("/tmp/test-sessions.db");
    const result = db.queryOne("SELECT * FROM sessions WHERE session_id = ?", ["nonexistent"]);
    expect(result).toBeUndefined();
  });

  it("should close without error", () => {
    const db = new SessionDatabase("/tmp/test-sessions.db");
    expect(() => db.close()).not.toThrow();
  });
});

describe("SessionManager", () => {
  let mockDb: SessionDatabase;
  let manager: SessionManager;

  beforeEach(() => {
    mockDb = {
      run: vi.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
      query: vi.fn().mockReturnValue([]),
      queryOne: vi.fn().mockReturnValue(undefined),
      initialize: vi.fn(),
      close: vi.fn(),
    } as unknown as SessionDatabase;
    manager = new SessionManager(mockDb);
  });

  describe("createSession()", () => {
    it("should create a session with correct defaults", () => {
      const session = manager.createSession("user-123");
      expect(session.userId).toBe("user-123");
      expect(session.currentPhase).toBe("human_layer_profiling");
      expect(session.currentAgent).toBe("user_profiler");
      expect(session.messages).toEqual([]);
      expect(session.contextData).toEqual({});
      expect(session.metadata.totalMessages).toBe(0);
      expect(mockDb.run).toHaveBeenCalledTimes(1);
    });
  });

  describe("getSession()", () => {
    it("should return null for nonexistent session", () => {
      const result = manager.getSession("nonexistent");
      expect(result).toBeNull();
    });

    it("should return session when found", () => {
      (mockDb.queryOne as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        session_id: "s1",
        user_id: "u1",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        current_phase: "human_layer_profiling",
        current_agent: "user_profiler",
        context_data: '{"key":"value"}',
        metadata: '{"totalMessages":5,"totalIterations":0,"averageResponseTime":0,"userSatisfaction":0}',
      });
      const result = manager.getSession("s1");
      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe("s1");
      expect(result!.contextData).toEqual({ key: "value" });
      expect(result!.metadata.totalMessages).toBe(5);
    });

    it("should handle empty context_data", () => {
      (mockDb.queryOne as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        session_id: "s1",
        user_id: "u1",
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
        current_phase: "human_layer_profiling",
        current_agent: "user_profiler",
        context_data: "",
        metadata: "",
      });
      const result = manager.getSession("s1");
      expect(result!.contextData).toEqual({});
    });
  });

  describe("updateSessionPhase()", () => {
    it("should call db.run with correct params", () => {
      manager.updateSessionPhase("s1", "strategic_layer_decisions", "autonomous_decision");
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE sessions SET current_phase"),
        expect.arrayContaining(["strategic_layer_decisions", "autonomous_decision"])
      );
    });
  });

  describe("updateSessionContext()", () => {
    it("should merge context with existing data", () => {
      (mockDb.queryOne as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        context_data: '{"existing":"data"}',
      });
      manager.updateSessionContext("s1", { newKey: "newValue" });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE sessions SET context_data"),
        expect.arrayContaining([expect.stringContaining("newKey")])
      );
    });

    it("should handle no existing session", () => {
      (mockDb.queryOne as ReturnType<typeof vi.fn>).mockReturnValueOnce(undefined);
      manager.updateSessionContext("s1", { key: "value" });
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should handle empty existing context_data", () => {
      (mockDb.queryOne as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        context_data: "",
      });
      manager.updateSessionContext("s1", { key: "value" });
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe("addMessage()", () => {
    it("should return a message object with correct fields", () => {
      const msg = manager.addMessage("s1", "user", "Hello");
      expect(msg.role).toBe("user");
      expect(msg.content).toBe("Hello");
      expect(msg.sessionId).toBe("s1");
      expect(mockDb.run).toHaveBeenCalledTimes(2); // INSERT + UPDATE metadata
    });

    it("should accept optional agentType", () => {
      const msg = manager.addMessage("s1", "agent", "Hi", "user_profiler");
      expect(msg.agentType).toBe("user_profiler");
    });

    it("should accept optional agentAction", () => {
      const msg = manager.addMessage("s1", "agent", "Action", "user_profiler", { type: "decision", data: {} });
      expect(msg.agentAction).toEqual({ type: "decision", data: {} });
    });

    it("should handle message without agentAction", () => {
      const msg = manager.addMessage("s1", "agent", "No action", "user_profiler");
      expect(msg.agentAction).toBeUndefined();
    });
  });

  describe("getMessages()", () => {
    it("should return empty array for no messages", () => {
      const messages = manager.getMessages("s1");
      expect(messages).toEqual([]);
    });

    it("should parse message rows correctly", () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockReturnValueOnce([
        {
          id: "m1",
          session_id: "s1",
          role: "user",
          agent_type: null,
          content: "Hello",
          timestamp: "2024-01-01",
          intent: null,
          sentiment: null,
          entities: null,
          agent_action: null,
        },
        {
          id: "m2",
          session_id: "s1",
          role: "agent",
          agent_type: "user_profiler",
          content: "Hi there",
          timestamp: "2024-01-01",
          intent: "greet",
          sentiment: "positive",
          entities: '["user"]',
          agent_action: '{"type":"decision","data":{}}',
        },
      ]);
      const messages = manager.getMessages("s1");
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[0].agentType).toBeUndefined();
      expect(messages[0].entities).toBeUndefined();
      expect(messages[1].role).toBe("agent");
      expect(messages[1].agentType).toBe("user_profiler");
      expect(messages[1].entities).toEqual(["user"]);
      expect(messages[1].agentAction).toEqual({ type: "decision", data: {} });
    });
  });

  describe("listSessions()", () => {
    it("should return empty array for unknown user", () => {
      const sessions = manager.listSessions("unknown");
      expect(sessions).toEqual([]);
    });

    it("should parse session rows correctly", () => {
      (mockDb.query as ReturnType<typeof vi.fn>).mockReturnValueOnce([
        {
          session_id: "s1",
          user_id: "u1",
          created_at: "2024-01-01",
          updated_at: "2024-01-02",
          current_phase: "engineering_analysis",
          current_agent: "analysis",
          context_data: '{"key":"value"}',
          metadata: '{"totalMessages":3,"totalIterations":1,"averageResponseTime":500,"userSatisfaction":0.8}',
        },
      ]);
      const sessions = manager.listSessions("u1");
      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe("s1");
      expect(sessions[0].currentPhase).toBe("engineering_analysis");
      expect(sessions[0].metadata.totalMessages).toBe(3);
      expect(sessions[0].messages).toEqual([]);
    });
  });

  describe("deleteSession()", () => {
    it("should call db.run with DELETE query", () => {
      manager.deleteSession("s1");
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM sessions"),
        ["s1"]
      );
    });
  });
});
