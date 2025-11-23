#!/usr/bin/env bash
set -e

echo "🚀 [Phase 12] Implementando Galeria de Quick Start (Templates)..."

# ==============================================================================
# 1. Criar Componente QuickStartGallery
# ==============================================================================
mkdir -p packages/ui/src/components/wizard
echo "📝 Criando packages/ui/src/components/wizard/QuickStartGallery.tsx..."

cat > packages/ui/src/components/wizard/QuickStartGallery.tsx <<EOF
import React from 'react';
import { Button } from '../Button';

interface QuickStartGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (prompt: string) => void;
  onStartTour: () => void;
}

export const QuickStartGallery: React.FC<QuickStartGalleryProps> = ({ 
  isOpen, 
  onClose, 
  onSelectTemplate, 
  onStartTour 
}) => {
  if (!isOpen) return null;

  const templates = [
    {
      icon: '🌐',
      title: 'API REST Node.js',
      desc: 'Servidor Fastify com TypeScript, Swagger e testes.',
      prompt: 'Quero criar uma API REST usando Node.js, Fastify e TypeScript. Preciso de endpoints para usuários (CRUD), documentação com Swagger e testes unitários com Vitest.'
    },
    {
      icon: '⚛️',
      title: 'React Dashboard',
      desc: 'SPA moderna com Vite, Tailwind e gráficos.',
      prompt: 'Quero criar um Dashboard administrativo usando React, Vite e TailwindCSS. Preciso de uma sidebar responsiva, modo escuro e um gráfico de exemplo.'
    },
    {
      icon: '🐍',
      title: 'Script Python',
      desc: 'Automação de dados com Pandas.',
      prompt: 'Quero um script Python para ler um arquivo CSV, filtrar linhas com erros e gerar um relatório resumido em JSON.'
    },
    {
      icon: '🏗️',
      title: 'Microserviço Go',
      desc: 'API de alta performance com Docker.',
      prompt: 'Quero criar um microserviço em Go (Golang) que exponha uma rota de healthcheck e uma rota de processamento, incluindo Dockerfile otimizado.'
    }
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-2xl w-[700px] max-w-[95vw] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#24304a] flex justify-between items-center bg-[#101727] rounded-t-xl">
          <div>
            <h2 className="text-[#e6ecff] font-bold text-xl">Como você quer começar?</h2>
            <p className="text-[#9fb0d3] text-sm mt-1">Escolha um ponto de partida ou faça um tour.</p>
          </div>
          <button onClick={onClose} className="text-[#9fb0d3] hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          
          {/* Tour Banner */}
          <div className="bg-gradient-to-r from-[#4ba3ff]/10 to-[#4ba3ff]/5 border border-[#4ba3ff]/20 rounded-lg p-4 flex items-center justify-between mb-8">
            <div className="flex gap-3 items-center">
              <div className="bg-[#4ba3ff]/20 p-2 rounded-full text-xl">🎓</div>
              <div>
                <h3 className="text-[#e6ecff] font-semibold">Novo na Mini-IDE?</h3>
                <p className="text-[#9fb0d3] text-xs">Faça um tour guiado para conhecer as ferramentas.</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { onClose(); onStartTour(); }}>
              Iniciar Tour
            </Button>
          </div>

          {/* Templates Grid */}
          <h3 className="text-[#e6ecff] font-medium mb-4 text-sm uppercase tracking-wider opacity-80">Templates Populares</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t, idx) => (
              <button 
                key={idx}
                onClick={() => { onSelectTemplate(t.prompt); onClose(); }}
                className="flex flex-col items-start p-4 bg-[#0f1420] border border-[#24304a] rounded-lg hover:border-[#4ba3ff] hover:bg-[#1a2335] transition-all text-left group"
              >
                <div className="flex justify-between w-full mb-2">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{t.icon}</span>
                  <span className="text-[#4ba3ff] opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">Usar →</span>
                </div>
                <strong className="text-[#e6ecff] font-medium mb-1">{t.title}</strong>
                <p className="text-[#9fb0d3] text-xs leading-relaxed">{t.desc}</p>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
EOF

# ==============================================================================
# 2. Atualizar App.tsx
# Integrar a nova Galeria e remover o link direto do Wizard
# ==============================================================================
echo "🔄 Atualizando packages/ui/src/App.tsx..."

cat > packages/ui/src/App.tsx <<EOF
import { useState } from 'react';
import { DiscoveryNotes } from './components/DiscoveryNotes';
import { ExploreTimeline } from './components/ExploreTimeline';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { Button } from './components/Button';
import { ProjectWizard } from './components/wizard/ProjectWizard';
import { QuickStartGallery } from './components/wizard/QuickStartGallery';
import { SettingsModal } from './components/settings/SettingsModal';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { api } from './services/api';

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

  // --- Handlers ---

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

  // HU-UI-QuickStart-Revamp-020: Preencher chat com template
  const handleTemplateSelect = (prompt: string) => {
    setChatInput(prompt);
    // Opcional: focar no input
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.focus();
  };

  const handleStartTour = () => {
    showToast('Tour guiado será implementado na Sprint 12.3!', 'info');
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
          {/* HU-UI-QuickStart-Revamp-020: Agora abre a Galeria */}
          <Button variant="ghost" onClick={() => setIsQuickStartOpen(true)}>Quick Start</Button>
        </div>
      </header>

      {/* Main Layout */}
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
                <Button onClick={handleExportZip} disabled={isExporting}>
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
            <button onClick={() => setIsSettingsOpen(true)} className="text-xs bg-[#101727] hover:bg-[#222b40] border border-[#24304a] px-2 py-1 rounded-md transition-colors text-[#e6ecff]">
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

      {/* Modais */}
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
# 3. Validação
# ==============================================================================
echo "🛡️  Validando UI..."
pnpm --filter @mini-ide/ui lint
pnpm --filter @mini-ide/ui build

echo "✅ Galeria de Quick Start implementada!"
EOF

chmod +x scripts/142_implement_quick_start_gallery.sh
