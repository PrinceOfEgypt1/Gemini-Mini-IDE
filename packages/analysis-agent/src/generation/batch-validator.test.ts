import { describe, it, expect } from 'vitest';
import { BatchValidator } from './batch-validator.js';
import type { LLMGeneratedFile } from '../types/generation-types.js';

describe('BatchValidator', () => {
  const validator = new BatchValidator();

  const validFile: LLMGeneratedFile = {
    path: 'src/index.ts',
    content: 'export const x = 1;',
    reasoning: 'Entry point',
    language: 'typescript',
  };

  it('should return no errors or warnings for valid files', () => {
    const result = validator.validate([validFile]);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should return no errors for an empty array', () => {
    const result = validator.validate([]);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should return error for null input', () => {
    const result = validator.validate(null as unknown as LLMGeneratedFile[]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('not a valid array');
  });

  it('should return error for undefined input', () => {
    const result = validator.validate(undefined as unknown as LLMGeneratedFile[]);
    expect(result.errors).toHaveLength(1);
  });

  it('should warn for file missing path', () => {
    const file = { content: 'some content', reasoning: '', language: '' } as unknown as LLMGeneratedFile;
    const result = validator.validate([file]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("missing 'path' or 'content'");
  });

  it('should warn for file missing content', () => {
    const file = { path: 'src/a.ts', reasoning: '', language: '' } as unknown as LLMGeneratedFile;
    const result = validator.validate([file]);
    expect(result.warnings).toHaveLength(1);
  });

  it('should warn for file with empty path', () => {
    const file = { path: '', content: 'code', reasoning: '', language: '' } as LLMGeneratedFile;
    const result = validator.validate([file]);
    expect(result.warnings).toHaveLength(1);
  });

  it('should warn for file with empty content', () => {
    const file = { path: 'src/a.ts', content: '', reasoning: '', language: '' } as LLMGeneratedFile;
    const result = validator.validate([file]);
    expect(result.warnings).toHaveLength(1);
  });

  it('should handle multiple files with mixed validity', () => {
    const files: LLMGeneratedFile[] = [
      validFile,
      { path: '', content: 'code', reasoning: '', language: '' },
      { path: 'src/b.ts', content: '', reasoning: '', language: '' },
    ];
    const result = validator.validate(files);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(2);
  });

  it('should validate multiple valid files without warnings', () => {
    const files: LLMGeneratedFile[] = [
      validFile,
      { path: 'src/b.ts', content: 'export const y = 2;', reasoning: 'util', language: 'typescript' },
    ];
    const result = validator.validate(files);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});
