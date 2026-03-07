#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

APP_PATH="packages/ui/src/App.tsx"
DOCS_PATH="packages/ui/src/components/docs/DocsPanel.tsx"

log_info "Iniciando correção final de Lint (Zero Warnings)..."

# 1. Corrigir App.tsx (Remover 'any' do catch)
log_info "Corrigindo App.tsx..."
cat > "$APP_PATH" << 'EOF'
import React, { useState, useEffect } from 'react';
import { DiscoveryNotes } from './components/DiscoveryNotes';
import { ExploreTimeline } from './components/ExploreTimeline';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { Sidebar } from './components/Sidebar';
import { HUsPanel } from './components/hus/HUsPanel';
import { DocsPanel } from './components/docs/DocsPanel';
import { TestsPanel } from './components/tests/TestsPanel';
import { FileViewer } from './components/code/FileViewer';
import { UserStory } from './components/hus/UserStoryCard';
import { Button } from './components/common/Button';
import { ProjectWizard } from './components/wizard/ProjectWizard';
import { QuickStartGallery } from './components/wizard/QuickStartGallery';
import { SettingsModal } from './components/settings/SettingsModal';
import { HelpModal } from './components/help/HelpModal';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { api } from './services/api';
import { startOnboardingTour } from './services/tour';
import { parseDiscoveryMessage, DiscoveryData } from './utils/discoveryParser';

interface GeneratedProject {
  engine?: { files?: Array<{ path: string; content: string }> };
  product?: { userStories?: UserStory[] };
  summary?: string;
  requestId?: string;
}

const MainLayout = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Estados de UI
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Dados
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'agent', text: string}>>([
    { role: 'agent', text: 'Olá! Estou pronto para ajudar. Configure sua API Key em "Preferências" para começarmos.' }
  ]);
  const [discoveryData, setDiscoveryData] = useState<DiscoveryData>({ intent: [], reqs: [], constraints: [] });
  const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
  const [selectedFile, setSelectedFile] = useState<{path: string, content: string} | null>(null);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('mini-ide-tour-seen');
    if (!hasSeenTour) setTimeout(() => { if (!isQuickStartOpen) startOnboardingTour(); }, 1500);
  }, []);

  const handleExportZip = async () => {
    if (!generatedProject) { showToast('Nenhum projeto gerado ainda.', 'warning'); return; }
    setIsExporting(true);
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
      // FIX: Tratamento de erro type-safe (sem 'any')
      const errMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setChatHistory(prev => [...prev, { role: 'agent', text: `Erro: ${errMsg}` }]);
      showToast(errMsg, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && e.ctrlKey) handleSendMessage(); };
  const handleTemplateSelect = (prompt: string) => { setChatInput(prompt); document.querySelector('textarea')?.focus(); };
  
  const projectFiles = generatedProject?.engine?.files || [];
  const projectHUs = generatedProject?.product?.userStories || [];

  const handleFileSelect = (path: string) => {
    const file = projectFiles.find(f => f.path === path);
    if (file) { setSelectedFile(file); setActiveTab('code'); }
    else showToast('Arquivo não encontrado.', 'error');
  };

  return (
    <div className="h-screen grid grid-rows-[56px_1fr_auto] bg-[var(--bg-app)] text-[var(--text-primary)] font-sans overflow-hidden">
      <header className="flex items-center gap-3 px-4 bg-[var(--bg-panel)]/90 border-b border-[var(--border-main)] shadow-sm z-10 backdrop-blur-sm">
        <div className="font-bold text-lg tracking-tight">Mini IDE</div>
        <span className="px-2.5 py-1 rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] text-xs font-medium">v0.16.0</span>
        <div className="flex-1" />
        <div className="flex gap-2 items-center">
          <Button variant="ghost" onClick={() => setIsWizardOpen(true)}>Criar</Button>
          <Button id="btnQuickStart" variant="ghost" onClick={() => setIsQuickStartOpen(true)}>Quick Start</Button>
          <div className="w-px h-6 bg-[var(--border-main)] mx-1"></div>
          <button id="btnPreferences" onClick={() => setIsSettingsOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] hover:text-[var(--brand-primary)] transition-all">⚙️</button>
          <button onClick={() => setIsHelpOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] hover:text-[var(--brand-primary)] transition-all">?</button>
        </div>
      </header>

      <main className="grid grid-cols-[auto_1fr_360px] gap-0 overflow-hidden">
        <div className="border-r border-[var(--border-main)] h-full overflow-hidden">
          <Sidebar files={projectFiles} onSelectFile={handleFileSelect} />
        </div>

        <section className="bg-[var(--bg-panel)] m-3 border border-[var(--border-main)] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden relative">
          <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 overflow-auto bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-4 relative">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="flex flex-col gap-4">
                   <div><h3 className="text-lg font-semibold mb-2">Bem-vindo</h3><p className="text-[var(--text-muted)] text-sm">Seu assistente de engenharia.</p></div>
                   <div className="mt-auto p-4 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Ações</h4>
                      <Button variant="ghost" size="sm" onClick={() => setIsQuickStartOpen(true)}>Templates</Button>
                   </div>
                </div>
                <div className="h-full"><DiscoveryNotes data={discoveryData} /></div>
              </div>
            )}
            
            {activeTab === 'code' && (selectedFile ? <FileViewer path={selectedFile.path} content={selectedFile.content} /> : <div className="center-msg">Selecione um arquivo.</div>)}
            {activeTab === 'hus' && <HUsPanel stories={projectHUs} />}
            {activeTab === 'docs' && <DocsPanel files={projectFiles} />}
            {activeTab === 'tests' && <TestsPanel files={projectFiles} />}
            {activeTab === 'timeline' && <ExploreTimeline />}
            
            {activeTab === 'outputs' && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Button id="btnExportZIP" onClick={handleExportZip} disabled={isExporting || !generatedProject} isLoading={isExporting}>
                  {isExporting ? 'Gerando...' : 'Exportar ZIP'}
                </Button>
              </div>
            )}
          </div>
        </section>

        <aside className="bg-[var(--bg-panel)] m-3 ml-0 border border-[var(--border-main)] rounded-xl shadow-sm flex flex-col p-3 gap-3">
          <div className="flex-1 bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg p-3 overflow-auto text-sm space-y-3">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${msg.role === 'agent' ? 'bg-[var(--bg-panel)]' : 'bg-[var(--bg-panel-hover)] border-[var(--brand-primary)]/30'}`}>
                <strong className={`block text-xs mb-1 ${msg.role === 'agent' ? 'text-[var(--brand-primary)]' : 'text-[var(--success)]'}`}>{msg.role === 'agent' ? 'Agente' : 'Você'}</strong>
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            ))}
            {isAnalyzing && <div className="text-xs text-[var(--text-muted)] animate-pulse">Processando...</div>}
          </div>
        </aside>
      </main>

      <footer className="px-4 py-3 bg-[var(--bg-panel)] border-t border-[var(--border-main)] grid grid-cols-[1fr_auto] gap-3">
        <textarea value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Digite aqui..." className="w-full h-[60px] bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-primary)] resize-none" disabled={isAnalyzing} />
        <div className="flex items-end gap-2">
          <Button variant="primary" onClick={handleSendMessage} disabled={isAnalyzing || !chatInput.trim()} isLoading={isAnalyzing}>Enviar</Button>
        </div>
      </footer>

      <ProjectWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      <QuickStartGallery isOpen={isQuickStartOpen} onClose={() => setIsQuickStartOpen(false)} onSelectTemplate={handleTemplateSelect} onStartTour={() => {setIsQuickStartOpen(false); setTimeout(startOnboardingTour, 300);}} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

function App() { return <ThemeProvider><ToastProvider><MainLayout /></ToastProvider></ThemeProvider>; }
export default App;
EOF
log_ok "App.tsx corrigido."

# 2. Corrigir DocsPanel.tsx (Renomear node -> _node e tipar code)
log_info "Corrigindo DocsPanel.tsx..."
cat > "$DOCS_PATH" << 'EOF'
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { SyntaxHighlighter } from '../../utils/syntaxHighlighter';

interface GeneratedFile {
  path: string;
  content: string;
}

interface DocsPanelProps {
  files?: GeneratedFile[];
}

// FIX: Interface completa para Props de componentes Markdown
// Extende props HTML padrão para evitar uso de 'any'
interface MarkdownCodeProps extends React.ClassAttributes<HTMLElement>, React.HTMLAttributes<HTMLElement> {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const DocsPanel: React.FC<DocsPanelProps> = ({ files = [] }) => {
  const docFile = useMemo(() => {
    if (!files || files.length === 0) return null;

    return files.find(f => {
      const p = f.path.toLowerCase().replace(/\\/g, '/');
      return p.endsWith('readme.md') || p === 'readme.txt';
    });
  }, [files]);

  if (!docFile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
        <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p>Nenhuma documentação encontrada.</p>
        <p className="text-xs mt-2">O Agente deve gerar um arquivo README.md.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-app)] rounded-lg border border-[var(--border-main)]">
      <div className="px-4 py-3 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-panel)]">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-[var(--brand-primary)]">📄</span>
          {docFile.path}
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        <article className="prose prose-invert max-w-none text-sm text-[var(--text-secondary)]">
          <ReactMarkdown
            components={{
              // FIX: Renomear 'node' para '_node' para evitar aviso de variável não usada
              h1: ({node: _node, ...props}) => <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border-main)] pb-2" {...props} />,
              h2: ({node: _node, ...props}) => <h2 className="text-xl font-semibold text-[var(--text-primary)] mt-6 mb-3" {...props} />,
              h3: ({node: _node, ...props}) => <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2" {...props} />,
              ul: ({node: _node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1" {...props} />,
              ol: ({node: _node, ...props}) => <ol className="list-decimal pl-5 mb-4 space-y-1" {...props} />,
              li: ({node: _node, ...props}) => <li className="pl-1" {...props} />,
              blockquote: ({node: _node, ...props}) => <blockquote className="border-l-4 border-[var(--brand-primary)] pl-4 italic text-[var(--text-muted)] bg-[var(--bg-panel-hover)]/30 py-2 pr-2 rounded-r mb-4" {...props} />,
              a: ({node: _node, ...props}) => <a className="text-[var(--brand-primary)] hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
              p: ({node: _node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
              
              // FIX: Tipagem explícita para 'code'
              code: ({node: _node, inline, className, children, ...props}: MarkdownCodeProps) => {
                 const match = /language-(\w+)/.exec(className || '');
                 return !inline ? (
                    <div className="my-4 rounded-lg overflow-hidden border border-[var(--border-main)]">
                      <SyntaxHighlighter code={String(children).replace(/\n$/, '')} language={match ? match[1] : ''} />
                    </div>
                 ) : (
                    <code className="bg-[var(--bg-panel-hover)] px-1.5 py-0.5 rounded text-[var(--brand-primary)] font-mono text-xs border border-[var(--border-main)]" {...props}>{children}</code>
                 )
              },
            }}
          >
            {docFile.content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
};
EOF
log_ok "DocsPanel.tsx corrigido."

# 3. Validar com Pipeline
log_info "Executando validação final..."
bash ./42_pipeline_checklist.sh
