#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 303_final_polish.sh
# DESCRIÇÃO: 
#   1. Remove 'import React' de App.tsx (Fix TS6133).
#   2. Garante tipagem correta em hooks e utils.
#   3. Executa a pipeline de verificação final.
# AUTOR: Mini-IDE Senior Architect
# ==============================================================================

echo ">>> 💎 POLIMENTO FINAL (Typecheck Fix)..."

# 1. Corrigindo App.tsx (Remover 'React' não usado)
echo ">>> [1/3] Ajustando packages/ui/src/App.tsx..."
cat > packages/ui/src/App.tsx << 'EOF'
import { useState, useEffect } from 'react';
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
  
  const { startAnalysis, isAnalyzing, events, partialProject } = useAnalysisStream();
  
  const [chatHistory, setChatHistory] = useState([
    { role: 'agent', text: 'Mini-IDE v0.17 Restaurado. Pronto para engenharia.' }
  ]);

  useEffect(() => { if (isAnalyzing) setActiveTab('timeline'); }, [isAnalyzing]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);

    try {
      await startAnalysis(msg);
      setChatHistory(prev => [...prev, { role: 'agent', text: 'Processo finalizado.' }]);
    } catch {
      showToast("Erro na comunicação", "error");
    }
  };

  const files = partialProject?.engine?.files || [];

  const handleSelectFile = (path: string) => {
     // Placeholder para evitar erro de unused variable, mas mantendo a assinatura
     void path; 
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden font-sans">
      <header className="h-14 flex-none flex items-center px-4 bg-[var(--bg-panel)] border-b border-[var(--border-main)] shadow-sm z-10">
        <div className="font-bold text-lg tracking-wide mr-4 text-[var(--brand-primary)]">Mini IDE</div>
        <span className="px-2 py-0.5 rounded bg-[var(--bg-panel-hover)] text-xs border border-[var(--border-main)]">v0.17.3 Green</span>
        <div className="flex-1"></div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-none border-r border-[var(--border-main)] bg-[var(--bg-panel)] flex flex-col">
          <div className="p-3 font-semibold text-xs text-[var(--text-muted)] uppercase">Arquivos</div>
          <div className="flex-1 overflow-y-auto p-2">
             <Sidebar files={files} onSelectFile={handleSelectFile} />
          </div>
        </div>

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

# 2. Re-garantindo arquivos de suporte (Para evitar regressão)
echo ">>> [2/3] Verificando hooks e utils..."

cat > packages/ui/src/hooks/useAnalysisStream.ts << 'EOF'
import { useState, useCallback } from 'react';
import { fetchStream, StreamEvent } from '../utils/stream';

export interface GeneratedFile {
  path: string;
  content: string;
  language?: string;
}

export interface GeneratedProject {
  engine?: { files?: GeneratedFile[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  product?: { userStories?: any[] };
  summary?: string;
  requestId?: string;
}

export function useAnalysisStream() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [partialProject, setPartialProject] = useState<GeneratedProject>({ engine: { files: [] } });

  const startAnalysis = useCallback(async (prompt: string, context?: unknown) => {
    setIsAnalyzing(true);
    setEvents([]);
    setPartialProject({ engine: { files: [] } });

    await fetchStream(
      '/api/analyze',
      { text: prompt, currentContext: context },
      (event) => {
        setEvents(prev => [...prev, event]);

        if (event.type === 'FILE' && event.data) {
          const fileData = event.data as GeneratedFile;
          setPartialProject(prev => ({
            ...prev,
            engine: {
              files: [
                ...(prev.engine?.files || []),
                { ...fileData, content: fileData.content || "// Conteúdo carregado..." }
              ]
            }
          }));
        }

        if (event.type === 'RESULT' && event.data) {
          setPartialProject(event.data as GeneratedProject);
          setIsAnalyzing(false);
        }
      },
      (errorMsg) => {
        setEvents(prev => [...prev, { type: 'ERROR', message: errorMsg, timestamp: new Date().toISOString() }]);
        setIsAnalyzing(false);
      }
    );
  }, []);

  return { startAnalysis, isAnalyzing, events, partialProject };
}
EOF

# 3. Executando Checklist
echo ">>> [3/3] Rodando pipeline de validação..."
bash 42_pipeline_checklist.sh

echo "✅ SCRIPT FINALIZADO."
EOF
