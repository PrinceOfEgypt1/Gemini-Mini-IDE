import { describe, it, expect, vi } from 'vitest';
import { validateIntegrity, logIntegrityResults } from './integrity-validator.js';
import type { RichManifestItem } from '../types/rich-schemas.js';
import type { IntegrityResult } from './integrity-validator.js';

describe('validateIntegrity', () => {
  const makeManifest = (paths: string[]): RichManifestItem[] =>
    paths.map(path => ({
      path,
      purpose: `Purpose of ${path}`,
      criticality: 'MEDIUM' as const,
      category: 'DOMAIN' as const,
    }));

  const makeGenerated = (paths: string[]) =>
    paths.map(path => ({ path, content: `// ${path}` }));

  it('should be valid when manifest and generated match exactly', () => {
    const paths = ['src/a.ts', 'src/b.ts'];
    const result = validateIntegrity(makeManifest(paths), makeGenerated(paths));
    expect(result.valid).toBe(true);
    expect(result.manifestCount).toBe(2);
    expect(result.deliveredCount).toBe(2);
    expect(result.missingFiles).toHaveLength(0);
    expect(result.extraFiles).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should detect missing files', () => {
    const result = validateIntegrity(
      makeManifest(['src/a.ts', 'src/b.ts', 'src/c.ts']),
      makeGenerated(['src/a.ts'])
    );
    expect(result.valid).toBe(false);
    expect(result.missingFiles).toContain('src/b.ts');
    expect(result.missingFiles).toContain('src/c.ts');
    expect(result.missingFiles).toHaveLength(2);
    expect(result.warnings.some(w => w.includes('CRITICAL'))).toBe(true);
  });

  it('should detect extra files', () => {
    const result = validateIntegrity(
      makeManifest(['src/a.ts']),
      makeGenerated(['src/a.ts', 'src/extra.ts'])
    );
    expect(result.valid).toBe(true); // extra files don't make it invalid
    expect(result.extraFiles).toContain('src/extra.ts');
    expect(result.extraFiles).toHaveLength(1);
    expect(result.warnings.some(w => w.includes('extras'))).toBe(true);
  });

  it('should detect both missing and extra files', () => {
    const result = validateIntegrity(
      makeManifest(['src/a.ts', 'src/b.ts']),
      makeGenerated(['src/a.ts', 'src/c.ts'])
    );
    expect(result.valid).toBe(false);
    expect(result.missingFiles).toContain('src/b.ts');
    expect(result.extraFiles).toContain('src/c.ts');
    expect(result.warnings).toHaveLength(2);
  });

  it('should handle empty manifest and empty generated', () => {
    const result = validateIntegrity([], []);
    expect(result.valid).toBe(true);
    expect(result.manifestCount).toBe(0);
    expect(result.deliveredCount).toBe(0);
    expect(result.missingFiles).toHaveLength(0);
    expect(result.extraFiles).toHaveLength(0);
  });

  it('should handle empty manifest with generated files', () => {
    const result = validateIntegrity([], makeGenerated(['src/a.ts']));
    expect(result.valid).toBe(true);
    expect(result.extraFiles).toContain('src/a.ts');
  });

  it('should handle manifest with no generated files', () => {
    const result = validateIntegrity(makeManifest(['src/a.ts']), []);
    expect(result.valid).toBe(false);
    expect(result.missingFiles).toContain('src/a.ts');
  });

  it('should deduplicate manifest paths', () => {
    const manifest = makeManifest(['src/a.ts', 'src/a.ts']);
    const result = validateIntegrity(manifest, makeGenerated(['src/a.ts']));
    expect(result.valid).toBe(true);
    expect(result.manifestCount).toBe(1); // Set deduplicates
  });

  it('should report correct counts', () => {
    const result = validateIntegrity(
      makeManifest(['src/a.ts', 'src/b.ts', 'src/c.ts']),
      makeGenerated(['src/a.ts', 'src/d.ts'])
    );
    expect(result.manifestCount).toBe(3);
    expect(result.deliveredCount).toBe(2);
  });
});

describe('logIntegrityResults', () => {
  it('should log valid result without errors', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result: IntegrityResult = {
      valid: true,
      manifestCount: 3,
      deliveredCount: 3,
      missingFiles: [],
      extraFiles: [],
      warnings: [],
    };
    logIntegrityResults(result);
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('INTEGRIDADE OK');
    expect(output).toContain('3');
    consoleSpy.mockRestore();
  });

  it('should log invalid result with missing files', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result: IntegrityResult = {
      valid: false,
      manifestCount: 3,
      deliveredCount: 1,
      missingFiles: ['src/b.ts', 'src/c.ts'],
      extraFiles: [],
      warnings: ['CRITICAL: 2 missing'],
    };
    logIntegrityResults(result);
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('FALHA DE INTEGRIDADE');
    expect(output).toContain('src/b.ts');
    consoleSpy.mockRestore();
  });

  it('should log extra files info', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result: IntegrityResult = {
      valid: true,
      manifestCount: 1,
      deliveredCount: 2,
      missingFiles: [],
      extraFiles: ['src/extra.ts'],
      warnings: ['Info: 1 extra file'],
    };
    logIntegrityResults(result);
    const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('src/extra.ts');
    consoleSpy.mockRestore();
  });
});
