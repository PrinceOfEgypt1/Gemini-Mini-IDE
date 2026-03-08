import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useProjectState,
  useChatState,
  useUIState,
  useProjectActions,
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

const MainLayout = () => {
  const { showToast } = useToast();

  const projectState = useProjectState();
  const chatState = useChatState();
  const uiState = useUIState();
  const projectActions = useProjectActions();

  const [discoveryData, setDiscoveryData] = React.useState<DiscoveryData>({
    intent: [],
    reqs: [],
    constraints: [],
  });

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut' as const,
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
      <Header
        onCreateClick={() => uiState.setIsWizardOpen(true)}
        onQuickStartClick={() => uiState.setIsQuickStartOpen(true)}
        onSettingsClick={() => uiState.setIsSettingsOpen(true)}
        onHelpClick={() => uiState.setIsHelpOpen(true)}
      />

      <main className="flex-1 flex overflow-hidden">
        <SidebarLayout files={projectFiles} onSelectFile={handleFileSelect} />

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

        <ChatPanel
          chatMode={chatState.chatMode}
          onChatModeChange={chatState.setChatMode}
          onProjectGenerated={(result) => projectState.setGeneratedProject(result)}
          onToast={showToast}
        />
      </main>

      <AnimatePresence>
        {uiState.isWizardOpen && (
          <ProjectWizard
            isOpen={uiState.isWizardOpen}
            onClose={() => uiState.setIsWizardOpen(false)}
          />
        )}

        {uiState.isQuickStartOpen && (
          <QuickStartGallery
            isOpen={uiState.isQuickStartOpen}
            onClose={() => uiState.setIsQuickStartOpen(false)}
            onSelectTemplate={(prompt: string) => {
              chatState.setChatInput(prompt);
              document.querySelector('textarea')?.focus();
            }}
            onStartTour={() => startOnboardingTour()}
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
