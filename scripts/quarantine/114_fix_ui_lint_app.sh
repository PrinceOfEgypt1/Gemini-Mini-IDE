#!/usr/bin/env bash
set -e

echo "🚑 [Phase 11] Corrigindo violações de Lint na UI (App.tsx)..."

# ==============================================================================
# 1. Reescrever App.tsx sem console.log
# Substituímos os logs por comentários de TODO
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
            <Button variant="ghost" onClick={() => { /* TODO: Implementar Provisionar */ }}>Provisionar</Button>
            <Button variant="primary" onClick={() => { /* TODO: Implementar Executar */ }}>Executar</Button>
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
# 2. Validação
# ==============================================================================
echo "🛡️  Validando Correção do Lint..."

pnpm --filter @mini-ide/ui lint

if [ $? -eq 0 ]; then
    echo "✅ Lint passou! App.tsx corrigido."
else
    echo "❌ Lint ainda falhando. Verifique o código."
    exit 1
fi
EOF

chmod +x scripts/114_fix_ui_lint_app.sh
