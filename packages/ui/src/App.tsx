import React, { useState, useEffect, useRef } from 'react';
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
import { TokenMeter } from './components/common/TokenMeter';
import { ProjectWizard } from './components/wizard/ProjectWizard';
import { QuickStartGallery } from './components/wizard/QuickStartGallery';
import { SettingsModal } from './components/settings/SettingsModal';
import { HelpModal } from './components/help/HelpModal';
import { ConversationChat } from './components/chat/ConversationChat';
import type { ConversationChatHandle } from './components/chat/ConversationChat';
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
  
  // Modais
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // Estados de Processamento
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Chat mode: 'classic' (one-shot) ou 'interactive' (conversacional)
  const [chatMode, setChatMode] = useState<'classic' | 'interactive'>('interactive');
  const conversationChatRef = useRef<ConversationChatHandle>(null);

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
    if (!generatedProject?.engine?.files || generatedProject.engine.files.length === 0) {
      showToast('Nenhum arquivo gerado para exportar.', 'warning');
      return;
    }
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

    // Se modo interativo, delega para o ConversationChat via ref
    if (chatMode === 'interactive') {
      const msg = chatInput;
      setChatInput('');
      conversationChatRef.current?.sendMessage(msg);
      return;
    }

    // Modo clássico: pipeline one-shot
    const apiKey = sessionStorage.getItem("mini-ide-api-key");
    if (!apiKey) {
      showToast("Configure sua API Key nas Preferências para continuar.", "warning");
      setIsSettingsOpen(true);
      return;
    }
    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);

    const updatedNotes = parseDiscoveryMessage(userMsg, discoveryData);
    setDiscoveryData(updatedNotes);

    setIsAnalyzing(true);
    try {
      const context = generatedProject ? { files: generatedProject.engine?.files?.map(f => ({ path: f.path })) || [], summary: generatedProject.summary } : undefined; const response = await api.analyze(userMsg, context);

      // STATE MERGING INTELLIGENCE (Lint Fixed)
      setGeneratedProject(prevProject => {
        const newFiles = response.engine?.files;
        const hasNewFiles = newFiles && newFiles.length > 0;

        // Se não tem arquivos novos, é apenas um chat: preserva o projeto antigo
        if (!hasNewFiles && prevProject) {
            return {
                ...prevProject,
                summary: response.summary, // Atualiza apenas o resumo/chat
                requestId: response.requestId
            };
        }

        // Se tem arquivos novos, é um novo projeto ou refatoração: substitui
        return response as GeneratedProject;
      });

      const agentText = response.summary || "Análise concluída.";
      setChatHistory(prev => [...prev, { role: 'agent', text: agentText }]);

      const fileCount = response.engine?.files?.length || 0;
      if (fileCount > 0) {
         showToast(`Projeto gerado com ${fileCount} arquivos!`, 'success');
      }

    } catch (error: unknown) {
      // FIX: Tipagem segura para erro
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] font-sans">
      <header className="h-14 flex-none flex items-center gap-3 px-4 bg-[var(--bg-panel)]/90 border-b border-[var(--border-main)] shadow-sm z-10 backdrop-blur-sm">
        <div className="font-bold text-lg tracking-tight">Gemini Mini-IDE</div>
        <span className="px-2.5 py-1 rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] text-xs font-medium">v0.17.1</span>
        <div className="flex-1" />
        <div className="flex gap-2 items-center">
          <Button variant="ghost" onClick={() => setIsWizardOpen(true)}>Criar</Button>
          <Button id="btnQuickStart" variant="ghost" onClick={() => setIsQuickStartOpen(true)}>Quick Start</Button>
          <div className="w-px h-6 bg-[var(--border-main)] mx-1"></div>
          <button id="btnPreferences" onClick={() => setIsSettingsOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] hover:text-[var(--brand-primary)] transition-all">⚙️</button>
          <button onClick={() => setIsHelpOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] hover:text-[var(--brand-primary)] transition-all">?</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="w-72 flex-none border-r border-[var(--border-main)] flex flex-col overflow-hidden">
          <Sidebar files={projectFiles} onSelectFile={handleFileSelect} />
        </div>

        <section className="flex-1 flex flex-col min-w-0 m-3 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl shadow-sm overflow-hidden">
          <div className="flex-none">
            <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 relative min-h-0">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="flex flex-col gap-4">
                   <div><h3 className="text-lg font-semibold mb-2">Bem-vindo</h3><p className="text-[var(--text-muted)] text-sm">Seu assistente de engenharia.</p></div>
                   <div className="mt-auto p-4 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Ações</h4>
                      <Button variant="ghost" size="sm" onClick={() => setIsQuickStartOpen(true)}>Templates</Button>
                   </div>
                </div>
                <div className="h-full overflow-hidden"><DiscoveryNotes data={discoveryData} /></div>
              </div>
            )}
            
            {activeTab === 'code' && (selectedFile ? <FileViewer path={selectedFile.path} content={selectedFile.content} /> : <div className="flex items-center justify-center h-full text-[var(--text-muted)]">Selecione um arquivo na sidebar.</div>)}
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
                  onClick={handleExportZip} 
                  disabled={isExporting || projectFiles.length === 0} 
                  isLoading={isExporting}
                >
                  {isExporting ? 'Gerando ZIP...' : 'Baixar Projeto Completo (.zip)'}
                </Button>
              </div>
            )}
          </div>
        </section>

        <aside className="w-96 flex-none flex flex-col m-3 ml-0 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl shadow-sm overflow-hidden">
          {/* Chat mode toggle */}
          <div className="flex-none flex border-b border-[var(--border-main)]">
            <button
              onClick={() => setChatMode('interactive')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${chatMode === 'interactive' ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              Chat Interativo
            </button>
            <button
              onClick={() => setChatMode('classic')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${chatMode === 'classic' ? 'text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              Chat Classico
            </button>
          </div>

          {chatMode === 'interactive' ? (
            <ConversationChat
              ref={conversationChatRef}
              onProjectGenerated={(result) => setGeneratedProject(result as GeneratedProject)}
              onToast={(msg, type) => showToast(msg, type)}
              hideInput={true}
            />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border text-sm ${msg.role === "agent" ? "bg-[var(--bg-panel)] border-[var(--border-main)]" : "bg-[var(--bg-panel-hover)] border-[var(--brand-primary)]/30"}`}>
                    <strong className={`block text-xs mb-1 ${msg.role === "agent" ? "text-[var(--brand-primary)]" : "text-[var(--success)]"}`}>{msg.role === "agent" ? "Agente" : "Voce"}</strong>
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                  </div>
                ))}
                {isAnalyzing && <div className="text-xs text-[var(--text-muted)] animate-pulse">Processando...</div>}
              </div>
              <TokenMeter chatHistory={chatHistory} files={generatedProject?.engine?.files || []} />
            </>
          )}
        </aside>
      </main>

      <footer className="h-[80px] flex-none px-4 py-3 bg-[var(--bg-panel)] border-t border-[var(--border-main)] grid grid-cols-[1fr_auto] gap-3 z-20">
        <textarea 
          value={chatInput} 
          onChange={(e) => setChatInput(e.target.value)} 
          onKeyDown={handleKeyDown} 
          placeholder={chatMode === 'interactive' ? "Descreva seu projeto ou responda ao agente... (Ctrl+Enter)" : "Digite aqui..."}
          className="w-full h-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-primary)] resize-none" 
          disabled={isAnalyzing} 
        />
        <div className="flex items-end pb-1">
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
