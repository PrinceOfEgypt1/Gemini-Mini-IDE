const API_BASE_URL = import.meta.env.VITE_MINI_IDE_SERVER_URL || 'http://localhost:3200';

export const api = {
  /**
   * Solicita a exportação do projeto como ZIP
   * @param projectData Dados do projeto (HUs, código, etc)
   */
  exportProjectZip: async (projectData: unknown) => {
    try {
      const response = await fetch(`${API_BASE_URL}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectData }),
      });

      if (!response.ok) {
        throw new Error(`Erro na exportação: ${response.statusText}`);
      }

      // Converte a resposta em Blob (arquivo binário)
      const blob = await response.blob();
      
      // Cria um link temporário para forçar o download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Tenta pegar o nome do arquivo do header ou usa default
      a.download = 'mini-ide-project.zip';
      document.body.appendChild(a);
      a.click();
      
      // Limpeza
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    } catch (error) {
       // eslint-disable-next-line no-console
      console.error('Falha no download:', error);
      throw error;
    }
  }
};
