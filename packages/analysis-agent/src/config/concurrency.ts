/**
 * Concurrency Configuration - Limites de concorrência para processamento paralelo
 *
 * Este arquivo define quantas tarefas podem ser executadas simultaneamente
 * para cada tier de modelo, balanceando performance e limites de API.
 *
 * Considerações:
 * - Rate limits de APIs (ex: OpenAI permite ~3500 RPM para Tier 2)
 * - Uso de memória (cada chamada LLM consome ~5-10MB)
 * - Tempo de resposta (muitas chamadas paralelas podem causar timeouts)
 * - Custos (mais concorrência = mais uso de API simultaneamente)
 *
 * @module config/concurrency
 */

import { ModelTier } from "../types/model-tiers.js";

/**
 * Configuração de limites de concorrência por tier de modelo
 *
 * Define quantas chamadas LLM podem ser executadas simultaneamente
 * para cada tier, respeitando rate limits e recursos disponíveis.
 *
 * Valores baseados em:
 * - OpenAI Tier 2: 3500 RPM (requests per minute) = ~58 RPS
 * - Anthropic: 50 RPS para Claude Haiku, 20 RPS para Sonnet
 * - Google Gemini: 60 RPM free tier, 1000 RPM paid
 * - Limites práticos de memória e latência
 *
 * @example
 * ```typescript
 * const limit = CONCURRENCY_LIMITS[ModelTier.PREMIUM]; // 5
 * const limit2 = CONCURRENCY_LIMITS[ModelTier.STANDARD]; // 12
 * ```
 */
export const CONCURRENCY_LIMITS: Record<ModelTier, number> = {
  /**
   * PREMIUM - Limite conservador de 5 chamadas simultâneas
   *
   * Justificativa:
   * - Modelos premium são mais lentos (3-10s por resposta)
   * - Geram mais tokens (higher latency)
   * - Rate limits mais restritivos (ex: Claude Sonnet 20 RPS)
   * - Custo mais alto (evitar estouro de orçamento acidental)
   *
   * Exemplo: Gerar 15 arquivos complexos
   * - Sem paralelismo: 15 × 8s = 120s (2 minutos)
   * - Com 5 paralelos: 3 batches × 8s = 24s (5x mais rápido)
   */
  [ModelTier.PREMIUM]: 5,

  /**
   * STANDARD - Limite otimista de 12 chamadas simultâneas
   *
   * Justificativa:
   * - Modelos standard são mais rápidos (1-3s por resposta)
   * - Rate limits mais generosos (ex: gpt-4o-mini ~58 RPS)
   * - Custo baixo (pode usar mais sem preocupação)
   * - Tarefas simples (menor chance de timeout)
   *
   * Exemplo: Gerar 35 arquivos simples
   * - Sem paralelismo: 35 × 2s = 70s
   * - Com 12 paralelos: 3 batches × 2s = 6s (11.7x mais rápido)
   */
  [ModelTier.STANDARD]: 12,

  /**
   * LOCAL - Limite alto de 8 chamadas simultâneas
   *
   * Justificativa:
   * - Sem rate limits de API (rodando local)
   * - Limitado apenas por CPU/GPU/RAM disponíveis
   * - Ollama pode processar múltiplas requisições se modelo cabe em VRAM
   * - 8 é um meio termo seguro para GPUs de 16-24GB
   *
   * Nota: Usuários com GPUs potentes podem aumentar via env var:
   * OLLAMA_CONCURRENCY_LIMIT=16
   */
  [ModelTier.LOCAL]: parseInt(process.env.OLLAMA_CONCURRENCY_LIMIT || "8", 10),
};

/**
 * Obtém o limite de concorrência para um tier específico
 *
 * @param tier - Tier de modelo
 * @returns Número máximo de chamadas simultâneas permitidas
 *
 * @example
 * ```typescript
 * const limit = getConcurrencyLimit(ModelTier.PREMIUM); // 5
 * const limit2 = getConcurrencyLimit(ModelTier.STANDARD); // 12
 * ```
 */
export function getConcurrencyLimit(tier: ModelTier): number {
  const limit = CONCURRENCY_LIMITS[tier];

  if (limit === undefined) {
    // eslint-disable-next-line no-console
    console.warn(`[Concurrency] Tier desconhecido: "${tier}" - usando limite padrão 5`);
    return 5;
  }

  return limit;
}

/**
 * Configuração de batch sizes para geração de arquivos
 *
 * Define quantos arquivos devem ser processados em cada batch,
 * considerando o tier de complexidade do arquivo.
 *
 * Exemplo de uso:
 * - 50 arquivos: 15 complexos (PREMIUM) + 35 simples (STANDARD)
 * - Batch 1 (PREMIUM): 5 arquivos complexos em paralelo
 * - Batch 2 (PREMIUM): 5 arquivos complexos em paralelo
 * - Batch 3 (PREMIUM): 5 arquivos complexos em paralelo
 * - Batch 4 (STANDARD): 12 arquivos simples em paralelo
 * - Batch 5 (STANDARD): 12 arquivos simples em paralelo
 * - Batch 6 (STANDARD): 11 arquivos simples em paralelo
 *
 * Tempo estimado:
 * - Sem paralelismo: (15 × 8s) + (35 × 2s) = 120s + 70s = 190s (~3.2min)
 * - Com paralelismo: (3 × 8s) + (3 × 2s) = 24s + 6s = 30s (~0.5min)
 * - Speedup: 6.3x mais rápido
 */
export const FILE_BATCH_SIZES = {
  /**
   * Arquivos complexos (PREMIUM): batches de 5
   */
  COMPLEX: CONCURRENCY_LIMITS[ModelTier.PREMIUM],

  /**
   * Arquivos simples (STANDARD): batches de 12
   */
  SIMPLE: CONCURRENCY_LIMITS[ModelTier.STANDARD],

  /**
   * Arquivos de configuração (STANDARD): batches de 12
   */
  CONFIG: CONCURRENCY_LIMITS[ModelTier.STANDARD],

  /**
   * Arquivos de teste (STANDARD): batches de 12
   */
  TEST: CONCURRENCY_LIMITS[ModelTier.STANDARD],

  /**
   * Arquivos de docs (STANDARD): batches de 12
   */
  DOCS: CONCURRENCY_LIMITS[ModelTier.STANDARD],
} as const;

/**
 * Configuração de concorrência para User Stories
 *
 * Define quantos épicos podem ter suas HUs geradas simultaneamente.
 *
 * Estratégia:
 * - 5 épicos geram HUs em paralelo (1 chamada LLM por épico)
 * - Cada chamada gera ~10 HUs
 * - Total: 5 × 10 = 50 HUs em ~1 batch
 *
 * Tempo estimado:
 * - Sem paralelismo: 5 épicos × 15s = 75s
 * - Com paralelismo (5 simultâneos): 1 batch × 15s = 15s
 * - Speedup: 5x mais rápido
 */
export const USER_STORIES_CONCURRENCY = CONCURRENCY_LIMITS[ModelTier.PREMIUM];

/**
 * Timeout por tier (em milissegundos)
 *
 * Define quanto tempo aguardar por uma resposta LLM antes de timeout.
 * Modelos premium geram mais tokens e precisam de mais tempo.
 */
export const TIMEOUT_BY_TIER: Record<ModelTier, number> = {
  /**
   * PREMIUM - 360s (6 minutos)
   * Justificativa: Tarefas complexas (Architecture, HUs) podem gerar
   * muitos tokens e precisam de tempo para raciocínio profundo.
   */
  [ModelTier.PREMIUM]: 360_000, // 6 minutos

  /**
   * STANDARD - 120s (2 minutos)
   * Justificativa: Tarefas simples devem completar rapidamente.
   * Se demorar mais que 2min, provavelmente há um problema.
   */
  [ModelTier.STANDARD]: 120_000, // 2 minutos

  /**
   * LOCAL - 180s (3 minutos)
   * Justificativa: Modelos locais podem ser mais lentos dependendo
   * do hardware disponível. 3min é um meio termo razoável.
   */
  [ModelTier.LOCAL]: 180_000, // 3 minutos
};

/**
 * Obtém o timeout apropriado para um tier
 *
 * @param tier - Tier de modelo
 * @returns Timeout em milissegundos
 *
 * @example
 * ```typescript
 * const timeout = getTimeoutForTier(ModelTier.PREMIUM); // 360000 (6 min)
 * const timeout2 = getTimeoutForTier(ModelTier.STANDARD); // 120000 (2 min)
 * ```
 */
export function getTimeoutForTier(tier: ModelTier): number {
  const timeout = TIMEOUT_BY_TIER[tier];

  if (timeout === undefined) {
    // eslint-disable-next-line no-console
    console.warn(`[Concurrency] Tier desconhecido: "${tier}" - usando timeout padrão 120s`);
    return 120_000;
  }

  return timeout;
}

/**
 * Estatísticas de performance esperadas
 *
 * Valores baseados em benchmarks com projetos de complexidade MEDIUM.
 * Útil para documentação e estimativas.
 */
export const PERFORMANCE_ESTIMATES = {
  /**
   * Geração sequencial (baseline - sem paralelismo)
   */
  sequential: {
    complexity: 5_000, // 5s
    architecture: 12_000, // 12s
    userStories: 75_000, // 75s (5 épicos × 15s)
    filesComplex: 120_000, // 120s (15 arquivos × 8s)
    filesSimple: 70_000, // 70s (35 arquivos × 2s)
    total: 282_000, // 282s (~4.7 minutos)
  },

  /**
   * Geração paralela (com estratégia de concorrência)
   */
  parallel: {
    complexity: 5_000, // 5s (não paralelizável - única tarefa)
    architecture: 12_000, // 12s (não paralelizável - única tarefa)
    userStories: 15_000, // 15s (5 épicos em paralelo)
    filesComplex: 24_000, // 24s (3 batches de 5)
    filesSimple: 6_000, // 6s (3 batches de 12)
    total: 62_000, // 62s (~1 minuto)
  },

  /**
   * Speedup (fator de aceleração)
   */
  speedup: {
    userStories: 5.0, // 75s → 15s (5x mais rápido)
    filesComplex: 5.0, // 120s → 24s (5x mais rápido)
    filesSimple: 11.7, // 70s → 6s (11.7x mais rápido)
    overall: 4.5, // 282s → 62s (4.5x mais rápido)
  },
} as const;

/**
 * Calcula o número de batches necessários para processar N itens
 *
 * @param itemCount - Número de itens a processar
 * @param batchSize - Tamanho de cada batch
 * @returns Número de batches necessários
 *
 * @example
 * ```typescript
 * const batches = calculateBatchCount(50, 12); // 5 batches
 * const batches2 = calculateBatchCount(15, 5); // 3 batches
 * ```
 */
export function calculateBatchCount(itemCount: number, batchSize: number): number {
  if (batchSize <= 0) {
    throw new Error(`calculateBatchCount(): batchSize deve ser > 0, recebido: ${batchSize}`);
  }

  return Math.ceil(itemCount / batchSize);
}

/**
 * Estima o tempo de processamento baseado em quantidade de itens e tier
 *
 * @param itemCount - Número de itens a processar
 * @param tier - Tier de modelo a ser usado
 * @param avgTimePerItem - Tempo médio por item em milissegundos
 * @returns Estimativa de tempo total em milissegundos
 *
 * @example
 * ```typescript
 * // 15 arquivos complexos usando PREMIUM (avg 8s por arquivo)
 * const estimate = estimateProcessingTime(15, ModelTier.PREMIUM, 8000);
 * // Com 5 concorrentes: 3 batches × 8000ms = 24000ms (24s)
 * ```
 */
export function estimateProcessingTime(
  itemCount: number,
  tier: ModelTier,
  avgTimePerItem: number
): number {
  const concurrencyLimit = getConcurrencyLimit(tier);
  const batchCount = calculateBatchCount(itemCount, concurrencyLimit);
  return batchCount * avgTimePerItem;
}
