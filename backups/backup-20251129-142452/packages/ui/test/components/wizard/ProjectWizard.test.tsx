import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
// CORREÇÃO AQUI: Subir 3 níveis (wizard -> components -> test -> ui root)
import { ProjectWizard } from '../../../src/components/wizard/ProjectWizard';
import React from 'react';

describe('ProjectWizard', () => {
  const mockOnClose = vi.fn();

  it('não renderiza nada se isOpen for false', () => {
    render(<ProjectWizard isOpen={false} onClose={mockOnClose} />);
    const title = screen.queryByText('Novo Projeto');
    expect(title).toBeNull();
  });

  it('renderiza o modal quando isOpen for true', () => {
    render(<ProjectWizard isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Novo Projeto')).toBeDefined();
    expect(screen.getByText('Wizard de criação de projeto (Placeholder)')).toBeDefined();
  });

  it('chama onClose ao clicar em Cancelar', () => {
    render(<ProjectWizard isOpen={true} onClose={mockOnClose} />);
    
    const btnCancel = screen.getByText('Cancelar');
    fireEvent.click(btnCancel);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
});
