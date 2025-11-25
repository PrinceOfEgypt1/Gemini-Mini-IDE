import React from 'react';

interface FileViewerProps {
  filename: string;
  content: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({ filename, content }) => {
  // Separa o conteúdo em linhas para gerar numeração
  const lines = content.split('\n');

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm rounded-lg overflow-hidden border border-[var(--border-main)]">
      {/* Header do Arquivo */}
      <div className="flex items-center px-4 py-2 bg-[#252526] border-b border-[#3e3e42]">
        <span className="text-[#858585] mr-2">📄</span>
        <span className="font-medium text-xs">{filename}</span>
      </div>

      {/* Corpo do Código com Numeração */}
      <div className="flex-1 overflow-auto flex">
        {/* Coluna de Números */}
        <div className="bg-[#1e1e1e] text-[#858585] text-right pr-3 pl-2 select-none border-r border-[#3e3e42] py-4 min-h-full leading-6">
          {lines.map((_, i) => (
            <div key={i} className="h-6">{i + 1}</div>
          ))}
        </div>

        {/* Conteúdo do Código */}
        <div className="flex-1 p-4 leading-6 whitespace-pre tab-4">
          {content}
        </div>
      </div>
    </div>
  );
};
