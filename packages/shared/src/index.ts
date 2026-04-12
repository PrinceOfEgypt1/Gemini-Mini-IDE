export * from './types/analyze-response.js';
export * from './types/analyze-request.js';
export * from './types/wizard.js';
export * from './impact-analysis/index.js';

// P27.1 — The ESAA HTTP DTO contracts under `./esaa/` are intentionally
// NOT re-exported here. The ESAA subsystem is officially classified as
// EXPERIMENTAL and CONTAINED (see docs/ESAA_ARCHITECTURE.md § 0). The
// 18 contract types still exist on disk under `./esaa/contracts.ts`,
// but they are not part of `@gemini-mini-ide/shared`'s public surface.
// They are kept as a frozen reference for any future ciclo that decides
// to revive ESAA — promotion would require the 6 prerequisites listed
// in docs/ESAA_ARCHITECTURE.md § 0 ("Como reverter a contenção"),
// including a real client, end-to-end tests, and a versioned contract.
