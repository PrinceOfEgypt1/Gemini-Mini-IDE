#!/usr/bin/env bash
set -e

echo "🚑 [Phase 11] Criando componentes de UI faltantes e corrigindo tipos..."

# Garantir diretório
mkdir -p packages/ui/src/components/wizard

# ==============================================================================
# 1. Criar Componente Genérico BUTTON
# Resolve: Cannot find module './components/Button'
# ==============================================================================
echo "📝 Criando packages/ui/src/components/Button.tsx..."
cat > packages/ui/src/components/Button.tsx <<EOF
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4ba3ff] disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#4ba3ff] text-white hover:bg-[#3b82f6]",
    secondary: "bg-[#222b40] text-[#e6ecff] border border-[#24304a] hover:bg-[#2d3748]",
    ghost: "bg-transparent text-[#9fb0d3] hover:text-white hover:bg-[#222b40]"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      className={\`\${baseStyles} \${variants[variant]} \${sizes[size]} \${className}\`}
      {...props}
    >
      {children}
    </button>
  );
};
EOF

# ==============================================================================
# 2. Atualizar PROJECT WIZARD
# Resolve: Property 'isOpen' does not exist on type...
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
            <Button onClick={() => console.log('Criar')}>Criar</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
EOF

# ==============================================================================
# 3. Criar Placeholders (DiscoveryNotes, Timeline, Tabs)
# Resolve: Cannot find module ...
# ==============================================================================

echo "📝 Criando packages/ui/src/components/DiscoveryNotes.tsx..."
cat > packages/ui/src/components/DiscoveryNotes.tsx <<EOF
import React from 'react';

export const DiscoveryNotes: React.FC = () => {
  return (
    <div className="bg-[#141b2b] border border-[#24304a] rounded-lg p-4 h-full">
      <h3 className="font-semibold text-[#e6ecff] mb-3">Discovery Notes</h3>
      <p className="text-sm text-[#9fb0d3]">Notas coletadas aparecerão aqui.</p>
    </div>
  );
};
EOF

echo "📝 Criando packages/ui/src/components/ExploreTimeline.tsx..."
cat > packages/ui/src/components/ExploreTimeline.tsx <<EOF
import React from 'react';

export const ExploreTimeline: React.FC = () => {
  return (
    <div className="p-4">
      <h3 className="font-semibold text-[#e6ecff] mb-3">Timeline</h3>
      <div className="text-sm text-[#9fb0d3]">Eventos recentes aparecerão aqui.</div>
    </div>
  );
};
EOF

echo "📝 Criando packages/ui/src/components/WorkspaceTabs.tsx..."
cat > packages/ui/src/components/WorkspaceTabs.tsx <<EOF
import React from 'react';

interface WorkspaceTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const WorkspaceTabs: React.FC<WorkspaceTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'hus', label: 'HUs' },
    { id: 'docs', label: 'Docs' },
    { id: 'tests', label: 'Testes' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'outputs', label: 'Outputs' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[#24304a]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={\`px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap \${
            activeTab === tab.id
              ? 'bg-[#4ba3ff] text-white'
              : 'bg-[#222b40] text-[#9fb0d3] hover:text-white border border-[#24304a]'
          }\`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
EOF

# ==============================================================================
# 4. Validação Rápida (Typecheck)
# ==============================================================================
echo "🛡️  Validando correções de tipo..."
pnpm --filter @mini-ide/ui typecheck

echo "✅ Componentes criados e tipos corrigidos."
