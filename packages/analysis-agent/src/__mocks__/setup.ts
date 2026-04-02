/**
 * Vitest setup file for mocking native modules.
 *
 * Note: better-sqlite3 is handled via resolve.alias in vitest.config.ts,
 * which redirects imports to ./better-sqlite3.ts (a complete mock class).
 * No vi.mock() needed here — the alias provides proper return values
 * (e.g., run() returns {changes, lastInsertRowid}) and full API surface.
 */

import { vi } from 'vitest';

// Mock fs to prevent side-effects during SessionDatabase construction
// (e.g., mkdirSync creating real directories when tests use default db path).
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
  };
});
