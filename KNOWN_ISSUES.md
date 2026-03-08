# Known Issues and Technical Debt

This document honestly tracks incomplete work and known limitations.

## 1. AppRefactored.tsx (packages/ui)

**Status**: Incomplete - DO NOT USE

**Issue**: `packages/ui/src/AppRefactored.tsx` was created as a refactored version of App.tsx with:
- Custom hooks architecture (useProjectState, useChatState, useUIState, useProjectActions)
- Framer Motion animations throughout
- Cleaner component separation

**Problem**: The required hooks do not exist:
- `hooks/index.ts` only exports `useAnalysisStream`
- Missing: `useProjectState`, `useChatState`, `useUIState`, `useProjectActions`

**Current State**: App.tsx is the working entry point with basic Framer Motion integration.

**Resolution Path**: Either implement the missing hooks or delete AppRefactored.tsx.

---

## 2. Test Exclusions (packages/analysis-agent)

**Status**: Known exclusions documented in vitest.config.ts

**Excluded Tests**:
- `esaa.test.ts` - Uses better-sqlite3 native module requiring complex mocking
- `agent.test.ts` - Outdated OpenAI client structure
- `index.test.ts` - Unresolved sqlite import issues

**Resolution Path**: Fix native module mocking or restructure tests.

---

## 3. TypeScript Build Errors (packages/analysis-agent)

**Status**: Build fails with multiple type errors

**Root Causes**:
- `incremental-generator.js` missing expected exports
- `agent.ts` API signature mismatches
- Zod schema type incompatibilities

**Workaround**: Tests pass independently via vitest (which uses esbuild, not tsc).

**Resolution Path**: Align type definitions with runtime implementations.

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

Last Updated: 2026-03-08 (Rodada 3)
