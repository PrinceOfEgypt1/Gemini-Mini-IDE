#!/bin/bash
################################################################################
# GEMINI-MINI-IDE - APLICAÇÃO DE GERAÇÃO PARALELA
# Data: 2025-12-08
# Objetivo: Implementar HU-AGENT-OPT-002 e HU-AGENT-OPT-003
#
# HUs implementadas:
# - HU-AGENT-OPT-002: Geração paralela de arquivos (batches de 5-12)
# - HU-AGENT-OPT-003: Geração paralela de HUs (1 call por épico)
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
echo -e "${BLUE}║  GEMINI-MINI-IDE - GERAÇÃO PARALELA (HU-OPT-002, 003)    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

################################################################################
# ETAPA 1: BACKUP
################################################################################
echo -e "${YELLOW}[1/4] Criando backup do agent.ts...${NC}"
BACKUP_DIR="$PROJECT_ROOT/.backups/parallel-gen-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp "$AGENT_FILE" "$BACKUP_DIR/agent.ts.bak"

echo -e "${GREEN}✓ Backup criado em: $BACKUP_DIR${NC}"
echo ""

################################################################################
# ETAPA 2: ADICIONAR MÉTODO AUXILIAR determineFileTier
################################################################################
echo -e "${YELLOW}[2/4] Adicionando método determineFileTier()...${NC}"

cat > /tmp/determine_file_tier.txt << 'EOF'

  /**
   * HU-AGENT-OPT-002: Determina o tier de um arquivo baseado em seu spec
   */
  private determineFileTier(spec: ManifestItem): ModelTier {
    const context = `File: ${spec.path} (purpose: ${spec.purpose}, criticality: ${spec.criticality}, category: ${spec.category || "UNKNOWN"})`;
    return determineTierFromContext(context);
  }
EOF

# Inserir antes do método detectLanguage
DETECT_LANG_LINE=$(grep -n "private detectLanguage" "$AGENT_FILE" | cut -d: -f1)
INSERT_LINE=$((DETECT_LANG_LINE - 1))
sed -i "${INSERT_LINE}r /tmp/determine_file_tier.txt" "$AGENT_FILE"

echo -e "${GREEN}✓ determineFileTier() adicionado${NC}"

################################################################################
# ETAPA 3: ADICIONAR MÉTODO generateAllFilesParallel
################################################################################
echo -e "${YELLOW}[3/4] Adicionando método generateAllFilesParallel()...${NC}"

cat > /tmp/generate_all_files_parallel.txt << 'EOF'

  /**
   * HU-AGENT-OPT-002: Gera todos os arquivos em paralelo, agrupados por tier
   *
   * Estratégia:
   * - Separa arquivos em PREMIUM (complexos) e STANDARD (simples)
   * - Processa PREMIUM em batches de 5 (concurrency limit)
   * - Processa STANDARD em batches de 12 (concurrency limit)
   */
  private async generateAllFilesParallel(
    manifest: ManifestItem[],
    stack: string,
    userPrompt: string
  ): Promise<GeneratedFile[]> {
    console.info(`[Agent] Iniciando geração paralela de ${manifest.length} arquivos...`);

    // Separar arquivos por tier
    const premiumFiles: ManifestItem[] = [];
    const standardFiles: ManifestItem[] = [];

    for (const spec of manifest) {
      const tier = this.determineFileTier(spec);
      if (tier === ModelTier.PREMIUM) {
        premiumFiles.push(spec);
      } else {
        standardFiles.push(spec);
      }
    }

    console.info(`[Agent] Arquivos PREMIUM (complexos): ${premiumFiles.length}`);
    console.info(`[Agent] Arquivos STANDARD (simples): ${standardFiles.length}`);

    const allFiles: GeneratedFile[] = [];

    // Processar arquivos PREMIUM em batches de 5
    if (premiumFiles.length > 0) {
      console.info(`[Agent] Processando ${premiumFiles.length} arquivos PREMIUM em batches de ${FILE_BATCH_SIZES.COMPLEX}...`);
      const premiumResults = await processBatches(
        premiumFiles,
        FILE_BATCH_SIZES.COMPLEX,
        async (spec) => this.generateFileContent(spec, stack, userPrompt)
      );
      allFiles.push(...premiumResults);
    }

    // Processar arquivos STANDARD em batches de 12
    if (standardFiles.length > 0) {
      console.info(`[Agent] Processando ${standardFiles.length} arquivos STANDARD em batches de ${FILE_BATCH_SIZES.SIMPLE}...`);
      const standardResults = await processBatches(
        standardFiles,
        FILE_BATCH_SIZES.SIMPLE,
        async (spec) => this.generateFileContent(spec, stack, userPrompt)
      );
      allFiles.push(...standardResults);
    }

    console.info(`[Agent] Geração paralela completa: ${allFiles.length} arquivos gerados`);
    return allFiles;
  }
EOF

# Inserir antes do método detectLanguage
DETECT_LANG_LINE=$(grep -n "private detectLanguage" "$AGENT_FILE" | cut -d: -f1)
INSERT_LINE=$((DETECT_LANG_LINE - 1))
sed -i "${INSERT_LINE}r /tmp/generate_all_files_parallel.txt" "$AGENT_FILE"

echo -e "${GREEN}✓ generateAllFilesParallel() adicionado${NC}"

################################################################################
# ETAPA 4: MODIFICAR expandEpicsToStories PARA GERAÇÃO PARALELA
################################################################################
echo -e "${YELLOW}[4/4] Modificando expandEpicsToStories() para geração paralela...${NC}"

# Criar nova versão do método que processa épicos em paralelo
cat > /tmp/new_expand_epics.txt << 'EOF'
  private async expandEpicsToStories(epics: Epic[]): Promise<UserStory[]> {
    console.info(`[Agent] Expandindo ${epics.length} épicos em User Stories (PARALELO)...`);

    // HU-AGENT-OPT-003: Gerar HUs de cada épico em paralelo
    // Cada épico gera ~10 HUs em uma chamada LLM separada
    const allStoriesNested = await Promise.all(
      epics.map(async (epic, index) => {
        const epicContext = `Épico ${index + 1}/${epics.length}: ${epic.title}
Contexto: ${epic.context}
Requisitos:
${epic.requirements.map(r => `- ${r}`).join('\n')}`;

        console.info(`[Agent] Gerando HUs para épico: "${epic.title}"...`);

        const result = await this.callLLM(
          SYSTEM_PROMPTS.USER_STORIES,
          epicContext,
          sanitizeUserStories,
          UserStoriesSchema,
          `UserStories:Epic:${epic.title}`
        );

        console.info(`[Agent] ✓ ${result.userStories.length} HUs geradas para "${epic.title}"`);
        return result.userStories;
      })
    );

    // Flatten array de arrays
    const allStories = allStoriesNested.flat();

    console.info(`[Agent] Total de ${allStories.length} User Stories geradas de ${epics.length} épicos`);
    return allStories;
  }
EOF

# Substituir o método expandEpicsToStories completo
# Encontrar linhas do método
START_LINE=$(grep -n "private async expandEpicsToStories" "$AGENT_FILE" | cut -d: -f1)
END_LINE=$(awk "NR > $START_LINE && /^  \}$/ { print NR; exit }" "$AGENT_FILE")

# Inserir novo método ANTES do antigo
INSERT_LINE=$((START_LINE - 1))
sed -i "${INSERT_LINE}r /tmp/new_expand_epics.txt" "$AGENT_FILE"

# Recalcular posição do método antigo e deletar
NEW_METHOD_LINES=$(wc -l < /tmp/new_expand_epics.txt)
OLD_START=$((START_LINE + NEW_METHOD_LINES))
OLD_END=$((END_LINE + NEW_METHOD_LINES))
sed -i "${OLD_START},${OLD_END}d" "$AGENT_FILE"

echo -e "${GREEN}✓ expandEpicsToStories() modificado para geração paralela${NC}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        GERAÇÃO PARALELA IMPLEMENTADA COM SUCESSO           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ HU-AGENT-OPT-002: Geração paralela de arquivos (batches de 5-12)${NC}"
echo -e "${GREEN}✓ HU-AGENT-OPT-003: Geração paralela de HUs (1 call por épico)${NC}"
echo ""
echo -e "${YELLOW}PRÓXIMO PASSO (manual):${NC}"
echo "Modificar método analyze() para:"
echo "  1. Substituir loop serial de arquivos por: generateAllFilesParallel()"
echo "  2. Adicionar inicialização de metricsTracker"
echo "  3. Adicionar logMetrics() ao final"
echo ""
echo -e "${BLUE}Backup: $BACKUP_DIR${NC}"
echo ""
