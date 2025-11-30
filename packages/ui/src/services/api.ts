const API_BASE_URL = import.meta.env.VITE_MINI_IDE_SERVER_URL || 'http://localhost:3200';

// Interface do Contexto
interface ProjectContext {
  files: Array<{ path: string; purpose?: string }>;
  summary?: string;
}

const getAuthHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = sessionStorage.getItem('mini-ide-api-key');
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  return headers;
};

export const api = {
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

  // Agora aceita contexto opcional
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
