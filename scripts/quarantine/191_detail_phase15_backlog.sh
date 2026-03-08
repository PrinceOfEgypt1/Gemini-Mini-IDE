#!/usr/bin/env bash
set -e

echo "📚 [Docs] Detalhando HUs da Fase 15 no BACKLOG.md..."

BACKLOG="docs/BACKLOG.md"

# Adiciona o detalhamento técnico ao final do arquivo
cat >> "$BACKLOG" <<EOF

---

## Detalhamento Técnico: Fase 15 (Visualização)

### 15.1 HU-UI-Viz-Sidebar-022
**Objetivo:** Transformar a lista plana de arquivos do JSON em árvore visual.
- **Entrada:** \`generatedProject.engine.files\` (Array de paths).
- **Saída:** Componente \`FileTree\` recursivo.
- **Interação:** \`onSelectFile(path)\`.

### 15.2 HU-UI-Viz-HUs-023
**Objetivo:** Renderizar plano de projeto.
- **Entrada:** \`generatedProject.product.userStories\`.
- **Componente:** \`UserStoryCard\`.

### 15.3 HU-UI-Viz-Docs-024
**Objetivo:** Visualizar documentação gerada.
- **Lógica:** Filtrar arquivos que terminam em \`.md\`.
- **Render:** Reutilizar \`react-markdown\` (já instalado).

### 15.4 HU-UI-Interaction-Refine-025
**Objetivo:** Iteração sobre o projeto.
- **Backend:** O endpoint \`/analyze\` deve aceitar um \`context\` opcional com o projeto anterior.
- **Frontend:** Manter histórico de versões.
EOF

echo "✅ Backlog detalhado com especificações da Fase 15."
