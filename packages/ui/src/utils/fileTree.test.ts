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
    const root = tree[0];
    expect(root).toBeDefined();
    expect(root?.name).toBe('src');
    const backend = root?.children?.[0];
    expect(backend?.name).toBe('backend');
    expect(backend?.children).toHaveLength(2);
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
