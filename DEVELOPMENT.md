# Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 9.2 (Governance Fix)
> **Versão do Software:** v0.15.0 (AI Powered)
> **Data:** 2025-11-24
> **Pipeline:** 🟢 Verde (Lint, Types, Tests, Build, Smoke)

---

# 🗺️ Plano de Desenvolvimento Mestre (Rastreabilidade)

Estratégia: **Monorepo Strict Types** $\to$ **Backend First** $\to$ **UI Driven**.

## 1. Fases Concluídas (Histórico Técnico)

*(Fases 1 a 11 - Detalhes mantidos no histórico do git)*
- **Fundação (1-4):** Monorepo, CLI, Mocks.
- **Core UI (5-9):** React, Tailwind v3, Chat.
- **Engenharia (10-11):** Wizard, Consolidador, Exportação ZIP.

### ✅ Fase 12: Experiência do Usuário & Segurança (Produto)
**Objetivo:** Transformar a ferramenta técnica em um produto amigável e seguro.
- **Artefatos:** `tour.ts`, `HelpModal.tsx`, `QuickStartGallery.tsx`.
- **HUs Entregues:** 14.1 a 14.5 (migradas).

### ✅ Fase 13: Acessibilidade e Polimento Visual
**Objetivo:** Sistema de Temas (Dark/Light) e refinamentos.
- **Artefatos:** `ThemeContext.tsx`, `tailwind.config.js` (v3).
- **HUs Entregues:** 9.8, 9.14, 9.18.

### ✅ Fase 14: Inteligência Real (O Cérebro)
**Objetivo:** Conectar Backend à OpenAI/DeepSeek com segurança.
- **Artefatos:** `agent.ts` (OpenAI SDK), `server/src/index.ts` (Security Headers).
- **HUs Entregues:** 12.7, 14.6, 14.7, 14.8.

---

## 2. Roadmap Futuro (Backlog Pendente)

### 🚧 Fase 15: Visualização Interativa (Foco Atual)
**Objetivo:** Substituir "Em breve" por dados reais na UI (Sidebar e Abas).

#### Planejamento de HUs
- [ ] **15.1 HU-UI-Viz-Sidebar-022**: Árvore de arquivos dinâmica na lateral.
- [ ] **15.2 HU-UI-Viz-HUs-023**: Renderização visual das Histórias de Usuário.
- [ ] **15.3 HU-UI-Viz-Docs-024**: Visualizador Markdown para abas Docs e README.
- [ ] **15.4 HU-UI-Interaction-Refine-025**: Fluxo de refinamento via Chat.

#### 📐 Especificações Técnicas da Fase 15
*Diretrizes de implementação para a próxima Sprint:*

**15.1 Sidebar (File Tree):**
- **Entrada:** `generatedProject.engine.files` (Array plano).
- **Lógica:** Converter paths (`src/index.js`) em árvore aninhada (Objeto ou Map).
- **UI:** Componente recursivo com indentação e ícones (pasta/arquivo).

**15.2 Aba HUs:**
- **Entrada:** `generatedProject.product.userStories`.
- **UI:** Grid de cards. Cada card deve ter checkbox para "Critérios de Aceite" (estado local).

**15.3 Aba Docs:**
- **Lógica:** Encontrar o arquivo que termina em `README.md` no payload.
- **Render:** Usar `react-markdown` com o plugin `rehype-highlight` (se necessário para código).

**15.4 Refinamento:**
- **Backend:** Endpoint `/analyze` deve aceitar um contexto opcional `previousContext`.
- **Frontend:** Manter histórico de versões do projeto no estado React.

### 📅 Fase 16: Persistência Real
**Objetivo:** Banco de Dados (SQLite/Postgres) para salvar histórico.

### 📅 Fase 17: Deploy & DevOps
**Objetivo:** Docker e CI/CD em nuvem.
