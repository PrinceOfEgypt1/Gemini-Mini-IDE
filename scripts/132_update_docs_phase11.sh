#!/usr/bin/env bash
set -e

echo "📚 [Docs] Atualizando documentação oficial (Fase 11 -> Fase 12)..."

# ==============================================================================
# 1. Atualizar BACKLOG.md
# ==============================================================================
BACKLOG="docs/BACKLOG.md"
echo "📝 Atualizando status no $BACKLOG..."

# Marcar HUs da Fase 11 como concluídas
# Backend & Consolidator
sed -i 's/📅 \*\*4.1 HU-Consolidator-Parse\*\*/✅ **4.1 HU-Consolidator-Parse**/' "$BACKLOG"
sed -i 's/📅 \*\*4.2 HU-Consolidator-Extract-HUs\*\*/✅ **4.2 HU-Consolidator-Extract-HUs**/' "$BACKLOG"
sed -i 's/📅 \*\*4.3 HU-Consolidator-Extract-Code\*\*/✅ **4.3 HU-Consolidator-Extract-Code**/' "$BACKLOG"
sed -i 's/📅 \*\*4.6 HU-Consolidator-Extract-Scripts\*\*/✅ **4.6 HU-Consolidator-Extract-Scripts**/' "$BACKLOG"

# UI & Settings
sed -i 's/📅 \*\*8.3 HU-UI-Settings\*\*/✅ **8.3 HU-UI-Settings**/' "$BACKLOG"
sed -i 's/📅 \*\*9.5 HU-UI-Export-005\*\*/✅ **9.5 HU-UI-Export-005**/' "$BACKLOG"

# Adicionar Novas HUs da Fase 12 (Usabilidade e Segurança)
echo "" >> "$BACKLOG"
echo "## 14. Épico E-Experience: Usabilidade & Segurança (Fase 12)" >> "$BACKLOG"
echo "- 📅 **14.1 HU-Sec-API-Key-Handling-001**: Tráfego seguro de API Key (Bearer Token)." >> "$BACKLOG"
echo "- 📅 **14.2 HU-UI-QuickStart-Revamp-020**: Galeria de Templates/Início amigável." >> "$BACKLOG"
echo "- 📅 **14.3 HU-UI-Explore-Tour-019**: Tour guiado (Onboarding)." >> "$BACKLOG"
echo "- 📅 **14.4 HU-Gov-User-Manual-001**: Manual do usuário integrado." >> "$BACKLOG"
echo "- 📅 **14.5 HU-UI-Settings-Models-021**: Seletor de modelos avançado." >> "$BACKLOG"

# ==============================================================================
# 2. Atualizar DEVELOPMENT.md
# ==============================================================================
DEV_DOC="DEVELOPMENT.md"
echo "📝 Atualizando histórico no $DEV_DOC..."

# Atualizar Versão e Data no Header
sed -i 's/Versão do Software:\*\* v0.10.1/Versão do Software:** v0.11.0 (Export Stable)/' "$DEV_DOC"
sed -i "s/Data:\*\* .*/Data:** $(date +%Y-%m-%d)/" "$DEV_DOC"

# Inserir Fase 11 após a Fase 10 (procura o padrão da Fase 10 e insere depois)
# Usamos um arquivo temporário para construir o bloco da Fase 11
cat > phase11_block.txt <<EOF

### ✅ Fase 11: Consolidação e Exportação (A Fábrica)
**Objetivo:** Materializar o projeto em arquivos reais e permitir download.
- **Artefatos:**
    - \`analysis-agent/.../consolidator-service.ts\` (Motor de geração de arquivos).
    - \`server/.../export.controller.ts\` (Endpoint de streaming ZIP).
    - \`ui/.../SettingsModal.tsx\` (Gestão de API Key).
    - \`scripts/127_fix_cors_brute_force.sh\` (Hardening de ambiente dev).
- **HUs Entregues:** 4.1, 4.2, 4.3, 4.6, 8.3, 9.5.
- **Status:** Pipeline Verde, Exportação .zip funcional.
EOF

# Insere o conteúdo do arquivo temporário logo antes da seção "Roadmap Futuro"
sed -i '/## 2. Roadmap Futuro/e cat phase11_block.txt' "$DEV_DOC"
rm phase11_block.txt

# ==============================================================================
# 3. Atualizar README.md
# ==============================================================================
README="README.md"
echo "📝 Atualizando $README..."

# Adicionar novas funcionalidades na lista de Features (se houver uma lista)
# Caso contrário, adicionamos um bloco de novidades no final
echo "" >> "$README"
echo "### 🆕 Novidades da Versão v0.11.0" >> "$README"
echo "- **Exportação de Projetos (.zip):** Baixe todo o código gerado, documentação e scripts em um clique." >> "$README"
echo "- **Painel de Configurações:** Configure sua API Key (DeepSeek/OpenAI) diretamente na interface." >> "$README"
echo "- **Backend Estabilizado:** Correção completa de dependências Fastify e Pipeline de CI local." >> "$README"

echo "✅ Documentação atualizada com sucesso."
