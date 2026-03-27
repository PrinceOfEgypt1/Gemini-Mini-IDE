# Gemini Mini-IDE — Engineering Manual

> **Document Version:** 20.1 (Prompt 10 completed + external main protection recorded)
> **Date:** 2026-03-22
> **Reference State:** `main @ fd816d9` (BG-05 + FG-09 pending merge)
> **Pipeline:** CI/CD via GitHub Actions (`lint`, `typecheck`, `test`, `build`)
> **Testes:** 41 arquivos executados / 44 escritos — 3 excluídos ativamente em `analysis-agent`

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

- `packages/analysis-agent/src/agent.ts @core-maintainers`
- `packages/analysis-agent/src/governance/ @core-maintainers`
- `packages/analysis-agent/src/validators/ @core-maintainers`
- `packages/analysis-agent/src/prompts/ @core-maintainers`

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

O comando `pnpm test` executa `pnpm -r test`, que roda `vitest run` em cada pacote individualmente. Cada pacote usa seu próprio `vitest.config.ts`. O `vitest.config.ts` da raiz não é usado pelo fluxo real de `pnpm test` e só serve para referência ou execução manual a partir da raiz.

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

### Contagem real por pacote (`main @ 5d6b1da`)

| Pacote | Arquivos escritos | Arquivos executados | Arquivos excluídos | Participação | Observações |
|---|---:|---:|---:|---|---|
| analysis-agent | 23 | 23 | 0 | Total | Todos os arquivos de teste executam (P03 resolvido) |
| ui | 14 | 14 | 0 | Total | `src/` e `test/` cobertos |
| server | 4 | 4 | 0 | Total | — |
| shared | 2 | 2 | 0 | Total | — |
| cli | 1 | 1 | 0 | Total | — |
| **TOTAL** | **44** | **44** | **0** | — | — |

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
| analysis-agent | 15% | 45% | 70% | 15% | Threshold de lines/statements baixo |
| cli | 40% | 80% | 80% | 40% | — |
| server | 40% | 30% | 55% | 40% | Threshold de functions baixo |
| shared | 80% | 50% | 80% | 80% | Functions threshold abaixo das demais métricas |
| ui | 20% | 35% | 60% | 20% | Thresholds baixos para pacote React |

Nota: thresholds não representam a cobertura real alcançada; são apenas pisos mínimos configurados. Thresholds baixos em `analysis-agent` e `ui` indicam que áreas não cobertas podem passar pelo gate.

### Contagens históricas de tests passing

As contagens abaixo são referências de execuções anteriores e precisam ser revalidadas no ambiente do operador:

| Pacote | Tests passing (última execução conhecida) |
|---|---:|
| analysis-agent | 306 |
| ui | 73 |
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

#### `packages/analysis-agent/src/{esaa,governance,generation,session,planning}/**` (production only)

| Rule | Level | Rationale |
|---|---|---|
| `no-console` | error | Governance and infrastructure sub-areas have no legitimate console usage; any addition would be noise |

### Existing suppressions (by design)

The following `eslint-disable-next-line` comments remain in production code and are intentional:

| File | Rule suppressed | Reason |
|---|---|---|
| `packages/server/src/index.ts` | `no-console` | Last-resort `console.error` in the uncatchable top-level catch before Fastify logger is available |
| `packages/server/src/services/agent-manager.ts` | `no-explicit-any` | `InteractiveOrchestrator` is lazily imported; native type is not available at declaration site |
| `packages/server/src/routes/esaa.routes.ts` | `no-explicit-any` (×3) | ESAA orchestrator is typed as `any` pending full ESAA type export; tracked as technical debt |

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
| `FORENSIC_AUDIT_REPORT.md` | Forensic audit of project state | Active |
| `docs/AI_POLICY.md` | Guidelines for AI-assisted development | Active |
| `docs/REVIEW_CHECKLIST.md` | Code review checklist | Active |
| `docs/ESAA_ARCHITECTURE.md` | ESAA architecture | Experimental |
| `docs/BACKLOG.md` | Backlog and roadmap | Active |
| `docs/adr/*.md` | Architecture Decision Records | Historical |
| `REMEDIATION_REPORT.md` | Recovery report (Rounds 1–5) | Historical |

## SSE Endpoint — Provisional Status (BG-07)

The endpoint GET /generation/progress/:sessionId is explicitly provisional.

### What it does today

- Validates sessionId format: 1–100 characters, alphanumeric, hyphens, and underscores only
- Returns 400 for invalid sessionId
- Establishes a valid SSE connection (text/event-stream)
- Sends a connected event with `{ type: "connected", sessionId, provisional: true }`
- Sends heartbeat comments every 15 seconds
- Enforces a 5-minute connection timeout (sends timeout event, then closes)
- Cleans up all resources (timers, listeners) on close, timeout, or error
- Uses `reply.hijack()` to prevent Fastify from interfering with the raw stream

### What it does NOT do

- Stream actual generation progress events
- Validate that sessionId corresponds to an existing session
- Bridge with `generate-incremental` progress callbacks
- Require authentication (unlike other conversation endpoints)

### Why it is provisional

The `generate-incremental` endpoint logs progress via `request.log.info` server-side, but there is no pub/sub mechanism to push those events to the SSE stream. Building that bridge would require an event emitter or channel system per session, which is outside the scope of the current hardening execution.

### Hardening applied (BG-07)

| Aspect | Before | After |
|---|---|---|
| sessionId validation | None | Regex: `^[a-zA-Z0-9_-]{1,100}$` |
| Timeout | None (indefinite) | 5 minutes, with explicit timeout event |
| Cleanup | Only heartbeat cleared on close | All timers cleared + stream ended on close, timeout, or error |
| Fastify integration | No `hijack()` — potential double-response | `reply.hijack()` used |
| Error handling | None | `reply.raw.on("error", cleanup)` |
| Provisional marker | None | `connected` event includes `provisional: true` |

### Boundary contract for sessionId

| Input | Behavior | Origin |
|---|---|---|
| Valid (1–100 chars, `[a-zA-Z0-9_-]`) | SSE connection established | Handler |
| Invalid format (special chars, empty, dots) | 400 with `{ error, details }` | Handler |
| Exceeds 100 chars | 404 (route does not match) | Fastify `maxParamLength` default (100) |

The handler's own regex (`^[a-zA-Z0-9_-]{1,100}$`) and Fastify's `maxParamLength` are aligned at 100 characters. For inputs > 100 chars, Fastify intercepts before the handler runs and returns 404. There is no gap between the two boundaries.


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

| Singleton | Module | Side Effect |
|---|---|---|
| `globalEventStore` | `analysis-agent/esaa/store/event-store.ts` | Opens SQLite DB + runs DDL |
| `globalESAAOrchestrator` | `analysis-agent/esaa/orchestrator.ts` | Creates 8+ sub-components + 2nd DB |
| `globalAnalysisCache` | `analysis-agent/services/cache.service.ts` | Reads `.mini-ide-cache.json` from disk |
| `defaultAgentInstance` | `server/services/agent-manager.ts` | Creates `AnalysisAgent` (TCP/TLS setup) |

This made bootstrap fragile, testing harder, and initialization order-dependent.

### Solution

All four singletons now use lazy initialization via getter functions:

| Old API | New API | Lifecycle Functions |
|---|---|---|
| `globalEventStore` | `getGlobalEventStore()` | `closeGlobalEventStore()`, `resetGlobalEventStore()` |
| `globalESAAOrchestrator` | `getGlobalESAAOrchestrator()` | `closeGlobalESAAOrchestrator()`, `resetGlobalESAAOrchestrator()` |
| `globalAnalysisCache` | `getGlobalAnalysisCache()` | `resetGlobalAnalysisCache()` |
| `defaultAgentInstance` (internal) | Lazy in `getAgent()` | `resetDefaultAgent()` |

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
- `dotenv.config()` in `server/src/index.ts` still runs at import time (acceptable — needed before any env-dependent code).


## Future Roadmap

Nota: esta seção é aspiracional. Os itens abaixo são visão futura, não funcionalidades implementadas.

- UI/UX premium (animations, micro-interactions)
- Real-time collaboration
- Plugin system for custom validators
- Database persistence (SQLite/Postgres)
- Docker deployment
- ESAA habilitado por padrão (atualmente experimental, `ESAA_ENABLED=false`)

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
- Request review from core maintainers for governance changes.


## External Step — Real Main Protection

Date of recording: 2026-03-23

Official reference state recorded after Prompt 10 completion:
- main @ `865f3e2`
- PR #49 merged successfully
- branch protection active on `main`
- required reviews active
- required status checks active and strict
- conversation resolution active
- enforce_admins active
- force-push disabled
- deletion disabled
- additional ruleset `14243549` active with `update` restriction on `refs/heads/main`
- bypass mode for the configured repository role: `pull_request`

Practical result:
- changes to `main` are governed by PR + review + green checks
- direct branch update is explicitly restricted by ruleset
- `main` is now materially hardened as the official protected branch

