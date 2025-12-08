/**
 * Generation Metrics - Tipos para métricas de geração agnósticas de provedor
 *
 * Este arquivo define estruturas para rastrear métricas de geração de projetos
 * de forma independente de provedor LLM, permitindo comparação e análise.
 *
 * Métricas rastreadas:
 * - Tokens consumidos (input/output)
 * - Tempo de execução
 * - Custos estimados (quando disponível)
 * - Taxa de sucesso/erro
 * - Tier de modelo usado
 *
 * @module types/metrics
 */

import { ModelTier } from "./model-tiers.js";

/**
 * Métricas de uma única chamada LLM
 *
 * Rastreia informações detalhadas sobre uma chamada individual,
 * incluindo tokens, tempo, custo e modelo usado.
 */
export interface LLMCallMetrics {
  /** Identificador da chamada (ex: "Complexity", "Architecture", "File: src/domain/Patient.ts") */
  context: string;

  /** Tier do modelo usado (PREMIUM, STANDARD, LOCAL) */
  tier: ModelTier;

  /** Nome do provedor (openai, anthropic, google, etc.) */
  provider: string;

  /** Nome específico do modelo usado (ex: "gpt-4o", "claude-3-5-sonnet-20241022") */
  model: string;

  /** Timestamp de início da chamada */
  startTime: number;

  /** Timestamp de fim da chamada */
  endTime: number;

  /** Duração em milissegundos */
  durationMs: number;

  /** Número de tokens no prompt (input) */
  inputTokens: number;

  /** Número de tokens na resposta (output) */
  outputTokens: number;

  /** Número total de tokens (input + output) */
  totalTokens: number;

  /** Custo estimado em USD (se disponível) */
  estimatedCostUSD?: number;

  /** Status da chamada */
  status: "success" | "error" | "timeout";

  /** Mensagem de erro (se status = "error") */
  errorMessage?: string;

  /** Número de tentativas (retries) realizadas */
  retryCount: number;
}

/**
 * Métricas agregadas de geração de um projeto completo
 *
 * Consolida todas as chamadas LLM realizadas durante a geração de um projeto,
 * fornecendo visão geral de consumo, performance e custos.
 */
export interface ProjectGenerationMetrics {
  /** Identificador único do projeto */
  projectId: string;

  /** Nome ou descrição do projeto */
  projectName: string;

  /** Timestamp de início da geração */
  startTime: number;

  /** Timestamp de fim da geração */
  endTime: number;

  /** Duração total em milissegundos */
  totalDurationMs: number;

  /** Métricas individuais de cada chamada LLM */
  calls: LLMCallMetrics[];

  /** Métricas agregadas por tier */
  byTier: Record<
    ModelTier,
    {
      /** Número de chamadas neste tier */
      callCount: number;

      /** Total de tokens de input */
      totalInputTokens: number;

      /** Total de tokens de output */
      totalOutputTokens: number;

      /** Total de tokens */
      totalTokens: number;

      /** Custo estimado total em USD */
      estimatedCostUSD: number;

      /** Tempo total gasto (soma das durações) */
      totalDurationMs: number;
    }
  >;

  /** Métricas agregadas por tipo de tarefa */
  byTask: Record<
    string,
    {
      /** Número de chamadas deste tipo */
      callCount: number;

      /** Total de tokens */
      totalTokens: number;

      /** Custo estimado em USD */
      estimatedCostUSD: number;

      /** Tempo total gasto */
      totalDurationMs: number;
    }
  >;

  /** Totais gerais */
  totals: {
    /** Total de chamadas realizadas */
    callCount: number;

    /** Total de chamadas bem-sucedidas */
    successCount: number;

    /** Total de chamadas com erro */
    errorCount: number;

    /** Total de chamadas com timeout */
    timeoutCount: number;

    /** Total de tokens de input */
    totalInputTokens: number;

    /** Total de tokens de output */
    totalOutputTokens: number;

    /** Total de tokens (input + output) */
    totalTokens: number;

    /** Custo estimado total em USD */
    estimatedTotalCostUSD: number;

    /** Taxa de sucesso (0.0 - 1.0) */
    successRate: number;

    /** Número total de retries realizados */
    totalRetries: number;
  };

  /** Economia estimada vs. usar apenas PREMIUM para tudo */
  savings?: {
    /** Custo se usasse apenas PREMIUM */
    costWithOnlyPremium: number;

    /** Custo real com estratégia de tiers */
    actualCost: number;

    /** Economia absoluta em USD */
    savedUSD: number;

    /** Economia percentual */
    savedPercentage: number;
  };
}

/**
 * Resumo de métricas para exibição em logs
 *
 * Versão simplificada das métricas para output conciso em console.
 */
export interface MetricsSummary {
  /** Duração total em formato legível (ex: "2.5 min") */
  duration: string;

  /** Total de tokens formatado (ex: "125.4K tokens") */
  tokens: string;

  /** Custo estimado formatado (ex: "$0.58") */
  cost: string;

  /** Taxa de sucesso formatada (ex: "98.5%") */
  successRate: string;

  /** Breakdown por tier */
  byTier: Array<{
    tier: ModelTier;
    calls: number;
    tokens: string;
    cost: string;
  }>;

  /** Economia estimada (se aplicável) */
  savings?: string;
}

/**
 * Estado do rastreador de métricas
 *
 * Armazena métricas em andamento durante a geração de um projeto.
 */
export interface MetricsTracker {
  /** Identificador do projeto sendo rastreado */
  projectId: string;

  /** Nome do projeto */
  projectName: string;

  /** Timestamp de início */
  startTime: number;

  /** Lista de chamadas registradas */
  calls: LLMCallMetrics[];

  /** Adiciona uma nova chamada ao rastreamento */
  addCall(metrics: LLMCallMetrics): void;

  /** Finaliza o rastreamento e retorna métricas completas */
  finalize(): ProjectGenerationMetrics;

  /** Retorna resumo formatado para logs */
  getSummary(): MetricsSummary;

  /** Retorna métricas parciais (enquanto ainda em andamento) */
  getPartialMetrics(): Partial<ProjectGenerationMetrics>;
}

/**
 * Configuração de exibição de métricas
 */
export interface MetricsDisplayConfig {
  /** Mostrar métricas no console durante a geração */
  showInConsole: boolean;

  /** Salvar métricas em arquivo JSON */
  saveToFile: boolean;

  /** Caminho do arquivo de métricas (se saveToFile = true) */
  filePath?: string;

  /** Incluir métricas de economia na exibição */
  showSavings: boolean;

  /** Incluir breakdown detalhado por tarefa */
  showTaskBreakdown: boolean;

  /** Nível de detalhe (0 = mínimo, 1 = médio, 2 = completo) */
  verbosity: 0 | 1 | 2;
}

/**
 * Evento de métrica
 *
 * Emitido quando uma chamada LLM é concluída, permitindo
 * logging e análise em tempo real.
 */
export interface MetricsEvent {
  /** Tipo do evento */
  type: "llm_call_start" | "llm_call_end" | "llm_call_error" | "project_complete";

  /** Timestamp do evento */
  timestamp: number;

  /** Contexto da chamada (ex: "Architecture", "File: Patient.ts") */
  context: string;

  /** Tier usado */
  tier?: ModelTier;

  /** Métricas da chamada (se disponível) */
  metrics?: LLMCallMetrics;

  /** Métricas do projeto completo (se type = "project_complete") */
  projectMetrics?: ProjectGenerationMetrics;
}
