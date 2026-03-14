import { describe, it, expect } from 'vitest';
import { runImpactAnalysis, getServerUrl } from './commands.js';

describe('runImpactAnalysis', () => {
  it('should return exit code 2 for empty files', () => {
    const result = runImpactAnalysis([], {});
    expect(result.exitCode).toBe(2);
    expect(result.output).toContain('Error');
  });

  it('should return exit code 0 for low risk files', () => {
    const result = runImpactAnalysis(['packages/cli/src/index.ts'], {});
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('IMPACT ANALYSIS REPORT');
  });

  it('should return exit code 0 for docs (BAIXO)', () => {
    const result = runImpactAnalysis(['docs/README.md'], {});
    expect(result.exitCode).toBe(0);
  });

  it('should return exit code 0 for UI components (MEDIO)', () => {
    const result = runImpactAnalysis(['packages/ui/src/components/Button.tsx'], {});
    expect(result.exitCode).toBe(0);
  });

  it('should return exit code 1 for server files (ALTO)', () => {
    const result = runImpactAnalysis(['packages/server/src/index.ts'], {});
    expect(result.exitCode).toBe(1);
  });

  it('should return exit code 1 for shared files (CRITICO)', () => {
    const result = runImpactAnalysis(['packages/shared/src/index.ts'], {});
    expect(result.exitCode).toBe(1);
  });

  it('should return exit code 1 for config files (CRITICO)', () => {
    const result = runImpactAnalysis(['package.json'], {});
    expect(result.exitCode).toBe(1);
  });

  it('should return exit code 1 if any file is high risk', () => {
    const result = runImpactAnalysis(['docs/README.md', 'packages/shared/src/index.ts'], {});
    expect(result.exitCode).toBe(1);
  });

  it('should output formatted report by default', () => {
    const result = runImpactAnalysis(['packages/cli/src/index.ts'], {});
    expect(result.output).toContain('IMPACT ANALYSIS REPORT');
    expect(result.output).toContain('BAIXO');
  });

  it('should output JSON when json option is set', () => {
    const result = runImpactAnalysis(['packages/cli/src/index.ts'], { json: true });
    const parsed = JSON.parse(result.output);
    expect(parsed.overallRisk).toBe('BAIXO');
    expect(parsed.files).toHaveLength(1);
  });

  it('should include areas in JSON output', () => {
    const result = runImpactAnalysis(
      ['packages/server/src/index.ts', 'packages/ui/src/App.tsx'],
      { json: true }
    );
    const parsed = JSON.parse(result.output);
    expect(parsed.areas.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle single file analysis', () => {
    const result = runImpactAnalysis(['.github/workflows/ci.yml'], {});
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('ALTO');
  });

  it('should handle multiple low-risk files', () => {
    const result = runImpactAnalysis(['docs/a.md', 'docs/b.md'], {});
    expect(result.exitCode).toBe(0);
  });
});

describe('getServerUrl', () => {
  it('should return default URL when env not set', () => {
    const original = process.env["MINI_IDE_SERVER_URL"];
    delete process.env["MINI_IDE_SERVER_URL"];
    expect(getServerUrl()).toBe('http://localhost:3200');
    if (original !== undefined) {
      process.env["MINI_IDE_SERVER_URL"] = original;
    }
  });

  it('should return custom URL from env', () => {
    const original = process.env["MINI_IDE_SERVER_URL"];
    process.env["MINI_IDE_SERVER_URL"] = 'http://custom:4000';
    expect(getServerUrl()).toBe('http://custom:4000');
    if (original !== undefined) {
      process.env["MINI_IDE_SERVER_URL"] = original;
    } else {
      delete process.env["MINI_IDE_SERVER_URL"];
    }
  });
});
