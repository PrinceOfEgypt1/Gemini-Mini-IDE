import React, { useRef } from 'react';
import { motion, type Variants } from 'framer-motion';
import { ConversationChat } from '../chat/ConversationChat';
import type { ConversationChatHandle } from '../chat/ConversationChat';
import type { GeneratedProject } from '../../hooks';

export interface ChatPanelProps {
  chatMode: 'classic' | 'interactive';
  onChatModeChange: (mode: 'classic' | 'interactive') => void;
  onProjectGenerated: (result: GeneratedProject) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

/**
 * Componente do painel de chat com animações cinematográficas.
 * Oferece uma experiência de chat interativa e responsiva.
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({
  chatMode,
  onChatModeChange,
  onProjectGenerated,
  onToast,
}) => {
  const conversationChatRef = useRef<ConversationChatHandle>(null);

  const panelVariants: Variants = {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  const modeButtonVariants: Variants = {
    active: {
      borderBottomColor: 'var(--brand-primary)',
      color: 'var(--brand-primary)',
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    inactive: {
      borderBottomColor: 'transparent',
      color: 'var(--text-muted)',
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.aside
      className="w-96 flex-none flex flex-col m-3 ml-0 bg-[var(--bg-panel)] border border-[var(--border-main)] rounded-xl shadow-sm overflow-hidden"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Chat mode toggle */}
      <div className="flex-none flex border-b border-[var(--border-main)]">
        <motion.button
          onClick={() => onChatModeChange('interactive')}
          className="flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2"
          variants={modeButtonVariants}
          animate={chatMode === 'interactive' ? 'active' : 'inactive'}
        >
          Chat Interativo
        </motion.button>
        <motion.button
          onClick={() => onChatModeChange('classic')}
          className="flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2"
          variants={modeButtonVariants}
          animate={chatMode === 'classic' ? 'active' : 'inactive'}
        >
          Chat Classico
        </motion.button>
      </div>

      {chatMode === 'interactive' ? (
        <ConversationChat
          ref={conversationChatRef}
          onProjectGenerated={(result: unknown) => onProjectGenerated(result as GeneratedProject)}
          onToast={onToast}
        />
      ) : (
        <div className="flex-1 p-4 text-[var(--text-muted)] text-sm">
          Chat clássico em desenvolvimento...
        </div>
      )}
    </motion.aside>
  );
};
