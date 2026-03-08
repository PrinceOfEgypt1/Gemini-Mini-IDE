#!/usr/bin/env bash
set -e

echo "🚑 [Fix] Restaurando Botão Anexar e visibilidade das Discovery Notes..."

UI_DIR="packages/ui/src"

# ==============================================================================
# 1. Atualizar DiscoveryNotes.tsx
# Mudança: Exibir categorias sempre (mesmo vazias) para melhor UX
# ==============================================================================
echo "📝 Atualizando $UI_DIR/components/DiscoveryNotes.tsx..."

cat > $UI_DIR/components/DiscoveryNotes.tsx <<EOF
import React from 'react';

export interface DiscoveryNotesProps {
  data?: {
    intent: string[];
    reqs: string[];
    constraints: string[];
  };
}

export const DiscoveryNotes: React.FC<DiscoveryNotesProps> = ({ data }) => {
  // Inicializa com arrays vazios se data for undefined
  const safeData = data || { intent: [], reqs: [], constraints: [] };

  const renderList = (items: string[], emptyText: string) => {
    if (items.length === 0) {
      return <p className="text-xs text-[#9fb0d3] italic opacity-50 py-1">{emptyText}</p>;
    }
    return (
      <ul className="list-disc list-inside text-sm text-[#e6ecff] space-y-1">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
  };

  return (
    <div className="bg-[#141b2b] border border-[#24304a] rounded-lg p-4 h-full overflow-y-auto">
      <h3 className="font-semibold text-[#e6ecff] mb-4 flex items-center gap-2">
        <span>🧭</span> Discovery Notes
      </h3>
      
      <div className="space-y-4">
        {/* Intenção */}
        <div className="bg-[#0f1420] rounded-md p-3 border border-[#24304a]">
          <h4 className="text-xs font-bold text-[#4ba3ff] uppercase tracking-wider mb-2">Intenção</h4>
          {renderList(safeData.intent, "O que você quer construir?")}
        </div>

        {/* Requisitos */}
        <div className="bg-[#0f1420] rounded-md p-3 border border-[#24304a]">
          <h4 className="text-xs font-bold text-[#47e6a1] uppercase tracking-wider mb-2">Requisitos</h4>
          {renderList(safeData.reqs, "O que o sistema deve ter? (Use 'deve', 'precisa')")}
        </div>

        {/* Restrições */}
        <div className="bg-[#0f1420] rounded-md p-3 border border-[#24304a]">
          <h4 className="text-xs font-bold text-[#ff5c7a] uppercase tracking-wider mb-2">Restrições</h4>
          {renderList(safeData.constraints, "O que é proibido? (Use 'não pode', 'sem')")}
        </div>
      </div>
    </div>
  );
};
EOF

# ==============================================================================
# 2. Atualizar App.tsx
# Mudança: Reintroduzir o botão "Anexar" no footer
# ==============================================================================
echo "🔄 Atualizando App.tsx com botão Anexar..."

cat > $UI_DIR/App.tsx <<EOF
import { useState, useEffect } from 'react';
import { DiscoveryNotes } from './components/DiscoveryNotes';
import { ExploreTimeline } from './components/ExploreTimeline';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { Button } from './components/Button';
import { ProjectWizard } from './components/wizard/ProjectWizard';
import { QuickStartGallery } from './components/wizard/QuickStartGallery';
import { SettingsModal } from './components/settings/SettingsModal';
import { HelpModal } from './components/help/HelpModal';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { api } from './services/api';
import { startOnboardingTour } from './services/tour';
import { parseDiscoveryMessage, DiscoveryData } from './utils/discoveryParser';

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
    intent: [],
    reqs: [],
    constraints: []
  });

  const [mode] = useState<'Explorando' | 'Executando'>('Explorando');

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('mini-ide-tour-seen');
    if (!hasSeenTour) {
      setTimeout(() => {
        if (!isQuickStartOpen) startOnboardingTour();
      }, 1500);
    }
  }, []);

  const handleExportZip = async () => {
    setIsExporting(true);
    showToast('Iniciando exportação...', 'info');
    try {
      const mockProjectData = {
        product: { userStories: [{ id: 'HU-TEST', description: 'Gerada via UI' }] },
        engine: { files: [{ path: 'README.md', content: '# Projeto Exportado via UI' }] }
      };
      await api.exportProjectZip(mockProjectData);
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
      const agentText = \`Análise concluída! (ID: \${response.requestId}).\nResumo: \${response.summary}\`;
      setChatHistory(prev => [...prev, { role: 'agent', text: agentText }]);
      showToast('Análise recebida do servidor!', 'success');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      setChatHistory(prev => [...prev, { role: 'agent', text: \`Erro: \${errMsg}\` }]);
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

  return (
    <div className="h-screen grid grid-rows-[56px_1fr_auto] bg-[#0f1420] text-[#e6ecff] font-sans overflow-hidden">
      <header className="flex items-center gap-3 px-4 bg-[#141b2b]/90 border-b border-[#24304a] shadow-lg z-10 backdrop-blur-sm">
        <div className="font-bold text-lg tracking-tight">Mini IDE</div>
        <span className="px-2.5 py-1 rounded-full bg-[#222b40] border border-[#24304a] text-[#9fb0d3] text-xs font-medium">Analysis Agent</span>
        <span className="px-2.5 py-1 rounded-full bg-[#47e6a1]/15 border border-[#47e6a1]/40 text-[#47e6a1] text-xs font-medium">{mode}</span>
        
        <div className="flex-1" />
        
        <div className="flex gap-2.5 items-center">
          <Button variant="ghost" onClick={() => setIsWizardOpen(true)}>Criar Projeto</Button>
          <Button id="btnQuickStart" variant="ghost" onClick={() => setIsQuickStartOpen(true)}>Quick Start</Button>
          <button 
            onClick={() => setIsHelpOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#222b40] border border-[#24304a] text-[#9fb0d3] hover:text-white hover:border-[#4ba3ff] transition-all font-bold"
            title="Manual do Usuário"
          >
            ?
          </button>
        </div>
      </header>

      <main className="grid grid-cols-[280px_1fr_360px] gap-3.5 p-3.5 overflow-hidden">
        <aside className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden">
          <div className="flex justify-between items-center">
            <strong className="text-sm">Projeto Atual</strong>
            <span className="text-[10px] bg-[#47e6a1]/15 text-[#47e6a1] px-2 py-0.5 rounded-full border border-[#47e6a1]/30">pronto</span>
          </div>
          <div className="flex-1 bg-[#101727] border border-[#24304a] rounded-lg p-2.5 overflow-auto font-mono text-sm text-[#9fb0d3]">
            <div className="pl-2 hover:text-white cursor-pointer">src/</div>
          </div>
        </aside>

        <section className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden relative">
          <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 overflow-auto bg-[#101727] border border-[#24304a] rounded-xl p-4 relative">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Bem-vindo à Mini IDE</h3>
                    <p className="text-[#9fb0d3] text-sm">Seu assistente de engenharia de software.</p>
                  </div>
                  <div className="mt-auto p-4 bg-[#141b2b] border border-[#24304a] rounded-lg">
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
                <div className="text-[#9fb0d3]">Artefatos prontos para download.</div>
                <Button id="btnExportZIP" onClick={handleExportZip} disabled={isExporting}>
                  {isExporting ? 'Gerando ZIP...' : 'Exportar Projeto (.zip)'}
                </Button>
              </div>
            )}
            {['hus', 'docs', 'tests'].includes(activeTab) && <div className="text-[#9fb0d3] text-center mt-10">Em breve.</div>}
          </div>
        </section>

        <aside className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-[#24304a]">
            <div className="flex gap-2">
              <span className="text-[10px] bg-[#222b40] px-2 py-0.5 rounded-full text-[#9fb0d3]">R$ 0,00</span>
            </div>
            <button 
              id="btnPreferences"
              onClick={() => setIsSettingsOpen(true)}
              className="text-xs bg-[#101727] hover:bg-[#222b40] border border-[#24304a] px-2 py-1 rounded-md transition-colors text-[#e6ecff]"
            >
              Preferências
            </button>
          </div>
          <div className="flex-1 bg-[#101727] border border-[#24304a] rounded-lg p-3 overflow-auto text-sm space-y-3">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={\`p-3 rounded-lg border \${msg.role === 'agent' ? 'bg-[#0f1420] border-[#24304a]/50' : 'bg-[#222b40] border-[#4ba3ff]/20'}\`}>
                <strong className={\`block text-xs mb-1 \${msg.role === 'agent' ? 'text-[#4ba3ff]' : 'text-[#47e6a1]'}\`}>
                  {msg.role === 'agent' ? 'Agente' : 'Você'}
                </strong>
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            ))}
            {isAnalyzing && <div className="text-xs text-[#9fb0d3] animate-pulse">Digitando...</div>}
          </div>
        </aside>
      </main>

      <footer className="px-4 py-3 bg-[#141b2b] border-t border-[#24304a] grid grid-cols-[1fr_auto] gap-3">
        <textarea 
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite em linguagem natural... (Ctrl+Enter para enviar)"
          className="w-full h-[60px] bg-[#101727] border border-[#24304a] rounded-lg px-3 py-2 text-sm text-[#e6ecff] focus:outline-none focus:border-[#4ba3ff] resize-none"
          disabled={isAnalyzing}
        />
        {/* RESTAURADO: Botão de Anexar */}
        <div className="flex items-end gap-2">
          <Button variant="ghost" onClick={handleAttach} title="Anexar Arquivo">📎</Button>
          <Button variant="primary" onClick={handleSendMessage} disabled={isAnalyzing || !chatInput.trim()}>
            {isAnalyzing ? '...' : 'Enviar'}
          </Button>
        </div>
      </footer>

      <ProjectWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      <QuickStartGallery 
        isOpen={isQuickStartOpen} 
        onClose={() => setIsQuickStartOpen(false)} 
        onSelectTemplate={handleTemplateSelect}
        onStartTour={handleStartTour}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <MainLayout />
    </ToastProvider>
  );
}

export default App;
EOF

# ==============================================================================
# 3. Validação
# ==============================================================================
echo "🛡️  Validando Build..."
pnpm --filter @mini-ide/ui build

echo "✅ UI Restaurada: Discovery Notes persistentes e Botão Anexar presente."
EOF

chmod +x scripts/150_fix_ui_regressions.sh
