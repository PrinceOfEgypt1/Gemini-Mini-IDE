import React from 'react';
import { motion, Variants } from 'framer-motion';
import { TRANSITIONS, hoverLift } from '../../config/animations';

export interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  hoverable?: boolean;
  animated?: boolean;
  delay?: number;
}

/**
 * Card com animacoes cinematograficas.
 */
export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'default',
  hoverable = true,
  animated = true,
  delay = 0,
}) => {
  const variantStyles = {
    default: 'bg-[var(--bg-panel)] border border-[var(--border-main)]',
    elevated: 'bg-[var(--bg-panel)] border border-[var(--border-main)] shadow-lg',
    outlined: 'bg-transparent border-2 border-[var(--border-main)]',
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        ...TRANSITIONS.normal,
        delay,
      },
    },
  };

  return (
    <motion.div
      className={`
        rounded-lg p-4 transition-all duration-200 cursor-pointer
        ${variantStyles[variant]}
        ${className}
      `}
      variants={animated ? containerVariants : undefined}
      initial={animated ? 'hidden' : undefined}
      animate="visible"
      whileHover={hoverable ? hoverLift : undefined}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};
