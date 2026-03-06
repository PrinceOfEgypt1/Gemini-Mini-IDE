import { useState, useCallback } from 'react';
import type { UserStory } from '../components/hus/UserStoryCard';

export interface GeneratedProject {
  engine?: { files?: Array<{ path: string; content: string }> };
  product?: { userStories?: UserStory[] };
  summary?: string;
  requestId?: string;
}

export interface ProjectState {
  generatedProject: GeneratedProject | null;
  selectedFile: { path: string; content: string } | null;
  isAnalyzing: boolean;
  isExporting: boolean;
}

export interface ProjectActions {
  setGeneratedProject: (project: GeneratedProject | null) => void;
  updateGeneratedProject: (updater: (prev: GeneratedProject | null) => GeneratedProject | null) => void;
  setSelectedFile: (file: { path: string; content: string } | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setIsExporting: (isExporting: boolean) => void;
  resetProject: () => void;
}

/**
 * Hook para gerenciar o estado do projeto gerado.
 * Centraliza a lógica de estado e oferece ações tipadas.
 */
export function useProjectState(): ProjectState & ProjectActions {
  const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const updateGeneratedProject = useCallback((updater: (prev: GeneratedProject | null) => GeneratedProject | null) => {
    setGeneratedProject(prev => updater(prev));
  }, []);

  const resetProject = useCallback(() => {
    setGeneratedProject(null);
    setSelectedFile(null);
    setIsAnalyzing(false);
    setIsExporting(false);
  }, []);

  return {
    generatedProject,
    selectedFile,
    isAnalyzing,
    isExporting,
    setGeneratedProject,
    updateGeneratedProject,
    setSelectedFile,
    setIsAnalyzing,
    setIsExporting,
    resetProject,
  };
}
