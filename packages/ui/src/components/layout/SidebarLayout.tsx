import React from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from '../Sidebar';

export interface SidebarLayoutProps {
  files: Array<{ path: string; content: string }>;
  onSelectFile: (path: string) => void;
}

/**
 * Componente de layout da sidebar com animações cinematográficas.
 * Oferece uma transição suave ao abrir/fechar.
 */
export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ files, onSelectFile }) => {
  const sidebarVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div
      className="w-72 flex-none border-r border-[var(--border-main)] flex flex-col overflow-hidden"
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
    >
      <Sidebar files={files} onSelectFile={onSelectFile} />
    </motion.div>
  );
};
