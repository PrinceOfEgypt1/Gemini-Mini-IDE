#!/usr/bin/env bash
set -e

echo "🚑 [Phase 13] Atualizando testes para reconhecer Variáveis CSS..."

# ==============================================================================
# 1. Atualizar WorkspaceTabs.test.tsx
# Substitui a verificação de HEX por VAR
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
    
    // FIX: Agora verificamos se a classe contém a variável do tema, não o hex fixo
    expect(tabHu.className).toContain('bg-[var(--brand-primary)]');
  });
});
EOF

# ==============================================================================
# 2. Validação
# ==============================================================================
echo "🛡️  Rodando testes da UI..."
pnpm --filter @mini-ide/ui test

echo "✅ Testes de UI corrigidos e passando."
