import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { type FastifyInstance } from 'fastify';

/**
 * P27 — Proof of containment for the ESAA HTTP surface.
 *
 * The ESAA subsystem is officially classified as EXPERIMENTAL and CONTAINED.
 * These tests are the executable proof of that classification at the HTTP
 * boundary: with the default environment (no ESAA_ENABLED, or
 * ESAA_ENABLED !== "true"), the entire `/esaa/*` namespace MUST NOT be
 * registered with Fastify and MUST return 404 for every documented endpoint.
 *
 * If a future change accidentally re-promotes the ESAA routes to the stable
 * HTTP surface (for example, by removing the gate in `server/src/index.ts`),
 * one of these assertions will fail and the regression will be caught at CI
 * time.
 *
 * The positive path (ESAA explicitly enabled, all 12 endpoints reachable) is
 * covered by `routes.test.ts`, which sets `ESAA_ENABLED=true` in beforeAll.
 */

// Mock analysis-agent to avoid native sqlite dependency at import time —
// even though the orchestrator should never be touched in this suite, the
// import graph still resolves through `getGlobalESAAOrchestrator`.
vi.mock('@gemini-mini-ide/analysis-agent', () => ({
  AnalysisAgent: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({ summary: 'mock', requestId: 'mock' }),
  })),
  getGlobalESAAOrchestrator: vi.fn().mockReturnValue({}),
  InteractiveOrchestrator: vi.fn().mockImplementation(() => ({
    startConversation: vi.fn(),
    respondToAgent: vi.fn(),
    getSession: vi.fn(),
    skipCurrentAgent: vi.fn(),
    generatePlan: vi.fn(),
    generateCodeFromPlan: vi.fn(),
    generateCodeFromPlanIncremental: vi.fn(),
    generateFinalResult: vi.fn(),
  })),
}));

import { buildApp, isESAAEnabled } from '../index.js';

describe('P27 · ESAA HTTP containment (default disabled)', () => {
  let app: FastifyInstance;
  let originalEsaaEnabled: string | undefined;

  beforeAll(async () => {
    originalEsaaEnabled = process.env['ESAA_ENABLED'];
    delete process.env['ESAA_ENABLED'];
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    if (originalEsaaEnabled === undefined) {
      delete process.env['ESAA_ENABLED'];
    } else {
      process.env['ESAA_ENABLED'] = originalEsaaEnabled;
    }
  });

  it('isESAAEnabled() returns false with no env var set', () => {
    expect(isESAAEnabled()).toBe(false);
  });

  it('isESAAEnabled() returns false for any value other than the literal "true"', () => {
    const cases = ['', '0', '1', 'TRUE', 'True', 'yes', 'on', 'enabled'];
    for (const value of cases) {
      process.env['ESAA_ENABLED'] = value;
      expect(isESAAEnabled()).toBe(false);
    }
    delete process.env['ESAA_ENABLED'];
  });

  it('isESAAEnabled() returns true only for the literal string "true"', () => {
    process.env['ESAA_ENABLED'] = 'true';
    expect(isESAAEnabled()).toBe(true);
    delete process.env['ESAA_ENABLED'];
  });

  // The full set of /esaa/* endpoints documented in docs/ESAA_ARCHITECTURE.md
  // § 5 ("API HTTP"). Each one MUST return 404 in the contained default state.
  const containedRoutes: Array<{ method: 'GET' | 'POST'; url: string }> = [
    { method: 'GET',  url: '/esaa/health' },
    { method: 'GET',  url: '/esaa/events' },
    { method: 'GET',  url: '/esaa/projections/operational' },
    { method: 'GET',  url: '/esaa/projections/audit/corr-1' },
    { method: 'GET',  url: '/esaa/agents' },
    { method: 'POST', url: '/esaa/agents/agent-1/quarantine' },
    { method: 'POST', url: '/esaa/agents/agent-1/reinstate' },
    { method: 'POST', url: '/esaa/recovery/snapshot' },
    { method: 'POST', url: '/esaa/recovery/rollback' },
    { method: 'POST', url: '/esaa/recovery/replay' },
    { method: 'GET',  url: '/esaa/promotions/batch-1' },
    { method: 'POST', url: '/esaa/promotions/batch-1/rollback' },
  ];

  for (const route of containedRoutes) {
    it(`${route.method} ${route.url} returns 404 when ESAA is contained`, async () => {
      const res = await app.inject({
        method: route.method,
        url: route.url,
        ...(route.method === 'POST' ? { payload: {} } : {}),
      });
      expect(res.statusCode).toBe(404);
    });
  }

  it('non-ESAA routes (e.g. /healthz) keep working when ESAA is contained', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
  });
});
