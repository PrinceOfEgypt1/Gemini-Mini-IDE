#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 402_fix_lint_strict.sh
# DESCRIÇÃO: Resolve erros de Lint (no-empty, no-explicit-any) impedindo o pipeline.
#            Não altera funcionalidade, apenas conformidade de código.
# AUTOR: Mini-IDE Senior Architect
# ==============================================================================

echo ">>> 🧹 FAXINA FINAL DE LINT (Satisfazendo ESLint e TSC)..."

# 1. Corrigir utils/stream.ts
# Mudanças:
# - body: any -> body: unknown
# - catch {} -> catch { /* ignore */ }
echo ">>> [1/2] Corrigindo packages/ui/src/utils/stream.ts..."
cat > packages/ui/src/utils/stream.ts << 'EOF'
export type StreamEventType = 'LOG' | 'PHASE' | 'FILE' | 'WARN' | 'ERROR' | 'RESULT';

export interface StreamEvent {
  type: StreamEventType;
  message?: string;
  data?: unknown;
  timestamp: string;
}

export type OnEventCallback = (event: StreamEvent) => void;
export type OnErrorCallback = (error: string) => void;

export async function fetchStream(
  url: string,
  body: unknown,
  onEvent: OnEventCallback,
  onError: OnErrorCallback
) {
  try {
    const token = "test-token"; 

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(body),
    });

    if (!response.body) throw new Error("No response body");

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
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        try {
          if (jsonStr === '[DONE]') continue;
          const event: StreamEvent = JSON.parse(jsonStr);
          onEvent(event);
        } catch {
          // ignore json parse errors
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    onError(msg);
  }
}
EOF

# 2. Corrigir App.tsx
# Mudanças:
# - Tipagem explicita para props dos componentes inline (Sidebar/Timeline)
# - Uso de 'unknown' com type casting seguro onde necessário
echo ">>> [2/2] Corrigindo packages/ui/src/App.tsx..."
cat > packages/ui/src/App.tsx << 'EOF'
import { useState } from 'react';
import { useAnalysisStream, GeneratedFile } from './hooks/useAnalysisStream';
import { StreamEvent } from './utils/stream';

// Definição de tipos para evitar 'any'
interface FileItem {
  path: string;
  content: string;
}

interface SidebarProps {
  files: GeneratedFile[];
}

interface TimelineProps {
  events: StreamEvent[];
}

const Sidebar = ({ files }: SidebarProps) => (
  <div className="p-2 space-y-1">
    {files.map((f, i) => (
      <div key={i} className="text-xs px-2 py-1 hover:bg-[var(--bg-panel-hover)] rounded cursor-pointer truncate text-[var(--text-secondary)]">
        {f.path}
      </div>
    ))}
    {files.length === 0 && <div className="text-xs text-[var(--text-muted)] p-2">Nenhum arquivo</div>}
  </div>
);

const Timeline = ({ events }: TimelineProps) => (
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
  
  // Garante que files seja tratado como array do tipo correto
  const files = (partialProject?.engine?.files || []) as GeneratedFile[];

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

echo "✅ CÓDIGO CORRIGIDO."
echo "Execute 'bash 42_pipeline_checklist.sh' agora."
EOF
