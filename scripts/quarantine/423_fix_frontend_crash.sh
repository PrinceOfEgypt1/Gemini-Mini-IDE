#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

FILE_VIEWER_PATH="packages/ui/src/components/code/FileViewer.tsx"

log_info "Blindando o componente FileViewer contra props nulas..."

# Reescreve o FileViewer.tsx com programação defensiva
cat > "$FILE_VIEWER_PATH" << 'EOF'
import React from 'react';
import { SyntaxHighlighter } from '../../utils/syntaxHighlighter';

interface FileViewerProps {
  path: string;
  content?: string | null; // Aceita nulo/undefined explicitamente
  language?: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({ path, content, language = 'plaintext' }) => {
  // Defesa: Garante que content seja sempre uma string
  const safeContent = content ?? ""; 

  if (!safeContent) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 bg-[var(--bg-panel)] p-8 text-center">
        <div>
          <p className="text-lg mb-2">Arquivo vazio ou não carregado</p>
          <p className="text-sm opacity-70">{path}</p>
        </div>
      </div>
    );
  }

  // Defesa extra: garante que o split não quebre em edge cases
  const lineCount = safeContent.split('\n').length;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-white font-mono text-sm overflow-hidden rounded-lg border border-[var(--border-main)]">
      {/* Header do Arquivo */}
      <div className="flex items-center px-4 py-2 bg-[#2d2d2d] border-b border-[#3e3e3e] select-none">
        <span className="opacity-70 mr-2">📄</span>
        <span className="font-medium text-gray-200">{path}</span>
        <span className="ml-auto text-xs text-gray-500">{lineCount} linhas • {language}</span>
      </div>

      {/* Conteúdo com Syntax Highlight */}
      <div className="flex-1 overflow-auto relative custom-scrollbar">
        <SyntaxHighlighter 
          code={safeContent} 
          language={language} 
          showLineNumbers={true} 
        />
      </div>
    </div>
  );
};
EOF
log_ok "FileViewer reescrito com proteção contra crash."

# Recompilação da UI para garantir integridade
log_info "Recompilando UI..."
cd packages/ui
if ../../node_modules/.bin/tsc -b; then
    log_ok "UI compilada com sucesso."
else
    echo "Erro na compilação da UI."
    exit 1
fi
cd ../..

# Não precisa reiniciar o servidor backend, apenas o frontend (HMR do Vite deve pegar, mas rebuild é seguro)
log_ok "Correção aplicada. Recarregue a página no navegador."
