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
