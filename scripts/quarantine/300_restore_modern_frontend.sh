#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 300_restore_modern_frontend.sh
# DESCRIÇÃO: 
#   1. Mata processos presos na porta 5173 (garantia).
#   2. Restaura o index.css com as Variáveis de Tema (que o script 200 apagou).
#   3. Restaura o App.tsx Moderno (que o script 200 simplificou).
#   4. Restaura componentes auxiliares (TimelinePanel) se tiverem sido perdidos.
# AUTOR: Mini-IDE Senior Architect
# ==============================================================================

echo ">>> 🚀 INICIANDO RESTAURAÇÃO DA INTERFACE MODERNA..."

# 1. Matar processos (Garantia de porta limpa)
echo ">>> [1/5] Liberando porta 5173..."
fuser -k 5173/tcp || true

# 2. Restaurar o Tema (CSS Variables)
# O script 200 removeu isso, por isso a versão moderna quebraria se não restaurarmos.
echo ">>> [2/5] Restaurando index.css com Tema Escuro/Claro..."
cat > packages/ui/src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Tema Padrão (Dark/Modern) */
  --bg-app: #0f172a;
  --bg-panel: #1e293b;
  --bg-panel-hover: #334155;
  --border-main: #334155;
  
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;

  --brand-primary: #3b82f6;
  --brand-secondary: #64748b;
  
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
  --info: #0ea5e9;

  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

body {
  background-color: var(--bg-app);
  color: var(--text-primary);
  margin: 0;
  height: 100vh;
  overflow: hidden;
}

/* Scrollbar Dark */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg-app); }
::-webkit-scrollbar-thumb { background: var(--border-main); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
EOF

# 3. Garantir Componentes Críticos
# Se o Hard Reset apagou o TimelinePanel, recriamos agora.
mkdir -p packages/ui/src/components
cat > packages/ui/src/components/TimelinePanel.tsx << 'EOF'
import React, { useEffect, useRef } from 'react';
import { StreamEvent } from '../utils/stream';

interface Props { events: StreamEvent[]; }

export const TimelinePanel: React.FC<Props> = ({ events }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [events]);

  if (events.length === 0) return <div className="flex h-full items-center justify-center text-[var(--text-muted)]">Aguardando início...</div>;

  return (
    <div className="flex flex-col gap-2 p-4 h-full overflow-y-auto font-mono text-sm">
      {events.map((ev, i) => (
        <div key={i} className="flex gap-3 animate-fade-in border-b border-[var(--border-main)]/30 pb-2">
          <span className="text-[var(--text-muted)] text-xs min-w-[70px]">{new Date(ev.timestamp).toLocaleTimeString()}</span>
          <div className="flex-1">
            <span className={`font-bold mr-2 text-xs uppercase ${getColor(ev.type)}`}>[{ev.type}]</span>
            <span>{ev.message}</span>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

function getColor(type: string) {
  if (type === 'ERROR') return 'text-[var(--error)]';
  if (type === 'PHASE') return 'text-[var(--brand-primary)]';
  if (type === 'FILE') return 'text-[var(--success)]';
  return 'text-[var(--text-secondary)]';
}
EOF

# 4. Restaurar App.tsx Moderno (A Interface Bonita)
echo ">>> [3/5] Restaurando App.tsx Moderno..."
cat > packages/ui/src/App.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { FileViewer } from './components/code/FileViewer';
import { DiscoveryNotes } from './components/DiscoveryNotes';
import { TimelinePanel } from './components/TimelinePanel';
import { Button } from './components/common/Button';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAnalysisStream } from './hooks/useAnalysisStream';

const MainLayout = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [chatInput, setChatInput] = useState('');
  
  // Hook de Streaming
  const { startAnalysis, isAnalyzing, events, partialProject } = useAnalysisStream();
  
  // Histórico de Chat
  const [chatHistory, setChatHistory] = useState([
    { role: 'agent', text: 'Mini-IDE v0.17 Restaurado. Pronto para engenharia.' }
  ]);

  // Se o streaming começar, muda para timeline
  useEffect(() => { if (isAnalyzing) setActiveTab('timeline'); }, [isAnalyzing]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);

    try {
      await startAnalysis(msg);
      setChatHistory(prev => [...prev, { role: 'agent', text: 'Processo finalizado.' }]);
    } catch (e) {
      showToast("Erro na comunicação", "error");
    }
  };

  // Mock seguro caso o projeto esteja vazio
  const files = partialProject?.engine?.files || [];

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden font-sans">
      {/* HEADER */}
      <header className="h-14 flex-none flex items-center px-4 bg-[var(--bg-panel)] border-b border-[var(--border-main)] shadow-sm z-10">
        <div className="font-bold text-lg tracking-wide mr-4 text-[var(--brand-primary)]">Mini IDE</div>
        <span className="px-2 py-0.5 rounded bg-[var(--bg-panel-hover)] text-xs border border-[var(--border-main)]">v0.17.1 Fixed</span>
        <div className="flex-1"></div>
      </header>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-64 flex-none border-r border-[var(--border-main)] bg-[var(--bg-panel)] flex flex-col">
          <div className="p-3 font-semibold text-xs text-[var(--text-muted)] uppercase">Arquivos</div>
          <div className="flex-1 overflow-y-auto p-2">
             <Sidebar files={files} onSelectFile={(path) => console.log(path)} />
          </div>
        </div>

        {/* CENTER */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-app)]">
          <div className="border-b border-[var(--border-main)] px-2">
             <WorkspaceTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
          <div className="flex-1 overflow-auto p-0 relative">
            {activeTab === 'overview' && <div className="p-8"><DiscoveryNotes data={{intent:[],reqs:[],constraints:[]}} /></div>}
            {activeTab === 'timeline' && <TimelinePanel events={events} />}
            {activeTab === 'code' && <FileViewer path="demo.ts" content="// Selecione um arquivo" />}
          </div>
        </div>

        {/* CHAT */}
        <div className="w-96 flex-none border-l border-[var(--border-main)] bg-[var(--bg-panel)] flex flex-col z-20">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`p-3 rounded-lg text-sm border ${msg.role === 'user' ? 'bg-[var(--bg-panel-hover)] border-[var(--border-main)]' : 'bg-transparent border-transparent'}`}>
                <strong className="block text-xs mb-1 opacity-70">{msg.role}</strong>
                {msg.text}
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-[var(--border-main)]">
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-[var(--bg-app)] border border-[var(--border-main)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--brand-primary)]"
                value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Comando..."
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              />
              <Button variant="primary" onClick={handleSendMessage} disabled={isAnalyzing} isLoading={isAnalyzing}>Go</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() { return <ThemeProvider><ToastProvider><MainLayout /></ToastProvider></ThemeProvider>; }
export default App;
EOF

# 5. Recompilar
echo ">>> [4/5] Limpando Cache e Recompilando..."
rm -rf packages/ui/node_modules/.vite
pnpm --filter @mini-ide/ui build

echo ">>> [5/5] Iniciando Servidor Frontend..."
# Não usamos '&' para você ver a saída. Abra outro terminal para o backend se precisar.
echo "✅ CONCLUÍDO. Execute: pnpm --filter @mini-ide/ui dev"
EOF
