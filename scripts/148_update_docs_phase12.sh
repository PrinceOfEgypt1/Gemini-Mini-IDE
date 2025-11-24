#!/usr/bin/env bash
set -e

echo "📚 [Docs] Atualizando documentação para v0.12.0 (Fase 12 Concluída)..."

# ==============================================================================
# 1. Atualizar BACKLOG.md
# Mudar status das HUs do Épico 14 para ✅
# ==============================================================================
BACKLOG="docs/BACKLOG.md"
echo "📝 Atualizando status no $BACKLOG..."

# Atualizar contagem geral (estimada)
sed -i 's/Status Geral:\*\* 84 HUs/Status Geral:** 84 HUs (Fase 12 Concluída)/' "$BACKLOG"

# Marcar HUs como concluídas
sed -i 's/📅 \*\*14.1/✅ **14.1/' "$BACKLOG"
sed -i 's/📅 \*\*14.2/✅ **14.2/' "$BACKLOG"
sed -i 's/📅 \*\*14.3/✅ **14.3/' "$BACKLOG"
sed -i 's/📅 \*\*14.4/✅ **14.4/' "$BACKLOG"
sed -i 's/📅 \*\*14.5/✅ **14.5/' "$BACKLOG"

# ==============================================================================
# 2. Atualizar DEVELOPMENT.md
# Atualizar versão e adicionar o bloco histórico da Fase 12
# ==============================================================================
DEV_DOC="DEVELOPMENT.md"
echo "📝 Atualizando histórico no $DEV_DOC..."

# 1. Bump de Versão
sed -i 's/Versão do Software:\*\* v0.11.0 (Export Stable)/Versão do Software:** v0.12.0 (UX & Security)/' "$DEV_DOC"
sed -i "s/Data:\*\* .*/Data:** $(date +%Y-%m-%d)/" "$DEV_DOC"

# 2. Preparar o Bloco da Fase 12 Concluída
cat > phase12_block.txt <<EOF

### ✅ Fase 12: Experiência do Usuário & Segurança (Produto)
**Objetivo:** Transformar a ferramenta técnica em um produto amigável e seguro.
- **Artefatos:**
    - \`ui/.../services/tour.ts\` (Driver.js integration).
    - \`ui/.../help/HelpModal.tsx\` (Manual Markdown).
    - \`ui/.../wizard/QuickStartGallery.tsx\` (Templates).
    - \`scripts/140_implement_secure_apikey_flow.sh\` (Security Middleware).
- **HUs Entregues:** 14.1, 14.2, 14.3, 14.4, 14.5.
- **Status:** Onboarding completo, API Key segura, Múltiplos Modelos.
EOF

# 3. Inserir o bloco antes da seção "Roadmap Futuro"
# Isso mantém a ordem cronológica nas "Fases Concluídas"
sed -i '/## 2. Roadmap Futuro/e cat phase12_block.txt' "$DEV_DOC"
rm phase12_block.txt

# 4. Atualizar a seção de Roadmap (mover Fase 12 de "Futuro" para "Histórico" já foi feito visualmente acima,
# mas vamos limpar a seção de roadmap pendente para não duplicar ou confundir)
# Vamos marcar os itens do roadmap antigo como feitos [x] para manter registro visual se alguém olhar o diff
sed -i 's/\[ \] \*\*14.1\*\*/[x] **14.1**/' "$DEV_DOC"
sed -i 's/\[ \] \*\*14.2\*\*/[x] **14.2**/' "$DEV_DOC"
sed -i 's/\[ \] \*\*14.3\*\*/[x] **14.3**/' "$DEV_DOC"
sed -i 's/\[ \] \*\*14.4\*\*/[x] **14.4**/' "$DEV_DOC"
sed -i 's/\[ \] \*\*14.5\*\*/[x] **14.5**/' "$DEV_DOC"

# ==============================================================================
# 3. Atualizar README.md
# Adicionar seção de Features da v0.12.0
# ==============================================================================
README="README.md"
echo "📝 Incrementando $README..."

cat >> "$README" <<EOF

### 🆕 Novidades da Versão v0.12.0 (UX & Security)
- **Tour Guiado:** Um passo a passo interativo para novos usuários.
- **Galeria de Templates:** Comece rápido com *API Node*, *React Dashboard*, *Python Script* e mais.
- **Manual Integrado:** Documentação completa de uso sem sair da aplicação.
- **Segurança de Verdade:** Sua API Key agora trafega via Headers HTTP seguros e nunca é logada.
- **Multi-Modelos:** Suporte nativo para OpenAI, Anthropic, Google Gemini, DeepSeek e **Ollama (Local)**.
EOF

echo "✅ Documentação sincronizada com o código."
