# Sanitation Compliance Matrix

> **Document Version:** 1.0
> **Created:** 2026-03-18
> **Updated:** 2026-03-20
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
| `PROMPT-05` | Testing Transparency | Separate written tests from executed tests; document active exclusions; remove misleading counts | Governance / Documentation | `README.md` and `DEVELOPMENT.md` mixed assertion counts with executable protection; divergence between `513` and `527` assertions; 3 excluded tests in `analysis-agent` were not clearly reflected in public docs; root `vitest.config.ts` does not mirror package exclusions | Rewrote test status in `README.md`; expanded testing transparency in `DEVELOPMENT.md`; documented exclusions and count divergence in `KNOWN_ISSUES.md`; added this entry to the matrix | None | `README.md`, `DEVELOPMENT.md`, `KNOWN_ISSUES.md`, `docs/governance/SANITATION_COMPLIANCE_MATRIX.md` | None | No | No (documentation only) | Attempted in AI environment: `lint`, `typecheck`, `test`, `pipeline.sh` | Prepared for manual application; requires local validation by operator | Root `vitest.config.ts` still does not mirror `analysis-agent` exclusions; thresholds remain low in `analysis-agent` and `ui`; assertion counts still need local revalidation | Set by operator after local validation and merge |

## 6. How to Use This Matrix

1. **Before starting** a sanitation execution, add a new row with status fields marked as pending if the execution is only planned.
2. **During execution**, update the Action and Files columns as work progresses.
3. **After validation**, fill in Validations Run and Result.
4. **After commit/merge**, fill in Final Commit with the official materialized hash.
5. **Never** mark Result as passed if any validation gate failed.
