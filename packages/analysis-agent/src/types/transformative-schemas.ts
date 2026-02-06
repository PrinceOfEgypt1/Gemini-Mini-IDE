/**
 * @fileoverview Schemas Zod e Interfaces para a Arquitetura Transformadora.
 *
 * Define os tipos da Camada Humana (User Profiler, Emotional Intelligence,
 * Adaptive Interaction) e da Camada Estratégica (Autonomous Decision Engine,
 * Experience Designer).
 *
 * @module types/transformative-schemas
 * @version 2.0.0
 */

import { z } from "zod";

// ============================================================================
// USER PROFILER TYPES
// ============================================================================

/** Nível de conhecimento técnico do usuário */
export type KnowledgeLevel = "child" | "beginner" | "intermediate" | "advanced" | "expert";

/** Faixa etária estimada */
export type EstimatedAge = "child_5_10" | "teen_11_17" | "young_adult_18_30" | "adult_31_55" | "senior_56_plus";

/** Estilo de comunicação preferido */
export type CommunicationStyle = "playful" | "simple" | "conversational" | "professional" | "technical";

/** Preferência de autonomia do sistema */
export type AutonomyPreference = "guide_me" | "decide_for_me" | "collaborate" | "just_do_it";

/** Perfil completo do usuário inferido pelo User Profiler Agent */
export interface UserProfile {
  knowledgeLevel: KnowledgeLevel;
  estimatedAge: EstimatedAge;
  communicationStyle: CommunicationStyle;
  domain: string;
  language: string;
  culturalContext: string;
  urgency: "low" | "medium" | "high" | "critical";
  accessibilityNeeds: string[];
  autonomyPreference: AutonomyPreference;
  confidence: number;
}

export const UserProfileSchema = z.object({
  knowledgeLevel: z.enum(["child", "beginner", "intermediate", "advanced", "expert"]),
  estimatedAge: z.enum(["child_5_10", "teen_11_17", "young_adult_18_30", "adult_31_55", "senior_56_plus"]),
  communicationStyle: z.enum(["playful", "simple", "conversational", "professional", "technical"]),
  domain: z.string(),
  language: z.string(),
  culturalContext: z.string(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  accessibilityNeeds: z.array(z.string()),
  autonomyPreference: z.enum(["guide_me", "decide_for_me", "collaborate", "just_do_it"]),
  confidence: z.number().min(0).max(1)
});

// ============================================================================
// EMOTIONAL INTELLIGENCE TYPES
// ============================================================================

/** Emoção primária detectada */
export type PrimaryEmotion =
  | "frustrated"
  | "insecure"
  | "enthusiastic"
  | "confused"
  | "anxious"
  | "curious"
  | "sad"
  | "determined"
  | "neutral";

/** Tom sugerido para a interação */
export type SuggestedTone =
  | "encouraging"
  | "playful"
  | "professional"
  | "empathetic"
  | "direct"
  | "patient"
  | "celebratory";

/** Contexto emocional completo do usuário */
export interface EmotionalContext {
  primaryEmotion: PrimaryEmotion;
  emotionalIntensity: number;
  motivationalDrivers: string[];
  fears: string[];
  needsEncouragement: boolean;
  needsSimplification: boolean;
  needsPatience: boolean;
  suggestedTone: SuggestedTone;
  emotionalStrategy: string;
}

export const EmotionalContextSchema = z.object({
  primaryEmotion: z.enum([
    "frustrated", "insecure", "enthusiastic", "confused",
    "anxious", "curious", "sad", "determined", "neutral"
  ]),
  emotionalIntensity: z.number().min(0).max(1),
  motivationalDrivers: z.array(z.string()),
  fears: z.array(z.string()),
  needsEncouragement: z.boolean(),
  needsSimplification: z.boolean(),
  needsPatience: z.boolean(),
  suggestedTone: z.enum([
    "encouraging", "playful", "professional", "empathetic",
    "direct", "patient", "celebratory"
  ]),
  emotionalStrategy: z.string()
});

// ============================================================================
// ADAPTIVE INTERACTION TYPES
// ============================================================================

/** Pergunta adaptada para o nível do usuário */
export interface InteractionQuestion {
  question: string;
  purpose: string;
  adaptedFor: string;
  fallbackDecision: string;
  priority: "essential" | "important" | "nice_to_have";
}

export const InteractionQuestionSchema = z.object({
  question: z.string(),
  purpose: z.string(),
  adaptedFor: z.string(),
  fallbackDecision: z.string(),
  priority: z.enum(["essential", "important", "nice_to_have"])
});

/** Estratégia de interação definida pelo Adaptive Interaction Agent */
export interface InteractionStrategy {
  tone: string;
  vocabulary: string;
  maxMessageLength: "short" | "medium" | "detailed";
  useEmojis: boolean;
  useAnalogies: boolean;
  useCodeExamples: boolean;
  autonomyLevel: number;
  questionsToAsk: InteractionQuestion[];
  questionsToSkip: string[];
  suggestGamification: boolean;
  suggestVisualLearning: boolean;
  suggestStepByStep: boolean;
  suggestAudioFeedback: boolean;
  checkpoints: string[];
  fallbackStrategy: string;
}

export const InteractionStrategySchema = z.object({
  tone: z.string(),
  vocabulary: z.string(),
  maxMessageLength: z.enum(["short", "medium", "detailed"]),
  useEmojis: z.boolean(),
  useAnalogies: z.boolean(),
  useCodeExamples: z.boolean(),
  autonomyLevel: z.number().min(0).max(1),
  questionsToAsk: z.array(InteractionQuestionSchema),
  questionsToSkip: z.array(z.string()),
  suggestGamification: z.boolean(),
  suggestVisualLearning: z.boolean(),
  suggestStepByStep: z.boolean(),
  suggestAudioFeedback: z.boolean(),
  checkpoints: z.array(z.string()),
  fallbackStrategy: z.string()
});

// ============================================================================
// AUTONOMOUS DECISION ENGINE TYPES
// ============================================================================

/** Categoria de decisão autônoma */
export type DecisionCategory =
  | "platform"
  | "stack"
  | "architecture"
  | "ux"
  | "security"
  | "deployment"
  | "accessibility"
  | "monetization"
  | "performance"
  | "content";

/** Uma decisão tomada autonomamente pelo sistema */
export interface AutonomousDecision {
  category: DecisionCategory;
  decision: string;
  rationale: string;
  alternatives: string[];
  confidence: number;
  impactIfWrong: "low" | "medium" | "high";
}

export const AutonomousDecisionSchema = z.object({
  category: z.enum([
    "platform", "stack", "architecture", "ux", "security",
    "deployment", "accessibility", "monetization", "performance", "content"
  ]),
  decision: z.string(),
  rationale: z.string(),
  alternatives: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  impactIfWrong: z.enum(["low", "medium", "high"])
});

/** Pergunta não-técnica para o usuário */
export interface UserQuestion {
  question: string;
  purpose: string;
  adaptedFor: string;
  fallbackDecision: string;
}

export const UserQuestionSchema = z.object({
  question: z.string(),
  purpose: z.string(),
  adaptedFor: z.string(),
  fallbackDecision: z.string()
});

/** Resultado completo do Autonomous Decision Engine */
export interface AutonomousDecisions {
  decisions: AutonomousDecision[];
  confidenceLevel: number;
  requiresValidation: boolean;
  questionsForUser: UserQuestion[];
  internalRationale: string;
}

export const AutonomousDecisionsSchema = z.object({
  decisions: z.array(AutonomousDecisionSchema),
  confidenceLevel: z.number().min(0).max(1),
  requiresValidation: z.boolean(),
  questionsForUser: z.array(UserQuestionSchema),
  internalRationale: z.string()
});

// ============================================================================
// EXPERIENCE DESIGNER TYPES
// ============================================================================

/** Fase da jornada do usuário */
export interface JourneyPhase {
  name: string;
  objective: string;
  emotionalGoal: string;
  interactions: string[];
  successCriteria: string[];
  failsafeActions: string[];
}

export const JourneyPhaseSchema = z.object({
  name: z.string(),
  objective: z.string(),
  emotionalGoal: z.string(),
  interactions: z.array(z.string()),
  successCriteria: z.array(z.string()),
  failsafeActions: z.array(z.string())
});

/** Elemento de gamificação */
export interface GamificationElement {
  type: "reward" | "progress" | "challenge" | "social" | "narrative";
  description: string;
  trigger: string;
  psychologicalEffect: string;
}

export const GamificationElementSchema = z.object({
  type: z.enum(["reward", "progress", "challenge", "social", "narrative"]),
  description: z.string(),
  trigger: z.string(),
  psychologicalEffect: z.string()
});

/** Regra de adaptação dinâmica */
export interface AdaptiveRule {
  condition: string;
  action: string;
  rationale: string;
}

export const AdaptiveRuleSchema = z.object({
  condition: z.string(),
  action: z.string(),
  rationale: z.string()
});

/** Estratégia de conteúdo */
export interface ContentStrategy {
  tone: string;
  visualStyle: string;
  audioElements: string[];
  interactiveElements: string[];
  culturalAdaptations: string[];
}

export const ContentStrategySchema = z.object({
  tone: z.string(),
  visualStyle: z.string(),
  audioElements: z.array(z.string()),
  interactiveElements: z.array(z.string()),
  culturalAdaptations: z.array(z.string())
});

/** Design de experiência completo */
export interface ExperienceDesign {
  experienceVision: string;
  targetEmotion: string;
  userJourney: JourneyPhase[];
  gamificationElements: GamificationElement[];
  adaptiveRules: AdaptiveRule[];
  accessibilityFeatures: string[];
  safetyMeasures: string[];
  contentStrategy: ContentStrategy;
  emotionalDesignPrinciples: string[];
}

export const ExperienceDesignSchema = z.object({
  experienceVision: z.string(),
  targetEmotion: z.string(),
  userJourney: z.array(JourneyPhaseSchema),
  gamificationElements: z.array(GamificationElementSchema),
  adaptiveRules: z.array(AdaptiveRuleSchema),
  accessibilityFeatures: z.array(z.string()),
  safetyMeasures: z.array(z.string()),
  contentStrategy: ContentStrategySchema,
  emotionalDesignPrinciples: z.array(z.string())
});

// ============================================================================
// TRANSFORMATIVE RESULT (extends AgentResult)
// ============================================================================

/** Resultado transformador completo */
export interface TransformativeResult {
  userProfile: UserProfile;
  emotionalContext: EmotionalContext;
  interactionStrategy: InteractionStrategy;
  autonomousDecisions: AutonomousDecisions;
  experienceDesign: ExperienceDesign;
}

export const TransformativeResultSchema = z.object({
  userProfile: UserProfileSchema,
  emotionalContext: EmotionalContextSchema,
  interactionStrategy: InteractionStrategySchema,
  autonomousDecisions: AutonomousDecisionsSchema,
  experienceDesign: ExperienceDesignSchema
});
