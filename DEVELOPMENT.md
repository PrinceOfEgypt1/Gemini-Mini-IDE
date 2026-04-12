# Gemini Mini-IDE — Engineering Manual

> **Document Version:** 20.8 (P27.1 — micro-adendo de superfície pública do ESAA)
> **Date:** 2026-04-12
> **Reference State:** `main @ 9f7bb75` (P27 materializado; PR #77 merged)
> **Pipeline:** CI/CD via GitHub Actions (`lint`, `typecheck`, `test`, `build`, `doc-drift-enforcement`)
> **Testes:** 89 arquivos executados / 89 escritos — 0 excluídos

---

## Architecture Overview

**Strategy:** monorepo with strict types, Clean Architecture and generic governance.

## Package Structure

```text
packages/
├── analysis-agent/ # Core analysis engine (agent.ts, governance, validators)
├── ui/             # React frontend (Vite + Tailwind)
├── server/         # Fastify backend API
├── shared/         # Shared types and utilities
└── cli/            # Command-line interface
```

All packages use namespace `@gemini-mini-ide/*`.

## Governance System

The governance system ensures code quality without being coupled to any specific domain.

### Generic Validators

| Validator | Purpose | Domain-Agnostic? |
|---|---|---|
| BaseProjectAuditor | Injects essential files (README, package.json, tsconfig, CI) | Yes |
| CategoryValidator | Validates architectural category distribution | Yes |
| CompletenessValidator | Anti-lazy validation (no placeholders, stubs) | Yes |
| ContractValidator | Validates code delivers promised functionality | Yes |
| ManifestValidator | Validates file manifest structure | Yes |

### What the Governance System Does Not Do

- Inject domain-specific files.
- Require specific method counts or implementations.
- Hardcode references to a specific prompt or use case.
- Prescribe exact file structures beyond universal requirements.

### Files Protected by CODEOWNERS

All files are owned by `@PrinceOfEgypt1` (sole repository maintainer).

## Testing Strategy

### Test Categories

- **Unit Tests:** individual validator and auditor logic.
- **Generality Tests:** multi-prompt tests ensuring no overfitting.
- **Integration Tests:** full pipeline validation.

### Running Tests

```bash
# All tests
pnpm test

# Specific package
pnpm --filter @gemini-mini-ide/analysis-agent test

# Watch mode
pnpm --filter @gemini-mini-ide/analysis-agent test:watch
```

### Generality Test Suite

Located at `packages/analysis-agent/src/governance/generality.test.ts`.

This suite:

- tests Web App, API, Library, CLI and Dashboard prompts;
- verifies there are no hardcoded data-structure references;
- ensures validators work for any project type.

## Test Suite Transparency

**AVISO DE GOVERNANÇA:** esta seção é a fonte de verdade para interpretação correta da suíte de testes. Não usar contagens brutas sem ler esta seção.

### Como `pnpm test` executa os testes

O comando `pnpm test` executa `pnpm -r test`, que roda `vitest run` em cada pacote individualmente. Cada pacote usa seu próprio `vitest.config.ts`. Não existe `vitest.config.ts` na raiz — a execução de testes é exclusivamente por pacote, garantindo que cada pacote use seu ambiente, setup e aliases corretos.

### Distinção fundamental: escrito vs. executado

| Conceito | Definição |
|---|---|
| Arquivo de teste escrito | Arquivo `.test.ts` ou `.test.tsx` presente fisicamente no repositório |
| Arquivo de teste executado | Arquivo alcançado pelo padrão `include` do runner e não excluído pelo padrão `exclude` |
| Arquivo de teste excluído | Arquivo escrito, mas removido da execução por configuração explícita em `vitest.config.ts` |
| Test passing | Caso de teste individual (`it()` / `test()`) aprovado pelo runner |
| Assertion | Verificação individual dentro de um teste (`expect(...)`) |

### Erros comuns a evitar

- Tratar o número de arquivos escritos como igual ao número de arquivos executados.
- Tratar o número de tests passing de uma execução anterior como representativo do estado atual sem revalidação local.
- Assumir que todos os pacotes têm cobertura homogênea.

### Contagem real por pacote (`main @ 9f7bb75`)

| Pacote | Arquivos escritos | Arquivos executados | Arquivos excluídos | Participação | Observações |
|---|---:|---:|---:|---|---|
| analysis-agent | 39 | 39 | 0 | Total | P24 adicionou 6 arquivos; P27.1 adicionou `esaa-public-surface.test.ts` (prova de contenção do barrel público) |
| ui | 39 | 39 | 0 | Total | `src/` e `test/` cobertos (P05 + P07 + P25 expandiram cobertura) |
| server | 7 | 7 | 0 | Total | P26 adicionou `routes/esaa.routes.test.ts` (type guard + `ESAAOrchestratorLike`); P27 adicionou `routes/esaa.containment.test.ts` (prova executável de contenção do namespace `/esaa/*`) |
| shared | 3 | 3 | 0 | Total | P27.1 adicionou `esaa-surface.test.ts` (prova de contenção dos 18 contratos HTTP do ESAA na superfície pública) |
| cli | 1 | 1 | 0 | Total | — |
| **TOTAL** | **89** | **89** | **0** | — | — |

### Arquivos de teste anteriormente excluídos (`analysis-agent`) — RESOLVIDO

Os 3 arquivos que estavam excluídos foram reabilitados no Prompt 03:

| Arquivo | Status | Correção aplicada |
|---|---|---|
| `packages/analysis-agent/src/agent.test.ts` | **REABILITADO** | Mock atualizado para usar `ILLMClient` interface em vez de `vi.mock('openai')` |
| `packages/analysis-agent/src/esaa/esaa.test.ts` | **REABILITADO** | Shim `node-sqlite.ts` com `createRequire` + alias em `vitest.config.ts` |
| `packages/analysis-agent/src/index.test.ts` | **REABILITADO** | Mesmo shim resolve a cadeia de imports |

Nenhuma exclusão de arquivos de teste resta no `vitest.config.ts` do analysis-agent.

### Exclusões de coverage por pacote

Cada pacote exclui das métricas de cobertura:

- `node_modules/`, `dist/`
- os próprios arquivos `.test.ts` e `.test.tsx`
- definições de tipo (`.d.ts`)
- `__mocks__/`

O `analysis-agent` adicionalmente exclui `*.spec.ts`.

### Thresholds de cobertura por pacote

| Pacote | Lines | Functions | Branches | Statements | Observação |
|---|---:|---:|---:|---:|---|
| analysis-agent | 55% | 55% | 70% | 55% | Elevados em P05 |
| cli | 40% | 80% | 80% | 40% | — |
| server | 40% | 30% | 55% | 40% | Threshold de functions baixo |
| shared | 80% | 50% | 80% | 80% | Functions threshold abaixo das demais métricas |
| ui | 85% | 70% | 80% | 85% | Elevados em P05, endurecidos em P25 |

Nota: thresholds não representam a cobertura real alcançada; são apenas pisos mínimos configurados.

### Contagens históricas de tests passing

As contagens abaixo são referências de execuções anteriores e precisam ser revalidadas no ambiente do operador:

| Pacote | Tests passing (última execução conhecida) |
|---|---:|
| analysis-agent | 306 |
| ui | 251 |
| server | 88 |
| shared | 35 |
| cli | 25 |

**ATENÇÃO:** `README.md` reportava “513 passando” e `DEVELOPMENT.md` reportava “527 passando” simultaneamente. Essa divergência foi registrada em `KNOWN_ISSUES.md`. Por isso, os cabeçalhos agora usam contagens de arquivos de teste, que são mais auditáveis.

### Como auditar a suíte daqui em diante

```bash
# Contar arquivos escritos em analysis-agent
find packages/analysis-agent -name "*.test.ts" | wc -l

# Verificar exclusões ativas no analysis-agent
grep -A10 'exclude:' packages/analysis-agent/vitest.config.ts

# Ver arquivos executados com verbose
pnpm --filter @gemini-mini-ide/analysis-agent test -- --reporter=verbose

# Ver cobertura real
pnpm --filter @gemini-mini-ide/analysis-agent test -- --coverage
```

## Development Workflow

### Prerequisites

- Node.js 20+
- pnpm 8+

### Setup

```bash
git clone <repo>
cd Gemini-Mini-IDE
pnpm install
```

### Development Commands

```bash
# Start backend (port 3200)
pnpm --filter @gemini-mini-ide/server start

# Start frontend (port 5173)
pnpm --filter @gemini-mini-ide/ui dev

# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Run tests
pnpm test

# Build all packages
pnpm build
```

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):

- Lint: ESLint across all packages
- Typecheck: TypeScript strict mode
- Test: Vitest with coverage
- Build: production builds
- Critical Files Detection: warns on changes to governance files
- Large Deletion Warning: alerts on deletions above the configured threshold
- **Doc Drift Enforcement (BLOCKING):** `bash scripts/active/doc-drift-check.sh`
  — bloqueia se a contagem real de arquivos de teste divergir do documentado em `DEVELOPMENT.md`,
  ou se documentos marcados como históricos perderem o marcador de classificação.
  Hash divergence é advisory (esperada em branches) e não bloqueia.

### Como validar localmente antes de abrir PR

```bash
# Verificação rápida de drift documental:
bash scripts/active/doc-drift-check.sh

# Pipeline completa (inclui doc-drift):
bash scripts/active/pipeline.sh
```

**Interpretação dos resultados:**

| Resultado | Exit code | Significado |
|---|---|---|
| `OK — documentação íntegra` | 0 | Tudo alinhado |
| `OK (com avisos advisory)` | 0 | Hash diverge do HEAD — esperado em branch |
| `FALHOU — N erro(s) bloqueante(s)` | 1 | Drift material: corrija antes de mergear |

**Erros bloqueantes comuns:**

- `total real=X vs documentado=Y` → atualize a tabela de contagem em `DEVELOPMENT.md`
- `sem marcador histórico — arquivo.md` → adicione `DOCUMENTO HISTÓRICO` ao cabeçalho do arquivo

## Lint Governance

ESLint configuration lives in `eslint.config.mjs` (flat config, ESLint v9).

### Global rules (`warn` — applies everywhere)

| Rule | Level | Rationale |
|---|---|---|
| `no-console` | warn | Signal but do not block — packages without a structured logger may use console |
| `@typescript-eslint/no-unused-vars` | warn | Extended ignore pattern: args, vars, destructured array elements and caught errors starting with `_` |
| `@typescript-eslint/no-explicit-any` | warn | Signal but do not block globally |

The `no-unused-vars` rule uses `varsIgnorePattern: "^_"` and `destructuredArrayIgnorePattern: "^_"` in addition to `argsIgnorePattern: "^_"`. This covers intentional no-op destructuring (e.g. `const { key: _removed, ...rest } = obj`) without requiring manual `eslint-disable` comments.

### Critical area overrides (`error` — fail the build)

#### `packages/server/src/**` (production only, not `*.test.ts`)

| Rule | Level | Rationale |
|---|---|---|
| `no-console` | error | Server uses Fastify structured logger (`app.log`); `console.*` is the wrong channel |
| `@typescript-eslint/no-explicit-any` | error | HTTP handlers are a public boundary — opaque types undermine contract safety |
| `@typescript-eslint/no-unused-vars` | error | Dead variables in request handlers signal incomplete logic |

#### `packages/analysis-agent/src/**` (production only, not `*.test.ts` / `*.spec.ts`)

| Rule | Level | Rationale |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | error | Core analysis engine must maintain explicit type contracts |
| `@typescript-eslint/no-unused-vars` | error | Silent dead code in the agent pipeline is a regression risk |

Note: `no-console` is kept at `warn` for the general `analysis-agent` because agents and the orchestrator use `console.warn` / `console.error` as a legitimate operational channel (no injected logger in these modules).

#### `packages/analysis-agent/src/{esaa,governance,generation,session,planning}/**` (production only — `esaa/` is experimental/disabled by default)

| Rule | Level | Rationale |
|---|---|---|
| `no-console` | error | Governance and infrastructure sub-areas have no legitimate console usage; any addition would be noise |

### Existing suppressions (by design)

The following `eslint-disable-next-line` comments remain in production code and are intentional:

| File | Rule suppressed | Reason |
|---|---|---|
| `packages/server/src/index.ts` | `no-console` | Last-resort `console.error` in the uncatchable top-level catch before Fastify logger is available |

> P26: the two `no-explicit-any` suppressions previously listed here
> (`services/agent-manager.ts` and `routes/esaa.routes.ts`) were removed once
> `ESAAOrchestratorLike` and a typed `InteractiveOrchestratorCtor` replaced the
> `any` aliases. No ESAA-related suppression remains in the server package.

### Package-specific overrides

| Package | Override | Rationale |
|---|---|---|
| `packages/cli/src/**` | `no-console: off`, `no-process-exit: off` | CLI is a terminal tool; `console.log` and `process.exit` are its primary I/O mechanisms |

## Key Technical Decisions

### ADR-001: Overfitting Removal (2026-03-07)

Removed domain-specific code that was coupled to “Prompt 7” (data-structures visualization).

Correctly removed:

- hardcoded data-structure patterns;
- visualization-specific validators;
- animation-specific requirements.

Recovered:

- generic governance mechanisms;
- universal file validation;
- category distribution checks.

See `docs/adr/001-remocao-overfitting-prompt7.md` for details.

## Documentation

| Document | Purpose | Status |
|---|---|---|
| `README.md` | Quick start and overview | Active |
| `DEVELOPMENT.md` | Engineering details | Active |
| `KNOWN_ISSUES.md` | Known limitations and exclusions | Active |
| `FORENSIC_AUDIT_REPORT.md` | Snapshot forense do estado do projeto (2026-03-15, commit e3729ce) | Historical |
| `docs/AI_POLICY.md` | Guidelines for AI-assisted development | Active |
| `docs/REVIEW_CHECKLIST.md` | Code review checklist | Active |
| `docs/ESAA_ARCHITECTURE.md` | ESAA architecture | Experimental |
| `docs/BACKLOG.md` | Backlog and roadmap | Active |
| `docs/adr/*.md` | Architecture Decision Records | Historical |
| `REMEDIATION_REPORT.md` | Recovery report (Rounds 1–5) | Historical |

## SSE Endpoint — EXPERIMENTAL, Not Part of Stable API Surface (P23)

**Classification: EXPERIMENTAL** — Formally demoted from provisional to experimental in P23.

The endpoint `GET /generation/progress/:sessionId` does NOT stream real generation progress. It establishes a valid SSE connection with heartbeat keep-alive and proper security, but emits no real-time progress data. No client-side consumer exists in the UI package. This endpoint must not be treated as a stable, contractual feature. It may be removed, redesigned, or left indefinitely in this state without notice.

### What it does

- Requires authentication (same API key pattern as all conversation endpoints) — added P11
- Validates sessionId format: 1–100 characters, alphanumeric, hyphens, and underscores only
- Validates that sessionId corresponds to an existing session in the orchestrator — added P11
- Returns 400 for invalid sessionId format, 401 for missing auth, 404 for non-existent session
- Establishes a valid SSE connection (text/event-stream)
- Sends a connected event with `{ type: "connected", sessionId, provisional: true }`
- Sends heartbeat comments every 15 seconds
- Enforces a 5-minute connection timeout (sends timeout event, then closes)
- Cleans up all resources (timers, listeners) on close, timeout, or error
- Uses `reply.hijack()` to prevent Fastify from interfering with the raw stream

### What it does NOT do

- Stream actual generation progress events
- Bridge with `generate-incremental` progress callbacks
- Deliver any real-time information about code generation state

### Why it is experimental — not provisional

Previous documentation (BG-07) classified this endpoint as "provisional", implying a clear path to promotion. P23 audited the endpoint and determined that:

1. **No real progress streaming exists.** The endpoint emits only a "connected" event, heartbeats, and a timeout — no progress data.
2. **No pub/sub bridge exists.** The `generate-incremental` endpoint logs progress via `request.log.info()` server-side, but nothing pushes those events to this SSE stream.
3. **No client consumer exists.** The UI package does not reference this endpoint.
4. **Promotion would require new architecture** — an event emitter or channel system per session — which is outside the scope of saneamento.

The security and infrastructure hardening (authentication, session validation, cleanup, timeout) is solid. The endpoint is well-implemented for what it is. But what it is does not include its nominal purpose: streaming real progress.

### Hardening history

| Aspect | BG-07 | P11 | Current |
|---|---|---|---|
| sessionId validation | Added regex `^[a-zA-Z0-9_-]{1,100}$` | — | Active |
| Authentication | Not present | Added (same pattern as all endpoints) | Active |
| Session existence check | Not present | Added (orchestrator.getSession) | Active |
| Timeout | Added 5-minute with explicit event | — | Active |
| Cleanup | Added comprehensive cleanup | — | Active |
| Fastify integration | Added `reply.hijack()` | — | Active |
| Error handling | Added `reply.raw.on("error", cleanup)` | — | Active |
| Provisional marker | Added `provisional: true` in connected event | — | Active |

### Boundary contract for sessionId

| Input | Behavior | Origin |
|---|---|---|
| Missing/invalid API key | 401 `{ error }` | Handler (P11) |
| Valid (1–100 chars, `[a-zA-Z0-9_-]`) | SSE connection established | Handler |
| Invalid format (special chars, empty, dots) | 400 with `{ error, details }` | Handler |
| Non-existent session | 404 `{ error }` | Handler (P11) |
| Exceeds 100 chars | 404 (route does not match) | Fastify `maxParamLength` default (100) |

The handler's own regex (`^[a-zA-Z0-9_-]{1,100}$`) and Fastify's `maxParamLength` are aligned at 100 characters. For inputs > 100 chars, Fastify intercepts before the handler runs and returns 404. There is no gap between the two boundaries.


## ESAA — Experimental, Contained Subsystem (P27 + P27.1)

**Classification: EXPERIMENTAL / CONTAINED.** The Event-Sourced Agent Architecture (ESAA) subsystem is officially **not part of the stable surface** of Gemini Mini-IDE. P27 closed the architectural ambiguity that surrounded the subsystem after P03–P26: ESAA code remains in the repository, but every public-facing channel (HTTP routes, runtime pipeline, public docs, env defaults) now reflects the same containment regime. **P27.1** completed the closure by also containing the *public-surface* exposure: the 18 HTTP DTO contracts in `packages/shared/src/esaa/contracts.ts` are no longer re-exported by `@gemini-mini-ide/shared`'s public barrel, and the ESAA primitives are no longer wildcard-re-exported by `@gemini-mini-ide/analysis-agent`'s public barrel.

### Where ESAA lives in the code

| Layer | Path | Status |
|---|---|---|
| Core engine | `packages/analysis-agent/src/esaa/` (orchestrator, store, projections, gateway, policy, invariants, workspace, promotion, recovery) | Experimental — ~2 000 LOC, exercised only by `esaa.test.ts` (38 unit tests) |
| HTTP routes | `packages/server/src/routes/esaa.routes.ts` (12 endpoints) | Experimental — registered with Fastify **only** when `ESAA_ENABLED=true` (P27 gate) |
| HTTP DTO contracts | `packages/shared/src/esaa/contracts.ts` | Experimental — frozen reference. **P27.1**: removed from `packages/shared/src/index.ts` barrel; not part of `@gemini-mini-ide/shared` public surface; zero external client. Pinned by `packages/shared/src/esaa-surface.test.ts`. |
| Re-exports (`analysis-agent`) | `packages/analysis-agent/src/index.ts` | Experimental. **P27.1** narrowed the barrel from `export * from "./esaa/index.js"` to three explicit symbols only: `getGlobalESAAOrchestrator` (used by `server/src/index.ts`) and the type-only `ESAAOrchestrator`/`ESAAEventType` (used by `server/src/routes/esaa.routes.ts`). All other ESAA primitives (EventStore, IntentionGateway, WorkspaceExecutor, PromotionController, RecoveryController, ProjectionEngine, PolicyEngine, InvariantEngine, etc.) are no longer part of the public surface. Pinned by `packages/analysis-agent/src/esaa-public-surface.test.ts`. |

### Containment guarantees enforced by code

| Guarantee | Where | How it is enforced |
|---|---|---|
| Pipeline bypass | `analysis-agent/src/esaa/orchestrator.ts` `runPipeline()` | First line returns `{ skipped: true }` when `config.enabled === false` |
| HTTP route gate | `server/src/index.ts` `buildApp()` | Calls `registerESAARoutes()` only when `isESAAEnabled() === true`; with default env every `/esaa/*` URL returns 404 |
| Containment proof (HTTP) | `server/src/routes/esaa.containment.test.ts` | Boots the app with `ESAA_ENABLED` unset and asserts that all 12 documented `/esaa/*` endpoints return 404; also pins `isESAAEnabled()` semantics (only the literal string `"true"` enables) |
| Positive proof (HTTP) | `server/src/routes.test.ts` | Sets `process.env.ESAA_ENABLED = 'true'` in `beforeAll` so the existing 12 endpoint assertions still cover the enabled path |
| Containment proof (`shared` public surface — P27.1) | `packages/shared/src/esaa-surface.test.ts` | Imports `@gemini-mini-ide/shared`'s public barrel and asserts that no symbol whose name starts with `ESAA` is exposed and that none of the 18 contract names appear; also pings the deep-import path to confirm the file is preserved on disk |
| Containment proof (`analysis-agent` public surface — P27.1) | `packages/analysis-agent/src/esaa-public-surface.test.ts` | Imports `@gemini-mini-ide/analysis-agent`'s public barrel and asserts that `getGlobalESAAOrchestrator` is exposed but that EventStore, IntentionGateway, WorkspaceExecutor, PromotionController, RecoveryController, ProjectionEngine, PolicyEngine, InvariantEngine and the close/reset helpers are NOT |

### Why CONTAINMENT and not a maturation track

P27 chose **Caminho A — contenção formal** over Caminho B (trilha de maturação) based on objective evidence in the repository:

1. **Zero production consumer.** `agent.ts`, `orchestrator.ts` (`TransformativeOrchestrator`), `orchestrator-interactive.ts` (`InteractiveOrchestrator`), the UI package, and the CLI package contain **zero** references to ESAA. `runPipeline()` is never called by any production code path.
2. **Flag has been false for 20+ prompts.** `ESAA_ENABLED` defaults to `false` since the subsystem was introduced. There is no observable trajectory toward enabling it.
3. **Promotion would be out of scope.** Promoting ESAA would require: enabling by default, full integration tests through real generation pipelines, contract guarantees on the 12 HTTP endpoints, performance audit of the SQLite event store under load, and a UI/CLI client. None of this is in scope for a saneamento cycle.
4. **Principle of prudence.** The internal `esaa.test.ts` suite covers the core engine (EventStore, projections, gateway, policy, invariants, promotion, recovery) at the unit level, but unit-level coverage of an unused subsystem does not equal product-level maturity. Pretending otherwise would violate the project's discourse-honesty rule.

### What CONTAINMENT does NOT mean

- It does **not** mean the ESAA code is dead. The unit suite still runs in CI, the orchestrator still constructs cleanly when toggled on, and an operator can still experiment locally with `ESAA_ENABLED=true`.
- It does **not** mean ESAA cannot be promoted later. Promotion is not forbidden — but it requires an explicit, dedicated cycle that addresses the four points above. Until then, no part of the stable surface may rely on ESAA.

### How to verify the containment locally

```bash
# 1. Default state — /esaa/* must return 404
unset ESAA_ENABLED
pnpm --filter @gemini-mini-ide/server test -- routes/esaa.containment.test.ts

# 2. Opted-in state — /esaa/* must return the documented payloads
ESAA_ENABLED=true pnpm --filter @gemini-mini-ide/server test -- routes.test.ts
```


## BG-08 — UI Duplicate Elimination + Consumer Regression Coverage

Prepared as technical handoff for local application. This execution consolidates the official UI implementations for timeline and discovery notes, removes duplicate stubs, and adds consumer-level regression coverage.

### Scope Applied

- `packages/ui/src/App.tsx` now imports the official `ExploreTimeline` from `./components/explore/ExploreTimeline`.
- `packages/ui/src/components/layout/MainContent.tsx` now imports the official `DiscoveryNotes` from `../DiscoveryNotes`.
- Duplicate stub components removed:
  - `packages/ui/src/components/ExploreTimeline.tsx`
  - `packages/ui/src/components/discovery/DiscoveryNotes.tsx`
- Consumer-level regression coverage added in `packages/ui/test/integration/AppConsumer.test.tsx`.

### Regression Coverage Goal

The new integration tests render `App.tsx` as the real consumer and verify:

- the `timeline` tab uses the official `ExploreTimeline` implementation, not the deleted stub;
- the overview flow uses the official `DiscoveryNotes` implementation, not the deleted stub;
- the tests fail if imports are reverted to the duplicate/stub implementations.

### Validation Status

This handoff is prepared for local application and still requires operator validation before official materialization on `main`:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `bash scripts/active/pipeline.sh`


## BG-06 — Orchestrator Cache Lifecycle

The orchestrator cache in `packages/server/src/services/agent-manager.ts` now has an explicit lifecycle policy to prevent unbounded growth.

### Policy Summary

| Parameter | Value | Description |
|---|---|---|
| TTL | 30 minutes | Entries expire after 30 minutes without access |
| Max entries | 50 | Cache holds at most 50 entries |
| Eviction strategy | LRU (least recently accessed) | When full, the entry with the oldest `lastAccessed` is evicted |
| Cleanup interval | 5 minutes | Periodic sweep removes expired entries |

### Behavior

- **Cache hit (valid):** `lastAccessed` is updated; same orchestrator instance is returned.
- **Cache hit (expired):** entry is removed; a new orchestrator is created and cached.
- **Cache miss (under capacity):** new orchestrator is created and cached.
- **Cache miss (at capacity):** the least recently accessed entry is evicted first, then the new entry is added.
- **Periodic cleanup:** a background timer (started on first cache population, `unref`'d so it does not prevent process exit) sweeps expired entries every 5 minutes.

### Exported Utilities

| Function | Purpose |
|---|---|
| `cleanupExpiredEntries()` | Manually trigger a sweep of expired entries; returns count removed |
| `startCleanupTimer()` / `stopCleanupTimer()` | Control the periodic cleanup timer |
| `getCacheSize()` | Return current number of cached entries |
| `clearCache()` | Remove all cached entries (for testing/shutdown) |

### Constants

| Constant | Value |
|---|---|
| `ORCHESTRATOR_TTL_MS` | `30 * 60 * 1000` (30 minutes) |
| `ORCHESTRATOR_MAX_ENTRIES` | `50` |
| `CLEANUP_INTERVAL_MS` | `5 * 60 * 1000` (5 minutes) |

### Remaining Risks

- TTL and max entries are compile-time constants; changing them requires a code change and redeploy.
- The cleanup timer `unref()` relies on Node.js behavior; in non-Node runtimes this may behave differently.
- Orchestrator instances may hold internal state (e.g., SQLite connections); eviction does not call a `close()` or `dispose()` method on the orchestrator because the `InteractiveOrchestrator` API does not expose one.

### Test Coverage

Tests in `packages/server/src/services/agent-manager.test.ts` cover:

- Cache reuse for identical and different configs
- TTL expiration and re-creation
- TTL reset on access (keep-alive)
- Cleanup of expired entries (manual and count verification)
- Max-size eviction (oldest by lastAccessed)
- LRU eviction correctness (recently accessed entry survives)
- Cache never exceeds max size under burst
- Cleanup timer lifecycle (start, stop, idempotency)
- clearCache behavior
- No regression on constructor arguments and composite cache key


## BG-05 + FG-09 — Singletons & Import-Time Side Effects

Critical singletons that previously initialized at import time have been converted to lazy initialization with explicit lifecycle management.

### Problem

Four critical singletons were creating heavy side effects when their modules were first imported:

| Singleton | Module | Side Effect | Status |
|---|---|---|---|
| `globalEventStore` | `analysis-agent/esaa/store/event-store.ts` | Opens SQLite DB + runs DDL | **Experimental** (ESAA) |
| `globalESAAOrchestrator` | `analysis-agent/esaa/orchestrator.ts` | Creates 8+ sub-components + 2nd DB | **Experimental** (ESAA) |
| `globalAnalysisCache` | `analysis-agent/services/cache.service.ts` | Reads `.mini-ide-cache.json` from disk | Production |
| `defaultAgentInstance` | `server/services/agent-manager.ts` | Creates `AnalysisAgent` (TCP/TLS setup) | Production |

This made bootstrap fragile, testing harder, and initialization order-dependent.

### Solution

All four singletons now use lazy initialization via getter functions:

| Old API | New API | Lifecycle Functions | Status |
|---|---|---|---|
| `globalEventStore` | `getGlobalEventStore()` | `closeGlobalEventStore()`, `resetGlobalEventStore()` | **Experimental** (ESAA) |
| `globalESAAOrchestrator` | `getGlobalESAAOrchestrator()` | `closeGlobalESAAOrchestrator()`, `resetGlobalESAAOrchestrator()` | **Experimental** (ESAA) |
| `globalAnalysisCache` | `getGlobalAnalysisCache()` | `resetGlobalAnalysisCache()` | Production |
| `defaultAgentInstance` (internal) | Lazy in `getAgent()` | `resetDefaultAgent()` | Production |

### Behavior Preserved

- First call to a getter creates the instance (same configuration as before).
- Subsequent calls return the same instance.
- `close*()` / `reset*()` releases resources and allows fresh creation on next access.
- All existing functional flows continue to work identically.

### Excluded from This Round

Stateless or lightweight singletons (`globalPolicyEngine`, `globalInvariantEngine`, `baseProjectAuditor`, `categoryValidator`, `globalGenerationContext`) were excluded — they create empty in-memory structures with no I/O side effects.

### Remaining Risks

- Consumers must now call getter functions instead of accessing bare constants. The old export names (`globalEventStore`, `globalESAAOrchestrator`, `globalAnalysisCache`) are removed.
- No automatic process-exit cleanup hook is installed; callers are responsible for calling `close*()` on shutdown if needed.
- `dotenv.config()` in `server/src/index.ts` now runs inside `start()`, not at import time (P10). `getDefaultApiKey()` reads `process.env` lazily.


## Future Roadmap

Nota: esta seção é aspiracional. Os itens abaixo são visão futura, não funcionalidades implementadas.

- UI/UX premium (animations, micro-interactions)
- Real-time collaboration
- Plugin system for custom validators
- Database persistence (SQLite/Postgres)
- Docker deployment

> **P27 — ESAA não consta deste roadmap.** O subsistema ESAA é oficialmente
> classificado como experimental e contido (ver § "ESAA — Experimental,
> Contained Subsystem (P27)" abaixo). Não há trilha de promoção planejada
> nem cronograma para torná-lo parte estável do produto. A versão anterior
> deste roadmap listava "ESAA habilitado por padrão" como item aspiracional;
> esse item foi removido em P27 para eliminar a ambiguidade entre discurso
> documental e estado real do código.

## Branch Policy

| Rule | Description |
|---|---|
| Official branch | `main` is the only official branch of the project |
| Provisional branches | Temporary branches used for development; must be merged into `main` or discarded promptly |
| Merge destination | Every execution must have a clear merge path to `main` |
| No orphan branches | Branches without a defined merge target are considered abandoned |

There is no `develop` branch. All integration happens directly on `main`.

## Minimum Merge Gate

Every merge into `main` must pass all of the following:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `bash scripts/active/pipeline.sh`

No PR should be merged if any gate fails.

## Sanitation Compliance

Technical sanitation executions are tracked in `docs/governance/SANITATION_COMPLIANCE_MATRIX.md`. Every governance or hygiene change must be registered there.

## Versioning Hygiene Policy

The following artifacts must never be committed to the repository:

| Category | Examples | Covered by `.gitignore` |
|---|---|---|
| Build output | `dist/`, `build/`, `*.tsbuildinfo` | Yes |
| Sourcemaps in source dirs | `packages/*/src/**/*.js.map`, `packages/*/src/**/*.d.ts.map` | Yes |
| Runtime logs | `logs/`, `*.log`, `*.log.*` | Yes |
| Runtime bundles | `bundles/` | Yes |
| Database files | `*.db`, `*.sqlite`, `*.sqlite3` | Yes |
| Environment secrets | `.env` | Yes |
| OS artifacts | `.DS_Store`, `*:Zone.Identifier` | Yes |

If a file matching these patterns is found tracked in the repository, it should be removed from tracking via `git rm --cached` while preserving the local copy, and the corresponding `.gitignore` rule should be verified.

## Contributing

- Create a feature branch from `main`.
- Follow existing code patterns.
- Add tests for new functionality.
- Ensure all merge gates pass.
- Request review from the repository owner for governance changes.


## External Step — Real Main Protection

Date of recording: 2026-03-23
Updated: 2026-04-05 (P19 — ajuste de governança para repositório solo)

Official reference state recorded after Prompt 10 completion:
- main @ `865f3e2`
- PR #49 merged successfully
- branch protection active on `main`
- required status checks active and strict
- conversation resolution active
- enforce_admins active
- force-push disabled
- deletion disabled
- additional ruleset `14243549` active with `update` restriction on `refs/heads/main`
- bypass mode for the configured repository role: `pull_request`

### Ajuste P19 — Governança Solo (2026-04-05)

A configuração original incluía 1 approval obrigatório + code owner review + enforce admins.
Essa combinação é incompatível com repositório de mantenedor solo:
- O autor do PR não pode aprovar o próprio PR no GitHub.
- O code owner (`@PrinceOfEgypt1`) é o mesmo que o autor do PR.

**Configuração alvo após P19:**
- required approvals: **0** (era 1)
- code owner review: **desabilitado** (era habilitado)
- Demais proteções mantidas integralmente.

**AÇÃO MANUAL REQUERIDA:** aplicar no GitHub UI (Settings → Branches).

Practical result:
- changes to `main` are governed by PR + green checks (automated)
- direct branch update is explicitly restricted by ruleset
- `main` continues materially hardened, without artificial dependency on external reviewer

