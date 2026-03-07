import React from 'react';
import { motion } from 'framer-motion';
import { DiscoveryNotes } from '../DiscoveryNotes';
import { ExploreTimeline } from '../ExploreTimeline';
import { WorkspaceTabs } from '../WorkspaceTabs';
import { HUsPanel } from '../hus/HUsPanel';
import { DocsPanel } from '../docs/DocsPanel';
import { TestsPanel } from '../tests/TestsPanel';
import { FileViewer } from '../code/FileViewer';
import { Button } from '../common/Button';
import type { UserStory } from '../hus/UserStoryCard';
import type { TabType } from '../../hooks';
import type { DiscoveryData } from '../../utils/discoveryParser';

export interface MainContentProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  projectFiles: Array<{ path: string; content: string }>;
  projectHUs: UserStory[];
  selectedFile: { path: string; content: string } | null;
  onFileSelect: (path: string) => void;
  discoveryData: DiscoveryData;
  isExporting: boolean;
  onExportClick: () => void;
}

/**
 * Componente de conteúdo principal com animações cinematográficas.
 * Gerencia as abas e exibe o conteúdo apropriado com transições suaves.
 */
export const MainContent: React.FC<MainContentProps> = ({
  activeTab,
  onTabChange,
  projectFiles,
  projectHUs,
  selectedFile,
  onFileSelect: _onFileSelect,
  discoveryData,
  isExporting,
  onExportClick,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2,
        ease: 'easeIn',
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
        ease: 'easeIn',
      },
    },
  };

  return (
    <motion.section
      className="flex-1 flex flex-col min-w-0 m-3 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl shadow-sm overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="flex-none">
        <WorkspaceTabs activeTab={activeTab} onTabChange={onTabChange} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 relative min-h-0">
        <motion.div
          key={activeTab}
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="h-full"
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-4 h-full">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Bem-vindo</h3>
                  <p className="text-[var(--text-muted)] text-sm">Seu assistente de engenharia.</p>
                </div>
                <div className="mt-auto p-4 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Ações</h4>
                  <Button variant="ghost" size="sm">
                    Templates
                  </Button>
                </div>
              </div>
              <div className="h-full overflow-hidden">
                <DiscoveryNotes data={discoveryData} />
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            selectedFile ? (
              <FileViewer path={selectedFile.path} content={selectedFile.content} />
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                Selecione um arquivo na sidebar.
              </div>
            )
          )}

          {activeTab === 'hus' && <HUsPanel stories={projectHUs} />}
          {activeTab === 'docs' && <DocsPanel files={projectFiles} />}
          {activeTab === 'tests' && <TestsPanel files={projectFiles} />}
          {activeTab === 'timeline' && <ExploreTimeline />}

          {activeTab === 'outputs' && (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Artefatos Gerados</h3>
                <p className="text-[var(--text-muted)] text-sm">Total de arquivos: {projectFiles.length}</p>
              </div>
              <Button
                id="btnExportZIP"
                variant="primary"
                size="lg"
                onClick={onExportClick}
                disabled={isExporting || projectFiles.length === 0}
                isLoading={isExporting}
              >
                {isExporting ? 'Gerando ZIP...' : 'Baixar Projeto Completo (.zip)'}
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
};
