const API_BASE_URL = import.meta.env.VITE_MINI_IDE_SERVER_URL || 'http://localhost:3200';

const getAuthHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const apiKey = localStorage.getItem('mini-ide-api-key');
  const model = localStorage.getItem('mini-ide-model');
  const baseUrl = localStorage.getItem('mini-ide-base-url');

  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  if (model) headers['X-LLM-Model'] = model;
  if (baseUrl) headers['X-LLM-Base-Url'] = baseUrl;
  
  return headers;
};

export const api = {
  exportProjectZip: async (projectData: unknown) => {
    try {
      const response = await fetch(`${API_BASE_URL}/export`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ projectData }),
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('Não autorizado: Verifique sua API Key.');
        throw new Error(`Erro na exportação: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mini-ide-project.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Falha no download:', error);
      throw error;
    }
  },

  analyze: async (text: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, maxLen: 2000 }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('API Key inválida ou ausente.');
        throw new Error(errData.error || `Erro no servidor: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro na análise:', error);
      throw error;
    }
  }
};
