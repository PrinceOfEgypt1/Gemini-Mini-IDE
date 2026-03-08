#!/usr/bin/env bash
set -e

echo "📚 Finalizando documentação da Fase 10 (Estável)..."

# 1. Atualizar README.md para v0.10.1
# -----------------------------------------------------
sed -i 's/v0.10.0/v0.10.1/g' README.md
sed -i 's/Status Atual:.*Pipeline/Status Atual: v0.10.1 (Wizard Stable) - Geração de Scripts Funcional\n> **Pipeline/g' README.md

# 2. Atualizar DEVELOPMENT.md (Marcar Fase 10 como 100% concluída e testada)
# -----------------------------------------------------
sed -i 's/Versão do Software:.*$/Versão do Software: v0.10.1 (Wizard Stable)/' DEVELOPMENT.md
sed -i "s/Data:.*$/Data: $(date +%Y-%m-%d)/" DEVELOPMENT.md

# 3. Atualizar BACKLOG.md (Garantir que todas as HUs da Fase 10 estão ✅)
# -----------------------------------------------------
sed -i 's/📅 \*\*10.1 HU/✅ \*\*10.1 HU/g' docs/BACKLOG.md
sed -i 's/📅 \*\*10.2 HU/✅ \*\*10.2 HU/g' docs/BACKLOG.md
sed -i 's/📅 \*\*10.3 HU/✅ \*\*10.3 HU/g' docs/BACKLOG.md
sed -i 's/📅 \*\*10.4 HU/✅ \*\*10.4 HU/g' docs/BACKLOG.md
sed -i 's/📅 \*\*9.6 HU/✅ \*\*9.6 HU/g' docs/BACKLOG.md
sed -i 's/📅 \*\*10.7 HU/✅ \*\*10.7 HU/g' docs/BACKLOG.md

echo "✅ Documentação v0.10.1 sincronizada."
