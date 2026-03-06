import React from 'react';
import { motion } from 'framer-motion';
import { TRANSITIONS, hoverScale } from '../../config/animations';

export interface AnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Botao com animacoes cinematograficas.
 */
export const AnimatedButton = React.forwardRef<
  HTMLButtonElement,
  AnimatedButtonProps
>((
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon,
    children,
    disabled,
    ...props
  },
  ref
) => {
  const variantStyles = {
    primary: 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90',
    secondary: 'bg-[var(--bg-panel-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]/80 border border-[var(--border-main)]',
    ghost: 'text-[var(--text-primary)] hover:bg-[var(--bg-panel-hover)]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <motion.button
      ref={ref}
      className={`
        relative inline-flex items-center gap-2 font-medium rounded-lg
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
      `}
      whileHover={!disabled ? hoverScale : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <motion.div
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {!isLoading && icon && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={TRANSITIONS.fast}
        >
          {icon}
        </motion.span>
      )}

      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={TRANSITIONS.normal}
      >
        {children}
      </motion.span>
    </motion.button>
  );
});

AnimatedButton.displayName = 'AnimatedButton';
