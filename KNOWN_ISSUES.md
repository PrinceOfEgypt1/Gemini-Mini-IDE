# Known Issues and Technical Debt

This document honestly tracks incomplete work and known limitations.

## 1. AppRefactored.tsx (packages/ui)

**Status:** RESOLVED — removed in Rodada 7.

**Previous issue:** `packages/ui/src/AppRefactored.tsx` was created as a refactored version of `App.tsx` with custom hooks architecture, but the hooks were never exported from `hooks/index.ts`, making the file unusable.

**Resolution:** `AppRefactored.tsx` and the associated unused hooks (`useProjectState`, `useChatState`, `useUIState`, `useProjectActions`) were removed as dead code.

**Current state:** `App.tsx` is the single active UI entry point with Framer Motion integration and accessibility support (`prefers-reduced-motion` via `useReducedMotion`).

---

## 2. Test Exclusions (packages/analysis-agent)

**Status:** exclusões ativas documentadas — 3 arquivos excluídos de 22 escritos.

### Resumo quantitativo

- Arquivos de teste escritos em `analysis-agent`: **22**
- Arquivos de teste efetivamente executados: **19**
- Arquivos de teste excluídos pelo runner: **3**

### Arquivos excluídos e padrões de exclusão

| Arquivo | Padrão em `vitest.config.ts` | Motivo |
|---|---|---|
| `src/agent.test.ts` | `**/agent.test.ts` | Estrutura do cliente OpenAI desatualizada nos mocks |
| `src/esaa/esaa.test.ts` | `**/esaa/**/*.test.ts` | `better-sqlite3` nativo com requisitos complexos de mock |
| `src/index.test.ts` | `**/index.test.ts` | Problemas não resolvidos de importação de sqlite |

**Risco de governança adicional:** o `vitest.config.ts` na raiz do repositório **não replica** essas exclusões. Se alguém rodar `vitest` diretamente da raiz, os 3 arquivos excluídos podem entrar na execução e falhar. O fluxo oficial usa `pnpm -r test`, que respeita o config de cada pacote.

**Resolution path:** corrigir mocking de módulos nativos ou reestruturar com injeção de dependência. Também considerar replicar as exclusões no `vitest.config.ts` raiz para consistência.

---

## 3. TypeScript Build (packages/analysis-agent)

**Status:** RESOLVED (Rodadas 4/5).

**Previous issues (now fixed):**

- server typecheck dependency on project references;
- `node:sqlite` type definitions missing;
- `incremental-generator.ts` using `any`.

**Current state:** `pnpm typecheck` e `pnpm build` já passaram em execuções anteriores consolidadas pelo operador.

**Evidence:** estado oficial materializado até `main @ 21d77f4`.

---

## 4. Domain-Specific Prompts

**Status:** optional code — not integrated into main pipeline.

**Clarification:** `packages/analysis-agent/src/prompts/domain-specific/` contains:

- `animation.ts` — animation / Framer Motion examples
- `visualization.ts` — visualization UI examples
- `data-structures.ts` — data-structure examples
- `index.ts` — `selectDomainExamples()` with domain detection logic
- `README.md` — documentation for the optional extension point

**Important:** this code is exported, but not used by the main code generation pipeline. The main prompts remain generic.

**Resolution path:** keep as optional extension or remove if no longer needed.

---

## 5. Divergência de Contagem de Asserções Entre Documentos

**Status:** detectado em 2026-03-20 (Prompt 5 — Testing Transparency).

**Problema:** `README.md` e `DEVELOPMENT.md` reportavam simultaneamente contagens diferentes de asserções:

- `README.md`: **513 passando**
- `DEVELOPMENT.md`: **527 passando**

A divergência de 14 asserções sugere atualizações feitas em momentos diferentes e sem coordenação. Não é possível determinar qual número era correto sem reexecutar os testes naquele contexto.

**Ação tomada (Prompt 5):** os cabeçalhos passaram a usar contagens de **arquivos de teste** em vez de contagens absolutas de asserções. As asserções históricas foram mantidas apenas como referência.

**Resolution path:** após uma execução local bem-sucedida de `pnpm test`, atualizar manualmente as contagens de asserções usando o formato:

```text
N asserções — execução YYYY-MM-DD @ commit XXXXXXX
```

---

**Last Updated:** 2026-03-20 (Prompt 5 — Testing Transparency)
