/**
 * Model Mappings - Mapeamento de tiers para modelos específicos de cada provedor
 *
 * Este arquivo mapeia os tiers abstratos (PREMIUM, STANDARD, LOCAL) para nomes
 * concretos de modelos de cada provedor LLM, permitindo que o sistema seja
 * agnóstico de provedor.
 *
 * Provedores suportados:
 * - openai: GPT-4o (premium), GPT-4o-mini (standard)
 * - anthropic: Claude 3.5 Sonnet (premium), Claude 3 Haiku (standard)
 * - google: Gemini 1.5 Pro (premium), Gemini 1.5 Flash (standard)
 * - deepseek: DeepSeek Chat (premium), DeepSeek Chat (standard)
 * - xai: Grok Beta (premium), Grok Beta (standard)
 * - ollama: Modelos locais configuráveis
 *
 * @module config/model-mappings
 */

import { ModelTier } from "../types/model-tiers.js";

/**
 * Tipo para mapeamento de tier → nome do modelo
 */
export type TierMapping = Record<ModelTier, string>;

/**
 * Tipo para mapeamento de provedor → tiers
 */
export type ProviderMappings = Record<string, TierMapping>;

/**
 * Mapeamento completo de provedores e seus modelos por tier
 *
 * Estrutura: { provedor: { tier: "nome-do-modelo" } }
 *
 * @example
 * ```typescript
 * const model = MODEL_MAPPINGS["openai"][ModelTier.PREMIUM]; // "gpt-4o"
 * const standardModel = MODEL_MAPPINGS["anthropic"][ModelTier.STANDARD]; // "claude-3-haiku-20240307"
 * ```
 */
export const MODEL_MAPPINGS: ProviderMappings = {
  /**
   * OpenAI - Modelos GPT
   * Premium: GPT-4o (mais capaz, $5/1M input tokens, $15/1M output tokens)
   * Standard: GPT-4o-mini (rápido e econômico, $0.15/1M input, $0.60/1M output)
   */
  openai: {
    [ModelTier.PREMIUM]: "gpt-4o",
    [ModelTier.STANDARD]: "gpt-4o-mini",
    [ModelTier.LOCAL]: "gpt-4o-mini", // Fallback: OpenAI não tem modelos locais
  },

  /**
   * Anthropic - Modelos Claude
   * Premium: Claude 3.5 Sonnet (mais capaz, $3/1M input, $15/1M output)
   * Standard: Claude 3 Haiku (rápido, $0.25/1M input, $1.25/1M output)
   */
  anthropic: {
    [ModelTier.PREMIUM]: "claude-3-5-sonnet-20241022",
    [ModelTier.STANDARD]: "claude-3-haiku-20240307",
    [ModelTier.LOCAL]: "claude-3-haiku-20240307", // Fallback: Anthropic não tem modelos locais
  },

  /**
   * Google - Modelos Gemini
   * Premium: Gemini 1.5 Pro (mais capaz, $1.25/1M input, $5/1M output)
   * Standard: Gemini 1.5 Flash (rápido, $0.075/1M input, $0.30/1M output)
   */
  google: {
    [ModelTier.PREMIUM]: "gemini-1.5-pro",
    [ModelTier.STANDARD]: "gemini-1.5-flash",
    [ModelTier.LOCAL]: "gemini-1.5-flash", // Fallback: Google não tem modelos locais
  },

  /**
   * DeepSeek - Modelos DeepSeek
   * Premium/Standard: DeepSeek Chat (único modelo, $0.14/1M input, $0.28/1M output)
   * Nota: DeepSeek tem apenas um modelo público, então premium = standard
   */
  deepseek: {
    [ModelTier.PREMIUM]: "deepseek-chat",
    [ModelTier.STANDARD]: "deepseek-chat",
    [ModelTier.LOCAL]: "deepseek-chat", // Fallback
  },

  /**
   * xAI - Modelos Grok
   * Premium/Standard: Grok Beta (único modelo disponível publicamente)
   * Nota: xAI tem apenas Grok Beta em acesso público, então premium = standard
   */
  xai: {
    [ModelTier.PREMIUM]: "grok-beta",
    [ModelTier.STANDARD]: "grok-beta",
    [ModelTier.LOCAL]: "grok-beta", // Fallback
  },

  /**
   * Ollama - Modelos locais
   * Premium: llama3.1:70b (modelo grande e capaz)
   * Standard: llama3.1:8b (modelo rápido e leve)
   * Local: llama3.1:8b (padrão para uso local)
   *
   * Nota: Estes são valores padrão. O usuário pode configurar modelos
   * customizados via variáveis de ambiente:
   * - OLLAMA_PREMIUM_MODEL
   * - OLLAMA_STANDARD_MODEL
   * - OLLAMA_LOCAL_MODEL
   */
  ollama: {
    [ModelTier.PREMIUM]: process.env.OLLAMA_PREMIUM_MODEL || "llama3.1:70b",
    [ModelTier.STANDARD]: process.env.OLLAMA_STANDARD_MODEL || "llama3.1:8b",
    [ModelTier.LOCAL]: process.env.OLLAMA_LOCAL_MODEL || "llama3.1:8b",
  },
};

/**
 * Obtém o nome do modelo específico para um provedor e tier
 *
 * @param provider - Nome do provedor (openai, anthropic, google, deepseek, xai, ollama)
 * @param tier - Tier do modelo (PREMIUM, STANDARD, LOCAL)
 * @returns Nome do modelo ou undefined se provedor desconhecido
 *
 * @example
 * ```typescript
 * const model = getModelForTier("openai", ModelTier.PREMIUM); // "gpt-4o"
 * const model2 = getModelForTier("anthropic", ModelTier.STANDARD); // "claude-3-haiku-20240307"
 * ```
 */
export function getModelForTier(provider: string, tier: ModelTier): string | undefined {
  const providerMappings = MODEL_MAPPINGS[provider.toLowerCase()];
  if (!providerMappings) {
    console.warn(`[ModelMappings] Provedor desconhecido: "${provider}" - retornando undefined`);
    return undefined;
  }

  const model = providerMappings[tier];
  if (!model) {
    console.warn(`[ModelMappings] Tier "${tier}" não encontrado para provedor "${provider}"`);
    return undefined;
  }

  return model;
}

/**
 * Detecta o provedor a partir da baseURL do cliente OpenAI
 *
 * Cada provedor tem uma baseURL característica:
 * - OpenAI: https://api.openai.com/v1
 * - Anthropic: via SDK próprio (não usa OpenAI client)
 * - Google: https://generativelanguage.googleapis.com/v1beta
 * - DeepSeek: https://api.deepseek.com
 * - xAI: https://api.x.ai/v1
 * - Ollama: http://localhost:11434/v1
 *
 * @param baseURL - URL base do cliente LLM
 * @returns Nome do provedor detectado ou "openai" como fallback
 *
 * @example
 * ```typescript
 * const provider = detectProviderFromURL("https://api.openai.com/v1"); // "openai"
 * const provider2 = detectProviderFromURL("http://localhost:11434/v1"); // "ollama"
 * ```
 */
export function detectProviderFromURL(baseURL?: string): string {
  if (!baseURL) {
    console.info("[ModelMappings] baseURL não fornecida - assumindo provedor 'openai'");
    return "openai";
  }

  const url = baseURL.toLowerCase();

  // OpenAI
  if (url.includes("api.openai.com")) {
    return "openai";
  }

  // Anthropic (geralmente usa SDK próprio, mas se configurado via OpenAI client)
  if (url.includes("anthropic") || url.includes("claude")) {
    return "anthropic";
  }

  // Google Gemini
  if (url.includes("generativelanguage.googleapis.com") || url.includes("gemini")) {
    return "google";
  }

  // DeepSeek
  if (url.includes("api.deepseek.com") || url.includes("deepseek")) {
    return "deepseek";
  }

  // xAI (Grok)
  if (url.includes("api.x.ai") || url.includes("grok")) {
    return "xai";
  }

  // Ollama (local)
  if (url.includes("localhost:11434") || url.includes("ollama")) {
    return "ollama";
  }

  // Fallback: OpenAI como padrão
  console.warn(`[ModelMappings] Provedor não identificado para URL "${baseURL}" - usando 'openai' como fallback`);
  return "openai";
}

/**
 * Valida se um provedor é suportado
 *
 * @param provider - Nome do provedor
 * @returns true se suportado, false caso contrário
 *
 * @example
 * ```typescript
 * isSupportedProvider("openai"); // true
 * isSupportedProvider("unknown"); // false
 * ```
 */
export function isSupportedProvider(provider: string): boolean {
  return provider.toLowerCase() in MODEL_MAPPINGS;
}

/**
 * Lista todos os provedores suportados
 *
 * @returns Array com nomes dos provedores
 *
 * @example
 * ```typescript
 * getSupportedProviders(); // ["openai", "anthropic", "google", "deepseek", "xai", "ollama"]
 * ```
 */
export function getSupportedProviders(): string[] {
  return Object.keys(MODEL_MAPPINGS);
}
