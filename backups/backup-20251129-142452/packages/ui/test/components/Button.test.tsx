import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../../src/components/common/Button';

describe('Button', () => {
  it('renderiza o texto corretamente', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByText('Clique aqui')).toBeDefined();
  });

  it('aplica a classe de variante', () => {
    const { container } = render(<Button variant="primary">Ação</Button>);
    expect(container.firstChild).toHaveProperty('className', expect.stringContaining('primary'));
  });

  it('mostra estado de loading', () => {
    const { container } = render(<Button isLoading>Processando</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveProperty('disabled', true);
  });
});
