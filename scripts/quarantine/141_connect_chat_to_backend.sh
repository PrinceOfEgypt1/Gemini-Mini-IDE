#!/usr/bin/env bash
set -e

echo "🔌 [Phase 12] Conectando Chat da UI ao Backend (/analyze)..."

# ==============================================================================
# 1. Atualizar App.tsx com lógica de envio real
# ==============================================================================
echo "📝 Atualizando packages/ui/src/App.tsx..."

cat > packages/ui/src/App.tsx <<EOF
import { useState } from 'react';
import { DiscoveryNotes } from './components/DiscoveryNotes';
import { ExploreTimeline } from './components/ExploreTimeline';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { Button } from './components/Button';
import { ProjectWizard } from './components/wizard/ProjectWizard';
import { SettingsModal } from './components/settings/SettingsModal';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { api } from './services/api';

// Componente interno para usar o hook useToast
const MainLayout = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Estado do Chat
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'agent', text: string}>>([
    { role: 'agent', text: 'Olá! Estou pronto para ajudar. Configure sua API Key em "Preferências" para começarmos.' }
  ]);

  const [mode] = useState<'Explorando' | 'Executando'>('Explorando');

  // Lógica de Exportação
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

  // Lógica de Análise (Chat)
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput(''); // Limpa input
    
    // 1. Adiciona mensagem do usuário na tela
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAnalyzing(true);

    try {
      // 2. Chama o Backend real
      const response = await api.analyze(userMsg);
      
      // 3. Adiciona resposta do agente na tela
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
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSendMessage();
    }
  };

  return (
    <div className="h-screen grid grid-rows-[56px_1fr_auto] bg-[#0f1420] text-[#e6ecff] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 bg-[#141b2b]/90 border-b border-[#24304a] shadow-lg z-10 backdrop-blur-sm">
        <div className="font-bold text-lg tracking-tight">Mini IDE</div>
        <span className="px-2.5 py-1 rounded-full bg-[#222b40] border border-[#24304a] text-[#9fb0d3] text-xs font-medium">
          Analysis Agent
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[#47e6a1]/15 border border-[#47e6a1]/40 text-[#47e6a1] text-xs font-medium">
          {mode}
        </span>
        <div className="flex-1" />
        <div className="flex gap-2.5">
          <Button variant="ghost" onClick={() => { /* TODO */ }}>Provisionar</Button>
          <Button variant="primary" onClick={() => { /* TODO */ }}>Executar</Button>
          <Button variant="ghost" onClick={() => setIsWizardOpen(true)}>Quick Start</Button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="grid grid-cols-[280px_1fr_360px] gap-3.5 p-3.5 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden">
          <div className="flex justify-between items-center">
            <strong className="text-sm">Projeto Atual</strong>
            <span className="text-[10px] bg-[#47e6a1]/15 text-[#47e6a1] px-2 py-0.5 rounded-full border border-[#47e6a1]/30">pronto</span>
          </div>
          <div className="flex-1 bg-[#101727] border border-[#24304a] rounded-lg p-2.5 overflow-auto font-mono text-sm text-[#9fb0d3]">
            <div className="pl-2 hover:text-white cursor-pointer">src/</div>
          </div>
        </aside>

        {/* Workspace */}
        <section className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden relative">
          <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 overflow-auto bg-[#101727] border border-[#24304a] rounded-xl p-4 relative">
            {activeTab === 'overview' && <DiscoveryNotes />}
            {activeTab === 'timeline' && <ExploreTimeline />}
            {activeTab === 'outputs' && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-[#9fb0d3]">Artefatos prontos para download.</div>
                <Button onClick={handleExportZip} disabled={isExporting}>
                  {isExporting ? 'Gerando ZIP...' : 'Exportar Projeto (.zip)'}
                </Button>
              </div>
            )}
            {['hus', 'docs', 'tests'].includes(activeTab) && <div className="text-[#9fb0d3] text-center mt-10">Em breve.</div>}
          </div>
        </section>

        {/* Right Panel (Chat Log) */}
        <aside className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-[#24304a]">
            <div className="flex gap-2">
              <span className="text-[10px] bg-[#222b40] px-2 py-0.5 rounded-full text-[#9fb0d3]">R$ 0,00</span>
            </div>
            <button onClick={() => setIsSettingsOpen(true)} className="text-xs bg-[#101727] hover:bg-[#222b40] border border-[#24304a] px-2 py-1 rounded-md transition-colors text-[#e6ecff]">
              Preferências
            </button>
          </div>
          
          {/* Histórico do Chat */}
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

      {/* Footer / Input Area */}
      <footer className="px-4 py-3 bg-[#141b2b] border-t border-[#24304a] grid grid-cols-[1fr_auto] gap-3">
        <textarea 
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite em linguagem natural... (Ctrl+Enter para enviar)"
          className="w-full h-[60px] bg-[#101727] border border-[#24304a] rounded-lg px-3 py-2 text-sm text-[#e6ecff] focus:outline-none focus:border-[#4ba3ff] resize-none"
          disabled={isAnalyzing}
        />
        <div className="flex items-end">
          <Button variant="primary" onClick={handleSendMessage} disabled={isAnalyzing || !chatInput.trim()}>
            {isAnalyzing ? '...' : 'Enviar'}
          </Button>
        </div>
      </footer>

      <ProjectWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
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

echo "✅ Chat conectado ao backend!"
