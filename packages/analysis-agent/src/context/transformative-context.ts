/**
 * @fileoverview Contexto de geração transformador.
 *
 * Estende o GenerationContext existente com informações da Camada Humana
 * e da Camada Estratégica: perfil do usuário, contexto emocional,
 * estratégia de interação, decisões autônomas e design de experiência.
 *
 * @module context/transformative-context
 * @version 2.0.0
 */

import type {
  UserProfile,
  EmotionalContext,
  InteractionStrategy,
  AutonomousDecisions,
  ExperienceDesign
} from "../types/transformative-schemas.js";

import type {
  RichAnalysis,
  RichProductPlan,
  RichArchitecture,
  RichUserStory,
  GeneratedFile
} from "../types/rich-schemas.js";

/**
 * Contexto transformador que acumula informação de todas as camadas.
 *
 * Camada Humana: UserProfile, EmotionalContext, InteractionStrategy
 * Camada Estratégica: AutonomousDecisions, ExperienceDesign
 * Camada de Engenharia: Analysis, Product, Architecture, UserStories, Files
 */
export class TransformativeContext {
  // Camada Humana
  private _userProfile: UserProfile | null = null;
  private _emotionalContext: EmotionalContext | null = null;
  private _interactionStrategy: InteractionStrategy | null = null;

  // Camada Estratégica
  private _autonomousDecisions: AutonomousDecisions | null = null;
  private _experienceDesign: ExperienceDesign | null = null;

  // Camada de Engenharia (herança conceitual do GenerationContext)
  private _userPrompt: string = "";
  private _analysis: RichAnalysis | null = null;
  private _product: RichProductPlan | null = null;
  private _architecture: RichArchitecture | null = null;
  private _userStories: RichUserStory[] = [];
  private _generatedFiles: GeneratedFile[] = [];
  private _startTime: number = 0;

  /**
   * Inicia um novo contexto de geração transformador.
   */
  start(userPrompt: string): void {
    this._userPrompt = userPrompt;
    this._startTime = performance.now();
    // Reset todas as camadas
    this._userProfile = null;
    this._emotionalContext = null;
    this._interactionStrategy = null;
    this._autonomousDecisions = null;
    this._experienceDesign = null;
    this._analysis = null;
    this._product = null;
    this._architecture = null;
    this._userStories = [];
    this._generatedFiles = [];
  }

  // --- SETTERS: Camada Humana ---

  /** Define o perfil do usuário inferido */
  setUserProfile(profile: UserProfile): void {
    this._userProfile = profile;
  }

  /** Define o contexto emocional detectado */
  setEmotionalContext(context: EmotionalContext): void {
    this._emotionalContext = context;
  }

  /** Define a estratégia de interação */
  setInteractionStrategy(strategy: InteractionStrategy): void {
    this._interactionStrategy = strategy;
  }

  // --- SETTERS: Camada Estratégica ---

  /** Define as decisões autônomas */
  setAutonomousDecisions(decisions: AutonomousDecisions): void {
    this._autonomousDecisions = decisions;
  }

  /** Define o design de experiência */
  setExperienceDesign(design: ExperienceDesign): void {
    this._experienceDesign = design;
  }

  // --- SETTERS: Camada de Engenharia ---

  /** Define a análise técnica */
  setAnalysis(analysis: RichAnalysis): void {
    this._analysis = analysis;
  }

  /** Define o plano de produto */
  setProduct(product: RichProductPlan): void {
    this._product = product;
  }

  /** Define a arquitetura */
  setArchitecture(architecture: RichArchitecture): void {
    this._architecture = architecture;
  }

  /** Adiciona user stories expandidas */
  addUserStories(stories: RichUserStory[]): void {
    this._userStories.push(...stories);
  }

  /** Adiciona um arquivo gerado */
  addGeneratedFile(file: GeneratedFile): void {
    this._generatedFiles.push(file);
  }

  // --- GETTERS ---

  get userPrompt(): string { return this._userPrompt; }
  get userProfile(): UserProfile | null { return this._userProfile; }
  get emotionalContext(): EmotionalContext | null { return this._emotionalContext; }
  get interactionStrategy(): InteractionStrategy | null { return this._interactionStrategy; }
  get autonomousDecisions(): AutonomousDecisions | null { return this._autonomousDecisions; }
  get experienceDesign(): ExperienceDesign | null { return this._experienceDesign; }
  get analysis(): RichAnalysis | null { return this._analysis; }
  get product(): RichProductPlan | null { return this._product; }
  get architecture(): RichArchitecture | null { return this._architecture; }
  get userStories(): RichUserStory[] { return this._userStories; }
  get generatedFiles(): GeneratedFile[] { return this._generatedFiles; }
  get elapsedMs(): number { return performance.now() - this._startTime; }

  // --- CONTEXT BUILDERS ---

  /**
   * Gera contexto da Camada Humana para uso pelos agentes estratégicos.
   */
  buildHumanLayerContext(): string {
    const parts: string[] = [];

    if (this._userProfile) {
      parts.push(`
## PERFIL DO USUÁRIO
- Nível de Conhecimento: ${this._userProfile.knowledgeLevel}
- Faixa Etária: ${this._userProfile.estimatedAge}
- Estilo de Comunicação: ${this._userProfile.communicationStyle}
- Domínio: ${this._userProfile.domain}
- Idioma: ${this._userProfile.language}
- Contexto Cultural: ${this._userProfile.culturalContext}
- Urgência: ${this._userProfile.urgency}
- Acessibilidade: ${this._userProfile.accessibilityNeeds.join(", ") || "nenhuma"}
- Preferência de Autonomia: ${this._userProfile.autonomyPreference}
`);
    }

    if (this._emotionalContext) {
      parts.push(`
## CONTEXTO EMOCIONAL
- Emoção Primária: ${this._emotionalContext.primaryEmotion} (${this._emotionalContext.emotionalIntensity})
- Motivações: ${this._emotionalContext.motivationalDrivers.join(", ")}
- Medos: ${this._emotionalContext.fears.join(", ") || "nenhum"}
- Tom Sugerido: ${this._emotionalContext.suggestedTone}
- Precisa Encorajamento: ${this._emotionalContext.needsEncouragement}
- Precisa Simplificação: ${this._emotionalContext.needsSimplification}
- Estratégia Emocional: ${this._emotionalContext.emotionalStrategy}
`);
    }

    if (this._interactionStrategy) {
      parts.push(`
## ESTRATÉGIA DE INTERAÇÃO
- Tom: ${this._interactionStrategy.tone}
- Vocabulário: ${this._interactionStrategy.vocabulary}
- Nível de Autonomia: ${this._interactionStrategy.autonomyLevel}
- Gamificação: ${this._interactionStrategy.suggestGamification}
- Aprendizado Visual: ${this._interactionStrategy.suggestVisualLearning}
- Passo a Passo: ${this._interactionStrategy.suggestStepByStep}
`);
    }

    return parts.join("\n").trim();
  }

  /**
   * Gera contexto das decisões autônomas para uso pelo Product e Architecture.
   */
  buildDecisionsContext(): string {
    if (!this._autonomousDecisions) return "";

    const decisionsText = this._autonomousDecisions.decisions
      .map(d => `- [${d.category}] ${d.decision}\n  Justificativa: ${d.rationale}\n  Confiança: ${d.confidence}`)
      .join("\n\n");

    return `
## DECISÕES AUTÔNOMAS
${decisionsText}

## RACIONAL INTERNO
${this._autonomousDecisions.internalRationale}
`.trim();
  }

  /**
   * Gera contexto do design de experiência para uso pelo Dev Lead e QA.
   */
  buildExperienceContext(): string {
    if (!this._experienceDesign) return "";

    const journeyText = this._experienceDesign.userJourney
      .map(phase => `### ${phase.name}\n- Objetivo: ${phase.objective}\n- Meta Emocional: ${phase.emotionalGoal}`)
      .join("\n\n");

    const gamificationText = this._experienceDesign.gamificationElements
      .map(el => `- [${el.type}] ${el.description} (Trigger: ${el.trigger})`)
      .join("\n");

    const rulesText = this._experienceDesign.adaptiveRules
      .map(r => `- SE ${r.condition} ENTÃO ${r.action} (${r.rationale})`)
      .join("\n");

    return `
## DESIGN DE EXPERIÊNCIA
Visão: ${this._experienceDesign.experienceVision}
Emoção Alvo: ${this._experienceDesign.targetEmotion}

## JORNADA DO USUÁRIO
${journeyText}

## GAMIFICAÇÃO
${gamificationText || "Sem elementos de gamificação"}

## REGRAS ADAPTATIVAS
${rulesText || "Sem regras adaptativas"}

## ACESSIBILIDADE
${this._experienceDesign.accessibilityFeatures.join(", ")}

## SEGURANÇA
${this._experienceDesign.safetyMeasures.join(", ")}

## PRINCÍPIOS DE DESIGN EMOCIONAL
${this._experienceDesign.emotionalDesignPrinciples.join(", ")}
`.trim();
  }

  /**
   * Gera contexto enriquecido para Product (combina Analysis + Camada Humana).
   */
  buildEnrichedProductContext(): string {
    const parts: string[] = [];

    // Análise técnica
    if (this._analysis) {
      parts.push(`
## ANÁLISE TÉCNICA
- Resumo: ${this._analysis.summary}
- Complexidade: ${this._analysis.complexity.level} (${this._analysis.complexity.score}/10)
- Entidades: ${this._analysis.coreEntities.join(", ")}
- Requisitos Implícitos: ${this._analysis.implicitRequirements.join("; ")}
`);
    }

    // Camada Humana
    parts.push(this.buildHumanLayerContext());

    // Decisões autônomas
    parts.push(this.buildDecisionsContext());

    // Pedido original
    parts.push(`\n## PEDIDO ORIGINAL\n${this._userPrompt}`);

    return parts.join("\n\n").trim();
  }

  /**
   * Gera contexto enriquecido para Architecture (combina tudo).
   */
  buildEnrichedArchitectureContext(): string {
    const parts: string[] = [];

    parts.push(`## PEDIDO ORIGINAL\n${this._userPrompt}`);

    // Camada Humana
    parts.push(this.buildHumanLayerContext());

    // Decisões autônomas
    parts.push(this.buildDecisionsContext());

    // Análise
    if (this._analysis) {
      parts.push(`
## ANÁLISE
- Complexidade: ${this._analysis.complexity.level} (${this._analysis.complexity.score}/10)
- Entidades: ${this._analysis.coreEntities.join(", ")}
- Requisitos Implícitos: ${this._analysis.implicitRequirements.join("; ")}
`);
    }

    // Produto
    if (this._product) {
      const epicsText = this._product.epics
        .map(e => `- [${e.id}] ${e.title} (${e.category}, ${e.priority})`)
        .join("\n");

      parts.push(`
## PRODUTO
Visão: ${this._product.productVision}

### Épicos:
${epicsText}
`);
    }

    // Design de Experiência
    parts.push(this.buildExperienceContext());

    return parts.join("\n\n").trim();
  }

  /**
   * Gera contexto enriquecido para Code Gen (inclui experiência).
   */
  buildEnrichedCodeGenContext(filePath: string): string {
    const parts: string[] = [];

    // Stack e arquitetura
    if (this._architecture) {
      const stack = this._architecture.stack;
      parts.push(`
## STACK TECNOLÓGICA
- Runtime: ${stack.runtime}
- Linguagem: ${stack.language}
- Framework: ${stack.framework}
- Testing: ${stack.testing}

## ESTILO ARQUITETURAL
${this._architecture.architectureStyle}

## DECISÕES CHAVE
${this._architecture.keyDecisions.map(d => `- ${d.decision}: ${d.rationale}`).join("\n")}
`);
    }

    // Arquivos já gerados
    if (this._generatedFiles.length > 0) {
      const fileList = this._generatedFiles
        .map(f => `- ${f.path}`)
        .join("\n");
      parts.push(`\n## ARQUIVOS JÁ GERADOS (use para imports)\n${fileList}`);
    }

    // Informação do arquivo no manifest
    if (this._architecture) {
      const manifestItem = this._architecture.manifest.find(m => m.path === filePath);
      if (manifestItem) {
        parts.push(`
## ARQUIVO A GERAR
- Path: ${manifestItem.path}
- Propósito: ${manifestItem.purpose}
- Criticidade: ${manifestItem.criticality}
- Categoria: ${manifestItem.category}
`);
      }
    }

    // Camada Humana (resumida para code gen)
    if (this._userProfile) {
      parts.push(`
## CONTEXTO DO USUÁRIO
- Nível: ${this._userProfile.knowledgeLevel}
- Público: ${this._userProfile.estimatedAge}
- Domínio: ${this._userProfile.domain}
`);
    }

    // Design de experiência (se relevante para o arquivo)
    if (this._experienceDesign) {
      parts.push(`
## EXPERIÊNCIA ESPERADA
Visão: ${this._experienceDesign.experienceVision}
Emoção Alvo: ${this._experienceDesign.targetEmotion}
Princípios: ${this._experienceDesign.emotionalDesignPrinciples.join(", ")}
`);

      if (this._experienceDesign.gamificationElements.length > 0) {
        parts.push(`Gamificação: ${this._experienceDesign.gamificationElements.map(g => g.description).join("; ")}`);
      }
    }

    // Contexto do projeto
    if (this._analysis) {
      parts.push(`\n## CONTEXTO DO PROJETO\n${this._analysis.summary}`);
    }

    return parts.join("\n").trim();
  }

  /**
   * Serializa o contexto completo para debug/logs.
   */
  toDebugString(): string {
    return JSON.stringify({
      userPrompt: this._userPrompt.substring(0, 100) + "...",
      hasUserProfile: !!this._userProfile,
      hasEmotionalContext: !!this._emotionalContext,
      hasInteractionStrategy: !!this._interactionStrategy,
      hasAutonomousDecisions: !!this._autonomousDecisions,
      hasExperienceDesign: !!this._experienceDesign,
      hasAnalysis: !!this._analysis,
      hasProduct: !!this._product,
      hasArchitecture: !!this._architecture,
      userStoriesCount: this._userStories.length,
      generatedFilesCount: this._generatedFiles.length,
      elapsedMs: this.elapsedMs
    }, null, 2);
  }
}
