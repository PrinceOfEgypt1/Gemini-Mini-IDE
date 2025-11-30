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
    
    const srcNode = tree[0];
    const readmeNode = tree[1];
    
    expect(srcNode).toBeDefined();
    expect(srcNode?.name).toBe('src');
    expect(srcNode?.type).toBe('folder');
    
    expect(readmeNode).toBeDefined();
    expect(readmeNode?.name).toBe('README.md');
    expect(readmeNode?.type).toBe('file');

    // Verificando filhos de src
    const srcChildren = srcNode?.children;
    expect(srcChildren).toBeDefined();
    expect(srcChildren).toHaveLength(2);
    
    // components (folder) vem antes de index.ts (file) devido à ordenação
    expect(srcChildren?.[0]?.name).toBe('components');
    expect(srcChildren?.[1]?.name).toBe('index.ts');
  });

  it('deve lidar com array vazio', () => {
    expect(buildFileTree([])).toEqual([]);
  });
});
