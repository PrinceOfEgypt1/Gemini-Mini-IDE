import { DETECT_INTENT_PROMPT } from './detect-intent.js';
import { ANALYSIS_PROMPT } from './analysis.js';
import { PRODUCT_PROMPT } from './product.js';
import { ARCHITECTURE_PROMPT } from './architecture.js';
import { CODE_GEN_PROMPT } from './code-gen.js';
import { USER_STORIES_PROMPT } from './user-stories.js';

// Prompts da Camada Humana e Estratégica (Arquitetura Transformadora v2.0)
import { USER_PROFILER_PROMPT } from './user-profiler.js';
import { EMOTIONAL_INTELLIGENCE_PROMPT } from './emotional-intelligence.js';
import { ADAPTIVE_INTERACTION_PROMPT } from './adaptive-interaction.js';
import { AUTONOMOUS_DECISION_PROMPT } from './autonomous-decision.js';
import { EXPERIENCE_DESIGN_PROMPT } from './experience-design.js';

export const SYSTEM_PROMPTS = {
  // Prompts originais (Camada de Engenharia)
  DETECT_INTENT: DETECT_INTENT_PROMPT,
  ANALYSIS: ANALYSIS_PROMPT,
  PRODUCT: PRODUCT_PROMPT,
  ARCHITECTURE: ARCHITECTURE_PROMPT,
  CODE_GEN: CODE_GEN_PROMPT,
  USER_STORIES: USER_STORIES_PROMPT,

  // Prompts transformadores (Camada Humana + Estratégica)
  USER_PROFILER: USER_PROFILER_PROMPT,
  EMOTIONAL_INTELLIGENCE: EMOTIONAL_INTELLIGENCE_PROMPT,
  ADAPTIVE_INTERACTION: ADAPTIVE_INTERACTION_PROMPT,
  AUTONOMOUS_DECISION: AUTONOMOUS_DECISION_PROMPT,
  EXPERIENCE_DESIGN: EXPERIENCE_DESIGN_PROMPT
};
