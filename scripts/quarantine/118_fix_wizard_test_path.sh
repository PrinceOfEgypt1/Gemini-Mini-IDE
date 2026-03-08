#!/usr/bin/env bash
set -e

echo "🚑 [Phase 11] Corrigindo caminho de importação no teste do ProjectWizard..."

# ==============================================================================
# 1. Corrigir o arquivo de teste
# Alteração: de "../../src..." para "../../../src..."
# ==============================================================================
echo "📝 Reescrevendo packages/ui/test/components/wizard/ProjectWizard.test.tsx..."

cat > packages/ui/test/components/wizard/ProjectWizard.test.tsx <<EOF
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
EOF

# ==============================================================================
# 2. Verificação de Integridade
# ==============================================================================
SOURCE_FILE="packages/ui/src/components/wizard/ProjectWizard.tsx"
if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ ALERTA: O arquivo fonte $SOURCE_FILE parece não existir."
    echo "Isso causará falha no teste. Verifique se o script 115 rodou corretamente."
    exit 1
fi

# ==============================================================================
# 3. Validação (Executar Testes)
# ==============================================================================
echo "🛡️  Rodando testes da UI..."
pnpm --filter @mini-ide/ui test

echo "✅ Caminho corrigido. O teste deve passar agora."
