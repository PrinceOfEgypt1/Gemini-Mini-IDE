# Known Issues and Technical Debt

This document honestly tracks incomplete work and known limitations.

## 1. AppRefactored.tsx (packages/ui)

**Status:** RESOLVED — removed in Rodada 7.

**Previous issue:** `packages/ui/src/AppRefactored.tsx` was created as a refactored version of `App.tsx` with custom hooks architecture, but the hooks were never exported from `hooks/index.ts`, making the file unusable.

**Resolution:** `AppRefactored.tsx` and the associated unused hooks (`useProjectState`, `useChatState`, `useUIState`, `useProjectActions`) were removed as dead code.

**Current state:** `App.tsx` is the single active UI entry point with Framer Motion integration and accessibility support (`prefers-reduced-motion` via `useReducedMotion`).

---

## 2. Test Exclusions (packages/analysis-agent)

**Status:** RESOLVIDO (Prompt 03) — todas as exclusões foram eliminadas.

### Resumo quantitativo

- Arquivos de teste escritos em `analysis-agent`: **23**
- Arquivos de teste efetivamente executados: **23**
- Arquivos de teste excluídos pelo runner: **0**

### Resolução aplicada (P03)

Os 3 arquivos anteriormente excluídos foram reabilitados:

| Arquivo | Correção |
|---|---|
| `src/agent.test.ts` | Mock reescrito usando `ILLMClient`/`IIncrementalLLMClient` interfaces; `resetGlobalAnalysisCache()` no `beforeEach` |
| `src/esaa/esaa.test.ts` | Shim `src/__mocks__/node-sqlite.ts` usando `createRequire` para contornar Vite não reconhecer `node:sqlite` como built-in |
| `src/index.test.ts` | Resolve alias `node:sqlite` no `vitest.config.ts` aponta para o mesmo shim |

O `vitest.config.ts` do analysis-agent agora exclui apenas `node_modules` e `dist` (padrão Vitest).

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
