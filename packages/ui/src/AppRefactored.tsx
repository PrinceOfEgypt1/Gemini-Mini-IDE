import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useProjectState,
  useChatState,
  useUIState,
  useProjectActions,
  type GeneratedProject,
} from './hooks';
import {
  Header,
  MainContent,
  SidebarLayout,
  ChatPanel,
} from './components/layout';
import { ProjectWizard } from './components/wizard/ProjectWizard';
import { QuickStartGallery } from './components/wizard/QuickStartGallery';
import { SettingsModal } from './components/settings/SettingsModal';
import { HelpModal } from './components/help/HelpModal';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { startOnboardingTour } from './services/tour';
import { parseDiscoveryMessage, type DiscoveryData } from './utils/discoveryParser';

/**
 * Componente principal da aplicação com arquitetura modular e animações cinematográficas.
 * 
 * Melhorias implementadas:
 * - Decomposição em hooks especializados (useProjectState, useChatState, useUIState)
 * - Separação de componentes de layout em módulos independentes
 * - Animações cinematográficas com Framer Motion
 * - Melhor gerenciamento de estado e ações
 * - Código mais legível e mantível
 */
const MainLayout = () => {
  const { showToast } = useToast();

  // Hooks de Estado
  const projectState = useProjectState();
  const chatState = useChatState();
  const uiState = useUIState();
  const projectActions = useProjectActions();

  // Estado de descoberta
  const [discoveryData, setDiscoveryData] = React.useState<DiscoveryData>({
    intent: [],
    reqs: [],
    constraints: [],
  });

  // Efeito de inicialização
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('mini-ide-tour-seen');
    if (!hasSeenTour) {
      setTimeout(() => {
        if (!uiState.isQuickStartOpen) {
          startOnboardingTour();
        }
      }, 1500);
    }
  }, [uiState.isQuickStartOpen]);

  // Handlers
  const handleExportZip = async () => {
    await projectActions.handleExportZip(
      projectState.generatedProject,
      () => {
        showToast('Projeto exportado com sucesso!', 'success');
      },
      (error) => {
        showToast(error, 'error');
      }
    );
  };

  const handleFileSelect = (path: string) => {
    projectActions.handleFileSelect(
      path,
      projectState.generatedProject?.engine?.files || [],
      (file) => {
        projectState.setSelectedFile(file);
        uiState.setActiveTab('code');
      },
      (error) => {
        showToast(error, 'error');
      }
    );
  };

  const handleSendMessage = async () => {
    if (!chatState.chatInput.trim()) return;

    const apiKey = sessionStorage.getItem('mini-ide-api-key');
    if (!apiKey) {
      showToast('Configure sua API Key nas Preferências para continuar.', 'warning');
      uiState.setIsSettingsOpen(true);
      return;
    }

    const userMsg = chatState.chatInput;
    chatState.setChatInput('');
    chatState.addMessage({ role: 'user', text: userMsg });

    const updatedNotes = parseDiscoveryMessage(userMsg, discoveryData);
    setDiscoveryData(updatedNotes);

    projectState.setIsAnalyzing(true);
    try {
      await projectActions.handleAnalyzeProject(
        userMsg,
        apiKey,
        discoveryData,
        projectState.generatedProject,
        (response) => {
          projectState.updateGeneratedProject(() => {
            const newFiles = response.engine?.files;
            const hasNewFiles = newFiles && newFiles.length > 0;

            if (!hasNewFiles && projectState.generatedProject) {
              return {
                ...projectState.generatedProject,
                summary: response.summary,
                requestId: response.requestId,
              };
            }

            return response;
          });

          const agentText = response.summary || 'Análise concluída.';
          chatState.addMessage({ role: 'agent', text: agentText });

          const fileCount = response.engine?.files?.length || 0;
          if (fileCount > 0) {
            showToast(`Projeto gerado com ${fileCount} arquivos!`, 'success');
          }
        },
        (error) => {
          chatState.addMessage({ role: 'agent', text: `Erro: ${error}` });
          showToast(error, 'error');
        }
      );
    } finally {
      projectState.setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSendMessage();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  const projectFiles = projectState.generatedProject?.engine?.files || [];
  const projectHUs = projectState.generatedProject?.product?.userStories || [];

  return (
    <motion.div
      className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] font-sans"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <Header
        onCreateClick={() => uiState.setIsWizardOpen(true)}
        onQuickStartClick={() => uiState.setIsQuickStartOpen(true)}
        onSettingsClick={() => uiState.setIsSettingsOpen(true)}
        onHelpClick={() => uiState.setIsHelpOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <SidebarLayout files={projectFiles} onSelectFile={handleFileSelect} />

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          <MainContent
            activeTab={uiState.activeTab}
            onTabChange={uiState.setActiveTab}
            projectFiles={projectFiles}
            projectHUs={projectHUs}
            selectedFile={projectState.selectedFile}
            onFileSelect={handleFileSelect}
            discoveryData={discoveryData}
            isExporting={projectState.isExporting}
            onExportClick={handleExportZip}
          />
        </AnimatePresence>

        {/* Chat Panel */}
        <ChatPanel
          chatMode={chatState.chatMode}
          onChatModeChange={chatState.setChatMode}
          onProjectGenerated={(result) => projectState.setGeneratedProject(result)}
          onToast={showToast}
        />
      </main>

      {/* Modals */}
      <AnimatePresence>
        {uiState.isWizardOpen && (
          <ProjectWizard
            isOpen={uiState.isWizardOpen}
            onClose={() => uiState.setIsWizardOpen(false)}
            onProjectGenerated={(result) => projectState.setGeneratedProject(result)}
          />
        )}

        {uiState.isQuickStartOpen && (
          <QuickStartGallery
            isOpen={uiState.isQuickStartOpen}
            onClose={() => uiState.setIsQuickStartOpen(false)}
            onTemplateSelect={(prompt) => {
              chatState.setChatInput(prompt);
              document.querySelector('textarea')?.focus();
            }}
          />
        )}

        {uiState.isSettingsOpen && (
          <SettingsModal
            isOpen={uiState.isSettingsOpen}
            onClose={() => uiState.setIsSettingsOpen(false)}
          />
        )}

        {uiState.isHelpOpen && (
          <HelpModal
            isOpen={uiState.isHelpOpen}
            onClose={() => uiState.setIsHelpOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/**
 * Aplicação principal com provedores de contexto.
 */
export const App = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
