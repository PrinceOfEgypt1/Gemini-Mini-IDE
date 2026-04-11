import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, className, onClick, ...rest }: React.PropsWithChildren<{ className?: string; onClick?: () => void }>, ref: React.Ref<HTMLDivElement>) => (
      <div ref={ref} className={className} onClick={onClick} {...rest}>{children}</div>
    )),
    button: React.forwardRef(({ children, onClick, className, ...rest }: React.PropsWithChildren<{ onClick?: () => void; className?: string }>, ref: React.Ref<HTMLButtonElement>) => (
      <button ref={ref} onClick={onClick} className={className} {...rest}>{children}</button>
    )),
    input: React.forwardRef(({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }, ref: React.Ref<HTMLInputElement>) => (
      <input ref={ref} className={className} {...rest} />
    )),
    textarea: React.forwardRef(({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }, ref: React.Ref<HTMLTextAreaElement>) => (
      <textarea ref={ref} className={className} {...rest} />
    )),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock Button
vi.mock('../../../src/components/common/Button', () => ({
  Button: ({ children, onClick, disabled, variant }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>{children}</button>
  ),
}));

// Mock hooks
vi.mock('../../../src/hooks', () => ({
  useReducedMotion: () => false,
}));

import { ProjectWizardRefactored } from '../../../src/components/wizard/ProjectWizardRefactored';

describe('ProjectWizardRefactored', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onProjectGenerated: vi.fn(),
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ProjectWizardRefactored {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the first step (welcome) when opened', () => {
    render(<ProjectWizardRefactored {...defaultProps} />);
    expect(screen.getByText('Bem-vindo ao Assistente de Criação')).toBeDefined();
    expect(screen.getByText('Crie seu Projeto')).toBeDefined();
  });

  it('shows project type options on the first step', () => {
    render(<ProjectWizardRefactored {...defaultProps} />);
    expect(screen.getByText('Web')).toBeDefined();
    expect(screen.getByText('Mobile')).toBeDefined();
    expect(screen.getByText('Backend')).toBeDefined();
  });

  it('navigates to the details step when clicking Next', () => {
    render(<ProjectWizardRefactored {...defaultProps} />);
    fireEvent.click(screen.getByText('Próximo'));
    expect(screen.getByText('Detalhes do Projeto')).toBeDefined();
    expect(screen.getByPlaceholderText('Ex: Meu Projeto Incrível')).toBeDefined();
  });

  it('navigates back when clicking Anterior', () => {
    render(<ProjectWizardRefactored {...defaultProps} />);
    fireEvent.click(screen.getByText('Próximo'));
    expect(screen.getByText('Detalhes do Projeto')).toBeDefined();
    fireEvent.click(screen.getByText('Anterior'));
    expect(screen.getByText('Bem-vindo ao Assistente de Criação')).toBeDefined();
  });

  it('Anterior button is disabled on the first step', () => {
    render(<ProjectWizardRefactored {...defaultProps} />);
    const anteriorBtn = screen.getByText('Anterior');
    expect(anteriorBtn).toHaveProperty('disabled', true);
  });

  it('navigates through all 4 steps', () => {
    render(<ProjectWizardRefactored {...defaultProps} />);

    // Step 1: Welcome
    expect(screen.getByText('Bem-vindo ao Assistente de Criação')).toBeDefined();
    fireEvent.click(screen.getByText('Próximo'));

    // Step 2: Details
    expect(screen.getByText('Detalhes do Projeto')).toBeDefined();
    fireEvent.click(screen.getByText('Próximo'));

    // Step 3: Template
    expect(screen.getByText('Escolha um Template')).toBeDefined();
    fireEvent.click(screen.getByText('Próximo'));

    // Step 4: Review
    expect(screen.getByText('Revisar')).toBeDefined();
  });

  it('shows "Criar Projeto" on the last step and generates project', () => {
    render(<ProjectWizardRefactored {...defaultProps} />);

    // Navigate to the last step
    fireEvent.click(screen.getByText('Próximo')); // -> details
    fireEvent.click(screen.getByText('Próximo')); // -> template
    fireEvent.click(screen.getByText('Próximo')); // -> review

    expect(screen.getByText('Criar Projeto')).toBeDefined();

    fireEvent.click(screen.getByText('Criar Projeto'));
    expect(defaultProps.onProjectGenerated).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('allows filling in project name and description', () => {
    render(<ProjectWizardRefactored {...defaultProps} />);
    fireEvent.click(screen.getByText('Próximo')); // -> details

    const nameInput = screen.getByPlaceholderText('Ex: Meu Projeto Incrível');
    const descTextarea = screen.getByPlaceholderText('Descreva seu projeto...');

    fireEvent.change(nameInput, { target: { value: 'Meu App' } });
    fireEvent.change(descTextarea, { target: { value: 'Um app incrivel' } });

    // Navigate to review to verify values are shown
    fireEvent.click(screen.getByText('Próximo')); // -> template
    fireEvent.click(screen.getByText('Próximo')); // -> review

    expect(screen.getByText('Meu App')).toBeDefined();
    expect(screen.getByText('Um app incrivel')).toBeDefined();
  });

  it('shows "Nao especificado" in review when fields are empty', () => {
    render(<ProjectWizardRefactored {...defaultProps} />);
    fireEvent.click(screen.getByText('Próximo')); // -> details
    fireEvent.click(screen.getByText('Próximo')); // -> template
    fireEvent.click(screen.getByText('Próximo')); // -> review

    expect(screen.getByText('Não especificado')).toBeDefined();
    expect(screen.getByText('Não especificada')).toBeDefined();
    expect(screen.getByText('Não selecionado')).toBeDefined();
  });

  it('allows selecting a template', () => {
    render(<ProjectWizardRefactored {...defaultProps} />);
    fireEvent.click(screen.getByText('Próximo')); // -> details
    fireEvent.click(screen.getByText('Próximo')); // -> template

    fireEvent.click(screen.getByText('React + TypeScript'));

    fireEvent.click(screen.getByText('Próximo')); // -> review
    expect(screen.getByText('React + TypeScript')).toBeDefined();
  });

  it('calls onClose when clicking close button', () => {
    const onClose = vi.fn();
    render(<ProjectWizardRefactored {...defaultProps} onClose={onClose} />);

    // The close button is the "✕" character
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop overlay', () => {
    const onClose = vi.fn();
    const { container } = render(<ProjectWizardRefactored {...defaultProps} onClose={onClose} />);

    // The backdrop is the first child div with fixed position
    const backdrop = container.firstChild;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });
});
