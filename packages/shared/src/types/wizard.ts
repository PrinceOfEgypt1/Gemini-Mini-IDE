/**
 * @fileoverview Cross-package types used by the project-wizard flow.
 *
 * Consumed by both the UI (wizard components) and the CLI/server when they
 * need to agree on what a "project definition" or "user story" looks like
 * at the UI boundary. These types are intentionally simpler than the
 * analysis-agent's internal rich schemas — the wizard works at the
 * user-facing level of abstraction.
 *
 * @module shared/types/wizard
 */

/**
 * User story as seen by the wizard UI.
 *
 * Simpler than the agent-internal `RichUserStory`: no technical notes, no
 * point estimates, no dependencies. Priority uses the standard `P0..P3`
 * scale (P0 = highest / blocker).
 */
export interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

/**
 * User-provided project configuration collected by the wizard.
 *
 * `stack` is a free-form label (e.g. `"Node.js + TypeScript"`); it is not
 * constrained to a closed enum because the wizard lets the user describe
 * arbitrary stacks.
 */
export interface ProjectDefinition {
  name: string;
  path: string;
  stack: string;
  userStories: UserStory[];
}

/**
 * Result of the script-generation step of the wizard.
 *
 * The two script fields hold the full textual body of each file; the
 * `instructions` field is a short human-readable explanation of how to
 * run them.
 */
export interface GeneratedScripts {
  /** Conteúdo do `setup.sh`. */
  setupScript: string;
  /** Conteúdo do `pipeline_check.sh`. */
  pipelineScript: string;
  /** Short human-readable usage instructions. */
  instructions: string;
}
