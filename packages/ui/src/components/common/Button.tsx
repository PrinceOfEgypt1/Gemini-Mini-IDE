import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

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
