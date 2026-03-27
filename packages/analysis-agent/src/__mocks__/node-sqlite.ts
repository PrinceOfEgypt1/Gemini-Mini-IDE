/**
 * Shim to load node:sqlite in Vitest/Vite environment.
 * Vite does not recognize node:sqlite as a built-in (experimental module),
 * so we use createRequire to bypass Vite's module resolution.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sqlite = require('node:sqlite');
export const DatabaseSync = sqlite.DatabaseSync;
export default sqlite;
