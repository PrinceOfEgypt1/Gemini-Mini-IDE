import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiscoveryNotes } from '../../src/components/discovery/DiscoveryNotes';

describe('DiscoveryNotes', () => {
  it('renderiza o título do painel', () => {
    render(<DiscoveryNotes />);
    expect(screen.getByText('Discovery Notes')).toBeDefined();
  });

  it('renderiza a seção de Intenção', () => {
    render(<DiscoveryNotes />);
    expect(screen.getByText(/INTENÇÃO/i)).toBeDefined();
  });
});
