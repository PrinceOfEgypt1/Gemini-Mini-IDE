import React from 'react';
import { FileTree } from './FileTree';
import { buildFileTree } from '../utils/fileTree';

// Interface para tipagem (idealmente viria de @gemini-mini-ide/shared)
interface GeneratedFile {
  path: string;
  content: string;
}

interface SidebarProps {
  // Em uma implementação real, isso viria de um hook useStore()
  // Mas para permitir testes isolados e composição, aceitamos props opcionalmente
  files?: GeneratedFile[];
  onSelectFile?: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ files = [], onSelectFile }) => {
  // Converte a lista plana em árvore
  const fileTree = React.useMemo(() => buildFileTree(files), [files]);

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full text-white">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
          Explorer
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {files.length > 0 ? (
          <FileTree nodes={fileTree} onSelectFile={onSelectFile} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
            <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 012 2v-5a2 2 0 01-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            <p className="text-xs text-center px-4">
              Os arquivos gerados aparecerão aqui.
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900 text-xs text-gray-500">
        Gemini Mini-IDE v0.15.0
      </div>
    </aside>
  );
};
