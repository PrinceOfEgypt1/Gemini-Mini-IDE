import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceTabs } from '../../src/components/WorkspaceTabs';
import React from 'react';

describe('WorkspaceTabs', () => {
  const mockOnTabChange = vi.fn();

  it('renderiza os botões das abas principais', () => {
    render(<WorkspaceTabs activeTab="overview" onTabChange={mockOnTabChange} />);
    
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('HUs')).toBeDefined();
    expect(screen.getByText('Docs')).toBeDefined();
  });

  it('dispara onTabChange ao clicar', () => {
    render(<WorkspaceTabs activeTab="overview" onTabChange={mockOnTabChange} />);
    
    const tabDocs = screen.getByText('Docs');
    fireEvent.click(tabDocs);
    
    expect(mockOnTabChange).toHaveBeenCalledWith('docs');
  });

  it('aplica estilo ativo na aba selecionada', () => {
    render(<WorkspaceTabs activeTab="hus" onTabChange={mockOnTabChange} />);
    
    const tabHu = screen.getByText('HUs');
    // Verifica se tem a classe de fundo azul (bg-[#4ba3ff]) ou similar
    expect(tabHu.className).toContain('bg-[#4ba3ff]');
  });
});
