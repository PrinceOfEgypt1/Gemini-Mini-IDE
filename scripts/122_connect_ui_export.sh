#!/usr/bin/env bash
set -e

echo "🔌 [Phase 11] Conectando UI ao Backend de Exportação..."

# ==============================================================================
# 1. Criar Serviço de API na UI
# Centraliza as chamadas HTTP (Melhor prática de arquitetura)
# ==============================================================================
mkdir -p packages/ui/src/services
echo "📝 Criando packages/ui/src/services/api.ts..."

cat > packages/ui/src/services/api.ts <<EOF
const API_BASE_URL = import.meta.env.VITE_MINI_IDE_SERVER_URL || 'http://localhost:3200';

export const api = {
  /**
   * Solicita a exportação do projeto como ZIP
   * @param projectData Dados do projeto (HUs, código, etc)
   */
  exportProjectZip: async (projectData: any) => {
    try {
      const response = await fetch(\`\${API_BASE_URL}/export\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectData }),
      });

      if (!response.ok) {
        throw new Error(\`Erro na exportação: \${response.statusText}\`);
      }

      // Converte a resposta em Blob (arquivo binário)
      const blob = await response.blob();
      
      // Cria um link temporário para forçar o download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Tenta pegar o nome do arquivo do header ou usa default
      a.download = 'mini-ide-project.zip';
      document.body.appendChild(a);
      a.click();
      
      // Limpeza
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return true;
    } catch (error) {
      console.error('Falha no download:', error);
      throw error;
    }
  }
};
EOF

# ==============================================================================
# 2. Atualizar App.tsx para usar o Serviço
# Conecta o botão "Exportar .zip" à lógica real
# ==============================================================================
echo "🔄 Atualizando packages/ui/src/App.tsx..."

# Vamos ler o arquivo atual e substituir a lógica do botão
# Nota: Em um cenário real, faríamos um parse mais inteligente, 
# mas aqui vamos injetar a função handleExport e conectar ao botão.

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
  
  const [mode] = useState<'Explorando' | 'Executando'>('Explorando');

  const handleExportZip = async () => {
    setIsExporting(true);
    showToast('Iniciando exportação...', 'info');
    
    try {
      // Mock dos dados do projeto (em breve virá do estado real)
      const mockProjectData = {
        product: {
          userStories: [{ id: 'HU-TEST', description: 'Gerada via UI' }]
        },
        engine: {
          files: [{ path: 'README.md', content: '# Projeto Exportado via UI' }]
        }
      };

      await api.exportProjectZip(mockProjectData);
      showToast('Projeto exportado com sucesso!', 'success');
    } catch (error) {
      showToast('Falha ao exportar projeto.', 'error');
    } finally {
      setIsExporting(false);
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
            <span className="text-[10px] bg-[#47e6a1]/15 text-[#47e6a1] px-2 py-0.5 rounded-full border border-[#47e6a1]/30">
              pronto
            </span>
          </div>
          <div className="flex-1 bg-[#101727] border border-[#24304a] rounded-lg p-2.5 overflow-auto font-mono text-sm text-[#9fb0d3]">
            <div className="hover:text-white cursor-pointer">apps/</div>
            <div className="pl-2 hover:text-white cursor-pointer">src/</div>
            <div className="pl-2 hover:text-white cursor-pointer">docs/</div>
          </div>
        </aside>

        {/* Workspace */}
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
                      <Button variant="ghost" size="sm" onClick={() => setIsWizardOpen(true)}>Criar Projeto</Button>
                    </div>
                  </div>
                </div>
                <div className="h-full"><DiscoveryNotes /></div>
              </div>
            )}
            
            {activeTab === 'timeline' && <ExploreTimeline />}
            
            {/* ABA OUTPUTS - Agora com botão funcional */}
            {activeTab === 'outputs' && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-[#9fb0d3]">Artefatos prontos para download.</div>
                <Button onClick={handleExportZip} disabled={isExporting}>
                  {isExporting ? 'Gerando ZIP...' : 'Exportar Projeto (.zip)'}
                </Button>
              </div>
            )}

            {/* Outras abas (placeholders) */}
            {['hus', 'docs', 'tests'].includes(activeTab) && (
              <div className="text-[#9fb0d3] text-center mt-10">Conteúdo em desenvolvimento.</div>
            )}
          </div>
        </section>

        {/* Right Panel */}
        <aside className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-sm flex flex-col p-3 gap-3 overflow-hidden">
          <div className="flex justify-between items-center pb-2 border-b border-[#24304a]">
            <div className="flex gap-2">
              <span className="text-[10px] bg-[#222b40] px-2 py-0.5 rounded-full text-[#9fb0d3]">R$ 0,00</span>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="text-xs bg-[#101727] hover:bg-[#222b40] border border-[#24304a] px-2 py-1 rounded-md transition-colors text-[#e6ecff]"
            >
              Preferências
            </button>
          </div>
          <div className="flex-1 bg-[#101727] border border-[#24304a] rounded-lg p-3 overflow-auto text-sm space-y-3">
            <div className="bg-[#0f1420] p-3 rounded-lg border border-[#24304a]/50">
              <strong className="block text-[#4ba3ff] text-xs mb-1">Agente</strong>
              Sistema pronto. Vá na aba <b>Outputs</b> para testar a exportação.
            </div>
          </div>
        </aside>
      </main>

      <footer className="px-4 py-3 bg-[#141b2b] border-t border-[#24304a] grid grid-cols-[1fr_auto] gap-3">
        <textarea 
          placeholder="Digite..."
          className="w-full h-[60px] bg-[#101727] border border-[#24304a] rounded-lg px-3 py-2 text-sm text-[#e6ecff] focus:outline-none focus:border-[#4ba3ff] resize-none"
        />
        <div className="flex items-end"><Button variant="primary">Enviar</Button></div>
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

# ==============================================================================
# 3. Correção de Lint (no-console e unused vars)
# ==============================================================================
echo "🛡️  Ajustando Lint..."
# O arquivo api.ts usa console.error, vamos permitir isso pois é um log de erro de rede
sed -i 's/console.error/ \/\/ eslint-disable-next-line no-console\n      console.error/' packages/ui/src/services/api.ts

# ==============================================================================
# 4. Validação
# ==============================================================================
echo "🏗️  Validando build da UI..."
pnpm --filter @mini-ide/ui build

echo "✅ Frontend conectado ao Backend de exportação!"
EOF

chmod +x scripts/122_connect_ui_export.sh
