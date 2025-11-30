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
