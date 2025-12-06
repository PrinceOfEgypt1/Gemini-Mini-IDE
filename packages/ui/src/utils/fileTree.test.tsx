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
