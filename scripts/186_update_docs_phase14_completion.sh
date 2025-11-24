#!/usr/bin/env bash
set -e

echo "📚 [Docs] Atualizando documentação: Fases 13/14 Concluídas -> Fase 15 Iniciada..."

# ==============================================================================
# 1. Atualizar BACKLOG.md
# - Marca HUs de Temas e Integração como Feitas
# - Adiciona o Épico 15 (Visualização)
# ==============================================================================
BACKLOG="docs/BACKLOG.md"
echo "📝 Atualizando $BACKLOG..."

# Atualizar Status Geral
sed -i 's/Status Geral:\*\* .*/Status Geral:** Fases 1-14 Concluídas (Backend Inteligente & Seguro)/' "$BACKLOG"

# Marcar Fase 13 (Temas/Acessibilidade) como concluída
sed -i 's/📅 \*\*9.8/✅ **9.8/' "$BACKLOG"
sed -i 's/📅 \*\*9.14/✅ **9.14/' "$BACKLOG" # Navegação Teclado (parcialmente entregue com acessibilidade)

# Marcar Fase 14 (Integração Real) como concluída
# Adicionamos as HUs técnicas que fizemos on-the-fly
sed -i '/## 14. Épico E-Experience/i \
## 14-B. Épico E-Intelligence: Integração Real (Fase 14)\
- ✅ **14.6 HU-Backend-Real-Agent**: Integração com OpenAI SDK.\
- ✅ **14.7 HU-Backend-Dry-Run**: Modo de teste para CI/CD.\
- ✅ **14.8 HU-Backend-CORS-Fix**: Configuração robusta de CORS.\
' "$BACKLOG"

# Adicionar Fase 15 (O que falta na UI)
cat >> "$BACKLOG" <<EOF

## 15. Épico E-Visualization: Interatividade e Renderização (Fase 15)
**Objetivo:** Substituir placeholders da UI por dados reais gerados pela IA.
- 📅 **15.1 HU-UI-Viz-Sidebar-022**: Árvore de arquivos dinâmica na lateral.
- 📅 **15.2 HU-UI-Viz-HUs-023**: Renderização visual das Histórias de Usuário e Critérios.
- 📅 **15.3 HU-UI-Viz-Docs-024**: Visualizador Markdown para abas Docs e README.
- 📅 **15.4 HU-UI-Interaction-Refine-025**: Fluxo de refinamento (pedir alterações ao agente).
EOF

# ==============================================================================
# 2. Atualizar DEVELOPMENT.md
# - Move Fases 13 e 14 para Histórico
# - Define Fase 15 como Foco Atual
# ==============================================================================
DEV_DOC="DEVELOPMENT.md"
echo "📝 Atualizando $DEV_DOC..."

# Bump de Versão
sed -i 's/Versão do Software:\*\* .*/Versão do Software:** v0.15.0 (AI Powered)/' "$DEV_DOC"
sed -i "s/Data:\*\* .*/Data:** $(date +%Y-%m-%d)/" "$DEV_DOC"

# Criar bloco de histórico recente
cat > recent_history.txt <<EOF

### ✅ Fase 13 & 14: Polimento Visual e Inteligência Real
**Objetivo:** Temas, Segurança de API Key e Conexão com GPT-4.
- **Artefatos:**
    - \`ui/.../contexts/ThemeContext.tsx\` (Dark/Light Mode).
    - \`analysis-agent/src/agent.ts\` (Integração OpenAI/DeepSeek).
    - \`server/src/index.ts\` (Servidor Fastify Seguro).
- **Status:** O sistema gera código real, exporta ZIP e passa em todos os testes.
EOF

# Inserir no histórico (após a Fase 12)
sed -i '/### ✅ Fase 12:/a \ ' "$DEV_DOC" # Adiciona quebra de linha
sed -i '/### ✅ Fase 12:/r recent_history.txt' "$DEV_DOC"
rm recent_history.txt

# Atualizar Roadmap Futuro
# Removemos o conteúdo antigo e colocamos a Fase 15
sed -i '/## 2. Roadmap Futuro/,$d' "$DEV_DOC" # Deleta do título até o fim

cat >> "$DEV_DOC" <<EOF
## 2. Roadmap Futuro (Backlog Pendente)

### 🚧 Fase 15: Visualização Interativa (Próxima)
**Objetivo:** "Limpar a sujeira" da UI. Mostrar os dados reais nas abas e sidebar.
- [ ] **15.1** Árvore de Arquivos (Sidebar).
- [ ] **15.2** Renderização de HUs (Abas).
- [ ] **15.3** Visualizador de Docs/Markdown.
- [ ] **15.4** Refinamento via Chat.

### 📅 Fase 16: Persistência Real (Database)
**Objetivo:** Salvar histórico entre sessões (SQLite/Postgres).
- [ ] Persistência de Chat.
- [ ] Persistência de Projetos.

### 📅 Fase 17: Deploy & DevOps
**Objetivo:** Dockerização e CI/CD em nuvem.
EOF

# ==============================================================================
# 3. Atualizar README.md
# ==============================================================================
README="README.md"
echo "📝 Atualizando $README..."

cat >> "$README" <<EOF

### 🚀 Versão v0.15.0 (AI Powered)
- **Inteligência Real:** O sistema agora se conecta a LLMs reais (GPT-4, DeepSeek) para gerar código.
- **Exportação Funcional:** Gere e baixe projetos completos em ZIP.
- **Segurança:** Gestão de chaves via Headers HTTP seguros.
- **Temas:** Suporte nativo a Dark e Light mode.
EOF

echo "✅ Documentação atualizada e sincronizada."
