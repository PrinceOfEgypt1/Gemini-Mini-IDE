import React from 'react';
import { motion } from 'framer-motion';

export interface LoadingAnimationProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente de carregamento com animações cinematográficas.
 * 
 * Características:
 * - Múltiplas variações de animação
 * - Tamanhos personalizáveis
 * - Mensagens customizáveis
 * - Efeitos de parallax e spring physics
 */
export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  message = 'Carregando...',
  size = 'md',
}) => {
  const sizeMap = {
    sm: { container: 'w-8 h-8', dot: 'w-2 h-2' },
    md: { container: 'w-12 h-12', dot: 'w-3 h-3' },
    lg: { container: 'w-16 h-16', dot: 'w-4 h-4' },
  };

  const containerVariants = {
    animate: {
      rotate: 360,
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  };

  const dotVariants = {
    animate: (i: number) => ({
      y: [0, -10, 0],
      transition: {
        duration: 1.4,
        repeat: Infinity,
        delay: i * 0.2,
        ease: 'easeInOut',
      },
    }),
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.2, 1],
      opacity: [1, 0.5, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Animated Container */}
      <motion.div
        className={`${sizeMap[size].container} relative`}
        variants={containerVariants}
        animate="animate"
      >
        {/* Outer Ring */}
        <motion.div
          className="absolute inset-0 border-2 border-transparent border-t-[var(--brand-primary)] border-r-[var(--brand-primary)] rounded-full"
          variants={pulseVariants}
          animate="animate"
        />

        {/* Inner Dots */}
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`${sizeMap[size].dot} bg-[var(--brand-primary)] rounded-full absolute`}
              style={{
                left: `${50 + 30 * Math.cos((i * 2 * Math.PI) / 3)}%`,
                top: `${50 + 30 * Math.sin((i * 2 * Math.PI) / 3)}%`,
                transform: 'translate(-50%, -50%)',
              }}
              custom={i}
              variants={dotVariants}
              animate="animate"
            />
          ))}
        </div>
      </motion.div>

      {/* Message */}
      {message && (
        <motion.p
          className="text-[var(--text-muted)] text-sm font-medium"
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};

/**
 * Variação alternativa com efeito de onda.
 */
export const WaveLoadingAnimation: React.FC<LoadingAnimationProps> = ({
  message = 'Carregando...',
  size = 'md',
}) => {
  const sizeMap = {
    sm: { height: 'h-6', width: 'w-1' },
    md: { height: 'h-8', width: 'w-1.5' },
    lg: { height: 'h-12', width: 'w-2' },
  };

  const barVariants = {
    animate: (i: number) => ({
      height: ['100%', '50%', '100%'],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        delay: i * 0.1,
        ease: 'easeInOut',
      },
    }),
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex gap-1 items-end">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className={`${sizeMap[size].width} ${sizeMap[size].height} bg-[var(--brand-primary)] rounded-full`}
            custom={i}
            variants={barVariants}
            animate="animate"
          />
        ))}
      </div>

      {message && (
        <motion.p
          className="text-[var(--text-muted)] text-sm font-medium"
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};
