#!/usr/bin/env bash
set -e

echo "🚑 [Phase 11] Atualizando testes da UI para refletir novos componentes..."

# ==============================================================================
# 1. Atualizar teste do WorkspaceTabs
# Ajustar seletores e mocks para a nova implementação
# ==============================================================================
echo "📝 Atualizando packages/ui/test/components/WorkspaceTabs.test.tsx..."

cat > packages/ui/test/components/WorkspaceTabs.test.tsx <<EOF
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
EOF

# ==============================================================================
# 2. Atualizar teste do ProjectWizard
# Ajustar para testar o Modal Placeholder atual
# ==============================================================================
echo "📝 Atualizando packages/ui/test/components/wizard/ProjectWizard.test.tsx..."

cat > packages/ui/test/components/wizard/ProjectWizard.test.tsx <<EOF
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectWizard } from '../../src/components/wizard/ProjectWizard';
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
EOF

# ==============================================================================
# 3. Validação
# ==============================================================================
echo "🛡️  Rodando testes da UI..."
pnpm --filter @mini-ide/ui test

echo "✅ Testes atualizados e passando."
