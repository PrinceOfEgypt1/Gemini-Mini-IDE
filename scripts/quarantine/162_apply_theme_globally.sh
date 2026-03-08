#!/usr/bin/env bash
set -e

echo "🎨 [Phase 13] Aplicando Tema Global (Substituindo cores hardcoded por variáveis)..."

UI_DIR="packages/ui/src"

# ==============================================================================
# 1. Atualizar App.tsx (Layout Principal)
# Substitui #0f1420, #141b2b, etc. por var(--bg-app), var(--bg-panel)
# ==============================================================================
echo "📝 Atualizando $UI_DIR/App.tsx..."

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
import { ThemeProvider } from './contexts/ThemeContext'; // Importante
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
    intent: [], reqs: [], constraints: []
  });

  const [mode] = useState<'Explorando' | 'Executando'>('Explorando');

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('mini-ide-tour-seen');
    if (!hasSeenTour) {
      setTimeout(() => { if (!isQuickStartOpen) startOnboardingTour(); }, 1500);
    }
  }, []);

  const handleExportZip = async () => {
    setIsExporting(true);
    showToast('Iniciando exportação...', 'info');
    try {
      const mockProjectData = { product: {}, engine: {} };
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
    <div className="h-screen grid grid-rows-[56px_1fr_auto] bg-[var(--bg-app)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-300">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 bg-[var(--bg-panel)]/90 border-b border-[var(--border-main)] shadow-sm z-10 backdrop-blur-sm transition-colors duration-300">
        <div className="font-bold text-lg tracking-tight text-[var(--text-primary)]">Mini IDE</div>
        <span className="px-2.5 py-1 rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] text-[var(--text-secondary)] text-xs font-medium">Analysis Agent</span>
        <span className="px-2.5 py-1 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/40 text-[var(--success)] text-xs font-medium">{mode}</span>
        
        <div className="flex-1" />
        
        <div className="flex gap-2.5 items-center">
          <Button variant="ghost" onClick={() => setIsWizardOpen(true)}>Criar Projeto</Button>
          <Button id="btnQuickStart" variant="ghost" onClick={() => setIsQuickStartOpen(true)}>Quick Start</Button>
          <button 
            id="btnPreferences"
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)] transition-all font-bold"
            title="Preferências"
          >
            ⚙️
          </button>
          <button 
             onClick={() => setIsHelpOpen(true)}
             className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)] transition-all font-bold"
             title="Ajuda"
          >
            ?
          </button>
        </div>
      </header>

      <main className="grid grid-cols-[280px_1fr_360px] gap-3.5 p-3.5 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden transition-colors duration-300">
          <div className="flex justify-between items-center">
            <strong className="text-sm text-[var(--text-primary)]">Projeto Atual</strong>
            <span className="text-[10px] bg-[var(--success)]/10 text-[var(--success)] px-2 py-0.5 rounded-full border border-[var(--success)]/30">pronto</span>
          </div>
          <div className="flex-1 bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg p-2.5 overflow-auto font-mono text-sm text-[var(--text-secondary)]">
            <div className="pl-2 hover:text-[var(--text-primary)] cursor-pointer">src/</div>
          </div>
        </aside>

        {/* Workspace */}
        <section className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden relative transition-colors duration-300">
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
                <Button id="btnExportZIP" onClick={handleExportZip} disabled={isExporting}>
                  {isExporting ? 'Gerando ZIP...' : 'Exportar Projeto (.zip)'}
                </Button>
              </div>
            )}
            {['hus', 'docs', 'tests'].includes(activeTab) && <div className="text-[var(--text-muted)] text-center mt-10">Em breve.</div>}
          </div>
        </section>

        {/* Chat Sidebar */}
        <aside className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden transition-colors duration-300">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--border-main)]">
            <div className="flex gap-2">
              <span className="text-[10px] bg-[var(--bg-panel-hover)] px-2 py-0.5 rounded-full text-[var(--text-muted)]">~ ms</span>
              <span className="text-[10px] bg-[var(--bg-panel-hover)] px-2 py-0.5 rounded-full text-[var(--text-muted)]">R$ 0,00</span>
            </div>
          </div>
          <div className="flex-1 bg-[var(--bg-app)] border border-[var(--border-main)] rounded-lg p-3 overflow-auto text-sm space-y-3">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={\`p-3 rounded-lg border \${
                msg.role === 'agent' 
                  ? 'bg-[var(--bg-panel)] border-[var(--border-main)]' 
                  : 'bg-[var(--bg-panel-hover)] border-[var(--brand-primary)]/30'
              }\`}>
                <strong className={\`block text-xs mb-1 \${msg.role === 'agent' ? 'text-[var(--brand-primary)]' : 'text-[var(--success)]'}\`}>
                  {msg.role === 'agent' ? 'Agente' : 'Você'}
                </strong>
                <div className="whitespace-pre-wrap text-[var(--text-primary)]">{msg.text}</div>
              </div>
            ))}
            {isAnalyzing && <div className="text-xs text-[var(--text-muted)] animate-pulse">Digitando...</div>}
          </div>
        </aside>
      </main>

      {/* Footer */}
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

      {/* Modais */}
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
    <ThemeProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
EOF

# ==============================================================================
# 2. Atualizar DiscoveryNotes.tsx (Componente Interno)
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
  const safeData = data || { intent: [], reqs: [], constraints: [] };

  const renderList = (items: string[], emptyText: string) => {
    if (items.length === 0) {
      return <p className="text-xs text-[var(--text-muted)] italic opacity-50 py-1">{emptyText}</p>;
    }
    return (
      <ul className="list-disc list-inside text-sm text-[var(--text-primary)] space-y-1">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
  };

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-lg p-4 h-full overflow-y-auto transition-colors duration-300">
      <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <span>🧭</span> Discovery Notes
      </h3>
      
      <div className="space-y-4">
        {/* Intenção */}
        <div className="bg-[var(--bg-app)] rounded-md p-3 border border-[var(--border-main)]">
          <h4 className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-2">Intenção</h4>
          {renderList(safeData.intent, "O que você quer construir?")}
        </div>

        {/* Requisitos */}
        <div className="bg-[var(--bg-app)] rounded-md p-3 border border-[var(--border-main)]">
          <h4 className="text-xs font-bold text-[var(--success)] uppercase tracking-wider mb-2">Requisitos</h4>
          {renderList(safeData.reqs, "O que o sistema deve ter? (Use 'deve', 'precisa')")}
        </div>

        {/* Restrições */}
        <div className="bg-[var(--bg-app)] rounded-md p-3 border border-[var(--border-main)]">
          <h4 className="text-xs font-bold text-[var(--danger)] uppercase tracking-wider mb-2">Restrições</h4>
          {renderList(safeData.constraints, "O que é proibido? (Use 'não pode', 'sem')")}
        </div>
      </div>
    </div>
  );
};
EOF

# ==============================================================================
# 3. Atualizar WorkspaceTabs.tsx (Aba Ativa)
# ==============================================================================
echo "📝 Atualizando $UI_DIR/components/WorkspaceTabs.tsx..."

cat > $UI_DIR/components/WorkspaceTabs.tsx <<EOF
import React from 'react';

interface WorkspaceTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'hus', label: 'HUs' },
    { id: 'docs', label: 'Docs' },
    { id: 'tests', label: 'Tests' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'outputs', label: 'Outputs' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[var(--border-main)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={\`px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap \${
            activeTab === tab.id
              ? 'bg-[var(--brand-primary)] text-white shadow-sm'
              : 'bg-[var(--bg-panel-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-main)]'
          }\`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
EOF

# ==============================================================================
# 4. Atualizar Button.tsx
# ==============================================================================
echo "📝 Atualizando $UI_DIR/components/Button.tsx..."

cat > $UI_DIR/components/Button.tsx <<EOF
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-primary)] disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-hover)] shadow-sm",
    secondary: "bg-[var(--bg-panel-hover)] text-[var(--text-primary)] border border-[var(--border-main)] hover:bg-[var(--bg-app)]",
    ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      className={\`\${baseStyles} \${variants[variant]} \${sizes[size]} \${className}\`}
      {...props}
    >
      {children}
    </button>
  );
};
EOF

# ==============================================================================
# 5. Validação
# ==============================================================================
echo "🛡️  Validando UI Global..."
pnpm --filter @mini-ide/ui lint
pnpm --filter @mini-ide/ui build

echo "✅ Tema aplicado globalmente! Teste o botão Claro/Escuro agora."
