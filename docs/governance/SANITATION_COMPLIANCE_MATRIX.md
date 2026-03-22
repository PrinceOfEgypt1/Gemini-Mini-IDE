# Sanitation Compliance Matrix

> **Document Version:** 1.5
> **Created:** 2026-03-18
> **Updated:** 2026-03-22
> **Purpose:** Living compliance matrix for tracking technical sanitation executions

---

## 1. Purpose

This matrix is the single source of truth for tracking all technical sanitation executions applied to the Gemini-Mini-IDE project. Each execution that modifies governance, documentation, CI, or codebase hygiene must be registered here with full traceability.

## 2. Scope of Technical Sanitation

Technical sanitation covers:

- governance documentation (policies, processes, decision records);
- CI/CD pipeline alignment;
- branch policy enforcement;
- code hygiene (dead-code removal, dependency cleanup, repository cleanliness);
- documentation coherence.

Technical sanitation does **not** cover:

- feature development;
- bug fixes in application code;
- architectural changes;
- performance optimization.

## 3. Branch Policy

| Rule | Description |
|---|---|
| **Official branch** | `main` is the only official branch |
| **Provisional branches** | Temporary branches for development; must be merged or discarded promptly |
| **Merge destination** | All work must have a clear path to `main` |
| **No orphan branches** | Branches without a merge target are considered abandoned |

## 4. Minimum Merge Gate

Every merge into `main` must pass:

| Gate | Command |
|---|---|
| Lint | `pnpm lint` |
| Type check | `pnpm typecheck` |
| Tests | `pnpm test` |
| Pipeline | `bash scripts/active/pipeline.sh` |

No execution is considered complete if it does not pass all gates.

## 5. Compliance Tracking Table

| ID | Execution | Theme | Type | Prior Status | Action | Files Created | Files Modified | Files Deleted | Existing Feature Removed? | Existing Feature Modified? | Validations Run | Result | Remaining Risks | Final Commit |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `FG-BASE-01` | Governance Base + Matrix + CI | Governance foundation, compliance matrix, CI alignment | Governance / Documentation / CI | No formal sanitation tracking; CI referenced nonexistent `develop` branch; no documented branch policy or merge gates | Created the compliance matrix; added branch policy and merge gates to `DEVELOPMENT.md`; removed `develop` from CI triggers | `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | `DEVELOPMENT.md`, `.github/workflows/ci.yml` | None | No | No | `lint`, `typecheck`, `test`, `pipeline.sh` | Passed | None identified | `1943f55` |
| `BG-03` | Repository Hygiene | Remove versioned transient artifacts; align `.gitignore`; document versioning policy | Hygiene / Versioning | TypeScript sourcemaps tracked in `src/`; runtime log tracked; bundle JSONs tracked; `.gitignore` missing some `src/` sourcemap rules | Removed transient artifacts from tracking; added `.gitignore` rules for `src/` sourcemaps; documented versioning hygiene policy | None | `.gitignore`, `DEVELOPMENT.md`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | Transient sourcemaps, runtime log, bundle JSONs | No | No | `lint`, `typecheck`, `test`, `pipeline.sh` | Passed | None identified | Set by operator after merge |
| `BG-01` | Critical Security Fix — ZIP Export | Path sanitization for ZIP export entries | Security / Export | ZIP export accepted unsanitized paths (traversal, absolute, backslash, empty segments) | Added strict path validation; blocked traversal, absolute paths, backslashes, empty segments and trailing slash abuse; preserved original silent-skip behavior for empty path/content; added regression tests | None | `packages/server/src/controllers/export.controller.ts`, `packages/server/src/routes.test.ts`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | None | No | No | `lint`, `typecheck`, `test`, `pipeline.sh` | Passed | None identified | `bcaf716` |
| `BG-02 + BG-09` | Server Auth Centralization | Eliminate parallel Bearer extraction; centralize LLM config extraction via `extractLLMConfig` | Refactor / Security | `analysis.routes.ts` had inline Bearer extraction bypassing canonical helper; `conversation.routes.ts` already used canonical extraction | Replaced inline extraction in `/analyze` with `extractLLMConfig`; preserved relevant `401` contracts; added regression tests for Bearer flow and `401` payload expectations; updated governance docs | None | `packages/server/src/routes/analysis.routes.ts`, `packages/server/src/routes.test.ts`, `DEVELOPMENT.md`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | None | No | No | `lint`, `typecheck`, `test`, `pipeline.sh` | Passed | None identified | `21d77f4` |
| `PROMPT-05` | Testing Transparency | Separate written tests from executed tests; document active exclusions; remove misleading counts | Governance / Documentation | `README.md` and `DEVELOPMENT.md` mixed assertion counts with executable protection; divergence between `513` and `527` assertions; 3 excluded tests in `analysis-agent` were not clearly reflected in public docs; root `vitest.config.ts` does not mirror package exclusions | Rewrote test status in `README.md`; expanded testing transparency in `DEVELOPMENT.md`; documented exclusions and count divergence in `KNOWN_ISSUES.md`; added this entry to the matrix | None | `README.md`, `DEVELOPMENT.md`, `KNOWN_ISSUES.md`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | None | No | No (documentation only) | Attempted in AI environment: `lint`, `typecheck`, `test`, `pipeline.sh` | Prepared for manual application; requires local validation by operator | Root `vitest.config.ts` still does not mirror `analysis-agent` exclusions; thresholds remain low in `analysis-agent` and `ui`; counts still need local revalidation | Set by operator after local validation and merge |
| `PROMPT-06` | Critical Lint Hardening | Harden ESLint rules in critical areas: server, analysis-agent, esaa, governance sub-areas | Governance / Lint / Code Quality | All lint rules were at `warn` globally; no package-level override enforced errors; `no-unused-vars` only ignored function args (`argsIgnorePattern: "^_"`) but not destructured variables or vars — causing suppressible-but-noisy warnings in esaa projections | Raised `no-console`, `no-explicit-any`, `no-unused-vars` to `error` in `packages/server/src` (production); raised `no-explicit-any` and `no-unused-vars` to `error` in `packages/analysis-agent/src` (production); raised `no-console` to `error` in analysis-agent governance sub-areas (`esaa`, `governance`, `generation`, `session`, `planning`); extended global `no-unused-vars` ignore pattern to also cover `varsIgnorePattern`, `destructuredArrayIgnorePattern`, `caughtErrorsIgnorePattern` starting with `_`; removed stale `eslint-disable-next-line` in `rich-schemas.test.ts` that became unnecessary after pattern extension; documented full lint governance in `DEVELOPMENT.md` | None | `eslint.config.mjs`, `packages/analysis-agent/src/types/rich-schemas.test.ts`, `DEVELOPMENT.md`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | None | No | No | `lint`, `typecheck`, `test`, `pipeline.sh` | Prepared as technical handoff; all 4 gates passed in AI environment — requires local validation by operator before official materialization | `no-console` in analysis-agent `agents/`, `orchestrator.ts`, `services/`, `validators/` kept at `warn` — these files use console as primary logging channel; ESAA orchestrator typed as `any` in routes (3 suppressions remain — tracked as technical debt); test files excluded from stricter rules (test mocking requires `as any` in some cases) | Set by operator after local validation and merge |

| `BG-07` | SSE Endpoint Formalization + Regularization | Harden SSE endpoint with validation, timeout, cleanup; formalize as provisional; regularize contract and tests | Hardening / Documentation | SSE endpoint `/generation/progress/:sessionId` accepted any sessionId without validation; no timeout (indefinite connections); cleanup only cleared heartbeat on `close`; no `reply.hijack()` (potential Fastify double-response); no error handling on write failures; no documentation of provisional status; endpoint was a stub sending only heartbeats with no real progress data | Added sessionId format validation (regex `^[a-zA-Z0-9_-]{1,100}$`); added 5-minute connection timeout with explicit timeout event; added comprehensive cleanup (timers + stream end) on close, timeout, or error; added `reply.hijack()` for correct Fastify raw stream handling; added `provisional: true` flag in connected event; marked endpoint explicitly as provisional in code comments and documentation; regularization: resolved sessionId > 100 ambiguity (Fastify maxParamLength intercepts with 404 — documented explicitly in code, tests, and docs); strengthened validation tests to verify full response shape (`error` + `details` fields); added boundary tests (single-char minimum, dots, encoded slashes); documented SSE testing strategy constraints (inject + hijack interaction) | None | `packages/server/src/routes/conversation.routes.ts`, `packages/server/src/routes.test.ts`, `DEVELOPMENT.md`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | None | No | Yes — SSE endpoint now validates sessionId (rejects invalid with 400), enforces 5-minute timeout, includes `provisional: true` in connected event; existing valid connections are not functionally broken | `lint`, `typecheck`, `test`, `pipeline.sh` | Prepared as technical handoff; requires local validation by operator before official materialization | Endpoint still does not stream real progress data; sessionId existence is not verified against orchestrator; no authentication on SSE endpoint; no pub/sub bridge between generate-incremental callbacks and SSE stream | Set by operator after local validation and merge |

| `BG-08` | UI Duplicate Elimination + Consumer Regression Coverage | Consolidate official UI components; remove duplicate stubs; protect real consumers with regression tests | Refactor / UI / Tests / Documentation | `App.tsx` and `MainContent.tsx` could point to duplicate/stub UI implementations; isolated component tests did not prove the real consumers used the official components | Repointed `App.tsx` to `./components/explore/ExploreTimeline`; repointed `MainContent.tsx` to `../DiscoveryNotes`; removed duplicate stub components; added `AppConsumer.test.tsx` rendering `App.tsx` to verify timeline and overview use official implementations and fail if imports revert to stubs; updated governance docs | `packages/ui/test/integration/AppConsumer.test.tsx` | `packages/ui/src/App.tsx`, `packages/ui/src/components/layout/MainContent.tsx`, `DEVELOPMENT.md`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | `packages/ui/src/components/ExploreTimeline.tsx`, `packages/ui/src/components/discovery/DiscoveryNotes.tsx` | No | Yes — UI consumer imports now resolve explicitly to the official implementations; user-facing intent preserved | `lint`, `typecheck`, `test`, `pipeline.sh` | Prepared as technical handoff; requires local validation by operator before official materialization | Local validation still pending; future duplicate reintroduction outside covered consumers still requires code review discipline | Set by operator after local validation and merge |

| `BG-06` | Orchestrator Cache Lifecycle | Add explicit TTL, max-size, and cleanup policy to the orchestrator cache in agent-manager | Hardening / Cache / Lifecycle | Orchestrator cache (`Map<string, any>`) grew unbounded — no TTL, no max size, no eviction, no cleanup | Added `CacheEntry` wrapper with `createdAt`/`lastAccessed` metadata; TTL of 30 minutes (entry expires if not accessed within window); max 50 entries with LRU eviction (oldest `lastAccessed` evicted on overflow); periodic cleanup timer every 5 minutes (`unref`'d to not block process exit); exported utility functions (`cleanupExpiredEntries`, `startCleanupTimer`, `stopCleanupTimer`, `getCacheSize`, `clearCache`) for monitoring and testing; comprehensive behavioral tests covering reuse, TTL expiration, TTL keep-alive, cleanup sweep, LRU eviction correctness, max-size enforcement, timer lifecycle, and no-regression on constructor arguments | `packages/server/src/services/agent-manager.test.ts` | `packages/server/src/services/agent-manager.ts`, `DEVELOPMENT.md`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | None | No | Yes — `getOrchestrator` now wraps entries with metadata, expires stale entries on access, and evicts the oldest entry when cache is full; existing valid-entry behavior is preserved (same config returns same instance within TTL) | `lint`, `typecheck`, `test`, `pipeline.sh` | Passed | TTL and max entries are compile-time constants (no runtime config); `InteractiveOrchestrator` has no `close()`/`dispose()` — eviction drops reference but does not explicitly release resources; cleanup timer `unref()` is Node.js-specific | `7f26e2de08a0cfaf55377d2cfe363157169753c3` |

| `BG-05 + FG-09` | Singletons & Import-Time Side Effects | Convert critical singletons from import-time instantiation to lazy init with explicit lifecycle | Refactor / Architecture / Lifecycle | 4 critical singletons (`globalEventStore`, `globalESAAOrchestrator`, `globalAnalysisCache`, `defaultAgentInstance`) created heavy side effects (SQLite DB open, disk I/O, TCP/TLS) at import time; no cleanup/lifecycle API | Converted all 4 singletons to lazy getter functions (`getGlobalEventStore()`, `getGlobalESAAOrchestrator()`, `getGlobalAnalysisCache()`, lazy `getAgent()`); added explicit lifecycle functions (`close*()`, `reset*()`); updated all consumers; added singleton lifecycle tests and lazy-init agent tests | `packages/analysis-agent/src/services/singleton-lifecycle.test.ts` | `packages/analysis-agent/src/esaa/store/event-store.ts`, `packages/analysis-agent/src/esaa/store/index.ts`, `packages/analysis-agent/src/esaa/orchestrator.ts`, `packages/analysis-agent/src/esaa/index.ts`, `packages/analysis-agent/src/services/cache.service.ts`, `packages/analysis-agent/src/agent.ts`, `packages/server/src/index.ts`, `packages/server/src/services/agent-manager.ts`, `packages/server/src/services/agent-manager.test.ts`, `packages/server/src/routes.test.ts`, `DEVELOPMENT.md`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | None | No | Yes — export names changed from bare constants (`globalEventStore`) to getter functions (`getGlobalEventStore()`); all consumers updated; functional behavior preserved | `lint`, `typecheck`, `test`, `pipeline.sh` | Passed | Old export names removed (breaking change for external consumers if any); no automatic process-exit cleanup hook; `dotenv.config()` still runs at import time in server (acceptable); stateless singletons not converted (low risk, deferred) | Set by operator after merge |

## 6. How to Use This Matrix

1. **Before starting** a sanitation execution, add a new row with status fields marked as pending if the execution is only planned.
2. **During execution**, update the Action and Files columns as work progresses.
3. **After validation**, fill in Validations Run and Result.
4. **After commit/merge**, fill in Final Commit with the official materialized hash.
5. **Never** mark Result as passed if any validation gate failed.
