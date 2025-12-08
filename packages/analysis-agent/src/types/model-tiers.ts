/**
 * Model Tiers - Categorização de modelos LLM por capacidade e custo
 *
 * Este arquivo define os tiers de modelos disponíveis no sistema,
 * permitindo seleção automática baseada em complexidade da tarefa.
 *
 * @module types/model-tiers
 */

/**
 * Tiers de modelos LLM disponíveis
 *
 * - PREMIUM: Modelos mais capazes e caros (GPT-4o, Claude Sonnet, Gemini Pro)
 * - STANDARD: Modelos rápidos e econômicos (GPT-4o-mini, Claude Haiku, Gemini Flash)
 * - LOCAL: Modelos locais via Ollama
 */
export enum ModelTier {
  PREMIUM = "premium",
  STANDARD = "standard",
  LOCAL = "local"
}
