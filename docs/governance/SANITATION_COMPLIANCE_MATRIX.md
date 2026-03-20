# Sanitation Compliance Matrix

> **Document Version:** 1.0
> **Created:** 2026-03-18
> **Purpose:** Living compliance matrix for tracking technical sanitation executions

---

## 1. Purpose

This matrix is the single source of truth for tracking all technical sanitation executions applied to the Gemini-Mini-IDE project. Each execution that modifies governance, documentation, CI, or codebase hygiene must be registered here with full traceability.

## 2. Scope of Technical Sanitation

Technical sanitation covers:

- Governance documentation (policies, processes, decision records)
- CI/CD pipeline alignment
- Branch policy enforcement
- Code hygiene (dead code removal, dependency cleanup)
- Documentation coherence

Technical sanitation does **not** cover:

- Feature development
- Bug fixes in application code
- Architectural changes
- Performance optimization

## 3. Branch Policy

| Rule | Description |
|------|-------------|
| **Official branch** | `main` is the only official branch |
| **Provisional branches** | Temporary branches for development; must be merged or discarded promptly |
| **Merge destination** | All work must have a clear path to `main` |
| **No orphan branches** | Branches without a merge target are considered abandoned |

## 4. Minimum Merge Gate

Every merge into `main` must pass:

| Gate | Command |
|------|---------|
| Lint | `pnpm lint` |
| Type check | `pnpm typecheck` |
| Tests | `pnpm test` |
| Pipeline | `bash scripts/active/pipeline.sh` |

No execution is considered complete if it does not pass all gates.

## 5. Compliance Tracking Table

| ID | Execution | Theme | Type | Prior Status | Action | Files Created | Files Modified | Files Deleted | Existing Feature Removed? | Existing Feature Modified? | Validations Run | Result | Remaining Risks | Final Commit |
|----|-----------|-------|------|--------------|--------|---------------|----------------|---------------|---------------------------|----------------------------|-----------------|--------|-----------------|--------------|
| FG-BASE-01 | Governance Base + Matrix + CI | Governance foundation, compliance matrix, CI alignment | Governance / Documentation / CI | No formal sanitation tracking; CI referenced nonexistent `develop` branch; no documented branch policy or merge gates | Created compliance matrix; added branch policy and merge gates to DEVELOPMENT.md; removed `develop` from CI triggers | `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | `DEVELOPMENT.md`, `.github/workflows/ci.yml` | None | No | No | lint, typecheck, test, pipeline.sh | Passed | None identified | `1943f55` |

---
| BG-03 | Repository Hygiene | Remove versioned transient artifacts, align `.gitignore`, document versioning policy | Hygiene / Versioning | 8 TypeScript sourcemaps tracked in `src/` dirs; 1 log file tracked; 2 bundle JSONs tracked; `.gitignore` missing `src/` sourcemap rules | Removed 11 transient artifacts from tracking via `git rm --cached`; added specific `.gitignore` rules for `src/` sourcemaps; documented versioning hygiene policy | None | `.gitignore`, `DEVELOPMENT.md`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | 8x `*.map` in `packages/*/src/`, `packages/server/logs/audit.log.1`, 2x bundle JSONs in `packages/server/bundles/` | No | No | lint, typecheck, test, pipeline.sh | Passed | None identified | set post-merge |
| BG-01 | Critical Security Fix — ZIP Export | Path sanitization for ZIP export entries | Security / Export | ZIP export accepted unsanitized paths (traversal, absolute, backslash, empty segments) | Added `validateZipEntryPath` function with strict path validation; fail-fast rejection on unsafe paths; preserved original skip behavior for empty path/content; 11 new tests covering valid and invalid cases | None | `packages/server/src/controllers/export.controller.ts`, `packages/server/src/routes.test.ts`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | None | No | No | lint, typecheck, test, pipeline.sh | Passed | None identified | `bcaf716` |
| BG-02 + BG-09 | Server Auth Centralization | Eliminate parallel Bearer extraction in analysis.routes.ts; centralize LLM config extraction via extractLLMConfig | Refactor / Security | `analysis.routes.ts` had inline Bearer token extraction (L74-79) bypassing the canonical `extractLLMConfig` helper; `conversation.routes.ts` already used canonical source | Replaced inline extraction in `/analyze` handler with `extractLLMConfig` call; preserved 401 payload `{ error, message }` exactly; preserved `conversation.routes.ts` unchanged (extraction already canonical); added 3 tests: Bearer token acceptance via canonical source, `/conversations/start` `{ error, message }` contract, session handler `{ error }` only contract | None | `packages/server/src/routes/analysis.routes.ts`, `packages/server/src/routes.test.ts`, `DEVELOPMENT.md`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | None | No | No | lint, typecheck, test, pipeline.sh | Passed | None identified | *(pending — handoff only, no commit in this execution)* |

## 6. How to Use This Matrix

1. **Before starting** a sanitation execution: add a new row with status fields marked as *(pending)*.
2. **During execution**: update the Action and Files columns as work progresses.
3. **After validation**: fill in Validations Run and Result.
4. **After commit**: fill in Final Commit hash.
5. **Never** mark Result as passed if any validation gate failed.
