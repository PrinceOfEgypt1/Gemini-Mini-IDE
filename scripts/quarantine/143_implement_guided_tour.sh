#!/usr/bin/env bash
set -e

echo "🎓 [Phase 12] Implementando Tour Guiado (Driver.js)..."

UI_DIR="packages/ui"

# ==============================================================================
# 1. Instalar driver.js
# Biblioteca leve para highlights na tela
# ==============================================================================
echo "📦 Instalando driver.js no pacote UI..."
pnpm --filter @mini-ide/ui add driver.js

# ==============================================================================
# 2. Criar Serviço de Tour
# Centraliza a configuração dos passos e textos
# ==============================================================================
mkdir -p $UI_DIR/src/services
echo "📝 Criando packages/ui/src/services/tour.ts..."

cat > $UI_DIR/src/services/tour.ts <<EOF
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startOnboardingTour = () => {
  const tourDriver = driver({
    showProgress: true,
    animate: true,
    nextBtnText: 'Próximo →',
    prevBtnText: '← Anterior',
    doneBtnText: 'Concluir',
    steps: [
      { 
        element: '#btnQuickStart', 
        popover: { 
          title: 'Comece por aqui', 
          description: 'Use o Quick Start para acessar templates prontos ou rever este tour a qualquer momento.', 
          side: 'bottom', 
          align: 'end' 
        } 
      },
      { 
        element: 'footer textarea', 
        popover: { 
          title: 'Descreva sua ideia', 
          description: 'Digite o que você quer criar em linguagem natural. O Agente vai analisar e propor um plano.', 
          side: 'top', 
          align: 'start' 
        } 
      },
      { 
        element: '.tabs', // Classe do container de abas
        popover: { 
          title: 'Acompanhe o progresso', 
          description: 'Navegue pelas abas para ver as Histórias de Usuário, Documentação e o Código gerado.', 
          side: 'bottom', 
          align: 'start' 
        } 
      },
      { 
        element: 'aside button:has(text="Preferências")', // Seletor mais específico se possível, ou usar ID
        popover: { 
          title: 'Configure sua IA', 
          description: 'Não esqueça de configurar sua API Key (DeepSeek/OpenAI) nas Preferências antes de começar.', 
          side: 'left', 
          align: 'start' 
        } 
      },
      { 
        element: '#btnExportZIP', // Botão de exportar na aba Outputs (precisa estar visível ou o driver pula)
        popover: { 
          title: 'Exporte o resultado', 
          description: 'Ao final, baixe todo o projeto gerado em um arquivo .zip pronto para uso.', 
          side: 'top', 
          align: 'end' 
        } 
      }
    ],
    onDestroyStarted: () => {
      // Opcional: Salvar no localStorage que o usuário já viu o tour
      localStorage.setItem('mini-ide-tour-seen', 'true');
      // Força a destruição para evitar artefatos visuais
      tourDriver.destroy();
    },
  });

  tourDriver.drive();
};
EOF

# ==============================================================================
# 3. Atualizar App.tsx para usar o Tour
# Adicionamos IDs nos elementos para facilitar o Driver.js e conectamos a função
# ==============================================================================
echo "🔄 Atualizando packages/ui/src/App.tsx com IDs e chamada do Tour..."

cat > packages/ui/src/App.tsx <<EOF
import { useState, useEffect } from 'react';
import { DiscoveryNotes } from './components/DiscoveryNotes';
import { ExploreTimeline } from './components/ExploreTimeline';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { Button } from './components/Button';
import { ProjectWizard } from './components/wizard/ProjectWizard';
import { QuickStartGallery } from './components/wizard/QuickStartGallery';
import { SettingsModal } from './components/settings/SettingsModal';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { api } from './services/api';
import { startOnboardingTour } from './services/tour';

const MainLayout = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modais
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQuickStartOpen, setIsQuickStartOpen] = useState(false);
  
  // Estados de Processamento
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Chat
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'agent', text: string}>>([
    { role: 'agent', text: 'Olá! Estou pronto para ajudar. Configure sua API Key em "Preferências" para começarmos.' }
  ]);

  const [mode] = useState<'Explorando' | 'Executando'>('Explorando');

  // Verificar se é a primeira vez do usuário (Auto-start tour)
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('mini-ide-tour-seen');
    if (!hasSeenTour) {
      // Pequeno delay para garantir que a UI carregou
      setTimeout(() => {
        // Opcional: Perguntar antes ou iniciar direto. Vamos iniciar direto para engajamento.
        // Mas só se não houver modais abertos.
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

  // Implementação da HU-UI-Explore-Tour-019
  const handleStartTour = () => {
    // Fecha a galeria se estiver aberta para o tour rodar na tela principal
    setIsQuickStartOpen(false);
    setTimeout(() => startOnboardingTour(), 300);
  };

  return (
    <div className="h-screen grid grid-rows-[56px_1fr_auto] bg-[#0f1420] text-[#e6ecff] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 bg-[#141b2b]/90 border-b border-[#24304a] shadow-lg z-10 backdrop-blur-sm">
        <div className="font-bold text-lg tracking-tight">Mini IDE</div>
        <span className="px-2.5 py-1 rounded-full bg-[#222b40] border border-[#24304a] text-[#9fb0d3] text-xs font-medium">Analysis Agent</span>
        <span className="px-2.5 py-1 rounded-full bg-[#47e6a1]/15 border border-[#47e6a1]/40 text-[#47e6a1] text-xs font-medium">{mode}</span>
        
        <div className="flex-1" />
        
        <div className="flex gap-2.5">
          <Button variant="ghost" onClick={() => setIsWizardOpen(true)}>Criar Projeto</Button>
          {/* ID adicionado para o Tour */}
          <Button id="btnQuickStart" variant="ghost" onClick={() => setIsQuickStartOpen(true)}>Quick Start</Button>
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
                <div className="h-full"><DiscoveryNotes /></div>
              </div>
            )}
            {activeTab === 'timeline' && <ExploreTimeline />}
            {activeTab === 'outputs' && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-[#9fb0d3]">Artefatos prontos para download.</div>
                {/* ID adicionado para o Tour */}
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
            {/* ID adicionado para o Tour. Nota: O driver.js usa seletores CSS, então precisamos garantir que seja unico */}
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
        <div className="flex items-end">
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
# 4. Validação
# ==============================================================================
echo "🛡️  Validando Build..."
pnpm --filter @mini-ide/ui build

echo "✅ Tour Guiado implementado com sucesso!"
EOF

chmod +x scripts/143_implement_guided_tour.sh
