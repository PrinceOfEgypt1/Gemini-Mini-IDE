import React from 'react';

// Paleta de cores estilo VS Code Dark+
const COLORS = {
  keyword: '#C586C0',   // Purple (control flow, keywords)
  function: '#DCDCAA',  // Yellow (functions)
  string: '#CE9178',    // Orange (strings)
  comment: '#6A9955',   // Green (comments)
  type: '#4EC9B0',      // Teal (types, classes)
  number: '#B5CEA8',    // Light Green (numbers)
  operator: '#D4D4D4',  // White (operators)
  tag: '#569CD6',       // Blue (HTML tags)
  attr: '#9CDCFE',      // Light Blue (attributes)
};

/**
 * Função pura para processar string de código e retornar HTML colorido.
 * Usada pelo FileViewer e outros componentes que precisam de HTML raw.
 */
export const highlightCode = (code: string, filename: string = ''): string => {
  // Proteção contra XSS básico
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Comentários (Prioridade alta para não colorir keywords dentro deles)
  html = html.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/g, `<span style="color:${COLORS.comment}">$1</span>`);

  const isTs = filename.match(/\.(ts|tsx|js|jsx)$/);
  const isHtml = filename.match(/\.(html|xml)$/);

  if (isTs) {
    // Keywords
    const keywords = 'const|let|var|import|export|from|return|if|else|for|while|switch|case|break|default|try|catch|await|async|function|class|interface|type|new|this';
    html = html.replace(new RegExp(`\\b(${keywords})\\b`, 'g'), (match) => {
       // Evita colorir se estiver dentro de um span (comentário)
       return match.includes('<span') ? match : `<span style="color:${COLORS.keyword}">${match}</span>`;
    });

    // Strings (Single/Double/Backtick) - Regex simplificada para performance
    // Nota: Isso é uma aproximação. Parsers reais são mais complexos.
    html = html.replace(/(['"`])(.*?)\1/g, (match) => {
        return match.includes('<span') ? match : `<span style="color:${COLORS.string}">${match}</span>`;
    });

    // Funções
    html = html.replace(/\b([a-zA-Z0-9_]+)(?=\()/g, (match) => {
        return match.includes('<span') ? match : `<span style="color:${COLORS.function}">${match}</span>`;
    });
  }

  if (isHtml) {
     // Tags
     html = html.replace(/(&lt;\/?)(\w+)/g, `$1<span style="color:${COLORS.tag}">$2</span>`);
     // Atributos
     html = html.replace(/(\s)([a-zA-Z-]+)(=)/g, `$1<span style="color:${COLORS.attr}">$2</span>$3`);
  }

  return html;
};

// Interface do Componente
interface SyntaxHighlighterProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

/**
 * Componente React para exibir código com highlight.
 */
export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({ code, language = 'text' }) => {
  const html = highlightCode(code, `file.${language}`); // Tenta inferir pelo 'language' como extensão

  return (
    <div className="syntax-highlighter-wrapper p-4 font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] rounded-md overflow-auto">
      <pre className="whitespace-pre-wrap break-words">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
};

export default SyntaxHighlighter;
