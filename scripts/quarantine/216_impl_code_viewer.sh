#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/216_impl_code_viewer.sh
# Objetivo: Implementar visualizador de código e integrar com clique na Sidebar
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "💻 Implementando Visualizador de Código (File Viewer)..."

# 1. Criar componente FileViewer com estilo de IDE
# ------------------------------------------------------------------------------
mkdir -p packages/ui/src/components/code

cat << 'EOF' > packages/ui/src/components/code/FileViewer.tsx
import React from 'react';

interface FileViewerProps {
  filename: string;
  content: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({ filename, content }) => {
  // Separa o conteúdo em linhas para gerar numeração
  const lines = content.split('\n');

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm rounded-lg overflow-hidden border border-[var(--border-main)]">
      {/* Header do Arquivo */}
      <div className="flex items-center px-4 py-2 bg-[#252526] border-b border-[#3e3e42]">
        <span className="text-[#858585] mr-2">📄</span>
        <span className="font-medium text-xs">{filename}</span>
      </div>

      {/* Corpo do Código com Numeração */}
      <div className="flex-1 overflow-auto flex">
        {/* Coluna de Números */}
        <div className="bg-[#1e1e1e] text-[#858585] text-right pr-3 pl-2 select-none border-r border-[#3e3e42] py-4 min-h-full leading-6">
          {lines.map((_, i) => (
            <div key={i} className="h-6">{i + 1}</div>
          ))}
        </div>

        {/* Conteúdo do Código */}
        <div className="flex-1 p-4 leading-6 whitespace-pre tab-4">
          {content}
        </div>
      </div>
    </div>
  );
};
EOF

# 2. Adicionar aba "Código" ao WorkspaceTabs
# ------------------------------------------------------------------------------
echo "📑 Atualizando WorkspaceTabs para incluir aba Código..."

cat << 'EOF' > packages/ui/src/components/WorkspaceTabs.tsx
import React from 'react';

interface WorkspaceTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'code', label: 'Código' }, // Nova aba
    { id: 'hus', label: 'HUs' },
    { id: 'docs', label: 'Docs' },
    { id: 'tests', label: 'Tests' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'outputs', label: 'Outputs' },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border-main)] overflow-x-auto no-scrollbar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap
            ${activeTab === tab.id 
              ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]' 
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
EOF

# 3. Integrar tudo no App.tsx
# ------------------------------------------------------------------------------
echo "🔗 Conectando Sidebar ao FileViewer no App.tsx..."

cat << 'EOF' > packages/ui/src/App.tsx
import React, { useState, useEffect } from 'react';
import { DiscoveryNotes } from './components/DiscoveryNotes';
import { ExploreTimeline } from './components/ExploreTimeline';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { Sidebar } from './components/Sidebar';
import { HUsPanel } from './components/hus/HUsPanel';
import { DocsPanel } from './components/docs/DocsPanel';
import { FileViewer } from './components/code/FileViewer'; // Nova Importação
import { UserStory } from './components/hus/UserStoryCard';
import { Button } from './components/Button';
import { ProjectWizard } from './components/wizard/ProjectWizard';
import { QuickStartGallery } from './components/wizard/QuickStartGallery';
import { SettingsModal } from './components/settings/SettingsModal';
import { HelpModal } from './components/help/HelpModal';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { api } from './services/api';
import { startOnboardingTour } from './services/tour';
import { parseDiscoveryMessage, DiscoveryData } from './utils/discoveryParser';

// Interface para tipagem do projeto gerado
interface GeneratedProject {
  engine?: {
    files?: Array<{ path: string; content: string }>;
  };
  product?: {
    userStories?: UserStory[];
  };
  summary?: string;
  requestId?: string;
}

const MainLayout = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Modais
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'agent', text: string}>>([
    { role: 'agent', text: 'Olá! Estou pronto para ajudar. Configure sua API Key em "Preferências" para começarmos.' }
  ]);

  const [discoveryData, setDiscoveryData] = useState<DiscoveryData>({
    intent: [], reqs: [], constraints: []
  });

  // ESTADO DO PROJETO
  const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
  
  // ESTADO DO ARQUIVO SELECIONADO
  const [selectedFile, setSelectedFile] = useState<{path: string, content: string} | null>(null);

  const [mode] = useState<'Explorando' | 'Executando'>('Explorando');

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('mini-ide-tour-seen');
    if (!hasSeenTour) {
      setTimeout(() => { if (!isQuickStartOpen) startOnboardingTour(); }, 1500);
    }
  }, []);

  const handleExportZip = async () => {
    if (!generatedProject) {
      showToast('Nenhum projeto gerado ainda.', 'warning');
      return;
    }
    setIsExporting(true);
    showToast('Iniciando exportação...', 'info');
    try {
      await api.exportProjectZip(generatedProject);
      showToast('Projeto exportado com sucesso!', 'success');
    } catch {
      showToast('Falha ao exportar projeto.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);

    const updatedNotes = parseDiscoveryMessage(userMsg, discoveryData);
    setDiscoveryData(updatedNotes);

    setIsAnalyzing(true);
    try {
      const response = await api.analyze(userMsg);
      setGeneratedProject(response as GeneratedProject);

      const agentText = `Análise concluída! (ID: ${response.requestId}).\nResumo: ${response.summary}`;
      setChatHistory(prev => [...prev, { role: 'agent', text: agentText }]);
      showToast('Projeto gerado! Veja os arquivos no Explorer.', 'success');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setChatHistory(prev => [...prev, { role: 'agent', text: `Erro: ${errMsg}` }]);
      showToast(errMsg, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) handleSendMessage();
  };

  const handleTemplateSelect = (prompt: string) => {
    setChatInput(prompt);
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.focus();
  };

  const handleStartTour = () => {
    setIsQuickStartOpen(false);
    setTimeout(() => startOnboardingTour(), 300);
  };

  const handleAttach = () => {
    showToast('Funcionalidade de anexo em breve!', 'info');
  };

  // Extração segura de dados
  const projectFiles = generatedProject?.engine?.files || [];
  const projectHUs = generatedProject?.product?.userStories || [];

  // AÇÃO AO CLICAR NO ARQUIVO (Sidebar)
  const handleFileSelect = (path: string) => {
    const file = projectFiles.find(f => f.path === path);
    if (file) {
      setSelectedFile(file);
      setActiveTab('code'); // Muda para a aba Código automaticamente
    } else {
      showToast('Arquivo não encontrado no bundle.', 'error');
    }
  };

  return (
    <div className="h-screen grid grid-rows-[56px_1fr_auto] bg-[var(--bg-app)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-300">
      <header className="flex items-center gap-3 px-4 bg-[var(--bg-panel)]/90 border-b border-[var(--border-main)] shadow-sm z-10 backdrop-blur-sm transition-colors duration-300">
        <div className="font-bold text-lg tracking-tight text-[var(--text-primary)]">Mini IDE</div>
        <span className="px-2.5 py-1 rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] text-[var(--text-secondary)] text-xs font-medium">Analysis Agent</span>
        <span className="px-2.5 py-1 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/40 text-[var(--success)] text-xs font-medium">{mode}</span>

        <div className="flex-1" />

        <div className="flex gap-2 items-center">
          <Button variant="ghost" onClick={() => setIsWizardOpen(true)}>Criar Projeto</Button>
          <Button id="btnQuickStart" variant="ghost" onClick={() => setIsQuickStartOpen(true)}>Quick Start</Button>
          <div className="w-px h-6 bg-[var(--border-main)] mx-1"></div>
          <button id="btnPreferences" onClick={() => setIsSettingsOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)] transition-all font-bold" title="Preferências">⚙️</button>
          <button onClick={() => setIsHelpOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)] transition-all font-bold" title="Ajuda">?</button>
        </div>
      </header>

      <main className="grid grid-cols-[auto_1fr_360px] gap-0 overflow-hidden">
        
        {/* Sidebar Integrada */}
        <div className="border-r border-[var(--border-main)] h-full overflow-hidden">
          <Sidebar 
            files={projectFiles} 
            onSelectFile={handleFileSelect} 
          />
        </div>

        <section className="bg-[var(--bg-panel)] m-3 border border-[var(--border-main)] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden relative transition-colors duration-300">
          <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 overflow-auto bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-4 relative">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Bem-vindo à Mini IDE</h3>
                    <p className="text-[var(--text-muted)] text-sm">Seu assistente de engenharia de software.</p>
                  </div>
                  <div className="mt-auto p-4 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Ações Rápidas</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setIsQuickStartOpen(true)}>Explorar Templates</Button>
                    </div>
                  </div>
                </div>
                <div className="h-full"><DiscoveryNotes data={discoveryData} /></div>
              </div>
            )}
            
            {/* Aba de Código (IDE Viewer) */}
            {activeTab === 'code' && (
              selectedFile ? (
                <FileViewer filename={selectedFile.path} content={selectedFile.content} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                  <p>Selecione um arquivo no Explorer para visualizar o código.</p>
                </div>
              )
            )}

            {activeTab === 'hus' && <HUsPanel stories={projectHUs} />}
            
            {activeTab === 'docs' && <DocsPanel files={projectFiles} />}

            {activeTab === 'timeline' && <ExploreTimeline />}
            
            {activeTab === 'outputs' && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-[var(--text-muted)]">Artefatos prontos para download.</div>
                <Button id="btnExportZIP" onClick={handleExportZip} disabled={isExporting || !generatedProject}>
                  {isExporting ? 'Gerando ZIP...' : 'Exportar Projeto (.zip)'}
                </Button>
                {!generatedProject && <p className="text-xs text-[var(--danger)]">Gere um projeto no chat primeiro!</p>}
              </div>
            )}
            {['tests'].includes(activeTab) && <div className="text-[var(--text-muted)] text-center mt-10">Em breve.</div>}
          </div>
        </section>

        <aside className="bg-[var(--bg-panel)] m-3 ml-0 border border-[var(--border-main)] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden transition-colors duration-300">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--border-main)]">
            <div className="flex gap-2">
              <span className="text-[10px] bg-[var(--bg-panel-hover)] px-2 py-0.5 rounded-full text-[var(--text-muted)]">~ ms</span>
              <span className="text-[10px] bg-[var(--bg-panel-hover)] px-2 py-0.5 rounded-full text-[var(--text-muted)]">R$ 0,00</span>
            </div>
            <button id="btnPreferences" onClick={() => setIsSettingsOpen(true)} className="text-xs bg-[var(--bg-panel-hover)] border border-[var(--border-main)] px-2 py-1 rounded-md transition-colors text-[var(--text-secondary)]">Preferências</button>
          </div>
          <div className="flex-1 bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg p-3 overflow-auto text-sm space-y-3">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${
                msg.role === 'agent'
                  ? 'bg-[var(--bg-panel)] border-[var(--border-main)]'
                  : 'bg-[var(--bg-panel-hover)] border-[var(--brand-primary)]/30'
              }`}>
                <strong className={`block text-xs mb-1 ${msg.role === 'agent' ? 'text-[var(--brand-primary)]' : 'text-[var(--success)]'}`}>
                  {msg.role === 'agent' ? 'Agente' : 'Você'}
                </strong>
                <div className="whitespace-pre-wrap text-[var(--text-primary)]">{msg.text}</div>
              </div>
            ))}
            {isAnalyzing && <div className="text-xs text-[var(--text-muted)] animate-pulse">Digitando...</div>}
          </div>
        </aside>
      </main>

      <ProjectWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      <QuickStartGallery isOpen={isQuickStartOpen} onClose={() => setIsQuickStartOpen(false)} onSelectTemplate={handleTemplateSelect} onStartTour={handleStartTour} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
EOF

echo "✅ Visualizador de código (FileViewer) implementado e integrado."
EOF
