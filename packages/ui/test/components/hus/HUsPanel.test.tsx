import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HUsPanel } from '../../../src/components/hus/HUsPanel';

describe('HUsPanel', () => {
  it('shows empty state when no stories provided', () => {
    render(<HUsPanel />);
    expect(screen.getByText('Nenhuma história de usuário gerada ainda.')).toBeDefined();
  });

  it('shows empty state for empty array', () => {
    render(<HUsPanel stories={[]} />);
    expect(screen.getByText('Nenhuma história de usuário gerada ainda.')).toBeDefined();
  });

  it('renders story cards when stories are provided', () => {
    const stories = [
      {
        id: 'HU-001',
        role: 'Como usuário',
        action: 'Quero fazer login',
        benefit: 'Para acessar o sistema',
        acceptanceCriteria: ['Validar email', 'Validar senha'],
      },
      {
        id: 'HU-002',
        role: 'Como admin',
        action: 'Quero gerenciar usuários',
        benefit: 'Para manter o sistema',
        acceptanceCriteria: ['Listar usuários'],
      },
    ];
    render(<HUsPanel stories={stories} />);
    expect(screen.getByText('HU-001')).toBeDefined();
    expect(screen.getByText('HU-002')).toBeDefined();
  });
});
