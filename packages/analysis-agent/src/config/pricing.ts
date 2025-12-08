/**
 * Pricing Configuration - Precificação de modelos LLM por provedor
 *
 * Este arquivo contém informações de preço por token para cada provedor e modelo,
 * permitindo estimativa de custos de forma agnóstica de provedor.
 *
 * ⚠️ IMPORTANTE: Preços podem mudar. Verificar documentação oficial:
 * - OpenAI: https://openai.com/pricing
 * - Anthropic: https://www.anthropic.com/pricing
 * - Google: https://ai.google.dev/pricing
 * - DeepSeek: https://platform.deepseek.com/pricing
 * - xAI: https://x.ai/pricing (quando disponível)
 * - Ollama: Gratuito (local)
 *
 * Última atualização: 2025-01-08
 *
 * @module config/pricing
 */

import { ModelTier } from "../types/model-tiers.js";

/**
 * Precificação de um modelo específico
 *
 * Preços em USD por 1 milhão de tokens.
 */
export interface ModelPricing {
  /** Preço por 1M tokens de input (USD) */
  inputPer1M: number;

  /** Preço por 1M tokens de output (USD) */
  outputPer1M: number;

  /** Nome do modelo */
  modelName: string;

  /** Tier do modelo */
  tier: ModelTier;
}

/**
 * Precificação de todos os modelos de um provedor
 */
export interface ProviderPricing {
  /** Nome do provedor */
  provider: string;

  /** Preços por modelo */
  models: Record<string, ModelPricing>;

  /** Preços por tier (atalho conveniente) */
  byTier: Record<ModelTier, ModelPricing>;
}

/**
 * Tabela de preços completa de todos os provedores
 *
 * Estrutura: { provedor: { tier: { inputPer1M, outputPer1M } } }
 *
 * Nota sobre Ollama: Modelos locais são gratuitos (custo = 0),
 * mas têm custo de infraestrutura (energia, hardware) não contabilizado aqui.
 */
export const PRICING_TABLE: Record<string, ProviderPricing> = {
  /**
   * OpenAI - Preços atualizados em Jan 2025
   *
   * Fonte: https://openai.com/pricing
   */
  openai: {
    provider: "openai",
    models: {
      "gpt-4o": {
        modelName: "gpt-4o",
        tier: ModelTier.PREMIUM,
        inputPer1M: 5.0, // $5.00 / 1M input tokens
        outputPer1M: 15.0, // $15.00 / 1M output tokens
      },
      "gpt-4o-mini": {
        modelName: "gpt-4o-mini",
        tier: ModelTier.STANDARD,
        inputPer1M: 0.15, // $0.15 / 1M input tokens
        outputPer1M: 0.6, // $0.60 / 1M output tokens
      },
    },
    byTier: {
      [ModelTier.PREMIUM]: {
        modelName: "gpt-4o",
        tier: ModelTier.PREMIUM,
        inputPer1M: 5.0,
        outputPer1M: 15.0,
      },
      [ModelTier.STANDARD]: {
        modelName: "gpt-4o-mini",
        tier: ModelTier.STANDARD,
        inputPer1M: 0.15,
        outputPer1M: 0.6,
      },
      [ModelTier.LOCAL]: {
        modelName: "gpt-4o-mini",
        tier: ModelTier.LOCAL,
        inputPer1M: 0.15,
        outputPer1M: 0.6,
      },
    },
  },

  /**
   * Anthropic - Preços atualizados em Jan 2025
   *
   * Fonte: https://www.anthropic.com/pricing
   */
  anthropic: {
    provider: "anthropic",
    models: {
      "claude-3-5-sonnet-20241022": {
        modelName: "claude-3-5-sonnet-20241022",
        tier: ModelTier.PREMIUM,
        inputPer1M: 3.0, // $3.00 / 1M input tokens
        outputPer1M: 15.0, // $15.00 / 1M output tokens
      },
      "claude-3-haiku-20240307": {
        modelName: "claude-3-haiku-20240307",
        tier: ModelTier.STANDARD,
        inputPer1M: 0.25, // $0.25 / 1M input tokens
        outputPer1M: 1.25, // $1.25 / 1M output tokens
      },
    },
    byTier: {
      [ModelTier.PREMIUM]: {
        modelName: "claude-3-5-sonnet-20241022",
        tier: ModelTier.PREMIUM,
        inputPer1M: 3.0,
        outputPer1M: 15.0,
      },
      [ModelTier.STANDARD]: {
        modelName: "claude-3-haiku-20240307",
        tier: ModelTier.STANDARD,
        inputPer1M: 0.25,
        outputPer1M: 1.25,
      },
      [ModelTier.LOCAL]: {
        modelName: "claude-3-haiku-20240307",
        tier: ModelTier.LOCAL,
        inputPer1M: 0.25,
        outputPer1M: 1.25,
      },
    },
  },

  /**
   * Google Gemini - Preços atualizados em Jan 2025
   *
   * Fonte: https://ai.google.dev/pricing
   */
  google: {
    provider: "google",
    models: {
      "gemini-1.5-pro": {
        modelName: "gemini-1.5-pro",
        tier: ModelTier.PREMIUM,
        inputPer1M: 1.25, // $1.25 / 1M input tokens
        outputPer1M: 5.0, // $5.00 / 1M output tokens
      },
      "gemini-1.5-flash": {
        modelName: "gemini-1.5-flash",
        tier: ModelTier.STANDARD,
        inputPer1M: 0.075, // $0.075 / 1M input tokens
        outputPer1M: 0.3, // $0.30 / 1M output tokens
      },
    },
    byTier: {
      [ModelTier.PREMIUM]: {
        modelName: "gemini-1.5-pro",
        tier: ModelTier.PREMIUM,
        inputPer1M: 1.25,
        outputPer1M: 5.0,
      },
      [ModelTier.STANDARD]: {
        modelName: "gemini-1.5-flash",
        tier: ModelTier.STANDARD,
        inputPer1M: 0.075,
        outputPer1M: 0.3,
      },
      [ModelTier.LOCAL]: {
        modelName: "gemini-1.5-flash",
        tier: ModelTier.LOCAL,
        inputPer1M: 0.075,
        outputPer1M: 0.3,
      },
    },
  },

  /**
   * DeepSeek - Preços atualizados em Jan 2025
   *
   * Fonte: https://platform.deepseek.com/pricing
   */
  deepseek: {
    provider: "deepseek",
    models: {
      "deepseek-chat": {
        modelName: "deepseek-chat",
        tier: ModelTier.PREMIUM,
        inputPer1M: 0.14, // $0.14 / 1M input tokens
        outputPer1M: 0.28, // $0.28 / 1M output tokens
      },
    },
    byTier: {
      [ModelTier.PREMIUM]: {
        modelName: "deepseek-chat",
        tier: ModelTier.PREMIUM,
        inputPer1M: 0.14,
        outputPer1M: 0.28,
      },
      [ModelTier.STANDARD]: {
        modelName: "deepseek-chat",
        tier: ModelTier.STANDARD,
        inputPer1M: 0.14,
        outputPer1M: 0.28,
      },
      [ModelTier.LOCAL]: {
        modelName: "deepseek-chat",
        tier: ModelTier.LOCAL,
        inputPer1M: 0.14,
        outputPer1M: 0.28,
      },
    },
  },

  /**
   * xAI (Grok) - Preços estimados (API ainda não pública)
   *
   * Nota: xAI não publicou preços oficiais ainda (Jan 2025).
   * Valores são estimativas baseadas em comunicados e comparáveis.
   * Atualizar quando preços oficiais forem divulgados.
   */
  xai: {
    provider: "xai",
    models: {
      "grok-beta": {
        modelName: "grok-beta",
        tier: ModelTier.PREMIUM,
        inputPer1M: 5.0, // Estimativa (similar a GPT-4o)
        outputPer1M: 15.0, // Estimativa (similar a GPT-4o)
      },
    },
    byTier: {
      [ModelTier.PREMIUM]: {
        modelName: "grok-beta",
        tier: ModelTier.PREMIUM,
        inputPer1M: 5.0,
        outputPer1M: 15.0,
      },
      [ModelTier.STANDARD]: {
        modelName: "grok-beta",
        tier: ModelTier.STANDARD,
        inputPer1M: 5.0,
        outputPer1M: 15.0,
      },
      [ModelTier.LOCAL]: {
        modelName: "grok-beta",
        tier: ModelTier.LOCAL,
        inputPer1M: 5.0,
        outputPer1M: 15.0,
      },
    },
  },

  /**
   * Ollama - Modelos locais (custo zero)
   *
   * Nota: Ollama roda modelos localmente, então custo de API é $0.
   * Custo real inclui hardware (GPU/CPU), energia, etc., mas não é
   * contabilizado aqui por ser variável demais.
   */
  ollama: {
    provider: "ollama",
    models: {
      "llama3.1:70b": {
        modelName: "llama3.1:70b",
        tier: ModelTier.PREMIUM,
        inputPer1M: 0.0,
        outputPer1M: 0.0,
      },
      "llama3.1:8b": {
        modelName: "llama3.1:8b",
        tier: ModelTier.STANDARD,
        inputPer1M: 0.0,
        outputPer1M: 0.0,
      },
    },
    byTier: {
      [ModelTier.PREMIUM]: {
        modelName: "llama3.1:70b",
        tier: ModelTier.PREMIUM,
        inputPer1M: 0.0,
        outputPer1M: 0.0,
      },
      [ModelTier.STANDARD]: {
        modelName: "llama3.1:8b",
        tier: ModelTier.STANDARD,
        inputPer1M: 0.0,
        outputPer1M: 0.0,
      },
      [ModelTier.LOCAL]: {
        modelName: "llama3.1:8b",
        tier: ModelTier.LOCAL,
        inputPer1M: 0.0,
        outputPer1M: 0.0,
      },
    },
  },
};

/**
 * Obtém o preço de um modelo específico
 *
 * @param provider - Nome do provedor
 * @param tier - Tier do modelo
 * @returns Objeto com preços de input/output ou undefined se não encontrado
 *
 * @example
 * ```typescript
 * const pricing = getPricing("openai", ModelTier.PREMIUM);
 * // { inputPer1M: 5.0, outputPer1M: 15.0, modelName: "gpt-4o", tier: "premium" }
 * ```
 */
export function getPricing(provider: string, tier: ModelTier): ModelPricing | undefined {
  const providerPricing = PRICING_TABLE[provider.toLowerCase()];

  if (!providerPricing) {
    console.warn(`[Pricing] Provedor desconhecido: "${provider}" - custo não calculado`);
    return undefined;
  }

  const pricing = providerPricing.byTier[tier];

  if (!pricing) {
    console.warn(`[Pricing] Tier "${tier}" não encontrado para provedor "${provider}"`);
    return undefined;
  }

  return pricing;
}

/**
 * Calcula o custo de uma chamada LLM
 *
 * @param provider - Nome do provedor
 * @param tier - Tier do modelo
 * @param inputTokens - Número de tokens de input
 * @param outputTokens - Número de tokens de output
 * @returns Custo estimado em USD
 *
 * @example
 * ```typescript
 * const cost = calculateCost("openai", ModelTier.PREMIUM, 10000, 5000);
 * // Input: 10K tokens × $5/1M = $0.05
 * // Output: 5K tokens × $15/1M = $0.075
 * // Total: $0.125
 * ```
 */
export function calculateCost(
  provider: string,
  tier: ModelTier,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getPricing(provider, tier);

  if (!pricing) {
    // Se não encontrou preço, retornar 0 (melhor que lançar erro)
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;

  return inputCost + outputCost;
}

/**
 * Formata um valor de custo em USD para exibição
 *
 * @param costUSD - Custo em USD
 * @param precision - Número de casas decimais (padrão: 2)
 * @returns String formatada (ex: "$0.58", "$2.35")
 *
 * @example
 * ```typescript
 * formatCost(0.5812); // "$0.58"
 * formatCost(2.3456, 3); // "$2.346"
 * formatCost(0.0042); // "$0.00"
 * ```
 */
export function formatCost(costUSD: number, precision: number = 2): string {
  return `$${costUSD.toFixed(precision)}`;
}

/**
 * Formata número de tokens para exibição legível
 *
 * @param tokens - Número de tokens
 * @returns String formatada (ex: "125.4K", "2.5M")
 *
 * @example
 * ```typescript
 * formatTokens(125432); // "125.4K"
 * formatTokens(2500000); // "2.5M"
 * formatTokens(850); // "850"
 * ```
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }

  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }

  return `${tokens}`;
}

/**
 * Calcula custo teórico se usasse apenas PREMIUM para tudo
 *
 * Útil para calcular economia ao usar estratégia de tiers.
 *
 * @param provider - Nome do provedor
 * @param totalInputTokens - Total de tokens de input
 * @param totalOutputTokens - Total de tokens de output
 * @returns Custo se usasse apenas tier PREMIUM
 *
 * @example
 * ```typescript
 * // Cenário: 500K input tokens, 200K output tokens
 * const costWithOnlyPremium = calculatePremiumOnlyCost("openai", 500000, 200000);
 * // Input: 500K × $5/1M = $2.50
 * // Output: 200K × $15/1M = $3.00
 * // Total: $5.50
 * ```
 */
export function calculatePremiumOnlyCost(
  provider: string,
  totalInputTokens: number,
  totalOutputTokens: number
): number {
  return calculateCost(provider, ModelTier.PREMIUM, totalInputTokens, totalOutputTokens);
}

/**
 * Calcula economia em USD e percentual
 *
 * @param actualCost - Custo real (com estratégia de tiers)
 * @param premiumOnlyCost - Custo teórico (se usasse apenas PREMIUM)
 * @returns Objeto com economia absoluta e percentual
 *
 * @example
 * ```typescript
 * const savings = calculateSavings(0.58, 2.35);
 * // { savedUSD: 1.77, savedPercentage: 75.3 }
 * ```
 */
export function calculateSavings(
  actualCost: number,
  premiumOnlyCost: number
): { savedUSD: number; savedPercentage: number } {
  const savedUSD = premiumOnlyCost - actualCost;
  const savedPercentage = premiumOnlyCost > 0 ? (savedUSD / premiumOnlyCost) * 100 : 0;

  return {
    savedUSD,
    savedPercentage,
  };
}

/**
 * Lista todos os provedores com preços disponíveis
 *
 * @returns Array com nomes dos provedores
 *
 * @example
 * ```typescript
 * getAvailableProviders();
 * // ["openai", "anthropic", "google", "deepseek", "xai", "ollama"]
 * ```
 */
export function getAvailableProviders(): string[] {
  return Object.keys(PRICING_TABLE);
}

/**
 * Verifica se um provedor tem informações de preço
 *
 * @param provider - Nome do provedor
 * @returns true se preço disponível, false caso contrário
 *
 * @example
 * ```typescript
 * hasPricing("openai"); // true
 * hasPricing("unknown"); // false
 * ```
 */
export function hasPricing(provider: string): boolean {
  return provider.toLowerCase() in PRICING_TABLE;
}

/**
 * Compara custos entre provedores para uma mesma carga de tokens
 *
 * @param inputTokens - Tokens de input
 * @param outputTokens - Tokens de output
 * @param tier - Tier a comparar
 * @returns Array com comparação de custos por provedor
 *
 * @example
 * ```typescript
 * const comparison = compareProviderCosts(100000, 50000, ModelTier.PREMIUM);
 * // [
 * //   { provider: "google", cost: 0.375, model: "gemini-1.5-pro" },
 * //   { provider: "anthropic", cost: 1.05, model: "claude-3-5-sonnet" },
 * //   { provider: "openai", cost: 1.25, model: "gpt-4o" },
 * //   ...
 * // ]
 * ```
 */
export function compareProviderCosts(
  inputTokens: number,
  outputTokens: number,
  tier: ModelTier
): Array<{ provider: string; cost: number; model: string }> {
  const providers = getAvailableProviders();

  const costs = providers
    .map((provider) => {
      const pricing = getPricing(provider, tier);
      if (!pricing) return null;

      const cost = calculateCost(provider, tier, inputTokens, outputTokens);

      return {
        provider,
        cost,
        model: pricing.modelName,
      };
    })
    .filter((item): item is { provider: string; cost: number; model: string } => item !== null)
    .sort((a, b) => a.cost - b.cost);

  return costs;
}
