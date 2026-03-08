#!/usr/bin/env bash
set -euo pipefail

echo "🏗️ [Phase 11] Implementando Modal de Configurações (UI)..."

# ==============================================================================
# 1. Criar Diretório de Componentes de Configuração
# ==============================================================================
mkdir -p packages/ui/src/components/settings

# ==============================================================================
# 2. Criar o Componente SettingsModal
# Interface visual para input da API Key com validação básica
# ==============================================================================
echo "📝 Criando packages/ui/src/components/settings/SettingsModal.tsx..."

cat > packages/ui/src/components/settings/SettingsModal.tsx <<EOF
import React, { useState, useEffect } from 'react';
import { Button } from '../Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [isVisible, setIsVisible] = useState(false);

  // Carregar configurações salvas ao abrir
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('mini-ide-api-key') || '';
      const savedModel = localStorage.getItem('mini-ide-model') || 'deepseek-chat';
      setApiKey(savedKey);
      setModel(savedModel);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('mini-ide-api-key', apiKey);
    localStorage.setItem('mini-ide-model', model);
    // Dispara evento customizado para notificar outros componentes se necessário
    window.dispatchEvent(new Event('settings-updated'));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-2xl w-[500px] max-w-[95vw] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#24304a] flex justify-between items-center bg-[#101727]">
          <h3 className="text-[#e6ecff] font-semibold text-lg">Configurações & Preferências</h3>
          <button 
            onClick={onClose}
            className="text-[#9fb0d3] hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6">
          
          {/* API Key Section */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#e6ecff]">
              API Key (DeepSeek / OpenAI)
            </label>
            <div className="relative">
              <input
                type={isVisible ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[#0f1420] border border-[#24304a] rounded-lg px-4 py-2 text-[#e6ecff] focus:outline-none focus:border-[#4ba3ff] transition-colors font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9fb0d3] hover:text-white"
              >
                {isVisible ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <p className="text-xs text-[#9fb0d3]">
              Sua chave é salva apenas no navegador (localStorage) e enviada diretamente ao agente.
            </p>
          </div>

          {/* Model Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#e6ecff]">
              Modelo LLM
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#0f1420] border border-[#24304a] rounded-lg px-4 py-2 text-[#e6ecff] focus:outline-none focus:border-[#4ba3ff] transition-colors appearance-none"
            >
              <option value="deepseek-chat">DeepSeek-V3 (Recomendado)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>

          <div className="h-px bg-[#24304a]"></div>

          {/* Preferences */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#e6ecff]">Modo Escuro</span>
            <span className="text-xs text-[#47e6a1] bg-[#47e6a1]/10 px-2 py-1 rounded-full border border-[#47e6a1]/30">
              Ativado (Padrão)
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#101727] border-t border-[#24304a] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Salvar Alterações
          </Button>
        </div>

      </div>
    </div>
  );
};
EOF

# ==============================================================================
# 3. Atualizar App.tsx para integrar o Modal
# Adicionamos o estado 'isSettingsOpen' e conectamos ao botão de preferências
# ==============================================================================
echo "🔄 Atualizando packages/ui/src/App.tsx..."

cat > packages/ui/src/App.tsx <<EOF
import { useState } from 'react';
import { DiscoveryNotes } from './components/DiscoveryNotes';
import { ExploreTimeline } from './components/ExploreTimeline';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { Button } from './components/Button';
import { ProjectWizard } from './components/wizard/ProjectWizard';
import { SettingsModal } from './components/settings/SettingsModal';
import { ToastProvider } from './contexts/ToastContext';

function App() {
  // Estados globais da UI
  const [activeTab, setActiveTab] = useState('overview');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Estado simulado do "Modo"
  const [mode] = useState<'Explorando' | 'Executando'>('Explorando');

  return (
    <ToastProvider>
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
            <Button variant="ghost" onClick={() => console.log('Provisionar')}>Provisionar</Button>
            <Button variant="primary" onClick={() => console.log('Executar')}>Executar</Button>
            <Button variant="ghost" onClick={() => setIsWizardOpen(true)}>Quick Start</Button>
          </div>
        </header>

        {/* Main Layout (3 colunas) */}
        <main className="grid grid-cols-[280px_1fr_360px] gap-3.5 p-3.5 overflow-hidden">
          
          {/* Coluna Esquerda: Navegação/Contexto */}
          <aside className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden">
            <div className="flex justify-between items-center">
              <strong className="text-sm">Projeto Atual</strong>
              <span className="text-[10px] bg-[#47e6a1]/15 text-[#47e6a1] px-2 py-0.5 rounded-full border border-[#47e6a1]/30">
                pronto
              </span>
            </div>
            
            {/* File Tree Placeholder */}
            <div className="flex-1 bg-[#101727] border border-[#24304a] rounded-lg p-2.5 overflow-auto font-mono text-sm text-[#9fb0d3]">
              <div className="hover:text-white cursor-pointer">apps/</div>
              <div className="pl-2 hover:text-white cursor-pointer">agent-dashboard/</div>
              <div className="pl-4 hover:text-white cursor-pointer">src/</div>
              <div className="hover:text-white cursor-pointer mt-1">packages/</div>
              <div className="pl-2 hover:text-white cursor-pointer">engine/</div>
              <div className="pl-2 hover:text-white cursor-pointer">analysis-agent/</div>
              <div className="hover:text-white cursor-pointer mt-1">docs/</div>
              <div className="pl-2 hover:text-white cursor-pointer">HUs/</div>
            </div>

            <div className="flex flex-wrap gap-2 text-[10px] text-[#9fb0d3]">
              <span className="bg-[#222b40] border border-[#24304a] px-2 py-1 rounded-full">
                path: ~/workspace
              </span>
              <span className="bg-[#47e6a1]/10 border border-[#47e6a1]/30 text-[#47e6a1] px-2 py-1 rounded-full">
                env: ok
              </span>
            </div>
          </aside>

          {/* Coluna Central: Workspace (Abas) */}
          <section className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden relative">
            <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
            
            {/* Área de Conteúdo Dinâmico */}
            <div className="flex-1 overflow-auto bg-[#101727] border border-[#24304a] rounded-xl p-4 relative">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Bem-vindo à Mini IDE</h3>
                      <ul className="list-disc list-inside text-[#9fb0d3] text-sm space-y-1">
                        <li>Orquestração de 8 personas em uma chamada.</li>
                        <li>Geração de HUs, código e testes.</li>
                        <li>Consolidação de artefatos prontos para uso.</li>
                      </ul>
                    </div>
                    <div className="mt-auto p-4 bg-[#141b2b] border border-[#24304a] rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Ações Rápidas</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsWizardOpen(true)}>Criar Projeto</Button>
                        <Button variant="ghost" size="sm">Gerar Plano</Button>
                      </div>
                    </div>
                  </div>
                  <div className="h-full">
                    <DiscoveryNotes />
                  </div>
                </div>
              )}
              
              {activeTab === 'timeline' && <ExploreTimeline />}
              
              {/* Placeholders para outras abas */}
              {activeTab === 'hus' && <div className="text-[#9fb0d3] text-center mt-10">Histórias de Usuário aparecerão aqui.</div>}
              {activeTab === 'docs' && <div className="text-[#9fb0d3] text-center mt-10">Documentação técnica será gerada aqui.</div>}
              {activeTab === 'outputs' && <div className="text-[#9fb0d3] text-center mt-10">Artefatos finais (.zip) para download.</div>}
            </div>
          </section>

          {/* Coluna Direita: Chat + Config */}
          <aside className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b border-[#24304a]">
              <div className="flex gap-2">
                <span className="text-[10px] bg-[#222b40] px-2 py-0.5 rounded-full text-[#9fb0d3]">~ ms</span>
                <span className="text-[10px] bg-[#222b40] px-2 py-0.5 rounded-full text-[#9fb0d3]">R$ 0,00</span>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-xs bg-[#101727] hover:bg-[#222b40] border border-[#24304a] px-2 py-1 rounded-md transition-colors text-[#e6ecff]"
              >
                Preferências
              </button>
            </div>

            {/* Chat Log Area */}
            <div className="flex-1 bg-[#101727] border border-[#24304a] rounded-lg p-3 overflow-auto text-sm space-y-3">
              <div className="bg-[#0f1420] p-3 rounded-lg border border-[#24304a]/50">
                <strong className="block text-[#4ba3ff] text-xs mb-1">Agente</strong>
                Olá! Estou pronto para ajudar. Configure sua API Key em "Preferências" para começarmos.
              </div>
            </div>
          </aside>

        </main>

        {/* Footer / Input Area */}
        <footer className="px-4 py-3 bg-[#141b2b] border-t border-[#24304a] grid grid-cols-[1fr_auto] gap-3">
          <textarea 
            placeholder="Digite em linguagem natural... (Ctrl+Enter para enviar)"
            className="w-full h-[60px] bg-[#101727] border border-[#24304a] rounded-lg px-3 py-2 text-sm text-[#e6ecff] focus:outline-none focus:border-[#4ba3ff] resize-none"
          />
          <div className="flex items-end">
            <Button variant="primary">Enviar</Button>
          </div>
        </footer>

        {/* Modais */}
        <ProjectWizard isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      </div>
    </ToastProvider>
  );
}

export default App;
EOF

# ==============================================================================
# 4. Validação do Frontend
# ==============================================================================
echo "🛡️  Validando UI (Lint/Build)..."

echo "   > Lint UI..."
pnpm --filter @mini-ide/ui lint

echo "   > Build UI..."
pnpm --filter @mini-ide/ui build

echo "✅ Sprint 11.2 Concluída: Interface de Settings integrada com sucesso."
EOF

chmod +x scripts/113_implement_ui_settings.sh
