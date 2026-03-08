#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/219_v2_governance_smart_update.sh
# Objetivo: Atualizar documentação de forma INCREMENTAL e SEGURA (Sem sobrescrita)
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "📜 Iniciando atualização rigorosa da documentação..."

# 1. Garantir Backups de Segurança
# ------------------------------------------------------------------------------
cp docs/BACKLOG.md docs/BACKLOG.md.bak.$(date +%s)
cp DEVELOPMENT.md DEVELOPMENT.md.bak.$(date +%s)
echo "✅ Backups criados."

# 2. Atualizar BACKLOG.md (Cirúrgico)
# ------------------------------------------------------------------------------
TARGET_BACKLOG="docs/BACKLOG.md"

echo "✏️  Atualizando status das HUs no Backlog..."

# Atualizar Status Geral
sed -i 's/Status Geral:.*/Status Geral: Fase 15 (Visualização) Concluída. Próximo: Refinamento de Inteligência./' "$TARGET_BACKLOG"

# Marcar HUs da Fase 15 como concluídas (De 🚧 para ✅)
sed -i 's/🚧 \*\*15.1/✅ \*\*15.1/' "$TARGET_BACKLOG"
sed -i 's/🚧 \*\*15.2/✅ \*\*15.2/' "$TARGET_BACKLOG"
sed -i 's/🚧 \*\*15.3/✅ \*\*15.3/' "$TARGET_BACKLOG"
sed -i 's/🚧 \*\*15.4/✅ \*\*15.4/' "$TARGET_BACKLOG"

# Atualizar título do Épico 15
sed -i 's/15. Épico E-Visualization.*(Próxima Fase)/15. Épico E-Visualization: Interatividade e Renderização (✅ Concluído)/' "$TARGET_BACKLOG"

# Adicionar a HU 15.5 (Code Viewer) que fizemos mas não estava listada originalmente
# Inserimos logo após a 15.4
sed -i '/\*\*15.4/a - ✅ **15.5 HU-UI-Viz-Code-Viewer-026**: Visualizador de Código com numeração de linhas (FileViewer).' "$TARGET_BACKLOG"

# Adicionar o novo Épico 16 ao final do arquivo (Append)
echo "" >> "$TARGET_BACKLOG"
echo "## 16. Épico E-Intelligence-Refinement: Melhoria de Prompts (🚧 Próximo Foco)" >> "$TARGET_BACKLOG"
echo "*Identificado durante QA da Fase 15: A UI suporta dados ricos, mas a IA nem sempre os fornece.*" >> "$TARGET_BACKLOG"
echo "- 📅 **16.1 HU-Intelligence-Prompt-Strict-Format-001**: Refinar Persona Product para obrigar geração de seções (Contexto, RF, RNF, Segurança)." >> "$TARGET_BACKLOG"
echo "- 📅 **16.2 HU-Intelligence-Test-Generation-002**: Refinar Persona Quality para gerar arquivos de teste (.spec.ts) para a aba Tests." >> "$TARGET_BACKLOG"

echo "✅ BACKLOG.md atualizado incrementalmente."

# 3. Atualizar DEVELOPMENT.md (Cirúrgico)
# ------------------------------------------------------------------------------
TARGET_DEV="DEVELOPMENT.md"

echo "✏️  Atualizando versão no Development..."

# Atualizar Cabeçalho
sed -i 's/Versão do Documento:.*/Versão do Documento: 10.0 (Visualization Complete)/' "$TARGET_DEV"
sed -i 's/Versão do Software:.*/Versão do Software: v0.15.1 (UI Powered)/' "$TARGET_DEV"

# Inserir registro da Fase 15 após a Fase 14
# Usamos um padrão conhecido (Fim da Fase 14 ou início do Roadmap) para inserir o texto
# Vamos inserir antes de "## 2. Roadmap Futuro"
sed -i '/## 2. Roadmap Futuro/i \
### ✅ Fase 15: Visualização Interativa\
**Objetivo:** Transformar dados JSON em UI rica.\
- **Artefatos:** `FileTree.tsx`, `UserStoryCard.tsx`, `DocsPanel.tsx`, `FileViewer.tsx`.\
- **HUs Entregues:** 15.1 a 15.5.\
' "$TARGET_DEV"

echo "✅ DEVELOPMENT.md atualizado incrementalmente."

echo "🎉 Governança aplicada com sucesso. Histórico preservado."
