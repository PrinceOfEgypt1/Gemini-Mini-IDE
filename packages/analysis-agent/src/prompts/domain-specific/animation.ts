/**
 * Animation domain examples for code generation
 *
 * These examples demonstrate proper use of Framer Motion, React hooks,
 * and animation patterns for data structure visualizations.
 */

export const ANIMATION_EXAMPLES = `
## Animation Examples for Data Structure Visualizations

### Example 1: ArrayVisualizer with Framer Motion

\`\`\`typescript
import { motion, AnimatePresence } from "framer-motion";
import { useAnimationController } from "../hooks/useAnimationController";
import type { AnimationStep } from "../types/animation";

interface ArrayVisualizerProps {
  data: number[];
  currentStep: AnimationStep | null;
  highlightIndices?: number[];
}

/**
 * Visualizes an array with animated bars.
 * Colors indicate current operation state:
 * - Blue: Reading/comparing
 * - Red: Swapping
 * - Green: Sorted/final position
 * - Gray: Default state
 */
export function ArrayVisualizer({
  data,
  currentStep,
  highlightIndices = []
}: ArrayVisualizerProps) {
  const maxValue = Math.max(...data, 1);

  const getBarColor = (index: number): string => {
    if (!currentStep) return "bg-gray-400";

    if (currentStep.type === "swap") {
      if (currentStep.indices.includes(index)) return "bg-red-500";
    }
    if (currentStep.type === "compare") {
      if (currentStep.indices.includes(index)) return "bg-blue-500";
    }
    if (currentStep.type === "sorted") {
      if (currentStep.indices.includes(index)) return "bg-green-500";
    }

    if (highlightIndices.includes(index)) return "bg-yellow-400";
    return "bg-gray-400";
  };

  return (
    <div className="flex items-end gap-1 h-64 p-4">
      <AnimatePresence mode="popLayout">
        {data.map((value, index) => (
          <motion.div
            key={\`\${index}-\${value}\`}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
              height: \`\${(value / maxValue) * 100}%\`
            }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className={\`w-8 rounded-t \${getBarColor(index)}\`}
          >
            <span className="text-xs text-white text-center block mt-1">
              {value}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
\`\`\`

### Example 2: useAnimationController Hook

\`\`\`typescript
import { useState, useCallback, useRef, useEffect } from "react";
import type { AnimationStep } from "../types/animation";

interface AnimationControllerState {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
}

interface AnimationControllerActions {
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  stepBack: () => void;
  setSpeed: (speed: number) => void;
  reset: () => void;
  goToStep: (step: number) => void;
}

export type AnimationController = AnimationControllerState & AnimationControllerActions;

/**
 * Hook for controlling animation playback.
 * Manages play/pause, stepping, and speed control.
 */
export function useAnimationController(
  steps: AnimationStep[],
  onStepChange?: (step: AnimationStep | null) => void
): AnimationController {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = steps.length;

  // Notify parent of step changes
  useEffect(() => {
    onStepChange?.(steps[currentStep] ?? null);
  }, [currentStep, steps, onStepChange]);

  // Auto-advance when playing
  useEffect(() => {
    if (isPlaying && currentStep < totalSteps - 1) {
      intervalRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 1000 / speed);
    } else if (currentStep >= totalSteps - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isPlaying, currentStep, totalSteps, speed]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const stepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  const goToStep = useCallback((step: number) => {
    setIsPlaying(false);
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)));
  }, [totalSteps]);

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(Math.max(0.1, Math.min(newSpeed, 5)));
  }, []);

  return {
    isPlaying,
    currentStep,
    totalSteps,
    speed,
    play,
    pause,
    stepForward,
    stepBack,
    setSpeed,
    reset,
    goToStep
  };
}
\`\`\`

### Example 3: PseudocodePanel Component

\`\`\`typescript
import { motion } from "framer-motion";

interface PseudocodePanelProps {
  pseudocode: string[];
  highlightLine: number;
  title?: string;
}

/**
 * Displays pseudocode with highlighted current line.
 * Synchronizes with animation steps to show execution flow.
 */
export function PseudocodePanel({
  pseudocode,
  highlightLine,
  title = "Algorithm"
}: PseudocodePanelProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
      {title && (
        <h3 className="text-gray-400 text-xs uppercase mb-2">{title}</h3>
      )}
      <div className="space-y-1">
        {pseudocode.map((line, index) => (
          <motion.div
            key={index}
            animate={{
              backgroundColor: index === highlightLine
                ? "rgba(59, 130, 246, 0.3)"
                : "transparent",
              x: index === highlightLine ? 4 : 0
            }}
            transition={{ duration: 0.2 }}
            className={\`px-2 py-1 rounded \${
              index === highlightLine
                ? "text-blue-300 font-semibold"
                : "text-gray-300"
            }\`}
          >
            <span className="text-gray-500 mr-4 select-none">
              {String(index + 1).padStart(2, "0")}
            </span>
            {line}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
\`\`\`
`;
