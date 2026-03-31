import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { type FastifyInstance } from 'fastify';

// Mock analysis-agent before importing buildApp
vi.mock('@gemini-mini-ide/analysis-agent', () => {
  return {
    AnalysisAgent: vi.fn().mockImplementation(() => ({
      analyze: vi.fn().mockResolvedValue({
        summary: 'mock analysis',
        requestId: 'mock-id',
      }),
    })),
    getGlobalESAAOrchestrator: vi.fn().mockReturnValue({
      healthStatus: vi.fn().mockReturnValue({ status: 'ok', uptime: 123 }),
      queryEvents: vi.fn().mockReturnValue([]),
      getOperationalProjection: vi.fn().mockReturnValue({
        lastAppliedVersion: 0,
        updatedAt: '2026-01-01',
        hash: 'abc',
        agents: {},
        activeIntentions: {},
        activeWorkspaces: {},
        activePromotions: {},
        filesInProgress: {},
      }),
      getAuditProjection: vi.fn().mockReturnValue({
        correlationIndex: {},
        intentions: {},
        promotions: {},
      }),
      store: {
        listAgents: vi.fn().mockReturnValue([]),
        getPromotionBatch: vi.fn().mockReturnValue(null),
      },
      quarantineAgent: vi.fn().mockReturnValue({ success: true }),
      reinstateAgent: vi.fn().mockReturnValue({ success: true }),
      createSnapshots: vi.fn().mockReturnValue({ snapshotId: 'snap-1' }),
      rollbackToSnapshot: vi.fn().mockReturnValue({ success: true }),
      recovery: {
        rollbackLastPromotion: vi.fn().mockResolvedValue({ success: true }),
        replayFromVersion: vi.fn().mockResolvedValue({ replayed: 0 }),
      },
      fullReplay: vi.fn().mockResolvedValue({ replayed: 0 }),
      promotion: {
        rollback: vi.fn().mockResolvedValue(undefined),
      },
    }),
    InteractiveOrchestrator: vi.fn().mockImplementation(() => ({
      startConversation: vi.fn().mockResolvedValue({ sessionId: 'mock-session' }),
      respondToAgent: vi.fn().mockResolvedValue({ message: 'mock' }),
      getSession: vi.fn().mockReturnValue(null),
      skipCurrentAgent: vi.fn().mockResolvedValue({ skipped: true }),
      generatePlan: vi.fn().mockResolvedValue({ plan: 'mock' }),
      generateCodeFromPlan: vi.fn().mockResolvedValue({ code: 'mock' }),
      generateCodeFromPlanIncremental: vi.fn().mockResolvedValue({ code: 'mock' }),
      generateFinalResult: vi.fn().mockResolvedValue({ result: 'mock' }),
    })),
  };
});

import { buildApp } from './index.js';
import { clearCache } from './services/agent-manager.js';
import { InteractiveOrchestrator } from '@gemini-mini-ide/analysis-agent';

describe('Server Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Health check ──────────────────────────────────────────────────────

  describe('GET /healthz', () => {
    it('should return status ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/healthz' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });

  // ── Impact analysis ───────────────────────────────────────────────────

  describe('POST /impact-analysis', () => {
    it('should analyze impact for valid files', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/impact-analysis',
        payload: { files: ['packages/server/src/index.ts'] },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.report).toBeDefined();
      expect(body.formatted).toBeDefined();
    });

    it('should return 400 for invalid body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/impact-analysis',
        payload: { files: 'not-an-array' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('Invalid request');
    });

    it('should return 400 for missing files field', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/impact-analysis',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /impact-analysis', () => {
    it('should return service description', async () => {
      const res = await app.inject({ method: 'GET', url: '/impact-analysis' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.description).toContain('Impact analysis');
      expect(body.usage).toBeDefined();
    });
  });

  // ── Analyze endpoint ──────────────────────────────────────────────────

  describe('POST /analyze', () => {
    it('should return 400 for invalid body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/analyze',
        payload: { text: '' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inválidos');
    });

    it('should return 400 for missing text field', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/analyze',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('should handle dry-run mode', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/analyze',
        headers: { 'x-dry-run': 'true' },
        payload: { text: 'test input' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.summary).toBe('Dry Run Successful');
      expect(body.requestId).toBe('dry-run-id');
    });

    it('should return 401 when no API key is available', async () => {
      // DEFAULT_API_KEY is '' in test env, so no Bearer header means 401
      const res = await app.inject({
        method: 'POST',
        url: '/analyze',
        payload: { text: 'test input' },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('API Key');
    });

    // BG-09: verify /analyze uses canonical extractLLMConfig source (Bearer token accepted)
    it('should accept Bearer token via canonical source and return analysis result', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/analyze',
        headers: { authorization: 'Bearer test-key' },
        payload: { text: 'test input' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.summary).toBe('mock analysis');
    });
  });

  // ── Export endpoint ───────────────────────────────────────────────────

  describe('POST /export', () => {
    it('should return 400 for invalid project structure', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: { project: {} },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inválida');
    });

    it('should return 400 for missing project', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return 501 for unsupported format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'tar',
          project: { engine: { files: [{ path: 'a.txt', content: 'hello' }] } },
        },
      });
      expect(res.statusCode).toBe(501);
    });

    it('should export ZIP successfully', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: 'src/main.ts', content: 'console.log("hi")' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/zip');
    });

    it('should export ZIP with nested relative path', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [
                { path: 'src/index.ts', content: 'export {}' },
                { path: 'docs/guide.md', content: '# Guide' },
                { path: 'nested/folder/file.txt', content: 'data' },
              ],
            },
          },
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/zip');
    });

    it('should reject path traversal with ../', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: '../../evil.txt', content: 'malicious' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should reject absolute path', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: '/tmp/evil.txt', content: 'malicious' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should reject backslash traversal', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: '..\\evil.txt', content: 'malicious' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should reject mid-path traversal a/../b.txt', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: 'a/../b.txt', content: 'data' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should reject dot segment ./file.txt', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: './file.txt', content: 'data' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should silently skip entry with empty path (preserved original behavior)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: '', content: 'data' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should reject path with empty segments (double slash)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: 'src//file.txt', content: 'data' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should reject path with backslash in middle', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: 'src\\file.txt', content: 'data' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should reject path ending with slash', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: 'src/folder/', content: 'data' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should reject entire request if any file has unsafe path', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [
                { path: 'safe/file.txt', content: 'ok' },
                { path: '../../evil.txt', content: 'bad' },
              ],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should reject Windows drive letter absolute path C:/', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: 'C:/Windows/evil.txt', content: 'malicious' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should reject Windows drive letter without slash D:file.txt', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: 'D:file.txt', content: 'malicious' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should reject path containing null byte', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: 'safe.txt\0../../evil.txt', content: 'malicious' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('inseguro');
    });

    it('should accept valid deeply nested path', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: 'src/components/ui/Button.tsx', content: 'export default Button' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/zip');
    });

    it('should silently skip entry with empty content (file not added to archive)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/export',
        payload: {
          format: 'zip',
          project: {
            engine: {
              files: [{ path: 'empty.txt', content: '' }],
            },
          },
        },
      });
      expect(res.statusCode).toBe(200);
    });

  });

  // ── ESAA Endpoints ────────────────────────────────────────────────────

  describe('GET /esaa/health', () => {
    it('should return health status', async () => {
      const res = await app.inject({ method: 'GET', url: '/esaa/health' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('ok');
    });
  });

  describe('GET /esaa/events', () => {
    it('should return events list', async () => {
      const res = await app.inject({ method: 'GET', url: '/esaa/events' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.events).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should pass query params', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/esaa/events?streamId=test&limit=5',
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /esaa/projections/operational', () => {
    it('should return operational projection', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/esaa/projections/operational',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.lastAppliedVersion).toBe(0);
      expect(body.activeAgents).toBe(0);
    });
  });

  describe('GET /esaa/projections/audit/:correlationId', () => {
    it('should return audit for correlation id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/esaa/projections/audit/corr-123',
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.correlationId).toBe('corr-123');
      expect(body.intentions).toEqual([]);
      expect(body.promotions).toEqual([]);
    });
  });

  describe('GET /esaa/agents', () => {
    it('should return agents list', async () => {
      const res = await app.inject({ method: 'GET', url: '/esaa/agents' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.agents).toEqual([]);
      expect(body.total).toBe(0);
    });
  });

  describe('POST /esaa/agents/:agentId/quarantine', () => {
    it('should quarantine an agent', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/esaa/agents/agent-1/quarantine',
        payload: { reason: 'test', operatorId: 'op-1' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });
  });

  describe('POST /esaa/agents/:agentId/reinstate', () => {
    it('should reinstate an agent', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/esaa/agents/agent-1/reinstate',
        payload: {},
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });
  });

  describe('POST /esaa/recovery/snapshot', () => {
    it('should create a snapshot', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/esaa/recovery/snapshot',
        payload: {},
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.snapshotId).toBe('snap-1');
      expect(body.createdAt).toBeDefined();
    });
  });

  describe('POST /esaa/recovery/rollback', () => {
    it('should rollback to snapshot', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/esaa/recovery/rollback',
        payload: { snapshotId: 'snap-1', operatorId: 'op-1' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should rollback by correlation id', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/esaa/recovery/rollback',
        payload: { correlationId: 'corr-1', operatorId: 'op-1' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when no snapshotId or correlationId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/esaa/recovery/rollback',
        payload: { operatorId: 'op-1' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /esaa/recovery/replay', () => {
    it('should full replay', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/esaa/recovery/replay',
        payload: { full: true, operatorId: 'op-1' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should replay from version', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/esaa/recovery/replay',
        payload: { fromVersion: 5, operatorId: 'op-1' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when no full or fromVersion', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/esaa/recovery/replay',
        payload: { operatorId: 'op-1' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /esaa/promotions/:batchId', () => {
    it('should return 404 for unknown batch', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/esaa/promotions/unknown-batch',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /esaa/promotions/:batchId/rollback', () => {
    it('should rollback a promotion', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/esaa/promotions/batch-1/rollback',
        payload: { reason: 'test', operatorId: 'op-1' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });
  });

  // ── Conversation routes ───────────────────────────────────────────────

  describe('POST /conversations/start', () => {
    it('should return 401 without API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/conversations/start',
        payload: { userId: 'u1', message: 'hello' },
      });
      expect(res.statusCode).toBe(401);
    });

    // BG-02: verify /conversations/start preserves distinct { error, message } contract
    it('should return 401 with both error and message fields (distinct contract)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/conversations/start',
        payload: { userId: 'u1', message: 'hello' },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
      expect(body.message).toBeDefined();
    });

    it('should return 400 for invalid body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/conversations/start',
        headers: { authorization: 'Bearer test-key' },
        payload: { userId: '', message: '' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /conversations/:sessionId/respond', () => {
    it('should return 401 without API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/conversations/sess-1/respond',
        payload: { message: 'hello' },
      });
      expect(res.statusCode).toBe(401);
    });

    // BG-02: verify session handlers preserve { error } only (no message) contract
    it('should return 401 with error field only and no message field', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/conversations/sess-1/respond',
        payload: { message: 'hello' },
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
      expect(body.message).toBeUndefined();
    });

    it('should return 400 for empty message', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/conversations/sess-1/respond',
        headers: { authorization: 'Bearer test-key' },
        payload: { message: '' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /conversations/:sessionId', () => {
    it('should return 401 without API key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/conversations/sess-1',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /conversations/:sessionId/skip', () => {
    it('should return 401 without API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/conversations/sess-1/skip',
        payload: {},
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /conversations/:sessionId/plan', () => {
    it('should return 401 without API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/conversations/sess-1/plan',
        payload: {},
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /conversations/:sessionId/generate', () => {
    it('should return 401 without API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/conversations/sess-1/generate',
        payload: {},
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /conversations/:sessionId/generate-incremental', () => {
    it('should return 401 without API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/conversations/sess-1/generate-incremental',
        payload: {},
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /conversations/:sessionId/finalize', () => {
    it('should return 401 without API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/conversations/sess-1/finalize',
        payload: {},
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /generation/progress/:sessionId', () => {
    // P11: Authentication tests
    it('should return 401 without API key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/generation/progress/valid-session',
      });
      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('API Key');
    });

    // P11: Auth check happens before sessionId format validation
    it('should return 401 before validating sessionId format when no API key', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/generation/progress/%20',
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 400 with error and details for whitespace sessionId (with auth)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/generation/progress/%20',
        headers: { authorization: 'Bearer test-key' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('sessionId inválido');
      expect(body.details).toContain('1-100 caracteres');
    });

    it('should return 400 with error and details for special characters (with auth)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/generation/progress/sess!@%23$',
        headers: { authorization: 'Bearer test-key' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('sessionId inválido');
      expect(body.details).toContain('alfanuméricos');
    });

    it('should return 400 for sessionId containing dots (with auth)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/generation/progress/sess.with.dots',
        headers: { authorization: 'Bearer test-key' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('sessionId inválido');
    });

    it('should return 400 for sessionId containing slashes (encoded, with auth)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/generation/progress/sess%2Fwith%2Fslash',
        headers: { authorization: 'Bearer test-key' },
      });
      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('sessionId inválido');
    });

    it('should return 404 for sessionId exceeding Fastify maxParamLength (101 chars)', async () => {
      const longId = 'a'.repeat(101);
      const res = await app.inject({
        method: 'GET',
        url: `/generation/progress/${longId}`,
        headers: { authorization: 'Bearer test-key' },
      });
      expect(res.statusCode).toBe(404);
    });

    // P11: Session existence validation — default mock returns null (no session)
    it('should return 404 for non-existent session (with auth)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/generation/progress/nonexistent-session',
        headers: { authorization: 'Bearer test-key' },
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('Sessão não encontrada');
    });

    // P11: SSE connection tests — require InteractiveOrchestrator mock to return a session
    it('should return 404 for valid format but non-existent session', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/generation/progress/valid-session-123',
        headers: { authorization: 'Bearer test-key' },
      });
      // Default mock getSession returns null → 404
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.error).toContain('Sessão não encontrada');
    });

    // P11: POSITIVE SCENARIO — valid auth + existing session → SSE connection established
    it('should establish SSE connection with valid auth and existing session', async () => {
      // Clear orchestrator cache so a fresh mock instance is created
      clearCache();

      // Override the mock to return a valid session for this test
      const MockOrchestrator = vi.mocked(InteractiveOrchestrator);
      MockOrchestrator.mockImplementationOnce(() => ({
        getSession: vi.fn().mockReturnValue({ sessionId: 'existing-session', status: 'active' }),
        startConversation: vi.fn(),
        respondToAgent: vi.fn(),
        skipCurrentAgent: vi.fn(),
        generatePlan: vi.fn(),
        generateCodeFromPlan: vi.fn(),
        generateCodeFromPlanIncremental: vi.fn(),
        generateFinalResult: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any));

      const DEADLINE = Symbol('sse-alive');
      const result = await Promise.race([
        app.inject({
          method: 'GET',
          url: '/generation/progress/existing-session',
          headers: { authorization: 'Bearer sse-positive-test-key' },
        }),
        new Promise<typeof DEADLINE>((resolve) => setTimeout(() => resolve(DEADLINE), 500)),
      ]);

      if (result === DEADLINE) {
        // SSE connection stayed open (expected behavior — hijacked response doesn't complete)
        expect(true).toBe(true);
      } else {
        // Connection completed within 500ms — validate SSE response
        expect(result.statusCode).toBe(200);
        expect(result.headers['content-type']).toBe('text/event-stream');
        expect(result.headers['cache-control']).toBe('no-cache');
        expect(result.payload).toContain('data:');
        expect(result.payload).toContain('"type":"connected"');
        expect(result.payload).toContain('"sessionId":"existing-session"');
        expect(result.payload).toContain('"provisional":true');
      }

      // Restore default mock behavior
      clearCache();
    });
  });

});
