#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/202_fix_filetree_lint.sh
# Objetivo: Remover variável não utilizada (handleToggle) do FileTree.tsx
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🔧 Corrigindo Lint em FileTree.tsx..."

cat << 'EOF' > packages/ui/src/components/FileTree.tsx
import React, { useState } from 'react';
import { FileNode } from '../utils/fileTree';

// Ícones Inline SVG para evitar dependências extras nesta fase
const FolderIcon = ({ open }: { open: boolean }) => (
  <svg 
    className={`w-4 h-4 mr-1 text-yellow-500 transition-transform ${open ? 'rotate-90' : ''}`} 
    fill="none" stroke="currentColor" viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

interface FileTreeProps {
  nodes: FileNode[];
  onSelectFile?: (path: string) => void;
}

const FileTreeNode: React.FC<{ node: FileNode; onSelectFile?: (path: string) => void }> = ({ node, onSelectFile }) => {
  const [isOpen, setIsOpen] = useState(true); // Pastas abertas por padrão para visualização imediata

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onSelectFile?.(node.path);
    }
  };

  return (
    <div className="pl-2 select-none">
      <div 
        className="flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-700 text-sm text-gray-300 transition-colors"
        onClick={handleClick}
      >
        {node.type === 'folder' ? (
          <>
            <FolderIcon open={isOpen} />
            <span className="font-semibold">{node.name}</span>
          </>
        ) : (
          <>
            <FileIcon />
            <span>{node.name}</span>
          </>
        )}
      </div>
      
      {node.type === 'folder' && isOpen && node.children && (
        <div className="border-l border-gray-700 ml-2">
          {node.children.map((child) => (
            <FileTreeNode key={child.path} node={child} onSelectFile={onSelectFile} />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ nodes, onSelectFile }) => {
  if (nodes.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center italic">
        Nenhum arquivo gerado ainda.
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      {nodes.map((node) => (
        <FileTreeNode key={node.path} node={node} onSelectFile={onSelectFile} />
      ))}
    </div>
  );
};
EOF

echo "✅ Correção aplicada. Código morto removido."
EOF
