#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/203_integrate_sidebar.sh
# Objetivo: Conectar Sidebar dinâmica ao App.tsx
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🔌 Iniciando integração da Sidebar no App.tsx..."

# Sobrescreve App.tsx com a versão integrada
cat << 'EOF' > packages/ui/src/App.tsx
import React, { useState, useEffect } from 'react';
import { DiscoveryNotes } from './components/DiscoveryNotes';
import { ExploreTimeline } from './components/ExploreTimeline';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { Sidebar } from './components/Sidebar'; // Novo componente
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

// Interface auxiliar para tipar o projeto gerado
interface GeneratedProject {
  engine?: {
    files?: Array<{ path: string; content: string }>;
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

  // ESTADO: Armazena o projeto gerado pela IA
  const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);

  const [mode] = useState<'Explorando' | 'Executando'>('Explorando');

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('mini-ide-tour-seen');
    if (!hasSeenTour) {
      setTimeout(() => { if (!isQuickStartOpen) startOnboardingTour(); }, 1500);
    }
  }, []);

  const handleExportZip = async () => {
    if (!generatedProject) {
      showToast('Nenhum projeto gerado ainda. Peça algo no chat primeiro!', 'warning');
      return;
    }

    setIsExporting(true);
    showToast('Iniciando exportação...', 'info');
    try {
      // Envia o projeto REAL gerado pela IA
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

      // CAPTURA CRÍTICA: Salva o JSON completo da IA
      setGeneratedProject(response as GeneratedProject);

      const agentText = `Análise concluída! (ID: ${response.requestId}).\nResumo: ${response.summary}`;
      setChatHistory(prev => [...prev, { role: 'agent', text: agentText }]);
      showToast('Análise recebida! Código pronto para exportação.', 'success');

      // Feedback visual na Timeline (futuro)
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

  // Extração segura de arquivos para a Sidebar
  const projectFiles = generatedProject?.engine?.files || [];

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

      {/* Ajuste de grid: auto para acomodar a largura da Sidebar */}
      <main className="grid grid-cols-[auto_1fr_360px] gap-0 overflow-hidden">
        
        {/* Sidebar Integrada */}
        <div className="border-r border-[var(--border-main)] h-full overflow-hidden">
          <Sidebar 
            files={projectFiles} 
            onSelectFile={(path) => showToast(`Selecionado: ${path}`, 'info')} 
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
            {['hus', 'docs', 'tests'].includes(activeTab) && <div className="text-[var(--text-muted)] text-center mt-10">Em breve.</div>}
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

      <footer className="px-4 py-3 bg-[var(--bg-panel)] border-t border-[var(--border-main)] grid grid-cols-[1fr_auto] gap-3 transition-colors duration-300">
        <textarea
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite em linguagem natural... (Ctrl+Enter para enviar)"
          className="w-full h-[60px] bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] resize-none transition-colors"
          disabled={isAnalyzing}
        />
        <div className="flex items-end gap-2">
          <Button variant="ghost" onClick={handleAttach} title="Anexar Arquivo">📎</Button>
          <Button variant="primary" onClick={handleSendMessage} disabled={isAnalyzing || !chatInput.trim()}>
            {isAnalyzing ? '...' : 'Enviar'}
          </Button>
        </div>
      </footer>

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

echo "✅ App.tsx atualizado com Sidebar dinâmica."
