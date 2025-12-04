import { DETECT_INTENT_PROMPT } from './detect-intent.js';
import { ANALYSIS_PROMPT } from './analysis.js';
import { PRODUCT_PROMPT } from './product.js';
import { ARCHITECTURE_PROMPT } from './architecture.js';
import { CODE_GEN_PROMPT } from './code-gen.js';
import { USER_STORIES_PROMPT } from './user-stories.js';

export const SYSTEM_PROMPTS = {
  DETECT_INTENT: DETECT_INTENT_PROMPT,
  ANALYSIS: ANALYSIS_PROMPT,
  PRODUCT: PRODUCT_PROMPT,
  ARCHITECTURE: ARCHITECTURE_PROMPT,
  CODE_GEN: CODE_GEN_PROMPT,
  USER_STORIES: USER_STORIES_PROMPT
};
