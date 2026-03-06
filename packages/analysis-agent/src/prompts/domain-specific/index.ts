/**
 * Domain-specific code examples for LLM prompts
 *
 * Provides targeted examples based on project analysis to help
 * the LLM generate more appropriate code for specific domains.
 */

import type { RichAnalysis } from "../../types/rich-schemas.js";
import { ANIMATION_EXAMPLES } from "./animation.js";
import { VISUALIZATION_EXAMPLES } from "./visualization.js";
import { DATA_STRUCTURES_EXAMPLES } from "./data-structures.js";

/**
 * Selects domain-specific code examples based on project analysis.
 *
 * Analyzes the project summary, core entities, and file path to determine
 * which example sets are relevant. Returns concatenated examples for
 * injection into code generation prompts.
 *
 * @param analysis - Rich analysis of the project
 * @param filePath - Path of the file being generated
 * @returns Concatenated domain examples or empty string if none match
 *
 * @example
 * const examples = selectDomainExamples(analysis, "src/visualizers/ArrayVisualizer.tsx");
 * // Returns ANIMATION_EXAMPLES + VISUALIZATION_EXAMPLES
 */
export function selectDomainExamples(
  analysis: RichAnalysis,
  filePath: string
): string {
  const examples: string[] = [];
  const summaryLower = analysis.summary.toLowerCase();
  const entitiesLower = analysis.coreEntities.join(" ").toLowerCase();
  const combinedText = summaryLower + " " + entitiesLower;

  // Detect visualization/animation domain
  const isVisualization = /visuali|animat|simulat|didáti|educaci|interativ|didatic|educac/i
    .test(combinedText);

  // Detect data structures domain
  const isDataStructures = /estrutura.*dado|data.*struct|array|linked.*list|tree|graph|pilha|fila|heap|stack|queue/i
    .test(combinedText);

  // Add animation examples for visualization projects
  if (isVisualization || isDataStructures) {
    examples.push(ANIMATION_EXAMPLES);
    examples.push(VISUALIZATION_EXAMPLES);
  }

  // Add data structures examples
  if (isDataStructures) {
    examples.push(DATA_STRUCTURES_EXAMPLES);
  }

  // Path-based detection for specific files
  if (filePath.match(/visuali|animat|canvas|svg|chart/i)) {
    if (!examples.includes(ANIMATION_EXAMPLES)) {
      examples.push(ANIMATION_EXAMPLES);
    }
  }

  if (filePath.match(/control|player|timeline|step/i)) {
    if (!examples.includes(VISUALIZATION_EXAMPLES)) {
      examples.push(VISUALIZATION_EXAMPLES);
    }
  }

  if (filePath.match(/data-struct|domain\/(array|tree|graph|stack|queue|heap|list)/i)) {
    if (!examples.includes(DATA_STRUCTURES_EXAMPLES)) {
      examples.push(DATA_STRUCTURES_EXAMPLES);
    }
  }

  return examples.join("\n\n");
}

// Re-export individual example sets for direct access
export { ANIMATION_EXAMPLES } from "./animation.js";
export { VISUALIZATION_EXAMPLES } from "./visualization.js";
export { DATA_STRUCTURES_EXAMPLES } from "./data-structures.js";
