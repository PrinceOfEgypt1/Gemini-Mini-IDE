import { describe, it, expect } from 'vitest';
import { fetchStream } from './stream';

describe('Stream Utils', () => {
  it('deve exportar a função fetchStream', () => {
    expect(fetchStream).toBeDefined();
    expect(typeof fetchStream).toBe('function');
  });
});
