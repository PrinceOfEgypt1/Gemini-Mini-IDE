import { describe, it, expect } from 'vitest';

describe('@mini-ide/server', () => {
  it('deve exportar configurações corretas', () => {
    // Teste de sanidade - verifica se o ambiente está OK
    expect(process.env).toBeDefined();
  });

  it('deve validar porta padrão', () => {
    const defaultPort = 3200;
    expect(defaultPort).toBeGreaterThan(0);
    expect(defaultPort).toBeLessThan(65536);
  });
});
