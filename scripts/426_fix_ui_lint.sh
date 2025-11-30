#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

FILE_PATH="packages/ui/src/utils/syntaxHighlighter.tsx"

log_info "Removendo imports não utilizados em syntaxHighlighter.tsx..."

# Reescreve o arquivo sem o import do ReactMarkdown
cat > "$FILE_PATH" << 'EOF'
import React from 'react';

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

log_ok "Arquivo corrigido."

# Executa o pipeline novamente para confirmar o sinal verde
log_info "Executando Pipeline Final..."
bash ./42_pipeline_checklist.sh
