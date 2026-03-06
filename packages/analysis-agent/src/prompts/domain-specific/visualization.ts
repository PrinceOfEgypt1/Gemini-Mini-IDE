/**
 * Visualization domain examples for code generation
 *
 * These examples demonstrate UI components for controlling
 * and displaying data structure animations.
 */

export const VISUALIZATION_EXAMPLES = `
## Visualization UI Examples

### Example 1: StepControls Component

\`\`\`typescript
import { motion } from "framer-motion";
import {
  PlayIcon,
  PauseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon
} from "@heroicons/react/24/solid";

interface StepControlsProps {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

/**
 * Control panel for animation playback.
 * Provides play/pause, step navigation, and speed control.
 */
export function StepControls({
  isPlaying,
  currentStep,
  totalSteps,
  speed,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onSpeedChange,
  onReset
}: StepControlsProps) {
  const progress = totalSteps > 0 ? (currentStep / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      {/* Progress bar */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full"
          animate={{ width: \`\${progress}%\` }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Step counter */}
      <div className="text-center text-sm text-gray-600">
        Step {currentStep + 1} of {totalSteps}
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onReset}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          title="Reset"
        >
          <ArrowPathIcon className="w-5 h-5 text-gray-600" />
        </button>

        <button
          onClick={onStepBack}
          disabled={currentStep === 0}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
          title="Previous step"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <PauseIcon className="w-6 h-6" />
          ) : (
            <PlayIcon className="w-6 h-6" />
          )}
        </button>

        <button
          onClick={onStepForward}
          disabled={currentStep >= totalSteps - 1}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 transition-colors"
          title="Next step"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Speed:</span>
        <input
          type="range"
          min="0.25"
          max="3"
          step="0.25"
          value={speed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm font-medium w-12 text-right">{speed}x</span>
      </div>
    </div>
  );
}
\`\`\`

### Example 2: OperationsLog Component

\`\`\`typescript
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface Operation {
  id: string;
  method: string;
  params: unknown[];
  result: unknown;
  timestamp: Date;
  duration: number;
}

interface OperationsLogProps {
  operations: Operation[];
  maxVisible?: number;
  onOperationClick?: (op: Operation) => void;
}

/**
 * Displays a scrollable log of operations performed on the data structure.
 * Shows method calls, parameters, results, and timing information.
 */
export function OperationsLog({
  operations,
  maxVisible = 10,
  onOperationClick
}: OperationsLogProps) {
  const visibleOps = operations.slice(-maxVisible);

  const formatResult = (result: unknown): string => {
    if (result === undefined) return "void";
    if (result === null) return "null";
    if (typeof result === "object") return JSON.stringify(result);
    return String(result);
  };

  const formatParams = (params: unknown[]): string => {
    if (params.length === 0) return "";
    return params.map(p => JSON.stringify(p)).join(", ");
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
      <h3 className="text-gray-400 text-xs uppercase mb-3 sticky top-0 bg-gray-900">
        Operations Log
      </h3>

      <AnimatePresence initial={false}>
        {visibleOps.map((op) => (
          <motion.div
            key={op.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, height: 0 }}
            onClick={() => onOperationClick?.(op)}
            className="mb-2 p-2 rounded bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-blue-400">
                {op.method}
                <span className="text-gray-400">
                  ({formatParams(op.params)})
                </span>
              </span>
              <span className="text-gray-500 text-xs">
                {op.duration}ms
              </span>
            </div>

            <div className="flex items-center justify-between mt-1">
              <span className="text-green-400 text-xs">
                → {formatResult(op.result)}
              </span>
              <span className="text-gray-600 text-xs">
                {format(op.timestamp, "HH:mm:ss.SSS")}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {operations.length === 0 && (
        <div className="text-gray-500 text-center py-8">
          No operations yet. Try calling a method!
        </div>
      )}
    </div>
  );
}
\`\`\`
`;
