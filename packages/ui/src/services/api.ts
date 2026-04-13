/**
 * @fileoverview UI ↔ server HTTP boundary.
 *
 * This is the single module the UI uses to reach the Fastify server. Every
 * other component MUST go through the `api` object exported here — direct
 * `fetch` calls from components are considered a regression of this
 * boundary and a leak of server concerns into the UI layer.
 *
 * Authentication contract:
 * - The API key is read from `sessionStorage['mini-ide-api-key']` and sent
 *   as `Authorization: Bearer <key>`. The user configures it via
 *   `SettingsModal`.
 * - Custom model and base URL are sent as `X-LLM-Model` and
 *   `X-LLM-Base-URL` (see `extractLLMConfig` on the server).
 * - None of these are ever persisted to localStorage — only sessionStorage
 *   — so closing the tab clears them.
 *
 * @module ui/services/api
 */

/**
 * Base URL of the Gemini Mini-IDE server. Comes from Vite's build-time env
 * (`VITE_MINI_IDE_SERVER_URL`) and defaults to the local dev server.
 */
const API_BASE_URL = import.meta.env.VITE_MINI_IDE_SERVER_URL || 'http://localhost:3200';

/**
 * Minimal refinement-context shape sent alongside an `analyze` call.
 * Mirrors `AnalyzeRequest['currentContext']` on the server side.
 */
interface ProjectContext {
  files: Array<{ path: string; purpose?: string }>;
  summary?: string;
}

/**
 * Builds the `Authorization` and `X-LLM-*` headers from sessionStorage.
 * Returns only the headers that are actually set — the server falls back
 * to its own defaults (and may return 401) when nothing is present.
 */
const getAuthHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = sessionStorage.getItem('mini-ide-api-key');
  const model = sessionStorage.getItem('mini-ide-model');
  const baseUrl = sessionStorage.getItem('mini-ide-base-url');

  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  if (model) headers['X-LLM-Model'] = model;
  if (baseUrl) headers['X-LLM-Base-URL'] = baseUrl;

  return headers;
};

/**
 * Thin wrapper around the server's HTTP endpoints used by the UI.
 *
 * Every method:
 * - Uses {@link getAuthHeaders} for `Authorization` / `X-LLM-*` headers;
 * - Throws a plain `Error` on non-2xx responses (the message is either
 *   the server-provided `error` field or a generic fallback);
 * - Does NOT retry — callers decide whether to surface a toast or retry.
 */
export const api = {
  /**
   * Calls `POST /export` with the given project data and triggers a
   * browser download of the resulting ZIP. Returns `true` on success,
   * throws on failure.
   */
  exportProjectZip: async (projectData: unknown) => {
    const response = await fetch(`${API_BASE_URL}/export`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ project: projectData })
    });
    if (!response.ok) throw new Error('Erro exportação');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'project.zip'; document.body.appendChild(a); a.click();
    return true;
  },

  /**
   * Calls `POST /analyze` with the user prompt and an optional refinement
   * context. Returns the server's full `AnalyzeResponse` as a plain object.
   *
   * On non-2xx responses the server's `error` field (if present) is
   * surfaced as the thrown `Error.message`; otherwise a generic
   * `'Erro no servidor'` message is used.
   */
  analyze: async (text: string, currentContext?: ProjectContext) => {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
          text, 
          maxLen: 2000,
          currentContext: currentContext // Envia o estado atual
      }),
    });
    if (!response.ok) {
       const err = await response.json().catch(() => ({}));
       throw new Error(err.error || 'Erro no servidor');
    }
    return await response.json();
  }
};
