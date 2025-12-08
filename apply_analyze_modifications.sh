#!/bin/bash
################################################################################
# GEMINI-MINI-IDE - MODIFICAÇÃO DO MÉTODO analyze()
# Data: 2025-12-08
# Objetivo: Integrar metrics tracking e parallel generation no analyze()
################################################################################

set -e
set -u

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Project paths - detectar automaticamente o diretório onde o script está
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
AGENT_DIR="$PROJECT_ROOT/packages/analysis-agent"
AGENT_FILE="$AGENT_DIR/src/agent.ts"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  MODIFICAÇÃO DO MÉTODO analyze() - INTEGRAÇÃO FINAL       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

################################################################################
# ETAPA 1: BACKUP
################################################################################
echo -e "${YELLOW}[1/2] Criando backup do agent.ts...${NC}"
BACKUP_DIR="$PROJECT_ROOT/.backups/analyze-mod-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp "$AGENT_FILE" "$BACKUP_DIR/agent.ts.bak"

echo -e "${GREEN}✓ Backup criado em: $BACKUP_DIR${NC}"
echo ""

################################################################################
# ETAPA 2: SUBSTITUIR MÉTODO analyze()
################################################################################
echo -e "${YELLOW}[2/2] Substituindo método analyze() com metrics e parallel generation...${NC}"

# Criar nova versão completa do método analyze()
cat > /tmp/new_analyze.txt << 'EOF'
  async analyze(userPrompt: string, _budgetContext?: BudgetContext): Promise<AgentResult> {
    const logger = console;
    logger.info(`[Agent v13.0 + Tier System] Cache Size: ${globalAnalysisCache.stats().size}`);

    // HU-AGENT-OPT-004: Inicializar rastreador de métricas
    const projectId = `proj-${Date.now()}`;
    const projectName = userPrompt.substring(0, 50) + (userPrompt.length > 50 ? "..." : "");
    this.metricsTracker = this.createMetricsTracker(projectId, projectName);
    logger.info(`[Agent] Métricas habilitadas para projeto: "${projectName}"`);

    const cleanUserPrompt = this.cleanPrompt(userPrompt);
    const tStart = performance.now();
    const stepTimes = { analysis: 0, product: 0, architecture: 0, codeGen: 0, userStories: 0 };

    try {
      const intent = await this.detectIntent(cleanUserPrompt);
      if (intent.type === "QUESTION") {
        const answer = await this.generateTextResponse(cleanUserPrompt);
        const tEnd = performance.now();
        return this.createChatResponse(answer, tEnd - tStart);
      }

      // Step 1: Analysis
      const t1 = performance.now();
      const analysis = await this.runAnalysisStep(cleanUserPrompt);
      stepTimes.analysis = performance.now() - t1;

      // Step 2: Product Plan
      const t2 = performance.now();
      const productPlan = await this.runProductStep(cleanUserPrompt, analysis);
      stepTimes.product = performance.now() - t2;

      // Step 3: Architecture
      const t3 = performance.now();
      logger.info("[Agent] Desenhando Arquitetura...");
      const architecture = await this.runArchitectureStep(cleanUserPrompt, productPlan);
      stepTimes.architecture = performance.now() - t3;

      const manifest = architecture.manifest;
      logger.info(`[Agent] ${manifest.length} arquivos planejados.`);

      // Step 4: Code Generation (PARALLEL - HU-AGENT-OPT-002)
      const t4 = performance.now();
      logger.info("[Agent] Iniciando geração paralela de código...");
      const allFiles = await this.generateAllFilesParallel(manifest, architecture.stack, cleanUserPrompt);
      stepTimes.codeGen = performance.now() - t4;
      logger.info(`[Agent] ✓ ${allFiles.length} arquivos gerados em ${(stepTimes.codeGen / 1000).toFixed(1)}s`);

      // Step 5: User Stories (PARALLEL - HU-AGENT-OPT-003)
      const t5 = performance.now();
      logger.info("[Agent] Gerando Histórias de Usuário (paralelo)...");
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);
      stepTimes.userStories = performance.now() - t5;
      logger.info(`[Agent] ✓ ${detailedHUs.length} HUs geradas em ${(stepTimes.userStories / 1000).toFixed(1)}s`);

      const mappedHUs: MappedUserStory[] = detailedHUs.map(hu => ({
        id: hu.id, title: hu.title, priority: hu.priority, role: hu.role, action: hu.action, benefit: hu.benefit,
        acceptanceCriteria: hu.acceptanceCriteria, functionalReqs: hu.functionalRequirements, security: hu.securityRequirements,
        context: hu.businessContext, nonFunctionalReqs: [], description: `Como ${hu.role}, quero ${hu.action}, para ${hu.benefit}`
      }));

      const requestId = `req-${Date.now()}`;
      const tTotal = performance.now() - tStart;

      // HU-AGENT-OPT-004: Finalizar e logar métricas
      if (this.metricsTracker) {
        const metrics = this.metricsTracker.finalize();

        // Calcular economia
        const premiumOnlyCost = calculatePremiumOnlyCost(
          this.provider,
          metrics.totals.totalInputTokens,
          metrics.totals.totalOutputTokens
        );
        const actualCost = metrics.totals.estimatedTotalCostUSD;
        const savings = calculateSavings(actualCost, premiumOnlyCost);

        metrics.savings = {
          costWithOnlyPremium: premiumOnlyCost,
          actualCost,
          savedUSD: savings.savedUSD,
          savedPercentage: savings.savedPercentage,
        };

        this.logMetrics(metrics);
      }

      return {
        summary: analysis.summary, requestId, timestamp: new Date().toISOString(), timings: { total: tTotal, ...stepTimes },
        analysis, product: { userStories: mappedHUs }, architect: { diagram: architecture.diagram, stack: architecture.stack },
        engine: { files: allFiles }, ux: { components: [] }, quality: { tests: [] }, ops: { scripts: [] },
        fenix: { notes: "Generated via Agent v13.0 + Tier System (Final)" }
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[Agent] Erro fatal:", errorMessage);

      // HU-AGENT-OPT-004: Logar métricas parciais mesmo em caso de erro
      if (this.metricsTracker && this.metricsTracker.calls.length > 0) {
        logger.warn("[Agent] Logando métricas parciais devido a erro...");
        const partialMetrics = this.metricsTracker.getPartialMetrics();
        logger.info(`[Agent] Chamadas completadas antes do erro: ${partialMetrics.totals?.callCount || 0}`);
        logger.info(`[Agent] Custo parcial: ${formatCost(partialMetrics.totals?.estimatedTotalCostUSD || 0)}`);
      }

      throw error;
    }
  }
EOF

# Encontrar início e fim do método analyze()
START_LINE=$(grep -n "async analyze(userPrompt: string" "$AGENT_FILE" | cut -d: -f1)
# Encontrar o fechamento do método (primeiro "  }" após a chave de abertura do try-catch)
END_LINE=$(awk "NR > $START_LINE && /^  \}$/ { print NR; exit }" "$AGENT_FILE")

# Deletar método antigo
sed -i "${START_LINE},${END_LINE}d" "$AGENT_FILE"

# Inserir novo método
sed -i "${START_LINE}i$(cat /tmp/new_analyze.txt)" "$AGENT_FILE"

echo -e "${GREEN}✓ Método analyze() substituído com sucesso${NC}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           TODAS AS MODIFICAÇÕES CONCLUÍDAS                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Metrics tracking integrado${NC}"
echo -e "${GREEN}✓ Geração paralela de arquivos ativada${NC}"
echo -e "${GREEN}✓ Geração paralela de HUs ativada${NC}"
echo -e "${GREEN}✓ Log de métricas com economia implementado${NC}"
echo ""
echo -e "${BLUE}Backup: $BACKUP_DIR${NC}"
echo ""
