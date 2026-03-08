#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/200_impl_sidebar_tree.sh
# Objetivo: Implementar HU-UI-Viz-Sidebar-022 (Árvore de Arquivos Dinâmica)
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🚀 Iniciando implementação da HU-UI-Viz-Sidebar-022..."

# 1. Criar utilitário de conversão de paths para árvore
# ------------------------------------------------------------------------------
echo "🛠️  Criando utilitário de árvore de arquivos..."
mkdir -p packages/ui/src/utils

cat << 'EOF' > packages/ui/src/utils/fileTree.ts
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

/**
 * Converte uma lista plana de caminhos de arquivo em uma estrutura de árvore.
 * Exemplo entrada: [{ path: 'src/index.ts' }, { path: 'README.md' }]
 */
export function buildFileTree(files: { path: string }[]): FileNode[] {
  const root: FileNode[] = [];

  files.forEach((file) => {
    const parts = file.path.split('/');
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      const existingNode = currentLevel.find((node) => node.name === part);

      if (existingNode) {
        if (!isFile) {
          // Se é pasta e já existe, descemos o nível
          currentLevel = existingNode.children || [];
        }
      } else {
        const newNode: FileNode = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        };

        currentLevel.push(newNode);

        if (!isFile) {
          currentLevel = newNode.children!;
        }
      }
    });
  });

  // Função auxiliar para ordenar: pastas primeiro, depois arquivos, ambos alfabeticamente
  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
    nodes.forEach((node) => {
      if (node.children) sortNodes(node.children);
    });
  };

  sortNodes(root);
  return root;
}
EOF

# 2. Criar testes para o utilitário
# ------------------------------------------------------------------------------
echo "🧪 Criando testes unitários para o utilitário..."

cat << 'EOF' > packages/ui/src/utils/fileTree.test.ts
import { describe, it, expect } from 'vitest';
import { buildFileTree } from './fileTree';

describe('buildFileTree', () => {
  it('deve converter lista plana em árvore hierárquica', () => {
    const files = [
      { path: 'src/components/Button.tsx' },
      { path: 'src/index.ts' },
      { path: 'README.md' },
    ];

    const tree = buildFileTree(files);

    // Esperamos 2 nós na raiz: src (folder) e README.md (file)
    expect(tree).toHaveLength(2);
    expect(tree[0].name).toBe('src');
    expect(tree[0].type).toBe('folder');
    expect(tree[1].name).toBe('README.md');
    expect(tree[1].type).toBe('file');

    // Verificando filhos de src
    const srcChildren = tree[0].children!;
    expect(srcChildren).toHaveLength(2);
    // components (folder) vem antes de index.ts (file) devido à ordenação
    expect(srcChildren[0].name).toBe('components');
    expect(srcChildren[1].name).toBe('index.ts');
  });

  it('deve lidar com array vazio', () => {
    expect(buildFileTree([])).toEqual([]);
  });
});
EOF

# 3. Criar componente visual Recursive File Tree
# ------------------------------------------------------------------------------
echo "🎨 Criando componente visual FileTree..."
mkdir -p packages/ui/src/components

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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

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

# 4. Atualizar Sidebar para Integrar (Mock de Store por enquanto)
# ------------------------------------------------------------------------------
# Nota: Estamos assumindo que a Sidebar consome o contexto. 
# Como não temos acesso ao código exato da store, vamos criar uma integração segura
# que tenta ler de props ou mostra o estado vazio.

echo "🔗 Atualizando Sidebar.tsx..."

cat << 'EOF' > packages/ui/src/components/Sidebar.tsx
import React from 'react';
import { FileTree } from './FileTree';
import { buildFileTree } from '../utils/fileTree';

// Interface para tipagem (idealmente viria de @mini-ide/shared)
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
        Mini-IDE v0.15.0
      </div>
    </aside>
  );
};
EOF

# 5. Validação imediata
# ------------------------------------------------------------------------------
echo "✅ Executando verificação de qualidade..."

# Rodar apenas o teste unitário criado para ser rápido
pnpm --filter @mini-ide/ui test src/utils/fileTree.test.ts

echo "🎉 Script 200 concluído! Sidebar File Tree implementada."
echo "⚠️  Próximo passo: Conectar a SidebarProps no layout principal (App.tsx) passando o estado real."
EOF

# Executar o script gerado
bash scripts/200_impl_sidebar_tree.sh

# Validação final de governança
bash ./42_pipeline_checklist.sh
