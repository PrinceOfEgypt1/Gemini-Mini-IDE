import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { Button } from '../common/Button';

export interface HeaderProps {
  onCreateClick: () => void;
  onQuickStartClick: () => void;
  onSettingsClick: () => void;
  onHelpClick: () => void;
}

/**
 * Header com animações cinematográficas.
 * Oferece uma experiência visual elegante e responsiva.
 */
export const Header: React.FC<HeaderProps> = ({
  onCreateClick,
  onQuickStartClick,
  onSettingsClick,
  onHelpClick,
}) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: 'easeOut',
      },
    }),
  };

  const buttonHoverVariants: Variants = {
    hover: {
      scale: 1.05,
      transition: {
        duration: 0.2,
        ease: 'easeInOut',
      },
    },
  };

  return (
    <motion.header
      className="h-14 flex-none flex items-center gap-3 px-4 bg-[var(--bg-panel)]/90 border-b border-[var(--border-main)] shadow-sm z-10 backdrop-blur-sm"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="font-bold text-lg tracking-tight"
        custom={0}
        variants={itemVariants}
      >
        Gemini Mini-IDE
      </motion.div>

      <motion.span
        className="px-2.5 py-1 rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] text-xs font-medium"
        custom={1}
        variants={itemVariants}
      >
        v0.17.1
      </motion.span>

      <div className="flex-1" />

      <motion.div className="flex gap-2 items-center">
        <motion.div custom={2} variants={itemVariants}>
          <motion.div whileHover="hover" variants={buttonHoverVariants}>
            <Button variant="ghost" onClick={onCreateClick}>
              Criar
            </Button>
          </motion.div>
        </motion.div>

        <motion.div custom={3} variants={itemVariants}>
          <motion.div whileHover="hover" variants={buttonHoverVariants}>
            <Button id="btnQuickStart" variant="ghost" onClick={onQuickStartClick}>
              Quick Start
            </Button>
          </motion.div>
        </motion.div>

        <div className="w-px h-6 bg-[var(--border-main)] mx-1"></div>

        <motion.button
          id="btnPreferences"
          onClick={onSettingsClick}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] hover:text-[var(--brand-primary)] transition-all"
          custom={4}
          variants={itemVariants}
          whileHover={{
            scale: 1.1,
            rotate: 90,
            transition: { duration: 0.3 },
          }}
        >
          ⚙️
        </motion.button>

        <motion.button
          onClick={onHelpClick}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-panel-hover)] border border-[var(--border-main)] hover:text-[var(--brand-primary)] transition-all"
          custom={5}
          variants={itemVariants}
          whileHover={{
            scale: 1.1,
            transition: { duration: 0.3 },
          }}
        >
          ?
        </motion.button>
      </motion.div>
    </motion.header>
  );
};
