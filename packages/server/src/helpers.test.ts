import { describe, it, expect } from 'vitest';
import {
  extractLLMConfig,
  AnalyzeRequestSchema,
  StartConversationSchema,
  RespondSchema,
  ImpactAnalysisSchema,
} from './helpers.js';

describe('extractLLMConfig', () => {
  const defaultKey = 'default-api-key';

  it('should return default API key when no Authorization header', () => {
    const config = extractLLMConfig({}, defaultKey);
    expect(config.apiKey).toBe(defaultKey);
    expect(config.model).toBeUndefined();
    expect(config.baseUrl).toBeUndefined();
  });

  it('should extract API key from Bearer token', () => {
    const config = extractLLMConfig(
      { authorization: 'Bearer custom-key-123' },
      defaultKey
    );
    expect(config.apiKey).toBe('custom-key-123');
  });

  it('should use default key for non-Bearer authorization', () => {
    const config = extractLLMConfig(
      { authorization: 'Basic dXNlcjpwYXNz' },
      defaultKey
    );
    expect(config.apiKey).toBe(defaultKey);
  });

  it('should use default key for empty authorization', () => {
    const config = extractLLMConfig(
      { authorization: '' },
      defaultKey
    );
    expect(config.apiKey).toBe(defaultKey);
  });

  it('should extract model from x-llm-model header', () => {
    const config = extractLLMConfig(
      { 'x-llm-model': 'gpt-4' },
      defaultKey
    );
    expect(config.model).toBe('gpt-4');
  });

  it('should extract baseUrl from x-llm-base-url header', () => {
    const config = extractLLMConfig(
      { 'x-llm-base-url': 'https://custom.openai.com' },
      defaultKey
    );
    expect(config.baseUrl).toBe('https://custom.openai.com');
  });

  it('should ignore array values for model header', () => {
    const config = extractLLMConfig(
      { 'x-llm-model': ['a', 'b'] },
      defaultKey
    );
    expect(config.model).toBeUndefined();
  });

  it('should ignore array values for base-url header', () => {
    const config = extractLLMConfig(
      { 'x-llm-base-url': ['a', 'b'] },
      defaultKey
    );
    expect(config.baseUrl).toBeUndefined();
  });

  it('should ignore array values for authorization header', () => {
    const config = extractLLMConfig(
      { authorization: ['Bearer key1', 'Bearer key2'] },
      defaultKey
    );
    expect(config.apiKey).toBe(defaultKey);
  });

  it('should handle all headers together', () => {
    const config = extractLLMConfig(
      {
        authorization: 'Bearer my-key',
        'x-llm-model': 'claude-3',
        'x-llm-base-url': 'https://api.anthropic.com',
      },
      defaultKey
    );
    expect(config.apiKey).toBe('my-key');
    expect(config.model).toBe('claude-3');
    expect(config.baseUrl).toBe('https://api.anthropic.com');
  });

  it('should handle empty default key', () => {
    const config = extractLLMConfig({}, '');
    expect(config.apiKey).toBe('');
  });
});

describe('AnalyzeRequestSchema', () => {
  it('should accept valid request with text only', () => {
    const result = AnalyzeRequestSchema.safeParse({ text: 'hello' });
    expect(result.success).toBe(true);
  });

  it('should accept valid request with text and maxLen', () => {
    const result = AnalyzeRequestSchema.safeParse({ text: 'hello', maxLen: 200 });
    expect(result.success).toBe(true);
  });

  it('should accept valid request with currentContext', () => {
    const result = AnalyzeRequestSchema.safeParse({
      text: 'hello',
      currentContext: {
        files: [{ path: 'src/index.ts', purpose: 'entry' }],
        summary: 'A project',
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty text', () => {
    const result = AnalyzeRequestSchema.safeParse({ text: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing text', () => {
    const result = AnalyzeRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-string text', () => {
    const result = AnalyzeRequestSchema.safeParse({ text: 123 });
    expect(result.success).toBe(false);
  });

  it('should reject invalid maxLen type', () => {
    const result = AnalyzeRequestSchema.safeParse({ text: 'hello', maxLen: 'abc' });
    expect(result.success).toBe(false);
  });

  it('should accept currentContext with files missing purpose', () => {
    const result = AnalyzeRequestSchema.safeParse({
      text: 'hello',
      currentContext: {
        files: [{ path: 'src/index.ts' }],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('StartConversationSchema', () => {
  it('should accept valid request', () => {
    const result = StartConversationSchema.safeParse({ userId: 'user1', message: 'hi' });
    expect(result.success).toBe(true);
  });

  it('should reject empty userId', () => {
    const result = StartConversationSchema.safeParse({ userId: '', message: 'hi' });
    expect(result.success).toBe(false);
  });

  it('should reject empty message', () => {
    const result = StartConversationSchema.safeParse({ userId: 'user1', message: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    expect(StartConversationSchema.safeParse({}).success).toBe(false);
    expect(StartConversationSchema.safeParse({ userId: 'u' }).success).toBe(false);
    expect(StartConversationSchema.safeParse({ message: 'm' }).success).toBe(false);
  });
});

describe('RespondSchema', () => {
  it('should accept valid message', () => {
    const result = RespondSchema.safeParse({ message: 'response' });
    expect(result.success).toBe(true);
  });

  it('should reject empty message', () => {
    const result = RespondSchema.safeParse({ message: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing message', () => {
    const result = RespondSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('ImpactAnalysisSchema', () => {
  it('should accept valid files array', () => {
    const result = ImpactAnalysisSchema.safeParse({ files: ['src/index.ts'] });
    expect(result.success).toBe(true);
  });

  it('should accept with optional base', () => {
    const result = ImpactAnalysisSchema.safeParse({ files: ['a.ts'], base: 'main' });
    expect(result.success).toBe(true);
  });

  it('should accept with optional staged', () => {
    const result = ImpactAnalysisSchema.safeParse({ files: ['a.ts'], staged: true });
    expect(result.success).toBe(true);
  });

  it('should reject missing files', () => {
    const result = ImpactAnalysisSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-string files', () => {
    const result = ImpactAnalysisSchema.safeParse({ files: [123] });
    expect(result.success).toBe(false);
  });

  it('should accept empty files array', () => {
    const result = ImpactAnalysisSchema.safeParse({ files: [] });
    expect(result.success).toBe(true);
  });
});
