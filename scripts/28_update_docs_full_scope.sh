#!/usr/bin/env bash
set -e

echo "📚 Sincronizando DEVELOPMENT.md com o Plano Mestre v4.0 (78 HUs)..."

cat > DEVELOPMENT.md <<EOF
# Mini-IDE — DEVELOPMENT.md

> **Versão do Documento:** 4.0 (Full Scope)
> **Versão do Software:** v0.6.0 (Alpha Estável)
> **Data:** $(date +%Y-%m-%d)
> **Pipeline:** 🟢 Verde (Lint, Types, Tests, Build, Smoke)

---

# 🗺️ Plano de Desenvolvimento Mestre (78 HUs)

Estratégia: **Monorepo Strict Types** $\to$ **Backend First** $\to$ **UI Driven**.

---

## 🟢 1. Fases Concluídas (Infraestrutura & MVP)

### **Fase 1: Fundação e Governança**
**Status:** ✅ CONCLUÍDO
**Objetivo:** Estabelecer o monorepo, ferramentas de qualidade e regras de contribuição.

| HU ID | Título | Implementação Técnica |
| :--- | :--- | :--- |
| **11.3** | HU-Gov-Docs-Minimas | Criação de \`README.md\` e \`DEVELOPMENT.md\`. |
| **5.4** | HU-Quality-Pipeline-Checklist | Script \`42_pipeline_checklist.sh\` (Lint, Test, Build). |
| **N/A** | Infraestrutura Monorepo | Configuração de \`pnpm workspaces\`, \`tsconfig\`, \`eslint v9\`. |

### **Fase 2: Motor de Análise (Backend Core)**
**Status:** ✅ CONCLUÍDO
**Objetivo:** Criar o servidor HTTP capaz de processar requisições e validar contratos.

| HU ID | Título | Implementação Técnica |
| :--- | :--- | :--- |
| **1.1** | HU-Server-Analyze-200 | Rota \`POST /analyze\` no \`@mini-ide/server\`. |
| **1.2** | HU-Server-Analyze-400 | Validação de input (texto vazio, maxLen) no controller. |
| **1.4** | HU-Server-Healthz | Rota \`GET /healthz\` retornando uptime. |
| **1.5** | HU-Server-Logging-JSON | Configuração do \`pino\` logger no Fastify. |
| **1.7** | HU-Server-Analyze-Shape-Contract | Interfaces \`AnalyzeRequest/Response\` em \`@mini-ide/shared\`. |

### **Fase 3: Inteligência Artificial (O Cérebro)**
**Status:** ✅ CONCLUÍDO
**Objetivo:** Integrar o orquestrador de IA e clientes de LLM.

| HU ID | Título | Implementação Técnica |
| :--- | :--- | :--- |
| **2.3** | HU-Analysis-Context | Classe \`AnalysisAgent\` recebendo contexto. |
| **3.1** | HU-LLM-Client-DeepSeek | \`DeepSeekProvider\` implementado com \`axios\`. |
| **3.10** | HU-LLM-Response-Schema | Definição (lógica) do JSON de saída esperado. |
| **12.3** | HU-LLM-Provider-Abstraction | Interface \`LLMProvider\` e \`MockProvider\` para testes. |

### **Fase 4: Primeira Interface (CLI)**
**Status:** ✅ CONCLUÍDO
**Objetivo:** Validar o fluxo funcional via terminal.

| HU ID | Título | Implementação Técnica |
| :--- | :--- | :--- |
| **7.1** | HU-CLI-Analyze | Comando \`analyze\` em \`@mini-ide/cli\` lendo arquivos. |

### **Fase 5: Interface Visual (UI Shell)**
**Status:** ✅ CONCLUÍDO
**Objetivo:** Construir a estrutura visual React conectada ao backend.

| HU ID | Título | Implementação Técnica |
| :--- | :--- | :--- |
| **9.1** | HU-UI-Explore-Mode-001 | Layout 3 colunas (Grid) em \`@mini-ide/ui\`. |
| **9.4** | HU-UI-Tabs-004 | Sistema de abas (\`overview\`, \`hus\`, etc.) no \`App.tsx\`. |
| **13.1** | HU-UI-Server-BaseURL-Config | Proxy Vite configurado para \`localhost:3200\`. |
| **13.2** | HU-UI-Healthz-Status-Indicator | Indicador visual (Mock visual inicial). |
| **13.3** | HU-UI-Analyze-Playground | Integração \`axios.post\` no chat do rodapé. |

---

## 🟢 2. Fase Recém-Concluída (Refinamento)

### **Fase 6: Refinamento de UX e Interatividade**
**Status:** ✅ CONCLUÍDO
**Objetivo:** UI responsiva com feedback rico.

| HU ID | Título | Implementação Técnica |
| :--- | :--- | :--- |
| **9.2** | HU-UI-Discovery-Notes-002 | Componente \`DiscoveryNotes\` estruturado. |
| **9.3** | HU-UI-Timeline-003 | Componente \`ExploreTimeline\` com filtros e ícones. |
| **9.9** | HU-UI-Explore-Primary-Actions-009 | Botões do Header conectados ao Toast system. |
| **9.10** | HU-UI-Explore-Chat-Flow-010 | Fluxo Chat -> Timeline -> Notes (State React). |
| **9.11** | HU-UI-Explore-Tabs-Minimum-Content-011 | Abas com conteúdo ou placeholders informativos. |
| **9.12** | HU-UI-Explore-Interactions-012 | \`ToastContext\` e \`Button\` (Loading state). |
| **9.13** | HU-UI-Explore-Empty-States-013 | Componentes de "Estado Vazio". |
| **9.16** | HU-UI-Explore-Error-Handling-016 | Tratamento de erro (Offline) com Toasts. |
| **9.17** | HU-UI-Explore-Loading-States-017 | Spinners e desativação de inputs durante request. |
| **13.4** | HU-UI-Analyze-Contract-Guard | (Parcial) Validação via tipos TS no frontend. |

---

## 🔴 3. Fases Futuras (Backlog Restante)

### **Fase 7: Persistência e Histórico**
**Objetivo:** Garantir que dados sobrevivam ao refresh.
- [ ] **6.1** HU-Persistence-Bundles
- [ ] **6.2** HU-Persistence-Metadata
- [ ] **6.3** HU-Persistence-Logs
- [ ] **8.2** HU-UI-Results
- [ ] **13.5** HU-UI-Analyze-Result-History

### **Fase 8: Robustez do Backend (Hardening)**
**Objetivo:** Controle de erros, custos e documentação.
- [ ] **1.3** HU-Server-Analyze-500
- [ ] **1.6** HU-Server-OpenAPI
- [ ] **2.1** HU-Analysis-CompactPrompt
- [ ] **2.2** HU-Analysis-Budget-Check
- [ ] **2.4** HU-Analysis-RunId
- [ ] **12.2** HU-Server-Budget-Per-Context

### **Fase 9: Orquestração de Personas (O Cérebro Completo)**
**Objetivo:** Implementar a cadeia de pensamento dos 8 especialistas.
- [ ] **3.2 a 3.9** Personas (Analysis, Product, Architect, Engine, UX, Quality, Ops, Fenix)

### **Fase 10: Fluxo de Descoberta e Engenharia (Wizard)**
**Objetivo:** Guiar o usuário da ideia ao código.
- [ ] **9.6** HU-UI-Project-Creation-006
- [ ] **9.7** HU-UI-RealTime-Preview-007
- [ ] **10.1** HU-MINI-IDE-Discovery-001
- [ ] **10.2** HU-MINI-IDE-Discovery-002
- [ ] **10.3** HU-MINI-IDE-Env-003
- [ ] **10.4** HU-MINI-IDE-Env-004
- [ ] **10.5** HU-MINI-IDE-Planning-005
- [ ] **10.6** HU-MINI-IDE-Dev-006

### **Fase 11: Consolidação e Exportação**
**Objetivo:** Transformar dados em arquivos.
- [ ] **4.1 a 4.6** Consolidator (Parse, HUs, Code, Tests, Docs, Scripts)
- [ ] **9.5** HU-UI-Export-005

### **Fase 12: CLI Avançada e Configurações**
**Objetivo:** Funcionalidades para Power Users.
- [ ] **7.2** HU-CLI-Config
- [ ] **7.3** HU-CLI-Workspace
- [ ] **8.1** HU-UI-Chat
- [ ] **8.3** HU-UI-Settings

### **Fase 13: Acessibilidade e Polimento Visual**
**Objetivo:** Conformidade WCAG e experiência premium.
- [ ] **9.8** HU-UI-Theme-System-008
- [ ] **9.14** HU-UI-Explore-Keyboard-Nav-014
- [ ] **9.15** HU-UI-Explore-Accessibility-015
- [ ] **9.18** HU-UI-Explore-Micro-Interactions-018

### **Fase 14: Hardening e Produção**
**Objetivo:** Segurança e CI/CD.
- [ ] **5.1** HU-Quality-Unit-Tests
- [ ] **5.2** HU-Quality-Schema-Validation
- [ ] **5.3** HU-Quality-Smoke-Bats
- [ ] **11.1** HU-Gov-Release-Checklist
- [ ] **11.2** HU-Gov-Announcements
- [ ] **12.1** HU-Gov-CI-CD
- [ ] **12.4** HU-Quality-Coverage-Thresholds
- [ ] **12.5** HU-Quality-E2E-Flow
- [ ] **12.6** HU-Server-Metrics-Observability

---
EOF

echo "✅ Documentação sincronizada com Plano v4.0 (78 HUs)."
