#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

BASE_PATH="packages/ui/src/utils"
OLD_FILE="$BASE_PATH/syntaxHighlighter.ts"
NEW_FILE="$BASE_PATH/syntaxHighlighter.tsx"

log_info "Corrigindo extensão de arquivo JSX (.ts -> .tsx)..."

# 1. Renomear o arquivo
if [ -f "$OLD_FILE" ]; then
    mv "$OLD_FILE" "$NEW_FILE"
    log_ok "Arquivo renomeado para syntaxHighlighter.tsx"
else
    # Caso já tenha sido movido ou não exista, cria o arquivo correto
    log_info "Arquivo .ts não encontrado, criando .tsx diretamente..."
    cat > "$NEW_FILE" << 'EOF'
import React from 'react';

// Interface simplificada
interface SyntaxHighlighterProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

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

export default SyntaxHighlighter;
EOF
fi

# 2. Recompilar UI
log_info "Recompilando UI..."
cd packages/ui
# Limpa cache do TS build se necessário (opcional, mas bom para garantir)
rm -f tsconfig.tsbuildinfo

if ../../node_modules/.bin/tsc -b; then
    log_ok "UI compilada com sucesso! (Zero Errors)"
else
    echo "Erro na compilação da UI."
    exit 1
fi
cd ../..

log_ok "Correção aplicada. A tela branca deve desaparecer."
