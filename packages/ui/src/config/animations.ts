/**
 * Configuracao centralizada de animacoes cinematograficas.
 * Define variantes, transicoes e efeitos reutilizaveis em toda a aplicacao.
 */

import type { Transition, Variants, Easing } from 'framer-motion';

// ============================================================================
// TRANSICOES PADRAO
// ============================================================================

const easeInOut: Easing = 'easeInOut';
const easeLinear: Easing = 'linear';

export const TRANSITIONS = {
  fast: { duration: 0.2, ease: easeInOut } as Transition,
  normal: { duration: 0.3, ease: easeInOut } as Transition,
  slow: { duration: 0.5, ease: easeInOut } as Transition,
  verySlow: { duration: 0.8, ease: easeInOut } as Transition,
  spring: { type: 'spring' as const, stiffness: 300, damping: 30 } as Transition,
  springBouncy: { type: 'spring' as const, stiffness: 200, damping: 10 } as Transition,
  springSmooth: { type: 'spring' as const, stiffness: 100, damping: 20 } as Transition,
};

// ============================================================================
// VARIANTES DE ENTRADA/SAIDA
// ============================================================================

export const fadeInOut: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

export const slideInFromRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const slideInFromTop: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const slideInFromBottom: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
};

export const rotateIn: Variants = {
  hidden: { opacity: 0, rotate: -10 },
  visible: { opacity: 1, rotate: 0 },
  exit: { opacity: 0, rotate: 10 },
};

// ============================================================================
// VARIANTES DE HOVER
// ============================================================================

export const hoverScale = {
  scale: 1.05,
};

export const hoverScaleLarge = {
  scale: 1.1,
};

export const hoverLift = {
  y: -4,
};

export const hoverGlow = {
  boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
};

// ============================================================================
// VARIANTES DE CONTAINER (STAGGER)
// ============================================================================

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeInOut },
  },
};

export const fastContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const fastItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeInOut },
  },
};

// ============================================================================
// VARIANTES DE MODAL
// ============================================================================

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeInOut },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: { duration: 0.2, ease: easeInOut },
  },
};

// ============================================================================
// VARIANTES DE PROGRESSO
// ============================================================================

export const progressBarVariants: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.5, ease: easeInOut },
  },
};

export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: easeInOut,
    },
  },
};

// ============================================================================
// VARIANTES DE LOADING
// ============================================================================

export const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: easeLinear,
    },
  },
};

export const bouncingDotsVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 1.4,
      repeat: Infinity,
      ease: easeInOut,
    },
  },
};

// ============================================================================
// VARIANTES DE LISTA
// ============================================================================

export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: easeInOut },
  },
};

// ============================================================================
// VARIANTES DE PAGINA
// ============================================================================

export const pageTransitionVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeInOut },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2, ease: easeInOut },
  },
};

// ============================================================================
// EFEITOS ESPECIAIS
// ============================================================================

export const shimmerVariants: Variants = {
  animate: {
    backgroundPosition: ['200% 0%', '-200% 0%'],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: easeLinear,
    },
  },
};

export const floatingVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: easeInOut,
    },
  },
};

export const glitchVariants: Variants = {
  animate: {
    x: [0, -2, 2, -2, 0],
    transition: {
      duration: 0.3,
      repeat: Infinity,
      repeatDelay: 2,
    },
  },
};

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Combina variantes com transicoes personalizadas.
 */
export function withTransition(
  variants: Variants,
  transition: Transition = TRANSITIONS.normal
): Variants {
  return Object.entries(variants).reduce((acc, [key, value]) => {
    if (typeof value === 'object' && value !== null) {
      acc[key] = {
        ...value,
        transition: (value as Record<string, unknown>).transition || transition,
      };
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as Variants);
}
