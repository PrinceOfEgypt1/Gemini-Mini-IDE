# Known Issues and Technical Debt

This document honestly tracks incomplete work and known limitations.

## 1. AppRefactored.tsx (packages/ui)

**Status**: RESOLVED - Removed in Rodada 7

**Previous Issue**: `packages/ui/src/AppRefactored.tsx` was created as a refactored version of App.tsx with custom hooks architecture, but the hooks were never exported from `hooks/index.ts`, making the file unusable.

**Resolution**: AppRefactored.tsx and the associated unused hooks (useProjectState, useChatState, useUIState, useProjectActions) were removed in Rodada 7 as dead code.

**Current State**: `App.tsx` is the single, active UI entry point with Framer Motion integration and accessibility support (prefers-reduced-motion via useReducedMotion hook).

---

## 2. Test Exclusions (packages/analysis-agent)

**Status**: Known exclusions documented in vitest.config.ts

**Excluded Tests**:
- `esaa.test.ts` - Uses better-sqlite3 native module requiring complex mocking
- `agent.test.ts` - Outdated OpenAI client structure
- `index.test.ts` - Unresolved sqlite import issues

**Resolution Path**: Fix native module mocking or restructure tests.

---

## 3. TypeScript Build (packages/analysis-agent)

**Status**: RESOLVED (Rodada 4/5)

**Previous Issues** (now fixed):
- Server typecheck dependency on project references - resolved by removing project references
- `node:sqlite` type definitions missing - resolved by adding type shim in server package
- `incremental-generator.ts` using `any` type - resolved with proper `unknown` type guards

**Current State**: Both `pnpm typecheck` and `pnpm build` pass cleanly across all packages.

**Evidence**: PR #18 merged to main with all fixes.

---

## 4. Domain-Specific Prompts

**Status**: Optional code - NOT integrated into main pipeline

**Clarification**: `packages/analysis-agent/src/prompts/domain-specific/` contains:
- `animation.ts` - Animation/Framer Motion code examples (~247 lines)
- `visualization.ts` - Visualization UI component examples (~224 lines)
- `data-structures.ts` - Data structure implementation examples (~275 lines)
- `index.ts` - `selectDomainExamples()` function with domain detection logic
- `README.md` - Documentation explaining optional nature

**Important**: This code is **EXPORTED** but **NOT USED** by the main code generation pipeline.
The `selectDomainExamples` function is available but never called by `code-gen.ts` or `architecture.ts`.
The main prompts are generic and work for any project type.

**Current State**: Optional extension point for future use. No overfitting to specific domains.

**Resolution Path**: Keep as optional extension or remove if not needed.

---

Last Updated: 2026-03-11 (Rodada 7)
