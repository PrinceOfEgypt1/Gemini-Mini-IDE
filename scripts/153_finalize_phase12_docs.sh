#!/usr/bin/env bash
set -e

echo "📚 [Docs] Finalizando documentação da Fase 12 (v0.12.1)..."

# ==============================================================================
# 1. Atualizar DEVELOPMENT.md (Version Bump)
# ==============================================================================
DEV_DOC="DEVELOPMENT.md"
echo "📝 Atualizando versão no $DEV_DOC..."

# Bump de versão para indicar as correções de estabilidade
sed -i 's/Versão do Software:\*\* v0.12.0 (UX & Security)/Versão do Software:** v0.12.1 (UX Polish)/' "$DEV_DOC"
sed -i "s/Data:\*\* .*/Data:** $(date +%Y-%m-%d)/" "$DEV_DOC"

# Adicionar nota sobre o Parser Local no histórico da Fase 12
# Usamos sed para encontrar a linha do Artefato e adicionar uma linha abaixo
sed -i '/- `scripts\/140_implement_secure_apikey_flow.sh`/a \    - `ui/.../utils/discoveryParser.ts` (Lógica Regex Local).' "$DEV_DOC"

# ==============================================================================
# 2. Atualizar README.md (Refinamento)
# ==============================================================================
README="README.md"
echo "📝 Refinando $README..."

# Adicionar menção à inteligência local
sed -i '/- \*\*Multi-Modelos:\*\*/a - **Inteligência Local:** O sistema entende intenções, requisitos e restrições em tempo real enquanto você digita.' "$README"

echo "✅ Documentação consolidada para v0.12.1."
