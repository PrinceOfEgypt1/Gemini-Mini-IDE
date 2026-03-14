import { describe, it, expect } from 'vitest';
import { ContextAccumulator } from './context-accumulator.js';
import type { LLMGeneratedFile } from '../types/generation-types.js';

describe('ContextAccumulator', () => {
  const makeFile = (path: string, content: string): LLMGeneratedFile => ({
    path,
    content,
    reasoning: 'test',
    language: 'typescript',
  });

  it('should return first-batch message when no files added', () => {
    const acc = new ContextAccumulator();
    const ctx = acc.buildContextForNextBatch();
    expect(ctx).toContain('first batch');
    expect(ctx).toContain('No files have been generated yet');
  });

  it('should include file paths in context after adding files', () => {
    const acc = new ContextAccumulator();
    acc.addFiles([makeFile('src/index.ts', 'export const x = 1;')]);
    const ctx = acc.buildContextForNextBatch();
    expect(ctx).toContain('src/index.ts');
    expect(ctx).toContain('already been generated');
  });

  it('should accumulate files across multiple addFiles calls', () => {
    const acc = new ContextAccumulator();
    acc.addFiles([makeFile('src/a.ts', 'const a = 1;')]);
    acc.addFiles([makeFile('src/b.ts', 'const b = 2;')]);
    const ctx = acc.buildContextForNextBatch();
    expect(ctx).toContain('src/a.ts');
    expect(ctx).toContain('src/b.ts');
  });

  it('should handle adding empty arrays', () => {
    const acc = new ContextAccumulator();
    acc.addFiles([]);
    const ctx = acc.buildContextForNextBatch();
    expect(ctx).toContain('first batch');
  });

  it('should truncate long content in context', () => {
    const acc = new ContextAccumulator();
    const longContent = 'x'.repeat(1000);
    acc.addFiles([makeFile('src/long.ts', longContent)]);
    const ctx = acc.buildContextForNextBatch();
    // Content should be truncated to 500 chars + "..."
    expect(ctx).toContain('...');
    expect(ctx.length).toBeLessThan(longContent.length);
  });

  it('should include content prefix for short files', () => {
    const acc = new ContextAccumulator();
    const shortContent = 'export const x = 1;';
    acc.addFiles([makeFile('src/short.ts', shortContent)]);
    const ctx = acc.buildContextForNextBatch();
    expect(ctx).toContain(shortContent.substring(0, 19));
  });

  it('should handle multiple files in a single addFiles call', () => {
    const acc = new ContextAccumulator();
    acc.addFiles([
      makeFile('src/a.ts', 'const a = 1;'),
      makeFile('src/b.ts', 'const b = 2;'),
      makeFile('src/c.ts', 'const c = 3;'),
    ]);
    const ctx = acc.buildContextForNextBatch();
    expect(ctx).toContain('src/a.ts');
    expect(ctx).toContain('src/b.ts');
    expect(ctx).toContain('src/c.ts');
  });
});
