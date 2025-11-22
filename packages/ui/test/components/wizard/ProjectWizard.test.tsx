import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectWizard } from '../../../src/components/wizard/ProjectWizard';
import { ToastProvider } from '../../../src/contexts/ToastContext';
import React from 'react';

describe('ProjectWizard', () => {
  const mockClose = vi.fn();

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <ProjectWizard onClose={mockClose} />
      </ToastProvider>
    );
  };

  it('renderiza o título do passo 1', () => {
    renderComponent();
    expect(screen.getByText(/Novo Projeto \(Passo 1\/3\)/i)).toBeDefined();
  });

  it('mostra o campo de intenção', () => {
    renderComponent();
    expect(screen.getByText('O que você deseja construir?')).toBeDefined();
  });
});
