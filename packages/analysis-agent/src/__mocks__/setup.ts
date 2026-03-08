/**
 * Vitest setup file for mocking native modules
 */

import { vi } from 'vitest';

// Mock better-sqlite3 globally
vi.mock('better-sqlite3', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      prepare: vi.fn().mockReturnValue({
        run: vi.fn(),
        get: vi.fn(),
        all: vi.fn().mockReturnValue([]),
        bind: vi.fn(),
      }),
      exec: vi.fn(),
      close: vi.fn(),
      pragma: vi.fn(),
      transaction: vi.fn((fn: () => void) => fn),
    })),
  };
});

// Mock fs for tests that need it
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
