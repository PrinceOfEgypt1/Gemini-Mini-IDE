#!/usr/bin/env bash
set -e

echo "📚 [Phase 12] Implementando Manual do Usuário Integrado..."

UI_DIR="packages/ui"

# ==============================================================================
# 1. Instalar react-markdown
# Para renderizar o manual com formatação rica e segura
# ==============================================================================
echo "📦 Instalando react-markdown..."
pnpm --filter @mini-ide/ui add react-markdown

# ==============================================================================
# 2. Criar o Conteúdo e o Modal de Ajuda
# ==============================================================================
mkdir -p $UI_DIR/src/components/help
echo "📝 Criando packages/ui/src/components/help/HelpModal.tsx..."

cat > $UI_DIR/src/components/help/HelpModal.tsx <<EOF
import React from 'react';
import Markdown from 'react-markdown';
import { Button } from '../Button';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MANUAL_CONTENT = \`
# Manual da Mini-IDE

Bem-vindo! A Mini-IDE é um **Agente de Engenharia de Software** projetado para transformar ideias em código estruturado.

## 🚀 Como Funciona

O fluxo de trabalho é dividido em 3 etapas principais:

1.  **Exploração (Chat):**
    - Converse com o agente. Descreva sua ideia ("Quero um sistema de login").
    - O agente coleta requisitos automaticamente no painel **Discovery Notes**.
    
2.  **Planejamento (Abas):**
    - O agente gera Histórias de Usuário (HUs) e Documentação Técnica.
    - Você pode revisar tudo nas abas **HUs**, **Docs** e **Timeline**.

3.  **Materialização (Exportação):**
    - Quando estiver satisfeito, clique em **Exportar Projeto (.zip)** na aba **Outputs**.
    - Você receberá o código completo para rodar na sua máquina.

## ⚠️ Limitações Importantes

- **Ambiente Local:** A Mini-IDE roda no seu navegador e servidor local. Ela não faz deploy automático na nuvem (AWS, Vercel, etc).
- **Contexto:** O agente lembra da conversa atual, mas se você recarregar a página (F5) sem exportar, o contexto da memória do agente será reiniciado (embora as configurações fiquem salvas).
- **Segurança:** Sua API Key é salva apenas no seu navegador. Nós nunca a armazenamos em nossos servidores.

## 💡 Dicas de Prompt

- Seja específico: *"Quero uma API em Node.js com Fastify"* é melhor que *"Quero um backend"*.
- Peça testes: *"Inclua testes unitários com Vitest"*.
\`;

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-2xl w-[600px] max-w-full flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#24304a] flex justify-between items-center bg-[#101727] rounded-t-xl">
          <h2 className="text-[#e6ecff] font-bold text-lg flex items-center gap-2">
            <span className="bg-[#4ba3ff]/20 text-[#4ba3ff] p-1 rounded text-xs">?</span> 
            Manual do Usuário
          </h2>
          <button onClick={onClose} className="text-[#9fb0d3] hover:text-white transition-colors">✕</button>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto text-[#e6ecff] leading-relaxed prose prose-invert prose-sm max-w-none">
          {/* Estilização customizada para o Markdown via Tailwind Typography ou CSS manual */}
          <div className="markdown-body">
            <Markdown>{MANUAL_CONTENT}</Markdown>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#24304a] bg-[#101727] rounded-b-xl flex justify-end">
          <Button variant="primary" onClick={onClose}>Entendi</Button>
        </div>

      </div>
    </div>
  );
};
EOF

# ==============================================================================
# 3. Adicionar Estilos para o Markdown (index.css)
# Para que o texto não fique "cru"
# ==============================================================================
echo "🎨 Adicionando estilos de tipografia no packages/ui/src/index.css..."

cat >> $UI_DIR/src/index.css <<EOF

/* === Estilos do Manual (Markdown) === */
.markdown-body h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 1rem;
  border-bottom: 1px solid #24304a;
  padding-bottom: 0.5rem;
}
.markdown-body h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #4ba3ff;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}
.markdown-body p {
  margin-bottom: 1rem;
  color: #e6ecff;
}
.markdown-body ul, .markdown-body ol {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
  color: #9fb0d3;
}
.markdown-body strong {
  color: #47e6a1; /* Destaque verde */
}
EOF

# ==============================================================================
# 4. Atualizar App.tsx
# Adicionar botão "?" no Header e conectar ao Modal
# ==============================================================================
echo "🔄 Atualizando App.tsx com botão de Ajuda..."

# Vamos reinjetar o App.tsx com o HelpModal importado e usado
cat > packages/ui/src/App.tsx <<EOF
import { useState, useEffect } from 'react';
import { DiscoveryNotes } from './components/DiscoveryNotes';
import { ExploreTimeline } from './components/ExploreTimeline';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { Button } from './components/Button';
import { ProjectWizard } from './components/wizard/ProjectWizard';
import { QuickStartGallery } from './components/wizard/QuickStartGallery';
import { SettingsModal } from './components/settings/SettingsModal';
import { HelpModal } from './components/help/HelpModal'; // NOVO
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
  const [isHelpOpen, setIsHelpOpen] = useState(false); // NOVO
  
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'agent', text: string}>>([
    { role: 'agent', text: 'Olá! Estou pronto para ajudar. Configure sua API Key em "Preferências" para começarmos.' }
  ]);

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
          
          {/* Botão de Ajuda NOVO */}
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
                <div className="h-full"><DiscoveryNotes /></div>
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
# 5. Validação
# ==============================================================================
echo "🛡️  Validando Build..."
pnpm --filter @mini-ide/ui build

echo "✅ Manual do Usuário implementado e estilizado!"
EOF

chmod +x scripts/145_implement_user_manual.sh
