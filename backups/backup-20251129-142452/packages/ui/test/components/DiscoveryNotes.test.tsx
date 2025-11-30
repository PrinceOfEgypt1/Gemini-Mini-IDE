import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiscoveryNotes } from '../../src/components/DiscoveryNotes';
import React from 'react';

describe('DiscoveryNotes', () => {
  it('exibe placeholders quando não há dados (UX Guiada)', () => {
    render(<DiscoveryNotes data={{ intent: [], reqs: [], constraints: [] }} />);
    
    // Agora esperamos ver os textos de orientação
    expect(screen.getByText(/O que você quer construir/i)).toBeDefined();
    expect(screen.getByText(/O que o sistema deve ter/i)).toBeDefined();
    expect(screen.getByText(/O que é proibido/i)).toBeDefined();
  });

  it('exibe notas quando dados são fornecidos', () => {
    const mockData = {
      intent: ['Criar sistema de login'],
      reqs: ['Usar JWT'],
      constraints: ['Sem banco de dados']
    };
    
    render(<DiscoveryNotes data={mockData} />);
    
    expect(screen.getByText('Criar sistema de login')).toBeDefined();
    expect(screen.getByText('Usar JWT')).toBeDefined();
    expect(screen.getByText('Sem banco de dados')).toBeDefined();
  });
});
