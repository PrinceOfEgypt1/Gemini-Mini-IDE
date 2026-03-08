#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SCRIPT: 301_restore_missing_files.sh
# DESCRIÇÃO: 
#   1. Recria packages/ui/src/utils/stream.ts (Utilitário de SSE perdido).
#   2. Recria packages/ui/src/hooks/useAnalysisStream.ts (Hook perdido).
#   3. Corrige App.tsx removendo import não usado de 'React'.
#   4. Executa o build final.
# AUTOR: Mini-IDE Senior Architect
# ==============================================================================

echo ">>> 🧩 RESTAURANDO DEPENDÊNCIAS PERDIDAS..."

# 1. Criar pasta utils e o arquivo stream.ts
echo ">>> [1/4] Recriando utils/stream.ts..."
mkdir -p packages/ui/src/utils
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
  body: any,
  onEvent: OnEventCallback,
  onError: OnErrorCallback
) {
  try {
    // Recupera token (simulação ou real)
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

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

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
        } catch (e) {
          console.warn("Falha ao parsear evento SSE:", jsonStr);
        }
      }
    }
  } catch (err: any) {
    onError(err.message || String(err));
  }
}
EOF

# 2. Criar pasta hooks e o arquivo useAnalysisStream.ts
echo ">>> [2/4] Recriando hooks/useAnalysisStream.ts..."
mkdir -p packages/ui/src/hooks
cat > packages/ui/src/hooks/useAnalysisStream.ts << 'EOF'
import { useState, useCallback } from 'react';
import { fetchStream, StreamEvent } from '../utils/stream';

// Definição simplificada para evitar dependências circulares complexas
export interface GeneratedFile {
  path: string;
  content: string;
  language?: string;
}

export interface GeneratedProject {
  engine?: { files?: GeneratedFile[] };
  product?: { userStories?: any[] };
  summary?: string;
  requestId?: string;
}

export function useAnalysisStream() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [partialProject, setPartialProject] = useState<GeneratedProject>({ engine: { files: [] } });

  const startAnalysis = useCallback(async (prompt: string, context?: any) => {
    setIsAnalyzing(true);
    setEvents([]);
    setPartialProject({ engine: { files: [] } });

    await fetchStream(
      '/api/analyze', // Usa o proxy do Vite configurado no script 999/104
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

# 3. Corrigir App.tsx (Remover import React não usado)
echo ">>> [3/4] Corrigindo App.tsx (Linter Fix)..."
# Lê o arquivo atual e remove "React, " da linha de importação
# Ou simplesmente reescrevemos o cabeçalho, já que sabemos o conteúdo.
sed -i 's/import React, {/import {/' packages/ui/src/App.tsx || true

# 4. Build Final
echo ">>> [4/4] Recompilando UI..."
pnpm --filter @mini-ide/ui build

echo "✅ DEPENDÊNCIAS RESTAURADAS."
echo "Agora o 'App.tsx' encontrará os hooks e o build deve passar."
echo "Execute: pnpm --filter @mini-ide/ui dev"
EOF
