// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './api';

describe('api', () => {
  const mockFetch = vi.fn();
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mockFetch;
    vi.spyOn(sessionStorage, 'getItem').mockReturnValue(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should call fetch with correct URL and body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ summary: 'result' }),
      });

      const result = await api.analyze('test input');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/analyze'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test input'),
        })
      );
      expect(result.summary).toBe('result');
    });

    it('should send maxLen in body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.analyze('text');
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.maxLen).toBe(2000);
    });

    it('should send currentContext when provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.analyze('text', { files: [{ path: 'a.ts' }], summary: 'ctx' });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.currentContext).toEqual({ files: [{ path: 'a.ts' }], summary: 'ctx' });
    });

    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      await expect(api.analyze('text')).rejects.toThrow('Server error');
    });

    it('should handle response.json() failure gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error('parse error')),
      });

      await expect(api.analyze('text')).rejects.toThrow('Erro no servidor');
    });

    it('should include auth headers from sessionStorage', async () => {
      // Set real sessionStorage values instead of mocking
      sessionStorage.setItem('mini-ide-api-key', 'test-key');
      sessionStorage.setItem('mini-ide-model', 'gpt-4');
      sessionStorage.setItem('mini-ide-base-url', 'https://custom.api');

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.analyze('text');
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer test-key');
      expect(headers['X-LLM-Model']).toBe('gpt-4');
      expect(headers['X-LLM-Base-URL']).toBe('https://custom.api');

      // Cleanup
      sessionStorage.removeItem('mini-ide-api-key');
      sessionStorage.removeItem('mini-ide-model');
      sessionStorage.removeItem('mini-ide-base-url');
    });
  });

  describe('exportProjectZip', () => {
    it('should call fetch with /export endpoint', async () => {
      const mockBlob = new Blob(['zip']);
      const mockA = { href: '', download: '', click: vi.fn() };

      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      // jsdom doesn't have createObjectURL, mock it
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
      vi.spyOn(document, 'createElement').mockReturnValue(mockA as unknown as HTMLElement);
      vi.spyOn(document.body, 'appendChild').mockReturnValue(mockA as unknown as HTMLElement);

      const result = await api.exportProjectZip({ engine: { files: [] } });
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/export'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValue({ ok: false });
      await expect(api.exportProjectZip({})).rejects.toThrow('Erro exportação');
    });
  });
});
