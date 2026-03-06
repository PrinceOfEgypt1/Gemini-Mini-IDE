import { useCallback } from 'react';
import { api } from '../services/api';
import type { GeneratedProject } from './useProjectState';
import type { DiscoveryData } from '../utils/discoveryParser';

export interface ProjectActionsHook {
  handleExportZip: (generatedProject: GeneratedProject | null, onSuccess: () => void, onError: (error: string) => void) => Promise<void>;
  handleFileSelect: (path: string, projectFiles: Array<{ path: string; content: string }>, onSelect: (file: { path: string; content: string }) => void, onError: (error: string) => void) => void;
  handleAnalyzeProject: (
    userMsg: string,
    apiKey: string,
    discoveryData: DiscoveryData,
    generatedProject: GeneratedProject | null,
    onSuccess: (response: GeneratedProject) => void,
    onError: (error: string) => void
  ) => Promise<void>;
}

/**
 * Hook para encapsular a lógica de ações do projeto.
 * Oferece funções reutilizáveis para operações comuns.
 */
export function useProjectActions(): ProjectActionsHook {
  const handleExportZip = useCallback(
    async (generatedProject: GeneratedProject | null, onSuccess: () => void, onError: (error: string) => void) => {
      if (!generatedProject?.engine?.files || generatedProject.engine.files.length === 0) {
        onError('Nenhum arquivo gerado para exportar.');
        return;
      }

      try {
        await api.exportProjectZip(generatedProject);
        onSuccess();
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Falha ao exportar projeto.';
        onError(errMsg);
      }
    },
    []
  );

  const handleFileSelect = useCallback(
    (path: string, projectFiles: Array<{ path: string; content: string }>, onSelect: (file: { path: string; content: string }) => void, onError: (error: string) => void) => {
      const file = projectFiles.find(f => f.path === path);
      if (file) {
        onSelect(file);
      } else {
        onError('Arquivo não encontrado.');
      }
    },
    []
  );

  const handleAnalyzeProject = useCallback(
    async (
      userMsg: string,
      apiKey: string,
      discoveryData: DiscoveryData,
      generatedProject: GeneratedProject | null,
      onSuccess: (response: GeneratedProject) => void,
      onError: (error: string) => void
    ) => {
      try {
        const context = generatedProject 
          ? { 
              files: generatedProject.engine?.files?.map(f => ({ path: f.path })) || [], 
              summary: generatedProject.summary 
            } 
          : undefined;

        const response = await api.analyze(userMsg, context);
        onSuccess(response as GeneratedProject);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        onError(errMsg);
      }
    },
    []
  );

  return {
    handleExportZip,
    handleFileSelect,
    handleAnalyzeProject,
  };
}
