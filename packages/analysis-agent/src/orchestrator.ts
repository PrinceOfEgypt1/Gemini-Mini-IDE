/**
 * @fileoverview Orquestrador Transformador — Pipeline principal da Mini-IDE 2.0.
 *
 * Implementa o pipeline de 3 camadas:
 * 1. Camada Humana: UserProfiler, EmotionalIntelligence, AdaptiveInteraction
 * 2. Camada Estratégica: AutonomousDecisionEngine, ExperienceDesigner
 * 3. Camada de Engenharia: Analysis, Product, Architecture, UserStories, CodeGen
 *
 * Mantém retrocompatibilidade com o AnalysisAgent existente.
 *
 * @module orchestrator
 * @version 2.0.0
 */

import OpenAI from "openai";
import { AnalysisAgent } from "./agent.js";
import { UserProfilerAgent } from "./agents/user-profiler.js";
import { EmotionalIntelligenceAgent } from "./agents/emotional-intelligence.js";
import { AdaptiveInteractionAgent } from "./agents/adaptive-interaction.js";
import { AutonomousDecisionEngine } from "./agents/autonomous-decision-engine.js";
import { ExperienceDesignerAgent } from "./agents/experience-designer.js";
import { TransformativeContext } from "./context/transformative-context.js";

import type { AgentResult } from "./types/rich-schemas.js";
import type { TransformativeResult } from "./types/transformative-schemas.js";

/**
 * Resultado completo do pipeline transformador.
 * Combina o resultado da engenharia com os dados da Camada Humana e Estratégica.
 */
export interface TransformativeAgentResult extends AgentResult {
  /** Dados da Camada Humana e Estratégica */
  transformative: TransformativeResult;
}

/**
 * Orquestrador Transformador — Pipeline principal da Mini-IDE 2.0.
 *
 * Coordena 3 camadas de agentes para produzir soluções que não apenas
 * funcionam tecnicamente, mas que entendem o usuário e criam experiências
 * verdadeiramente humanizadas.
 *
 * @example
 * ```typescript
 * const orchestrator = new TransformativeOrchestrator(apiKey);
 * const result = await orchestrator.analyze("Quero aprender a ler");
 * // result.transformative.userProfile.knowledgeLevel === 'child'
 * // result.transformative.emotionalContext.primaryEmotion === 'insecure'
 * // result.engine.files contém app educativo gamificado
 * ```
 */
export class TransformativeOrchestrator {
  private client: OpenAI;
  private context: TransformativeContext;

  // Agentes da Camada Humana
  private userProfiler: UserProfilerAgent;
  private emotionalIntelligence: EmotionalIntelligenceAgent;
  private adaptiveInteraction: AdaptiveInteractionAgent;

  // Agentes da Camada Estratégica
  private autonomousDecisionEngine: AutonomousDecisionEngine;
  private experienceDesigner: ExperienceDesignerAgent;

  // Agente de Engenharia (existente)
  private engineeringAgent: AnalysisAgent;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      timeout: 600000
    });

    this.context = new TransformativeContext();

    // Instanciar agentes da Camada Humana
    this.userProfiler = new UserProfilerAgent(this.client);
    this.emotionalIntelligence = new EmotionalIntelligenceAgent(this.client);
    this.adaptiveInteraction = new AdaptiveInteractionAgent(this.client);

    // Instanciar agentes da Camada Estratégica
    this.autonomousDecisionEngine = new AutonomousDecisionEngine(this.client);
    this.experienceDesigner = new ExperienceDesignerAgent(this.client);

    // Instanciar agente de Engenharia (existente)
    this.engineeringAgent = new AnalysisAgent(apiKey);
  }

  /**
   * Executa o pipeline transformador completo.
   *
   * Fluxo:
   * 1. Camada Humana (paralelo): UserProfiler + EmotionalIntelligence
   * 2. Adaptação: AdaptiveInteraction
   * 3. Camada Estratégica (parcialmente paralelo): Analysis + AutonomousDecision
   * 4. Design de Experiência: ExperienceDesigner
   * 5. Camada de Engenharia: Pipeline existente enriquecido
   *
   * @param userPrompt - Mensagem original do usuário
   * @returns Resultado transformador completo
   */
  async analyze(userPrompt: string): Promise<TransformativeAgentResult> {
    const startTime = performance.now();

    this.context.start(userPrompt);

    // ═══════════════════════════════════════════════════════════
    // CAMADA HUMANA — Executar em paralelo
    // ═══════════════════════════════════════════════════════════
    // eslint-disable-next-line no-console
    console.log("[Orchestrator] === CAMADA HUMANA ===");

    // eslint-disable-next-line no-console
    console.log("[Orchestrator] Step 1: User Profiling + Emotional Analysis (paralelo)...");
    const [userProfile, emotionalContext] = await Promise.all([
      this.userProfiler.analyze(userPrompt),
      this.emotionalIntelligence.analyze(userPrompt)
    ]);

    this.context.setUserProfile(userProfile);
    this.context.setEmotionalContext(emotionalContext);

    // eslint-disable-next-line no-console
    console.log(`[Orchestrator] Perfil: ${userProfile.knowledgeLevel} | Emoção: ${emotionalContext.primaryEmotion}`);

    // eslint-disable-next-line no-console
    console.log("[Orchestrator] Step 2: Adaptive Interaction Strategy...");
    const interactionStrategy = await this.adaptiveInteraction.createStrategy(
      userProfile,
      emotionalContext
    );
    this.context.setInteractionStrategy(interactionStrategy);

    // eslint-disable-next-line no-console
    console.log(`[Orchestrator] Autonomia: ${interactionStrategy.autonomyLevel} | Tom: ${interactionStrategy.tone}`);

    // ═══════════════════════════════════════════════════════════
    // CAMADA ESTRATÉGICA — Requer resultados da Camada Humana
    // ═══════════════════════════════════════════════════════════
    // eslint-disable-next-line no-console
    console.log("[Orchestrator] === CAMADA ESTRATÉGICA ===");

    // Executar Engenharia de análise existente para alimentar o Decision Engine
    // eslint-disable-next-line no-console
    console.log("[Orchestrator] Step 3: Engineering Pipeline...");
    const engineeringResult = await this.engineeringAgent.analyze(userPrompt);

    this.context.setAnalysis(engineeringResult.analysis);
    this.context.setProduct(engineeringResult.product);
    this.context.setArchitecture(engineeringResult.architect);

    // Decisões Autônomas + Design de Experiência (sequencial, pois ADE alimenta XDA)
    // eslint-disable-next-line no-console
    console.log("[Orchestrator] Step 4: Autonomous Decisions...");
    const autonomousDecisions = await this.autonomousDecisionEngine.decide(
      userPrompt,
      userProfile,
      emotionalContext,
      engineeringResult.analysis,
      interactionStrategy
    );
    this.context.setAutonomousDecisions(autonomousDecisions);

    // eslint-disable-next-line no-console
    console.log(`[Orchestrator] Decisões: ${autonomousDecisions.decisions.length} | Confiança: ${autonomousDecisions.confidenceLevel}`);

    // eslint-disable-next-line no-console
    console.log("[Orchestrator] Step 5: Experience Design...");
    const experienceDesign = await this.experienceDesigner.design(
      userPrompt,
      userProfile,
      emotionalContext,
      autonomousDecisions
    );
    this.context.setExperienceDesign(experienceDesign);

    // eslint-disable-next-line no-console
    console.log(`[Orchestrator] Experiência: ${experienceDesign.targetEmotion}`);

    // ═══════════════════════════════════════════════════════════
    // CONSOLIDAÇÃO
    // ═══════════════════════════════════════════════════════════
    const totalTime = performance.now() - startTime;

    // eslint-disable-next-line no-console
    console.log(`[Orchestrator] === CONCLUÍDO em ${(totalTime / 1000).toFixed(1)}s ===`);
    // eslint-disable-next-line no-console
    console.log(`[Orchestrator] Contexto: ${this.context.toDebugString()}`);

    // Combinar resultado da engenharia com dados transformadores
    const transformativeResult: TransformativeAgentResult = {
      ...engineeringResult,
      transformative: {
        userProfile,
        emotionalContext,
        interactionStrategy,
        autonomousDecisions,
        experienceDesign
      }
    };

    return transformativeResult;
  }

  /**
   * Retorna o contexto transformador atual para debug ou inspeção.
   */
  getContext(): TransformativeContext {
    return this.context;
  }
}
