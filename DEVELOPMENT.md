# Gemini Mini-IDE — Engineering Manual

> **Document Version:** 16.0 (Testing Transparency — Prompt 5)
> **Date:** 2026-03-20
> **Reference State:** `main @ 21d77f4`
> **Pipeline:** CI/CD via GitHub Actions (`lint`, `typecheck`, `test`, `build`)
> **Testes:** 39 arquivos executados / 42 escritos — 3 excluídos ativamente em `analysis-agent`

---

## Architecture Overview

**Strategy:** monorepo with strict types, Clean Architecture and generic governance.

### Package Structure

```text
packages/
├── analysis-agent/ # Core analysis engine (agent.ts, governance, validators)
├── ui/             # React frontend (Vite + Tailwind)
├── server/         # Fastify backend API
├── shared/         # Shared types and utilities
└── cli/            # Command-line interface
```

All packages use namespace `@gemini-mini-ide/*`.

---

## Governance System

The governance system ensures code quality without being coupled to any specific domain.

### Generic Validators

| Validator | Purpose | Domain-Agnostic? |
|---|---|---|
| `BaseProjectAuditor` | Injects essential files (`README`, `package.json`, `tsconfig`, CI) | Yes |
| `CategoryValidator` | Validates architectural category distribution | Yes |
| `CompletenessValidator` | Anti-lazy validation (no placeholders, stubs) | Yes |
| `ContractValidator` | Validates code delivers promised functionality | Yes |
| `ManifestValidator` | Validates file manifest structure | Yes |

### What the Governance System Does Not Do

- Inject domain-specific files.
- Require specific method counts or implementations.
- Hardcode references to a specific prompt or use case.
- Prescribe exact file structures beyond universal requirements.

### Files Protected by CODEOWNERS

```text
packages/analysis-agent/src/agent.ts @core-maintainers
packages/analysis-agent/src/governance/ @core-maintainers
packages/analysis-agent/src/validators/ @core-maintainers
packages/analysis-agent/src/prompts/ @core-maintainers
```

---

## Testing Strategy

### Test Categories

1. **Unit Tests:** individual validator and auditor logic.
2. **Generality Tests:** multi-prompt tests ensuring no overfitting.
3. **Integration Tests:** full pipeline validation.

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

### Test Suite Transparency

> **AVISO DE GOVERNANÇA:** esta seção é a fonte de verdade para interpretação correta da suíte de testes. Não usar contagens brutas sem ler esta seção.

#### Como `pnpm test` executa os testes

O comando `pnpm test` executa `pnpm -r test`, que roda `vitest run` em cada pacote individualmente. Cada pacote usa seu próprio `vitest.config.ts`. O `vitest.config.ts` da raiz **não** é usado pelo fluxo real de `pnpm test` e só serve para referência ou execução manual a partir da raiz.

#### Distinção fundamental: escrito vs. executado

| Conceito | Definição |
|---|---|
| Arquivo de teste escrito | Arquivo `.test.ts` ou `.test.tsx` presente fisicamente no repositório |
| Arquivo de teste executado | Arquivo alcançado pelo padrão `include` do runner e não excluído pelo padrão `exclude` |
| Arquivo de teste excluído | Arquivo escrito, mas removido da execução por configuração explícita em `vitest.config.ts` |
| Asserção (`assertion`) | Verificação individual dentro de um teste (`expect(...)`) |
| Contagem de asserções passando | Total de asserções aprovadas em uma execução específica; varia por execução |

#### Erros comuns a evitar

- Tratar o número de arquivos escritos como igual ao número de arquivos executados.
- Tratar o número de asserções de uma execução anterior como representativo do estado atual.
- Assumir que todos os pacotes têm cobertura homogênea.

#### Contagem real por pacote (`main @ 21d77f4`)

| Pacote | Arquivos escritos | Arquivos executados | Arquivos excluídos | Participação | Observações |
|---|---:|---:|---:|---|---|
| `analysis-agent` | 22 | 19 | 3 | Parcial | 3 arquivos explicitamente excluídos por débito técnico |
| `ui` | 14 | 14 | 0 | Total | `src/` e `test/` cobertos |
| `server` | 3 | 3 | 0 | Total | — |
| `shared` | 2 | 2 | 0 | Total | — |
| `cli` | 1 | 1 | 0 | Total | — |
| **TOTAL** | **42** | **39** | **3** | — | — |

#### Arquivos de teste excluídos ativamente (`analysis-agent`)

Os arquivos abaixo estão presentes no repositório, mas não são executados pelo runner:

| Arquivo | Padrão de exclusão | Motivo documentado |
|---|---|---|
| `packages/analysis-agent/src/agent.test.ts` | `**/agent.test.ts` | Estrutura do cliente OpenAI desatualizada nos mocks |
| `packages/analysis-agent/src/esaa/esaa.test.ts` | `**/esaa/**/*.test.ts` | `better-sqlite3` nativo com requisitos complexos de mock |
| `packages/analysis-agent/src/index.test.ts` | `**/index.test.ts` | Problemas não resolvidos de importação de sqlite |

**Configuração:** as exclusões estão declaradas em `packages/analysis-agent/vitest.config.ts`, no campo `test.exclude`.

**Risco de governança:** o `vitest.config.ts` raiz não replica essas exclusões. Se alguém rodar `vitest` diretamente da raiz, esses 3 arquivos podem entrar na execução e falhar.

#### Exclusões de coverage por pacote

Cada pacote exclui das métricas de cobertura:

- `node_modules/`, `dist/`
- os próprios arquivos `.test.ts` e `.test.tsx`
- definições de tipo (`.d.ts`)
- `__mocks__/`

O `analysis-agent` adicionalmente exclui `*.spec.ts`.

#### Thresholds de cobertura por pacote

| Pacote | Lines | Functions | Branches | Statements | Observação |
|---|---:|---:|---:|---:|---|
| `analysis-agent` | 15% | 45% | 70% | 15% | Threshold de lines/statements baixo |
| `cli` | 40% | 80% | 80% | 40% | — |
| `server` | 40% | 30% | 55% | 40% | Threshold de functions baixo |
| `shared` | 80% | 50% | 80% | 80% | Functions threshold abaixo das demais métricas |
| `ui` | 20% | 35% | 60% | 20% | Thresholds baixos para pacote React |

**Nota:** thresholds não representam a cobertura real alcançada; são apenas pisos mínimos configurados. Thresholds baixos em `analysis-agent` e `ui` indicam que áreas não cobertas podem passar pelo gate.

#### Contagens de asserções (referência histórica)

As contagens abaixo são referências de execuções anteriores e precisam ser revalidadas no ambiente do operador:

| Pacote | Asserções (última execução conhecida) |
|---|---:|
| `analysis-agent` | ~306 |
| `ui` | ~73 |
| `server` | ~74 |
| `shared` | ~35 |
| `cli` | ~25 |

**ATENÇÃO:** `README.md` reportava “513 passando” e `DEVELOPMENT.md` reportava “527 passando” simultaneamente. Essa divergência foi registrada em `KNOWN_ISSUES.md`. Por isso, os cabeçalhos agora usam contagens de **arquivos de teste**, que são mais auditáveis.

#### Como auditar a suíte daqui em diante

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

- **Lint:** ESLint across all packages
- **Typecheck:** TypeScript strict mode
- **Test:** Vitest with coverage
- **Build:** production builds
- **Critical Files Detection:** warns on changes to governance files
- **Large Deletion Warning:** alerts on deletions above the configured threshold

---

## Key Technical Decisions

### ADR-001: Overfitting Removal (2026-03-07)

Removed domain-specific code that was coupled to “Prompt 7” (data-structures visualization).

**Correctly removed:**

- hardcoded data-structure patterns;
- visualization-specific validators;
- animation-specific requirements.

**Recovered:**

- generic governance mechanisms;
- universal file validation;
- category distribution checks.

See `docs/adr/001-remocao-overfitting-prompt7.md` for details.

---

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

---

## Future Roadmap

> **Nota:** esta seção é aspiracional. Os itens abaixo são visão futura, não funcionalidades implementadas.

- UI/UX premium (animations, micro-interactions)
- Real-time collaboration
- Plugin system for custom validators
- Database persistence (SQLite/Postgres)
- Docker deployment
- ESAA habilitado por padrão (atualmente experimental, `ESAA_ENABLED=false`)

---

## Branch Policy

| Rule | Description |
|---|---|
| Official branch | `main` is the only official branch of the project |
| Provisional branches | Temporary branches used for development; must be merged into `main` or discarded promptly |
| Merge destination | Every execution must have a clear merge path to `main` |
| No orphan branches | Branches without a defined merge target are considered abandoned |

There is no `develop` branch. All integration happens directly on `main`.

---

## Minimum Merge Gate

Every merge into `main` must pass all of the following:

```bash
pnpm lint
pnpm typecheck
pnpm test
bash scripts/active/pipeline.sh
```

No PR should be merged if any gate fails.

---

## Sanitation Compliance

Technical sanitation executions are tracked in `docs/governance/SANITATION_COMPLIANCE_MATRIX.md`. Every governance or hygiene change must be registered there.

---

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

---

## Contributing

1. Create a feature branch from `main`.
2. Follow existing code patterns.
3. Add tests for new functionality.
4. Ensure all merge gates pass.
5. Request review from core maintainers for governance changes.
