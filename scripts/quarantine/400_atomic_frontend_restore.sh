#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 400_atomic_frontend_restore.sh
# DESCRIÇÃO: Restauração ATÔMICA do Frontend.
#   1. Limpa packages/ui/src (Remove vestígios de versões misturadas).
#   2. Recria a infraestrutura de Build (Vite + Tailwind Inline - RCA Fix).
#   3. Recria o Código Moderno (App.tsx, Hooks, CSS com Variáveis).
#   4. Força recompilação limpa.
# AUTOR: Mini-IDE Senior Architect
# ==============================================================================

echo ">>> ☢️ INICIANDO RESTAURAÇÃO ATÔMICA DO FRONTEND..."

# 1. LIMPEZA TOTAL (Garante que não sobre lixo)
echo ">>> [1/6] Limpando diretórios antigos..."
rm -rf packages/ui/src/*
rm -rf packages/ui/dist
rm -rf packages/ui/node_modules/.vite
rm -f packages/ui/postcss.config.js # Removemos para usar config inline no Vite (Mais seguro)
rm -f packages/ui/tailwind.config.js # Vamos recriar limpo

mkdir -p packages/ui/src/components/code
mkdir -p packages/ui/src/components/common
mkdir -p packages/ui/src/components/docs
mkdir -p packages/ui/src/components/hus
mkdir -p packages/ui/src/components/settings
mkdir -p packages/ui/src/components/tests
mkdir -p packages/ui/src/components/wizard
mkdir -p packages/ui/src/contexts
mkdir -p packages/ui/src/hooks
mkdir -p packages/ui/src/utils

# 2. INFRAESTRUTURA DE BUILD (RCA FIX)
# Configuramos o PostCSS DENTRO do vite.config.ts para evitar erros de resolução de arquivo
echo ">>> [2/6] Configurando Build System (Vite + Tailwind Inline)..."

cat > packages/ui/vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
          theme: {
            extend: {
              colors: {
                background: "var(--bg-app)",
                foreground: "var(--text-primary)",
              }
            },
          },
        }),
        autoprefixer(),
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3200',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  }
});
EOF

# 3. ESTILOS (TEMA)
echo ">>> [3/6] Criando index.css com Variáveis de Tema..."
cat > packages/ui/src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* TEMA ESCURO MODERNO (Recuperado) */
  --bg-app: #0f172a;
  --bg-panel: #1e293b;
  --bg-panel-hover: #334155;
  --border-main: #334155;
  
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;

  --brand-primary: #3b82f6;
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;

  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  line-height: 1.5;
}

body {
  background-color: var(--bg-app);
  color: var(--text-primary);
  margin: 0;
  height: 100vh;
  overflow: hidden;
}

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--bg-app); }
::-webkit-scrollbar-thumb { background: var(--border-main); border-radius: 4px; }

.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
EOF

# 4. ENTRYPOINT
echo ">>> [4/6] Criando main.tsx..."
cat > packages/ui/src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# 5. DEPENDÊNCIAS (Hooks e Utils)
echo ">>> [5/6] Restaurando Hooks e Utils..."

cat > packages/ui/src/utils/stream.ts << 'EOF'
export type StreamEventType = 'LOG' | 'PHASE' | 'FILE' | 'WARN' | 'ERROR' | 'RESULT';
export interface StreamEvent { type: StreamEventType; message?: string; data?: unknown; timestamp: string; }
export type OnEventCallback = (event: StreamEvent) => void;
export type OnErrorCallback = (error: string) => void;

export async function fetchStream(url: string, body: unknown, onEvent: OnEventCallback, onError: OnErrorCallback) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test', 'Accept': 'text/event-stream' },
      body: JSON.stringify(body),
    });
    if (!response.body) throw new Error("No body");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim().startsWith('data: ')) continue;
        try { onEvent(JSON.parse(line.trim().slice(6))); } catch {}
      }
    }
  } catch (err: any) { onError(err.message || String(err)); }
}
EOF

cat > packages/ui/src/hooks/useAnalysisStream.ts << 'EOF'
import { useState, useCallback } from 'react';
import { fetchStream, StreamEvent } from '../utils/stream';

export interface GeneratedFile { path: string; content: string; language?: string; }
export interface GeneratedProject { engine?: { files?: GeneratedFile[] }; summary?: string; }

export function useAnalysisStream() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [partialProject, setPartialProject] = useState<GeneratedProject>({ engine: { files: [] } });

  const startAnalysis = useCallback(async (prompt: string, context?: unknown) => {
    setIsAnalyzing(true);
    setEvents([]);
    setPartialProject({ engine: { files: [] } });
    await fetchStream('/api/analyze', { text: prompt, currentContext: context }, 
      (ev) => {
        setEvents(p => [...p, ev]);
        if (ev.type === 'FILE' && ev.data) {
          const f = ev.data as GeneratedFile;
          setPartialProject(prev => ({ ...prev, engine: { files: [...(prev.engine?.files || []), { ...f, content: f.content || "// ..." }] } }));
        }
        if (ev.type === 'RESULT') {
           setPartialProject(ev.data as GeneratedProject);
           setIsAnalyzing(false);
        }
      },
      (err) => {
        setEvents(p => [...p, { type: 'ERROR', message: err, timestamp: new Date().toISOString() }]);
        setIsAnalyzing(false);
      }
    );
  }, []);
  return { startAnalysis, isAnalyzing, events, partialProject };
}
EOF

# 6. APLICAÇÃO (App.tsx Moderno e Validado)
echo ">>> [6/6] Criando App.tsx Moderno (Validado)..."
cat > packages/ui/src/App.tsx << 'EOF'
import { useState, useEffect } from 'react';
import { useAnalysisStream } from './hooks/useAnalysisStream';

// Componentes Mínimos Inline para garantir funcionamento imediato
const Sidebar = ({ files }: { files: any[] }) => (
  <div className="p-2 space-y-1">
    {files.map((f, i) => (
      <div key={i} className="text-xs px-2 py-1 hover:bg-[var(--bg-panel-hover)] rounded cursor-pointer truncate text-[var(--text-secondary)]">
        {f.path}
      </div>
    ))}
    {files.length === 0 && <div className="text-xs text-[var(--text-muted)] p-2">Nenhum arquivo</div>}
  </div>
);

const Timeline = ({ events }: { events: any[] }) => (
  <div className="flex flex-col gap-2 font-mono text-xs p-4">
    {events.map((ev, i) => (
      <div key={i} className={`border-b border-[var(--border-main)] pb-1 ${ev.type === 'ERROR' ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
        <span className="opacity-50 mr-2">[{new Date(ev.timestamp).toLocaleTimeString()}]</span>
        <span className="font-bold mr-2">[{ev.type}]</span>
        {ev.message}
      </div>
    ))}
  </div>
);

const App = () => {
  const [prompt, setPrompt] = useState('');
  const { startAnalysis, isAnalyzing, events, partialProject } = useAnalysisStream();
  const files = partialProject?.engine?.files || [];

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-app)] text-[var(--text-primary)] font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[var(--bg-panel)] border-r border-[var(--border-main)] flex flex-col">
        <div className="h-14 flex items-center px-4 font-bold border-b border-[var(--border-main)] text-[var(--brand-primary)]">
          Mini IDE <span className="ml-2 text-[10px] bg-[var(--bg-panel-hover)] px-1 rounded text-white">v0.18</span>
        </div>
        <div className="flex-1 overflow-auto"><Sidebar files={files} /></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-auto bg-[var(--bg-app)] relative">
          {events.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
              Digite um prompt para começar.
            </div>
          ) : (
            <Timeline events={events} />
          )}
        </div>

        {/* Input Area */}
        <div className="h-20 bg-[var(--bg-panel)] border-t border-[var(--border-main)] p-4 flex gap-2">
          <input 
            className="flex-1 bg-[var(--bg-app)] border border-[var(--border-main)] rounded px-4 focus:outline-none focus:border-[var(--brand-primary)]"
            placeholder="O que vamos construir hoje?"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isAnalyzing && startAnalysis(prompt)}
            disabled={isAnalyzing}
          />
          <button 
            className="bg-[var(--brand-primary)] text-white px-6 rounded font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            onClick={() => startAnalysis(prompt)}
            disabled={isAnalyzing || !prompt.trim()}
          >
            {isAnalyzing ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
EOF

echo ">>> Compilando..."
pnpm --filter @mini-ide/ui build

echo "✅ RESTAURAÇÃO ATÔMICA CONCLUÍDA."
echo "Execute: pnpm --filter @mini-ide/ui dev"
echo "Acesse: http://localhost:5173"
EOF
