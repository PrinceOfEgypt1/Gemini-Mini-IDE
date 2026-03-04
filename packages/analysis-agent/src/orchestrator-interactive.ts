/**
 * @fileoverview Orquestrador Interativo — Gerencia conversas multi-turno.
 *
 * Substitui o pipeline one-shot por um fluxo conversacional onde cada agente
 * faz perguntas, coleta respostas e acumula contexto antes de gerar o resultado.
 *
 * @module orchestrator-interactive
 * @version 1.0.0
 */

import OpenAI from "openai";
import { SessionManager } from "./session/manager.js";
import { SessionDatabase } from "./session/database.js";
import { AGENT_PIPELINE } from "./session/types.js";
import type {
  AgentPhase,
  AgentType,
  ConversationMessage,
  ConversationSession
} from "./session/types.js";
import type {
  InteractiveAgent,
  ConversationContext,
  AgentResponse
} from "./agents/interactive-agent.js";

import { InteractiveUserProfilerAgent } from "./agents/interactive-user-profiler.js";
import { InteractiveEmotionalIntelligenceAgent } from "./agents/interactive-emotional-intelligence.js";
import { InteractiveAdaptiveInteractionAgent } from "./agents/interactive-adaptive-interaction.js";
import { InteractiveAutonomousDecisionAgent } from "./agents/interactive-autonomous-decision.js";
import { InteractiveExperienceDesignerAgent } from "./agents/interactive-experience-designer.js";

import { AnalysisAgent } from "./agent.js";
import type { AgentResult, PlanResult } from "./types/rich-schemas.js";

/**
 * Resultado da interação com um agente.
 * Contém a mensagem do agente + metadados da sessão.
 */
export interface InteractionResult {
  sessionId: string;
  message: ConversationMessage;
  currentPhase: AgentPhase;
  currentAgent: AgentType;
  isComplete: boolean;
  options?: string[];
}

/**
 * Options for configuring the InteractiveOrchestrator.
 */
export interface OrchestratorOptions {
  /** LLM model to use (e.g., 'gpt-4o', 'gpt-4o-mini') */
  model?: string;
  /** Custom base URL for the LLM API (e.g., 'https://api.anthropic.com/v1') */
  baseUrl?: string;
}

/**
 * Orquestrador Interativo — Gerencia o fluxo conversacional multi-turno.
 *
 * Cada agente do pipeline faz perguntas ao usuário, processa respostas e
 * acumula contexto. Quando todos os agentes completam, gera o resultado final.
 *
 * @example
 * ```typescript
 * const orchestrator = new InteractiveOrchestrator(apiKey);
 * const start = await orchestrator.startConversation('user-1', 'Quero um app de receitas');
 * // start.message.content = "Olá! Qual seu nível de experiência?"
 * const resp = await orchestrator.respondToAgent(start.sessionId, 'Sou iniciante');
 * // resp.message.content = "Legal! E qual sua faixa etária?"
 * ```
 */
export class InteractiveOrchestrator {
  private client: OpenAI;
  private sessionManager: SessionManager;
  private agents: Map<AgentType, InteractiveAgent>;
  private engineeringAgent: AnalysisAgent;
  private model: string;

  constructor(apiKey: string, dbPath?: string, options?: OrchestratorOptions) {
    const clientOptions: { apiKey: string; timeout: number; baseURL?: string } = {
      apiKey,
      timeout: 600000
    };

    // Set custom base URL if provided
    if (options?.baseUrl) {
      clientOptions.baseURL = options.baseUrl;
    }

    this.client = new OpenAI(clientOptions);
    this.model = options?.model || "gpt-4o-mini";

    // Inicializa banco de dados e gerenciador de sessões
    const db = new SessionDatabase(dbPath);
    db.initialize();
    this.sessionManager = new SessionManager(db);

    // Inicializa agentes interativos
    this.agents = new Map<AgentType, InteractiveAgent>();
    this.agents.set("user_profiler", new InteractiveUserProfilerAgent(this.client, this.model));
    this.agents.set("emotional_intelligence", new InteractiveEmotionalIntelligenceAgent(this.client, this.model));
    this.agents.set("adaptive_interaction", new InteractiveAdaptiveInteractionAgent(this.client, this.model));
    this.agents.set("autonomous_decision", new InteractiveAutonomousDecisionAgent(this.client, this.model));
    this.agents.set("experience_designer", new InteractiveExperienceDesignerAgent(this.client, this.model));

    // Agente de engenharia (pipeline existente)
    this.engineeringAgent = new AnalysisAgent(apiKey, {
      model: this.model,
      baseUrl: options?.baseUrl
    });
  }

  /**
   * Inicia uma nova conversa. Cria sessão e dispara o primeiro agente.
   */
  async startConversation(userId: string, userMessage: string): Promise<InteractionResult> {
    // Cria sessão
    const session = this.sessionManager.createSession(userId);

    // Salva a mensagem original do usuário
    this.sessionManager.updateSessionContext(session.sessionId, {
      originalUserPrompt: userMessage
    });

    // Registra mensagem do usuário
    this.sessionManager.addMessage(session.sessionId, "user", userMessage);

    // Inicia o primeiro agente
    const firstPipeline = AGENT_PIPELINE[0]!;
    const agent = this.agents.get(firstPipeline.agent);
    if (!agent) {
      throw new Error(`Agent not found: ${firstPipeline.agent}`);
    }

    const context = this.buildContext(session.sessionId, userMessage);
    const agentMessage = await agent.initiateConversation(context);

    // Registra mensagem do agente
    const savedMessage = this.sessionManager.addMessage(
      session.sessionId,
      "agent",
      agentMessage.content,
      firstPipeline.agent,
      { type: agentMessage.type, data: {} }
    );

    return {
      sessionId: session.sessionId,
      message: savedMessage,
      currentPhase: firstPipeline.phase,
      currentAgent: firstPipeline.agent,
      isComplete: false,
      options: agentMessage.options
    };
  }

  /**
   * Processa a resposta do usuário ao agente atual.
   */
  async respondToAgent(sessionId: string, userResponse: string): Promise<InteractionResult> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Registra mensagem do usuário
    this.sessionManager.addMessage(sessionId, "user", userResponse);

    // Obtém o agente atual
    const agent = this.agents.get(session.currentAgent);
    if (!agent) {
      throw new Error(`Agent not found: ${session.currentAgent}`);
    }

    const context = this.buildContext(sessionId);

    // Processa resposta
    const response: AgentResponse = await agent.processUserResponse(userResponse, context);

    // Atualiza contexto com dados extraídos
    if (response.dataExtracted && Object.keys(response.dataExtracted).length > 0) {
      this.sessionManager.updateSessionContext(sessionId, response.dataExtracted);
    }

    // Verifica próxima ação
    if (response.nextAction === "proceed_to_next") {
      return this.advanceToNextAgent(sessionId);
    }

    // Agente ainda quer continuar a conversa
    const messageContent = response.agentMessage?.content || response.feedback;
    const savedMessage = this.sessionManager.addMessage(
      sessionId,
      "agent",
      messageContent,
      session.currentAgent,
      { type: response.agentMessage?.type || "question", data: response.dataExtracted }
    );

    return {
      sessionId,
      message: savedMessage,
      currentPhase: session.currentPhase,
      currentAgent: session.currentAgent,
      isComplete: false,
      options: response.agentMessage?.options
    };
  }

  /**
   * Avança para o próximo agente no pipeline.
   */
  async advanceToNextAgent(sessionId: string): Promise<InteractionResult> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Encontra o índice atual no pipeline
    const currentIndex = AGENT_PIPELINE.findIndex(p => p.agent === session.currentAgent);
    const nextIndex = currentIndex + 1;

    // Se todos os agentes interativos completaram, marca como pronto para engenharia
    if (nextIndex >= AGENT_PIPELINE.length) {
      // Atualiza fase para engenharia
      this.sessionManager.updateSessionPhase(sessionId, "engineering_layer", "analysis");

      const originalPrompt = (session.contextData["originalUserPrompt"] as string) || "";
      const dynamicMessage = await this.generateDynamicMessage("collection_complete", {
        originalPrompt,
        userProfile: session.contextData["userProfileData"] as Record<string, unknown>
      });

      const savedMessage = this.sessionManager.addMessage(
        sessionId,
        "agent",
        dynamicMessage,
        "analysis",
        { type: "feedback", data: {} }
      );

      return {
        sessionId,
        message: savedMessage,
        currentPhase: "engineering_layer",
        currentAgent: "analysis",
        isComplete: false
      };
    }

    // Avança para o próximo agente
    const nextPipeline = AGENT_PIPELINE[nextIndex]!;
    this.sessionManager.updateSessionPhase(sessionId, nextPipeline.phase, nextPipeline.agent);

    const agent = this.agents.get(nextPipeline.agent);
    if (!agent) {
      throw new Error(`Agent not found: ${nextPipeline.agent}`);
    }

    const context = this.buildContext(sessionId);
    const agentMessage = await agent.initiateConversation(context);

    const savedMessage = this.sessionManager.addMessage(
      sessionId,
      "agent",
      agentMessage.content,
      nextPipeline.agent,
      { type: agentMessage.type, data: {} }
    );

    return {
      sessionId,
      message: savedMessage,
      currentPhase: nextPipeline.phase,
      currentAgent: nextPipeline.agent,
      isComplete: false,
      options: agentMessage.options
    };
  }

  /**
   * Pula o agente atual e avança para o próximo.
   */
  async skipCurrentAgent(sessionId: string): Promise<InteractionResult> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Registra que o agente foi pulado com mensagem dinâmica
    const skipMessage = await this.generateDynamicMessage("agent_skipped", {
      agentName: session.currentAgent
    });

    this.sessionManager.addMessage(
      sessionId,
      "agent",
      skipMessage,
      session.currentAgent,
      { type: "feedback", data: { skipped: true } }
    );

    return this.advanceToNextAgent(sessionId);
  }

  /**
   * FASE 1: Gera o plano do projeto (análise, arquitetura, HUs).
   * Retorna o plano para revisão do usuário ANTES de gerar código.
   */
  async generatePlan(sessionId: string): Promise<PlanResult> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const contextData = session.contextData;
    const originalPrompt = (contextData["originalUserPrompt"] as string) || "";
    const enrichedPrompt = this.buildEnrichedPrompt(originalPrompt, contextData);

    // Executa Steps 1-4 (Analysis, Product, Architecture, User Stories)
    const plan = await this.engineeringAgent.planProject(enrichedPrompt);

    // Armazena o plano na sessão para uso posterior em generateCodeFromPlan
    this.sessionManager.updateSessionContext(sessionId, {
      planResult: plan
    });

    // Registra mensagem com resumo do plano (gerada dinamicamente)
    const planMessage = await this.generateDynamicMessage("plan_ready", {
      epicCount: plan.epicCount,
      userStoryCount: plan.userStoryCount,
      fileCount: plan.manifestFileCount
    });

    this.sessionManager.addMessage(
      sessionId,
      "agent",
      planMessage,
      "analysis",
      { type: "feedback", data: { plan: true } }
    );

    return plan;
  }

  /**
   * FASE 2: Gera o código a partir do plano aprovado pelo usuário.
   * Deve ser chamado APÓS generatePlan() e aprovação.
   */
  async generateCodeFromPlan(sessionId: string): Promise<AgentResult> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const contextData = session.contextData;
    const originalPrompt = (contextData["originalUserPrompt"] as string) || "";
    const enrichedPrompt = this.buildEnrichedPrompt(originalPrompt, contextData);
    const plan = contextData["planResult"] as PlanResult | undefined;

    if (!plan) {
      throw new Error("No plan found. Call generatePlan first.");
    }

    // Executa Step 5 (Code Generation) usando o plano aprovado
    const result = await this.engineeringAgent.generateFromPlan(plan, enrichedPrompt);

    // Marca sessão como completa
    this.sessionManager.updateSessionPhase(sessionId, "completed", "code_gen");
    this.sessionManager.updateSessionContext(sessionId, {
      engineeringResult: {
        summary: result.summary,
        fileCount: result.engine?.files?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

    const codeMessage = await this.generateDynamicMessage("code_generated", {
      fileCount: result.engine?.files?.length || 0
    });

    this.sessionManager.addMessage(
      sessionId,
      "agent",
      codeMessage,
      "code_gen",
      { type: "feedback", data: { fileCount: result.engine?.files?.length || 0 } }
    );

    return result;
  }

  /**
   * FASE 2 INCREMENTAL: Gera código com governança por lotes.
   *
   * Esta versão usa o IncrementalGenerator que:
   * - Divide o manifesto em lotes lógicos
   * - Valida cada lote antes de prosseguir
   * - Mantém contexto entre lotes
   * - Falha rápido se qualquer lote for inválido
   *
   * @param sessionId - ID da sessão
   * @param onProgress - Callback opcional para progresso
   * @returns Resultado completo ou erro
   */
  async generateCodeFromPlanIncremental(
    sessionId: string,
    onProgress?: (batchName: string, progress: number) => void
  ): Promise<AgentResult> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const contextData = session.contextData;
    const originalPrompt = (contextData["originalUserPrompt"] as string) || "";
    const enrichedPrompt = this.buildEnrichedPrompt(originalPrompt, contextData);
    const plan = contextData["planResult"] as PlanResult | undefined;

    if (!plan) {
      throw new Error("No plan found. Call generatePlan first.");
    }

    // Executa geração incremental com governança
    const result = await this.engineeringAgent.generateFromPlanIncremental(
      plan,
      enrichedPrompt,
      onProgress
    );

    // Marca sessão como completa
    this.sessionManager.updateSessionPhase(sessionId, "completed", "code_gen");
    this.sessionManager.updateSessionContext(sessionId, {
      engineeringResult: {
        summary: result.summary,
        fileCount: result.engine?.files?.length || 0,
        timestamp: new Date().toISOString(),
        incremental: true,
        quality: result.quality
      }
    });

    const incrementalMessage = await this.generateDynamicMessage("incremental_generated", {
      fileCount: result.engine?.files?.length || 0,
      completeness: result.quality?.codeCompleteness || 100
    });

    this.sessionManager.addMessage(
      sessionId,
      "agent",
      incrementalMessage,
      "code_gen",
      { type: "feedback", data: { fileCount: result.engine?.files?.length || 0, incremental: true } }
    );

    return result;
  }

  /**
   * Gera o resultado final (legado — roda tudo de uma vez).
   * Mantido para compatibilidade. Prefira generatePlan + generateCodeFromPlan.
   */
  async generateFinalResult(sessionId: string): Promise<AgentResult> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const contextData = session.contextData;
    const originalPrompt = (contextData["originalUserPrompt"] as string) || "";
    const enrichedPrompt = this.buildEnrichedPrompt(originalPrompt, contextData);

    const result = await this.engineeringAgent.analyze(enrichedPrompt);

    this.sessionManager.updateSessionPhase(sessionId, "completed", "code_gen");
    this.sessionManager.updateSessionContext(sessionId, {
      engineeringResult: {
        summary: result.summary,
        fileCount: result.engine?.files?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

    const finalMessage = await this.generateDynamicMessage("code_generated", {
      fileCount: result.engine?.files?.length || 0
    });

    this.sessionManager.addMessage(
      sessionId,
      "agent",
      finalMessage,
      "code_gen",
      { type: "feedback", data: { fileCount: result.engine?.files?.length || 0 } }
    );

    return result;
  }

  /**
   * Retorna o estado atual da sessão.
   */
  getSession(sessionId: string): ConversationSession | null {
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * Lista sessões de um usuário.
   */
  listSessions(userId: string): ConversationSession[] {
    return this.sessionManager.listSessions(userId);
  }

  /**
   * Remove uma sessão.
   */
  deleteSession(sessionId: string): void {
    this.sessionManager.deleteSession(sessionId);
  }

  // ============================================================================
  // MÉTODOS PRIVADOS
  // ============================================================================

  /**
   * Gera uma mensagem dinâmica via LLM baseada no contexto.
   * Evita frases hardcoded e mantém a conversa natural.
   */
  private async generateDynamicMessage(
    messageType: "plan_ready" | "code_generated" | "incremental_generated" | "collection_complete" | "agent_skipped",
    context: {
      epicCount?: number;
      userStoryCount?: number;
      fileCount?: number;
      completeness?: number;
      agentName?: string;
      userProfile?: Record<string, unknown>;
      originalPrompt?: string;
    }
  ): Promise<string> {
    const systemPrompt = `Você é um assistente de desenvolvimento de software amigável e profissional.
Gere uma mensagem curta (1-2 frases) e natural para informar o usuário sobre o status.
Adapte o tom ao contexto. Seja conciso mas informativo.
Responda apenas com a mensagem, sem formatação adicional.`;

    const prompts: Record<string, string> = {
      plan_ready: `O plano do projeto foi gerado com sucesso. Dados: ${context.epicCount} épicos, ${context.userStoryCount} user stories, ${context.fileCount} arquivos planejados. Informe o usuário de forma natural.`,
      code_generated: `O código foi gerado com sucesso. Total de ${context.fileCount} arquivos criados. Informe o usuário de forma celebratória mas profissional.`,
      incremental_generated: `O código foi gerado incrementalmente com governança. Total de ${context.fileCount} arquivos criados, completude de ${context.completeness}%. Destaque o processo incremental.`,
      collection_complete: `Todas as informações foram coletadas dos agentes de descoberta. O projeto original era: "${context.originalPrompt}". Informe que agora vai gerar o projeto.`,
      agent_skipped: `O agente "${context.agentName}" foi pulado pelo usuário. Confirme de forma breve.`
    };

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompts[messageType] || "Informe o status atual." }
        ],
        temperature: 0.7,
        max_tokens: 150
      });

      return response.choices[0]?.message?.content?.trim() || this.getFallbackMessage(messageType, context);
    } catch {
      return this.getFallbackMessage(messageType, context);
    }
  }

  /**
   * Fallback messages caso o LLM falhe (usado apenas em caso de erro de API).
   */
  private getFallbackMessage(
    messageType: string,
    context: { epicCount?: number; userStoryCount?: number; fileCount?: number; completeness?: number; agentName?: string }
  ): string {
    switch (messageType) {
      case "plan_ready":
        return `Plano pronto: ${context.epicCount} épicos, ${context.userStoryCount} histórias, ${context.fileCount} arquivos.`;
      case "code_generated":
        return `Código gerado: ${context.fileCount} arquivos.`;
      case "incremental_generated":
        return `Código gerado: ${context.fileCount} arquivos (${context.completeness}% completo).`;
      case "collection_complete":
        return `Informações coletadas. Iniciando geração...`;
      case "agent_skipped":
        return `${context.agentName}: pulado.`;
      default:
        return `Operação concluída.`;
    }
  }

  /**
   * Constrói o contexto para o agente atual.
   */
  private buildContext(sessionId: string, originalPrompt?: string): ConversationContext {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      sessionId,
      userProfile: null,
      emotionalContext: null,
      interactionStrategy: null,
      previousMessages: session.messages,
      currentPhase: session.currentPhase,
      accumulatedData: session.contextData,
      originalUserPrompt: originalPrompt || (session.contextData["originalUserPrompt"] as string) || ""
    };
  }

  /**
   * Constrói um prompt enriquecido com contexto acumulado para o pipeline de engenharia.
   */
  private buildEnrichedPrompt(originalPrompt: string, contextData: Record<string, unknown>): string {
    const parts: string[] = [originalPrompt];

    // Adiciona dados do perfil do usuário
    const profileData = contextData["userProfileData"];
    if (profileData && typeof profileData === "object") {
      const profile = profileData as Record<string, unknown>;
      parts.push(`\n\n[PERFIL DO USUÁRIO]`);
      if (profile["knowledgeLevel"]) parts.push(`Nível: ${profile["knowledgeLevel"]}`);
      if (profile["communicationStyle"]) parts.push(`Comunicação: ${profile["communicationStyle"]}`);
      if (profile["ageGroup"]) parts.push(`Faixa etária: ${profile["ageGroup"]}`);
    }

    // Adiciona contexto emocional
    const emotionalData = contextData["emotionalData"];
    if (emotionalData && typeof emotionalData === "object") {
      const emotions = emotionalData as Record<string, unknown>;
      parts.push(`\n\n[CONTEXTO EMOCIONAL]`);
      if (emotions["primaryEmotion"]) parts.push(`Emoção: ${emotions["primaryEmotion"]}`);
      if (emotions["suggestedTone"]) parts.push(`Tom sugerido: ${emotions["suggestedTone"]}`);
    }

    // Adiciona estratégia de interação
    const interactionData = contextData["interactionData"];
    if (interactionData && typeof interactionData === "object") {
      const interaction = interactionData as Record<string, unknown>;
      parts.push(`\n\n[ESTRATÉGIA DE INTERAÇÃO]`);
      if (interaction["autonomyLevel"] !== undefined) parts.push(`Autonomia: ${interaction["autonomyLevel"]}`);
      if (interaction["tone"]) parts.push(`Tom: ${interaction["tone"]}`);
    }

    // Adiciona decisões técnicas
    const decisionsData = contextData["decisionsData"];
    if (decisionsData && typeof decisionsData === "object") {
      parts.push(`\n\n[DECISÕES TÉCNICAS]`);
      parts.push(JSON.stringify(decisionsData, null, 2));
    }

    // Adiciona ajustes de experiência
    const experienceAdjustments = contextData["experienceAdjustments"];
    if (experienceAdjustments && typeof experienceAdjustments === "object") {
      parts.push(`\n\n[AJUSTES DE EXPERIÊNCIA]`);
      parts.push(JSON.stringify(experienceAdjustments, null, 2));
    }

    return parts.join("\n");
  }
}
