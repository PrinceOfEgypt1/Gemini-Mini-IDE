import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

/**
 * Propriedades do componente Button.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Estilo visual do botão.
   * @defaultValue 'secondary'
   */
  variant?: 'primary' | 'secondary' | 'ghost';

  /**
   * Se verdadeiro, exibe um spinner e desabilita o botão.
   * @defaultValue false
   */
  isLoading?: boolean;
}

/**
 * Componente de botão padrão da aplicação.
 * Suporta variantes visuais e estado de carregamento automático.
 * 
 * @param props - Propriedades do botão (incluindo props HTML padrão).
 */
export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'secondary', 
  isLoading, 
  className, 
  disabled, 
  ...props 
}) => {
  return (
    <button 
      className={clsx('btn', variant, className)} 
      disabled={disabled || isLoading}
      style={{ opacity: (disabled || isLoading) ? 0.7 : 1, cursor: (disabled || isLoading) ? 'not-allowed' : 'pointer' }}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" size={16} />}
      {children}
    </button>
  );
};
