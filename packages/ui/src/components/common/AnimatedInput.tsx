import React, { useState, ChangeEvent } from 'react';
import { motion, Variants } from 'framer-motion';
import { TRANSITIONS } from '../../config/animations';

export interface AnimatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  animated?: boolean;
}

/**
 * Input com animacoes cinematograficas.
 */
export const AnimatedInput = React.forwardRef<
  HTMLInputElement,
  AnimatedInputProps
>((
  {
    label,
    error,
    icon,
    animated = true,
    className = '',
    ...props
  },
  ref
) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value);

  const labelVariants: Variants = {
    initial: { y: 0, scale: 1 },
    float: { y: -24, scale: 0.75 },
  };

  const errorVariants: Variants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value);
    props.onChange?.(e);
  };

  return (
    <div className="relative">
      {label && (
        <motion.label
          className="absolute left-3 top-3 text-[var(--text-muted)] pointer-events-none"
          variants={animated ? labelVariants : undefined}
          animate={isFocused || hasValue ? 'float' : 'initial'}
          transition={TRANSITIONS.fast}
        >
          {label}
        </motion.label>
      )}

      <div className="relative flex items-center">
        {icon && (
          <motion.span
            className="absolute left-3 text-[var(--text-muted)]"
            animate={isFocused ? { color: 'var(--brand-primary)' } : {}}
            transition={TRANSITIONS.fast}
          >
            {icon}
          </motion.span>
        )}

        <motion.input
          ref={ref}
          className={`
            w-full px-3 py-2 border border-[var(--border-main)] rounded-lg
            bg-[var(--bg-app)] text-[var(--text-primary)]
            focus:outline-none focus:border-[var(--brand-primary)]
            transition-colors duration-200
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleChange}
          animate={isFocused ? { boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' } : {}}
          transition={TRANSITIONS.fast}
          {...props}
        />
      </div>

      {error && (
        <motion.p
          className="text-red-500 text-sm mt-1"
          variants={errorVariants}
          initial="hidden"
          animate="visible"
          transition={TRANSITIONS.fast}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
});

AnimatedInput.displayName = 'AnimatedInput';
