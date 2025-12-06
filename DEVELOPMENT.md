# Gemini Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 10.0 (Visualization Complete)
> **Versão do Software:** v0.15.1 (UI Powered)
> **Data:** 2025-11-24
> **Pipeline:** 🟢 Verde (Lint, Types, Tests, Build, Smoke)

---

# 🗺️ Plano de Desenvolvimento Mestre

Estratégia: **Monorepo Strict Types** $\to$ **Backend First** $\to$ **UI Driven**.

## 1. Fases Concluídas (Histórico Técnico Completo)

### ✅ Fase 1-4: Fundação e Backend Core
- **Objetivo:** Estabelecer infraestrutura e lógica base.
- **Artefatos:** Monorepo (PNPM), Fastify Server, CLI, Mocks iniciais.
- **Status:** Configuração de TypeScript Estrito e ESLint (desafio superado de versões).

### ✅ Fase 5-9: Core UI e Explorador
- **Objetivo:** Criar interface React moderna e responsiva.
- **Artefatos:** Tailwind CSS v3, Componentes Base (Button, Modal), Discovery Notes (Regex Local).
- **Status:** Implementação do fluxo de chat e análise preliminar.

### ✅ Fase 10-11: Engenharia e Consolidação
- **Objetivo:** Transformar JSON em arquivos reais.
- **Artefatos:** ConsolidatorService, Archiver (ZIP), Wizard de Criação.
- **Status:** Resolução do conflito de dependências ("Inferno das Dependências") com limpeza de lockfile.

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

### ✅ Fase 15: Visualização Interativa (UI Powered)
**Objetivo:** Transformar dados JSON em UI rica e navegável.
- **Sidebar:** Implementada árvore recursiva (`FileTree.tsx`) conectada ao JSON.
- **Code Viewer:** Visualizador de código estilo IDE com numeração de linhas (`FileViewer.tsx`).
- **HUs:** Cards visuais com parser resiliente para RF/RNF/Segurança (`UserStoryCard.tsx`).
- **Docs:** Renderização Markdown completa na aba Docs (`DocsPanel.tsx`).
- **Status:** Pipeline Verde. Integração total Backend -> Frontend.

---

## 2. Roadmap Futuro (Backlog Pendente)

### 🚧 Fase 16: Refinamento de Inteligência e Testes
**Objetivo:** Garantir que a IA forneça dados estruturados para preencher 100% da UI.
- Refinar Prompt da Persona Product (HU 16.1).
- Gerar arquivos de teste físicos para aba Tests (HU 16.2).

### 📅 Fase 17: Persistência Real
**Objetivo:** Banco de Dados (SQLite/Postgres) para salvar histórico.

### 📅 Fase 18: Deploy & DevOps
**Objetivo:** Docker e CI/CD em nuvem.
