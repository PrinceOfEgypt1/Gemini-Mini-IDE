# Gemini Mini-IDE — Engineering Manual

> **Document Version:** 15.0 (Server Auth Centralization — BG-02 + BG-09)
> **Date:** 2026-03-20
> **Pipeline:** CI/CD via GitHub Actions (lint, typecheck, test, build)
> **Testes:** 527 passando (vitest)

---

# Architecture Overview

**Strategy:** Monorepo with strict types, Clean Architecture, Generic Governance.

## Package Structure

```
packages/
├── analysis-agent/     # Core analysis engine (agent.ts, governance, validators)
├── ui/                 # React frontend (Vite + Tailwind)
├── server/            # Fastify backend API
├── shared/            # Shared types and utilities
└── cli/               # Command-line interface
```

All packages use namespace `@gemini-mini-ide/*`.

---

## Governance System

The governance system ensures code quality without being coupled to any specific domain.

### Generic Validators

| Validator | Purpose | Domain-Agnostic? |
|-----------|---------|------------------|
| `BaseProjectAuditor` | Injects essential files (README, package.json, tsconfig, CI) | Yes |
| `CategoryValidator` | Validates architectural category distribution | Yes |
| `CompletenessValidator` | Anti-lazy validation (no placeholders, stubs) | Yes |
| `ContractValidator` | Validates code delivers promised functionality | Yes |
| `ManifestValidator` | Validates file manifest structure | Yes |

### What the Governance System Does NOT Do

- Inject domain-specific files (no animation, visualization, data structure files)
- Require specific method counts or implementations
- Hardcode references to "Prompt 7" or any specific use case
- Prescribe exact file structures beyond universal requirements

### Files Protected by CODEOWNERS

```
packages/analysis-agent/src/agent.ts    @core-maintainers
packages/analysis-agent/src/governance/ @core-maintainers
packages/analysis-agent/src/validators/ @core-maintainers
packages/analysis-agent/src/prompts/    @core-maintainers
```

---

## Testing Strategy

### Test Categories

1. **Unit Tests**: Individual validator and auditor logic
2. **Generality Tests**: Multi-prompt tests ensuring NO overfitting
3. **Integration Tests**: Full pipeline validation

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

Located at `packages/analysis-agent/src/governance/generality.test.ts`:

- Tests Web App, API, Library, CLI, Dashboard prompts
- Verifies NO hardcoded data structure references
- Ensures validators work for ANY project type

---

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

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`):

1. **Lint**: ESLint across all packages
2. **Typecheck**: TypeScript strict mode
3. **Test**: Vitest with coverage
4. **Build**: Production builds
5. **Critical Files Detection**: Warns on changes to governance files
6. **Large Deletion Warning**: Alerts on >200 lines deleted

---

## Key Technical Decisions

### ADR-001: Overfitting Removal (2026-03-07)

Removed domain-specific code that was coupled to "Prompt 7" (data structures visualization):

**Correctly Removed (~70%):**
- Hardcoded data structure patterns
- Visualization-specific validators
- Animation-specific requirements

**Recovered (~10%):**
- Generic governance mechanisms
- Universal file validation
- Category distribution checks

See `docs/adr/001-remocao-overfitting-prompt7.md` for details.

---

## Documentation

| Document | Purpose | Status |
|----------|---------|--------|
| `README.md` | Quick start and overview | Active |
| `DEVELOPMENT.md` | This file - engineering details | Active |
| `KNOWN_ISSUES.md` | Known limitations and exclusions | Active |
| `FORENSIC_AUDIT_REPORT.md` | Forensic audit of project state | Active |
| `docs/AI_POLICY.md` | Guidelines for AI-assisted development | Active |
| `docs/REVIEW_CHECKLIST.md` | Code review checklist | Active |
| `docs/ESAA_ARCHITECTURE.md` | ESAA architecture (experimental) | Aspirational |
| `docs/BACKLOG.md` | Backlog and roadmap | Active + Aspirational |
| `docs/adr/*.md` | Architecture Decision Records | Historical |
| `REMEDIATION_REPORT.md` | Recovery report (Rounds 1-5) | Historical |

---

## Future Roadmap

> **Nota: Esta seção é ASPIRACIONAL.** Os itens abaixo são visão futura, não funcionalidades implementadas.

- [ ] UI/UX Premium (animations, micro-interactions)
- [ ] Real-time collaboration
- [ ] Plugin system for custom validators
- [ ] Database persistence (SQLite/Postgres)
- [ ] Docker deployment
- [ ] ESAA habilitado por padrão (atualmente experimental, `ESAA_ENABLED=false`)

---

## Branch Policy

| Rule | Description |
|------|-------------|
| **Official branch** | `main` is the only official branch of the project |
| **Provisional branches** | Temporary branches used for development; must be merged into `main` or discarded promptly |
| **Merge destination** | Every execution must have a clear merge path to `main` |
| **No orphan branches** | Branches without a defined merge target are considered abandoned |

> There is no `develop` branch. All integration happens directly on `main`.

## Minimum Merge Gate

Every merge into `main` must pass all of the following:

```bash
pnpm lint
pnpm typecheck
pnpm test
bash scripts/active/pipeline.sh
```

No PR should be merged if any gate fails. CI enforces lint, typecheck, test, and build automatically.

## Sanitation Compliance

Technical sanitation executions are tracked in [`docs/governance/SANITATION_COMPLIANCE_MATRIX.md`](docs/governance/SANITATION_COMPLIANCE_MATRIX.md). Every governance or hygiene change must be registered there.

---


## Versioning Hygiene Policy

The following artifacts must never be committed to the repository:

| Category | Examples | Covered by .gitignore |
|----------|----------|------------------------|
| Build output | `dist/`, `build/`, `*.tsbuildinfo` | Yes |
| Sourcemaps in source dirs | `packages/*/src/**/*.js.map`, `packages/*/src/**/*.d.ts.map` | Yes |
| Runtime logs | `logs/`, `*.log`, `*.log.*` | Yes |
| Runtime bundles | `bundles/` | Yes |
| Database files | `*.db`, `*.sqlite`, `*.sqlite3` | Yes |
| Environment secrets | `.env` | Yes |
| OS artifacts | `.DS_Store`, `*:Zone.Identifier` | Yes |

If a file matching these patterns is found tracked in the repository, it should be removed from tracking via `git rm --cached` (preserving the local copy) and the corresponding `.gitignore` rule should be verified or added.

## Contributing

1. Create feature branch from `main`
2. Follow existing code patterns
3. Add tests for new functionality
4. Ensure all merge gates pass (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `bash scripts/active/pipeline.sh`)
5. Request review from core maintainers for governance changes
