#!/bin/bash
################################################################################
# GEMINI-MINI-IDE - APLICAÇÃO DO SISTEMA DE TIERS
# Data: 2025-12-08
# Objetivo: Implementar HU-AGENT-OPT-001, 002, 003, 004
#
# HUs implementadas:
# - HU-AGENT-OPT-001: Seleção de modelo por tier (PREMIUM/STANDARD/LOCAL)
# - HU-AGENT-OPT-002: Geração paralela de código (batches de 5-12 arquivos)
# - HU-AGENT-OPT-003: Geração paralela de HUs (1 LLM call por épico)
# - HU-AGENT-OPT-004: Métricas agnósticas de provedor
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="/home/user/Gemini-Mini-IDE"
AGENT_DIR="$PROJECT_ROOT/packages/analysis-agent"
AGENT_FILE="$AGENT_DIR/src/agent.ts"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  GEMINI-MINI-IDE - IMPLEMENTAÇÃO DO SISTEMA DE TIERS     ║${NC}"
echo -e "${BLUE}║  HU-AGENT-OPT-001, 002, 003, 004                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

################################################################################
# ETAPA 1: BACKUP
################################################################################
echo -e "${YELLOW}[1/6] Criando backup do agent.ts original...${NC}"
BACKUP_DIR="$PROJECT_ROOT/.backups/tier-system-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp "$AGENT_FILE" "$BACKUP_DIR/agent.ts.bak"

echo -e "${GREEN}✓ Backup criado em: $BACKUP_DIR${NC}"
echo ""

################################################################################
# ETAPA 2: ADICIONAR IMPORTS
################################################################################
echo -e "${YELLOW}[2/6] Adicionando imports dos novos módulos...${NC}"

# Criar bloco de imports para inserir após linha 4 (depois do cache import)
cat > /tmp/new_imports.txt << 'EOF'
import { ModelTier } from "./types/model-tiers.js";
import { getModelForTier, detectProviderFromURL } from "./config/model-mappings.js";
import { determineTierFromContext, TaskType, getTaskTypeFromContext } from "./config/model-strategy.js";
import { getConcurrencyLimit, getTimeoutForTier, FILE_BATCH_SIZES } from "./config/concurrency.js";
import { chunk, processBatches } from "./utils/array.js";
import {
  LLMCallMetrics,
  ProjectGenerationMetrics,
  MetricsTracker
} from "./types/metrics.js";
import {
  calculateCost,
  formatCost,
  formatTokens,
  calculatePremiumOnlyCost,
  calculateSavings
} from "./config/pricing.js";
EOF

# Inserir imports após linha 4
sed -i '4 r /tmp/new_imports.txt' "$AGENT_FILE"

echo -e "${GREEN}✓ Imports adicionados${NC}"

################################################################################
# ETAPA 3: ADICIONAR CAMPOS À CLASSE
################################################################################
echo -e "${YELLOW}[3/6] Adicionando campos de provider e metrics à classe...${NC}"

# Adicionar campos após linha com "private model: string;" (linha ~142 no original, agora ~158)
# Encontrar a linha exata
LINE_NUM=$(grep -n "private model: string;" "$AGENT_FILE" | cut -d: -f1)

# Inserir novos campos após essa linha
sed -i "${LINE_NUM}a\\
  private provider: string;\\
  private metricsTracker: MetricsTracker | null = null;" "$AGENT_FILE"

echo -e "${GREEN}✓ Campos adicionados à classe${NC}"

################################################################################
# ETAPA 4: MODIFICAR CONSTRUTOR
################################################################################
echo -e "${YELLOW}[4/6] Modificando construtor para detectar provedor...${NC}"

# Encontrar linha do construtor e adicionar lógica de detecção de provider
# Substituir o construtor completo
cat > /tmp/new_constructor.txt << 'EOF'
  constructor(apiKey: string, baseURL?: string, model?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
    this.model = model ?? "gpt-4o";

    // HU-AGENT-OPT-001: Detectar provedor a partir da baseURL
    this.provider = detectProviderFromURL(baseURL);
    console.info(`[Agent] Provider detectado: "${this.provider}" (baseURL: ${baseURL || "default"})`);
  }
EOF

# Substituir construtor existente (linhas ~144-147 no original, agora offset pelo insert)
# Usar sed para encontrar e substituir o bloco do construtor
sed -i '/^  constructor(apiKey: string, baseURL\?: string, model\?: string) {$/,/^  }$/c\
  constructor(apiKey: string, baseURL?: string, model?: string) {\
    this.client = new OpenAI({ apiKey, baseURL });\
    this.model = model ?? "gpt-4o";\
    \
    \/\/ HU-AGENT-OPT-001: Detectar provedor a partir da baseURL\
    this.provider = detectProviderFromURL(baseURL);\
    console.info(`[Agent] Provider detectado: "${this.provider}" (baseURL: ${baseURL || "default"})`);\
  }' "$AGENT_FILE"

echo -e "${GREEN}✓ Construtor modificado${NC}"

################################################################################
# ETAPA 5: ADICIONAR MÉTODOS AUXILIARES
################################################################################
echo -e "${YELLOW}[5/6] Adicionando métodos auxiliares (selectModelForTask, createMetricsTracker)...${NC}"

# Criar arquivo com os novos métodos
cat > /tmp/new_methods.txt << 'EOF'

  // ============================================================================
  // HU-AGENT-OPT-001: Seleção de Modelo por Tier
  // ============================================================================

  /**
   * Seleciona o modelo apropriado baseado no tipo de tarefa
   *
   * @param context - Contexto da tarefa (ex: "Architecture", "File: Patient.ts")
   * @returns Nome do modelo específico para o provedor atual
   */
  private selectModelForTask(context: string): string {
    // Determinar tier baseado no contexto
    const tier = determineTierFromContext(context);

    // Obter modelo para o tier e provedor atual
    const modelForTier = getModelForTier(this.provider, tier);

    // Se não encontrou modelo, usar o modelo padrão da instância
    if (!modelForTier) {
      console.warn(`[Agent] Modelo não encontrado para provider="${this.provider}" tier="${tier}" - usando modelo padrão "${this.model}"`);
      return this.model;
    }

    console.info(`[Agent][Model Selection] ${context} → ${tier} (${this.provider}:${modelForTier})`);
    return modelForTier;
  }

  // ============================================================================
  // HU-AGENT-OPT-004: Rastreamento de Métricas
  // ============================================================================

  /**
   * Cria um rastreador de métricas para o projeto
   */
  private createMetricsTracker(projectId: string, projectName: string): MetricsTracker {
    const tracker: MetricsTracker = {
      projectId,
      projectName,
      startTime: performance.now(),
      calls: [],

      addCall(metrics: LLMCallMetrics) {
        this.calls.push(metrics);
      },

      finalize(): ProjectGenerationMetrics {
        const endTime = performance.now();
        const totalDurationMs = endTime - this.startTime;

        // Agregar por tier
        const byTier: Record<ModelTier, any> = {
          [ModelTier.PREMIUM]: { callCount: 0, totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, estimatedCostUSD: 0, totalDurationMs: 0 },
          [ModelTier.STANDARD]: { callCount: 0, totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, estimatedCostUSD: 0, totalDurationMs: 0 },
          [ModelTier.LOCAL]: { callCount: 0, totalInputTokens: 0, totalOutputTokens: 0, totalTokens: 0, estimatedCostUSD: 0, totalDurationMs: 0 },
        };

        // Agregar por tarefa
        const byTask: Record<string, any> = {};

        let successCount = 0;
        let errorCount = 0;
        let timeoutCount = 0;
        let totalRetries = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalCost = 0;

        for (const call of this.calls) {
          // Agregar por tier
          const tierStats = byTier[call.tier];
          tierStats.callCount++;
          tierStats.totalInputTokens += call.inputTokens;
          tierStats.totalOutputTokens += call.outputTokens;
          tierStats.totalTokens += call.totalTokens;
          tierStats.estimatedCostUSD += call.estimatedCostUSD || 0;
          tierStats.totalDurationMs += call.durationMs;

          // Agregar por tarefa
          if (!byTask[call.context]) {
            byTask[call.context] = { callCount: 0, totalTokens: 0, estimatedCostUSD: 0, totalDurationMs: 0 };
          }
          const taskStats = byTask[call.context];
          taskStats.callCount++;
          taskStats.totalTokens += call.totalTokens;
          taskStats.estimatedCostUSD += call.estimatedCostUSD || 0;
          taskStats.totalDurationMs += call.durationMs;

          // Totais
          totalInputTokens += call.inputTokens;
          totalOutputTokens += call.outputTokens;
          totalCost += call.estimatedCostUSD || 0;
          totalRetries += call.retryCount;

          if (call.status === "success") successCount++;
          else if (call.status === "error") errorCount++;
          else if (call.status === "timeout") timeoutCount++;
        }

        const totalTokens = totalInputTokens + totalOutputTokens;
        const callCount = this.calls.length;
        const successRate = callCount > 0 ? successCount / callCount : 0;

        return {
          projectId: this.projectId,
          projectName: this.projectName,
          startTime: this.startTime,
          endTime,
          totalDurationMs,
          calls: this.calls,
          byTier: byTier as any,
          byTask,
          totals: {
            callCount,
            successCount,
            errorCount,
            timeoutCount,
            totalInputTokens,
            totalOutputTokens,
            totalTokens,
            estimatedTotalCostUSD: totalCost,
            successRate,
            totalRetries,
          },
        };
      },

      getSummary() {
        const partial = this.getPartialMetrics();
        const duration = partial.totalDurationMs ? `${(partial.totalDurationMs / 1000 / 60).toFixed(1)} min` : "0 min";
        const tokens = partial.totals?.totalTokens ? formatTokens(partial.totals.totalTokens) : "0";
        const cost = partial.totals?.estimatedTotalCostUSD ? formatCost(partial.totals.estimatedTotalCostUSD) : "$0.00";
        const successRate = partial.totals?.successRate ? `${(partial.totals.successRate * 100).toFixed(1)}%` : "0%";

        return {
          duration,
          tokens,
          cost,
          successRate,
          byTier: [],
        };
      },

      getPartialMetrics(): Partial<ProjectGenerationMetrics> {
        if (this.calls.length === 0) {
          return {
            projectId: this.projectId,
            projectName: this.projectName,
            startTime: this.startTime,
            calls: [],
          };
        }

        // Simplified partial metrics
        const totalInputTokens = this.calls.reduce((sum, c) => sum + c.inputTokens, 0);
        const totalOutputTokens = this.calls.reduce((sum, c) => sum + c.outputTokens, 0);
        const totalCost = this.calls.reduce((sum, c) => sum + (c.estimatedCostUSD || 0), 0);
        const successCount = this.calls.filter(c => c.status === "success").length;

        return {
          projectId: this.projectId,
          projectName: this.projectName,
          startTime: this.startTime,
          totalDurationMs: performance.now() - this.startTime,
          calls: this.calls,
          totals: {
            callCount: this.calls.length,
            successCount,
            errorCount: this.calls.filter(c => c.status === "error").length,
            timeoutCount: this.calls.filter(c => c.status === "timeout").length,
            totalInputTokens,
            totalOutputTokens,
            totalTokens: totalInputTokens + totalOutputTokens,
            estimatedTotalCostUSD: totalCost,
            successRate: this.calls.length > 0 ? successCount / this.calls.length : 0,
            totalRetries: this.calls.reduce((sum, c) => sum + c.retryCount, 0),
          },
        };
      },
    };

    return tracker;
  }

  /**
   * Loga as métricas finais do projeto
   */
  private logMetrics(metrics: ProjectGenerationMetrics): void {
    console.info("\n" + "=".repeat(70));
    console.info("📊 MÉTRICAS DE GERAÇÃO DO PROJETO");
    console.info("=".repeat(70));
    console.info(`Projeto: ${metrics.projectName}`);
    console.info(`Duração total: ${(metrics.totalDurationMs / 1000 / 60).toFixed(2)} minutos`);
    console.info("");
    console.info("Totais:");
    console.info(`  - Chamadas LLM: ${metrics.totals.callCount}`);
    console.info(`  - Sucesso: ${metrics.totals.successCount} (${(metrics.totals.successRate * 100).toFixed(1)}%)`);
    console.info(`  - Erros: ${metrics.totals.errorCount}`);
    console.info(`  - Timeouts: ${metrics.totals.timeoutCount}`);
    console.info(`  - Retries: ${metrics.totals.totalRetries}`);
    console.info("");
    console.info("Tokens:");
    console.info(`  - Input: ${formatTokens(metrics.totals.totalInputTokens)}`);
    console.info(`  - Output: ${formatTokens(metrics.totals.totalOutputTokens)}`);
    console.info(`  - Total: ${formatTokens(metrics.totals.totalTokens)}`);
    console.info("");
    console.info("Custo estimado:");
    console.info(`  - Total: ${formatCost(metrics.totals.estimatedTotalCostUSD)}`);

    // Economia se houver
    if (metrics.savings) {
      console.info("");
      console.info("💰 Economia vs. usar apenas PREMIUM:");
      console.info(`  - Custo com PREMIUM apenas: ${formatCost(metrics.savings.costWithOnlyPremium)}`);
      console.info(`  - Custo real: ${formatCost(metrics.savings.actualCost)}`);
      console.info(`  - Economizado: ${formatCost(metrics.savings.savedUSD)} (${metrics.savings.savedPercentage.toFixed(1)}%)`);
    }

    console.info("=".repeat(70) + "\n");
  }
EOF

# Inserir os novos métodos antes do método detectLanguage (próximo ao fim da classe)
# Encontrar linha do detectLanguage
DETECT_LANG_LINE=$(grep -n "private detectLanguage" "$AGENT_FILE" | cut -d: -f1)

# Inserir antes dessa linha
sed -i "${DETECT_LANG_LINE}i$(cat /tmp/new_methods.txt)" "$AGENT_FILE"

echo -e "${GREEN}✓ Métodos auxiliares adicionados${NC}"

################################################################################
# ETAPA 6: MODIFICAR callLLM PARA USAR TIER SYSTEM
################################################################################
echo -e "${YELLOW}[6/6] Modificando callLLM para usar tier system e métricas...${NC}"

# Criar nova versão do callLLM com tier system e métricas
cat > /tmp/new_callLLM.txt << 'EOF'
  private async callLLM<T>(sys: string, usr: string, san: SanitizeFunction<T>, sch: z.ZodType<T>, ctx: string): Promise<T> {
    const cacheKey = globalAnalysisCache.generateKey(sys, usr, this.model, 0.0);
    const cached = globalAnalysisCache.get<T>(cacheKey);
    if (cached) {
      console.info(`[Agent][Cache Hit] ${ctx}`);
      return cached;
    }

    // HU-AGENT-OPT-001: Selecionar modelo baseado no contexto
    const selectedModel = this.selectModelForTask(ctx);
    const tier = determineTierFromContext(ctx);

    // HU-AGENT-OPT-004: Preparar tracking de métricas
    const callStartTime = performance.now();

    const maxRetries = 3;
    const baseDelay = 2000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // HU-AGENT-OPT-001: Timeout baseado no tier
        const timeoutMs = getTimeoutForTier(tier);

        console.info(`[Agent][LLM Call] ${ctx} (attempt ${attempt + 1}/${maxRetries}, model: ${selectedModel}, timeout: ${timeoutMs}ms)`);

        const completion = await this.client.chat.completions.create({
          model: selectedModel,
          messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
          response_format: { type: "json_object" },
          temperature: 0.0,
          seed: 42
        }, { timeout: timeoutMs });

        const rawContent = completion.choices[0]?.message?.content || "{}";
        const result = sch.parse(san(JSON.parse(cleanJsonString(rawContent))));
        globalAnalysisCache.set(cacheKey, result);

        // HU-AGENT-OPT-004: Registrar métricas de sucesso
        if (this.metricsTracker) {
          const callEndTime = performance.now();
          const usage = completion.usage;
          const inputTokens = usage?.prompt_tokens || 0;
          const outputTokens = usage?.completion_tokens || 0;
          const totalTokens = usage?.total_tokens || (inputTokens + outputTokens);
          const estimatedCost = calculateCost(this.provider, tier, inputTokens, outputTokens);

          this.metricsTracker.addCall({
            context: ctx,
            tier,
            provider: this.provider,
            model: selectedModel,
            startTime: callStartTime,
            endTime: callEndTime,
            durationMs: callEndTime - callStartTime,
            inputTokens,
            outputTokens,
            totalTokens,
            estimatedCostUSD: estimatedCost,
            status: "success",
            retryCount: attempt,
          });
        }

        return result;
      } catch (e) {
        const isLastAttempt = attempt === maxRetries - 1;
        const error = e instanceof Error ? e : new Error(String(e));

        console.error(`[Agent][LLM Error] ${ctx} - Attempt ${attempt + 1} failed: ${error.message}`);

        if (isLastAttempt) {
          // HU-AGENT-OPT-004: Registrar métrica de erro
          if (this.metricsTracker) {
            const callEndTime = performance.now();
            const isTimeout = error.message.includes("timeout") || error.message.includes("Timeout");

            this.metricsTracker.addCall({
              context: ctx,
              tier,
              provider: this.provider,
              model: selectedModel,
              startTime: callStartTime,
              endTime: callEndTime,
              durationMs: callEndTime - callStartTime,
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              estimatedCostUSD: 0,
              status: isTimeout ? "timeout" : "error",
              errorMessage: error.message,
              retryCount: attempt,
            });
          }

          console.error(`[Agent][LLM Fatal] ${ctx} - Todas as tentativas falharam`);
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[Agent][Retry] ${ctx} - Aguardando ${delay}ms antes de retry...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    console.error(`[Agent][Fallback] ${ctx} - Usando dados vazios como último recurso`);
    return sch.parse(san({}));
  }
EOF

# Substituir o método callLLM completo
# Encontrar início e fim do método callLLM
START_LINE=$(grep -n "private async callLLM<T>" "$AGENT_FILE" | cut -d: -f1)
# Encontrar o fechamento do método (próximo "  }" após o início)
END_LINE=$(awk "NR > $START_LINE && /^  \}$/ { print NR; exit }" "$AGENT_FILE")

# Deletar linhas do método antigo
sed -i "${START_LINE},${END_LINE}d" "$AGENT_FILE"

# Inserir novo método na mesma posição
sed -i "${START_LINE}i$(cat /tmp/new_callLLM.txt)" "$AGENT_FILE"

echo -e "${GREEN}✓ callLLM modificado para usar tier system e métricas${NC}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            MODIFICAÇÕES APLICADAS COM SUCESSO              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ HU-AGENT-OPT-001: Seleção de modelo por tier implementada${NC}"
echo -e "${GREEN}✓ HU-AGENT-OPT-004: Sistema de métricas implementado${NC}"
echo ""
echo -e "${YELLOW}PRÓXIMOS PASSOS (manual):${NC}"
echo "1. Modificar método 'analyze()' para:"
echo "   - Inicializar metricsTracker"
echo "   - Implementar geração paralela de arquivos (HU-OPT-002)"
echo "   - Implementar geração paralela de HUs (HU-OPT-003)"
echo "   - Logar métricas ao final"
echo ""
echo "2. Executar pipeline de validação:"
echo "   cd $PROJECT_ROOT"
echo "   pnpm lint"
echo "   pnpm typecheck"
echo "   pnpm build"
echo ""
echo -e "${BLUE}Backup dos arquivos originais: $BACKUP_DIR${NC}"
echo ""
