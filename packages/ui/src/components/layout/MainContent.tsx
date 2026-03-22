import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileViewer } from '../code/FileViewer';
import { HUsPanel } from '../hus/HUsPanel';
import { DocsPanel } from '../docs/DocsPanel';
import { TestsPanel } from '../tests/TestsPanel';
import { ExploreTimeline } from '../explore/ExploreTimeline';
import { DiscoveryNotes } from '../DiscoveryNotes';
import { Button } from '../common/Button';
import { WorkspaceTabs } from './WorkspaceTabs';
import type { GeneratedFile, UserStory } from '../../types';
import type { DiscoveryData } from '../../utils/discoveryParser';

export interface MainContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  projectFiles: GeneratedFile[];
  projectHUs: UserStory[];
  selectedFile: GeneratedFile | null;
  onFileSelect: (path: string) => void;
  discoveryData: DiscoveryData;
  isExporting: boolean;
  onExportClick: () => void;
}

export const MainContent: React.FC<MainContentProps> = ({
  activeTab,
  onTabChange,
  projectFiles,
  projectHUs,
  selectedFile,
  onFileSelect: _onFileSelect, // Renomeado para evitar warning de não utilizado
  discoveryData,
  isExporting,
  onExportClick,
}) => {
  const containerVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'code':
        return selectedFile ? (
          <FileViewer path={selectedFile.path} content={selectedFile.content} />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
            Selecione um arquivo na sidebar.
          </div>
        );
      case 'hus':
        return <HUsPanel stories={projectHUs} />;
      case 'docs':
        return <DocsPanel files={projectFiles} />;
      case 'tests':
        return <TestsPanel files={projectFiles} />;
      case 'timeline':
        return <ExploreTimeline />;
      case 'discovery':
        return (
          <div className="h-full overflow-hidden p-4">
            <DiscoveryNotes data={discoveryData} />
          </div>
        );
      case 'outputs':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Artefatos Gerados</h3>
              <p className="text-[var(--text-muted)] text-sm">Total de arquivos: {projectFiles.length}</p>
            </div>
            <Button id="btnExportZIP" onClick={onExportClick} disabled={isExporting}>
              {isExporting ? 'Exportando...' : 'Exportar Projeto (.zip)'}
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-panel)] overflow-hidden">
      <WorkspaceTabs activeTab={activeTab} onTabChange={onTabChange} />
      <motion.div
        key={activeTab}
        className="flex-1 overflow-y-auto bg-[var(--bg-app)]"
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
