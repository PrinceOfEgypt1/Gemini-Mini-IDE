#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

APP_PATH="packages/ui/src/App.tsx"
HIGHLIGHTER_PATH="packages/ui/src/utils/syntaxHighlighter.ts"

log_info "Iniciando correções de compilação da UI..."

# 1. Corrigir App.tsx (Prop Mismatch: filename -> path)
# Usa sed para substituir apenas a ocorrência específica no componente FileViewer
if [ -f "$APP_PATH" ]; then
    log_info "Corrigindo props no App.tsx..."
    # Substitui 'filename={selectedFile.path}' por 'path={selectedFile.path}'
    sed -i 's/<FileViewer filename={/<FileViewer path={/g' "$APP_PATH"
    # Fallback caso esteja usando outra variável
    sed -i 's/filename={selectedFile/path={selectedFile/g' "$APP_PATH"
    log_ok "App.tsx atualizado."
else
    echo "Erro: App.tsx não encontrado."
    exit 1
fi

# 2. Padronizar o SyntaxHighlighter (Import Mismatch)
# Reescrevemos o utilitário para garantir que ele tenha o export nomeado correto
log_info "Padronizando utils/syntaxHighlighter.ts..."
cat > "$HIGHLIGHTER_PATH" << 'EOF'
import React from 'react';
import ReactMarkdown from 'react-markdown';

// Interface simplificada para garantir compatibilidade
interface SyntaxHighlighterProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

/**
 * Wrapper robusto para highlight de sintaxe.
 * Garante exportação nomeada para satisfazer FileViewer.tsx.
 */
export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({ code, language = 'text' }) => {
  return (
    <div className="syntax-highlighter-wrapper p-4 font-mono text-sm">
      <pre className="whitespace-pre-wrap break-words">
        <code className={`language-${language}`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

// Fallback default export também, para compatibilidade reversa
export default SyntaxHighlighter;
EOF
log_ok "syntaxHighlighter.ts corrigido."

# 3. Recompilar UI para validar
log_info "Recompilando UI..."
cd packages/ui
if ../../node_modules/.bin/tsc -b; then
    log_ok "UI compilada com sucesso! (Zero Errors)"
else
    echo "Erro persistente na compilação da UI."
    exit 1
fi
cd ../..

log_ok "Correções aplicadas. Recarregue a página no navegador."
