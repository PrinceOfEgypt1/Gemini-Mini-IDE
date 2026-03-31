import React, { useState } from 'react';
import { motion, type Variants } from 'framer-motion';

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  icon?: string;
}

export interface AnimatedTimelineProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
}

/**
 * Timeline animada com efeitos cinematográficos.
 * 
 * Características:
 * - Animações de entrada em cascata
 * - Efeitos de hover com spring physics
 * - Indicador de progresso animado
 * - Transições suaves entre eventos
 */
export const AnimatedTimeline: React.FC<AnimatedTimelineProps> = ({
  events,
  onEventClick,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20, y: 20 },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const dotVariants: Variants = {
    hidden: { scale: 0 },
    visible: {
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
      },
    },
    hover: {
      scale: 1.3,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 10,
      },
    },
  };

  const lineVariants: Variants = {
    hidden: { scaleY: 0 },
    visible: (i: number) => ({
      scaleY: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.6,
        ease: 'easeInOut',
      },
    }),
  };

  const contentVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2,
        ease: 'easeIn',
      },
    },
  };

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          className="relative flex gap-6"
          variants={itemVariants}
        >
          {/* Timeline Line */}
          <div className="flex flex-col items-center">
            {/* Dot */}
            <motion.div
              className={`w-4 h-4 rounded-full border-2 cursor-pointer transition-colors ${
                selectedEvent === event.id
                  ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]'
                  : 'bg-[var(--bg-app)] border-[var(--brand-primary)]'
              }`}
              variants={dotVariants}
              whileHover="hover"
              onClick={() => {
                setSelectedEvent(event.id);
                onEventClick?.(event);
              }}
            />

            {/* Connecting Line */}
            {index < events.length - 1 && (
              <motion.div
                className="w-0.5 h-16 bg-gradient-to-b from-[var(--brand-primary)] to-[var(--border-main)]"
                custom={index}
                variants={lineVariants}
              />
            )}
          </div>

          {/* Content */}
          <motion.div
            className={`flex-1 p-4 rounded-lg border transition-all cursor-pointer ${
              selectedEvent === event.id
                ? 'border-[var(--brand-primary)] bg-[var(--bg-panel-hover)]'
                : 'border-[var(--border-main)] hover:border-[var(--brand-primary)]'
            }`}
            onClick={() => {
              setSelectedEvent(event.id);
              onEventClick?.(event);
            }}
            whileHover={{
              scale: 1.02,
              transition: { type: 'spring', stiffness: 300, damping: 20 },
            }}
          >
            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="flex items-start gap-3">
                {event.icon && (
                  <span className="text-2xl mt-1">{event.icon}</span>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-[var(--text-primary)]">
                    {event.title}
                  </h4>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {event.description}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    {new Date(event.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
};
