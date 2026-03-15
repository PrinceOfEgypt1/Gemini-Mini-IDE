## Summary
- Fix lint/typecheck errors in `discoveryParser.test.ts` (unused variable, missing function call parentheses)
- Add `@vitest-environment jsdom` directive to 4 UI test files for browser globals support
- Add 56 new UI tests: animations, ThemeContext, ToastContext, useReducedMotion, api service, discoveryParser, stream
- Add 31 new analysis-agent tests: all 14 Zod schemas in `rich-schemas.ts` (0% -> 100% coverage)
- Update governance docs (MC-028, Round 14 status, COI-002 progress)

## Coverage Impact
| Package | File/Area | Before | After |
|---------|-----------|--------|-------|
| analysis-agent | rich-schemas.ts | 0% all metrics | 100% all metrics |
| analysis-agent | overall stmts | 14.9% | 16.66% |
| ui | 7 areas | 0 dedicated tests | 56 tests |

## Validation
- pnpm lint: PASS (0 warnings)
- pnpm typecheck: PASS
- pnpm build: PASS
- pnpm test: all pass (234 analysis-agent + 56 ui + others)
- pipeline.sh: 6/6 steps OK

## Test plan
- [x] All 87 new tests pass
- [x] No lint warnings or typecheck errors
- [x] Build succeeds
- [x] Pipeline 6/6 green
- [x] Coverage verified via vitest --coverage

https://claude.ai/code/session_01XiXMcKwJH2NZDjVraLCEKD
