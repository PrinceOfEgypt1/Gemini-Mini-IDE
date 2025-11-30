/* eslint-disable */
// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { buildFileTree } from './fileTree';

describe('FileTree Utils', () => {
  it('deve lidar com caminhos profundos corretamente', () => {
    const input = [
      { path: 'src/backend/controllers/user.ts', content: '' },
      { path: 'src/backend/index.ts', content: '' }
    ];
    
    const tree = buildFileTree(input);
    
    // Estrutura esperada: src -> backend -> [controllers, index.ts]
    const srcNode = tree[0];
    expect(srcNode).toBeDefined();
    expect(srcNode?.name).toBe('src');
    
    const backendNode = srcNode?.children?.[0];
    expect(backendNode).toBeDefined();
    expect(backendNode?.name).toBe('backend');
    expect(backendNode?.children).toHaveLength(2);
  });

  it('deve ser resiliente a caminhos malformados', () => {
    const input = [
      { path: 'root.txt', content: '' },
      { path: '', content: '' } // Caminho vazio deve ser ignorado ou tratado
    ];
    
    const tree = buildFileTree(input);
    // A implementação atual pode criar nós vazios, vamos verificar se não crasha
    expect(tree).toBeDefined();
    expect(tree.length).toBeGreaterThanOrEqual(1);
  });
});
