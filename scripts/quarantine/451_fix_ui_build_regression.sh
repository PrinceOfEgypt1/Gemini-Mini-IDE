#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

log_info "Iniciando correção de regressões da UI (Button & Imports)..."

# 1. REESCREVER O COMPONENTE BUTTON (COMMON) PARA SUPORTAR 'SIZE'
# Isso resolve o erro: Property 'size' does not exist on type 'IntrinsicAttributes & ButtonProps'
BUTTON_PATH="packages/ui/src/components/common/Button.tsx"
log_info "Padronizando componente Button em $BUTTON_PATH..."

mkdir -p $(dirname "$BUTTON_PATH")

cat > "$BUTTON_PATH" << 'EOF'
import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading, 
  className, 
  disabled, 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--brand-primary)] disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-hover)] shadow-sm border border-transparent",
    secondary: "bg-[var(--bg-panel-hover)] text-[var(--text-primary)] border border-[var(--border-main)] hover:bg-[var(--bg-app)]",
    ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)] border border-transparent",
    danger: "bg-red-600 text-white hover:bg-red-700 border border-transparent"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button 
      className={clsx(baseStyles, variants[variant], sizes[size], className)} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin mr-2" size={16} />}
      {children}
    </button>
  );
};
EOF
log_ok "Componente Button atualizado com suporte a 'size'."

# 2. CORRIGIR IMPORTAÇÕES NO APP.TSX
# Problema: App.tsx ainda aponta para ./components/Button (deletado)
APP_PATH="packages/ui/src/App.tsx"
log_info "Corrigindo imports no App.tsx..."

# Substitui a importação antiga pela nova
sed -i "s|import { Button } from './components/Button';|import { Button } from './components/common/Button';|g" "$APP_PATH"

# Garantia extra: verificar se existem outros arquivos importando do local errado
log_info "Verificando e corrigindo outros imports quebrados..."
grep -r "from '../Button'" packages/ui/src/components || true
find packages/ui/src -type f -name "*.tsx" -print0 | xargs -0 sed -i "s|from '../Button'|from '../common/Button'|g"
find packages/ui/src -type f -name "*.tsx" -print0 | xargs -0 sed -i "s|from '../../components/Button'|from '../../components/common/Button'|g"

log_ok "Imports corrigidos."

# 3. RECOMPILAR UI PARA VALIDAÇÃO
log_info "Recompilando UI..."
cd packages/ui
if ../../node_modules/.bin/tsc -b && ../../node_modules/.bin/vite build; then
    log_ok "UI compilada com sucesso!"
else
    echo "Erro ainda persiste na compilação da UI."
    exit 1
fi
cd ../..

# 4. RESTART FINAL
log_info "Reiniciando servidor para aplicar tudo..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Correção de Build concluída. Execute 'pnpm --filter @mini-ide/server start'."
