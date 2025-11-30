import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkspaceTabs } from '../../src/components/WorkspaceTabs';

describe('WorkspaceTabs', () => {
  it('renderiza os botões das abas principais', () => {
    render(<WorkspaceTabs activeTab="overview" onTabChange={() => {}} />);
    
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('HUs')).toBeDefined();
    // Verificamos se a nova aba Código está presente também
    expect(screen.getByText('Código')).toBeDefined(); 
  });

  it('dispara onTabChange ao clicar', () => {
    const handleTabChange = vi.fn();
    render(<WorkspaceTabs activeTab="overview" onTabChange={handleTabChange} />);

    fireEvent.click(screen.getByText('HUs'));
    expect(handleTabChange).toHaveBeenCalledWith('hus');
  });

  it('aplica estilo ativo na aba selecionada', () => {
    render(<WorkspaceTabs activeTab="hus" onTabChange={() => {}} />);

    const tabHu = screen.getByText('HUs');
    
    // FIX: O estilo mudou de background color para border-bottom
    // Antes: expect(tabHu.className).toContain('bg-[var(--brand-primary)]');
    
    // Agora verificamos o sublinhado e a cor do texto/borda
    expect(tabHu.className).toContain('border-b-2');
    expect(tabHu.className).toContain('border-[var(--brand-primary)]');
    expect(tabHu.className).toContain('text-[var(--brand-primary)]');
  });
});
