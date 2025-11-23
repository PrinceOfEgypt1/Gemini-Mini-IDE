#!/usr/bin/env bash
set -e

echo "🚑 [Phase 11] Removendo console.log do ProjectWizard..."

# ==============================================================================
# 1. Reescrever ProjectWizard.tsx sem console.log
# ==============================================================================
echo "📝 Atualizando packages/ui/src/components/wizard/ProjectWizard.tsx..."

cat > packages/ui/src/components/wizard/ProjectWizard.tsx <<EOF
import React from 'react';
import { Button } from '../Button';

export interface ProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectWizard: React.FC<ProjectWizardProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#141b2b] border border-[#24304a] rounded-xl shadow-2xl w-[600px] max-w-[95vw] p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#e6ecff]">Novo Projeto</h2>
          <button onClick={onClose} className="text-[#9fb0d3] hover:text-white">✕</button>
        </div>
        
        <div className="space-y-4">
          <p className="text-[#9fb0d3]">Wizard de criação de projeto (Placeholder)</p>
          
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            {/* TODO: Conectar com a lógica de criação de projeto */}
            <Button onClick={() => {}}>Criar</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
EOF

# ==============================================================================
# 2. Validação
# ==============================================================================
echo "🛡️  Validando Lint da UI..."
pnpm --filter @mini-ide/ui lint

echo "✅ ProjectWizard corrigido."
