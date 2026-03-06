import { useState, useCallback } from 'react';

export type TabType = 'overview' | 'code' | 'hus' | 'docs' | 'tests' | 'timeline' | 'outputs';

export interface UIState {
  activeTab: TabType;
  isWizardOpen: boolean;
  isSettingsOpen: boolean;
  isQuickStartOpen: boolean;
  isHelpOpen: boolean;
}

export interface UIActions {
  setActiveTab: (tab: TabType) => void;
  setIsWizardOpen: (isOpen: boolean) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsQuickStartOpen: (isOpen: boolean) => void;
  setIsHelpOpen: (isOpen: boolean) => void;
  closeAllModals: () => void;
}

/**
 * Hook para gerenciar o estado da UI (abas e modais).
 * Centraliza a lógica de estado da interface e oferece ações tipadas.
 */
export function useUIState(): UIState & UIActions {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const closeAllModals = useCallback(() => {
    setIsWizardOpen(false);
    setIsSettingsOpen(false);
    setIsQuickStartOpen(false);
    setIsHelpOpen(false);
  }, []);

  return {
    activeTab,
    isWizardOpen,
    isSettingsOpen,
    isQuickStartOpen,
    isHelpOpen,
    setActiveTab,
    setIsWizardOpen,
    setIsSettingsOpen,
    setIsQuickStartOpen,
    setIsHelpOpen,
    closeAllModals,
  };
}
