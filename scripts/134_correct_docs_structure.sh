#!/usr/bin/env bash
set -e

echo "📚 [Docs] Reorganizando estrutura e corrigindo ordem dos documentos..."

# ==============================================================================
# 1. Reconstruir DEVELOPMENT.md
# Correções aplicadas:
# - Fase 11 movida para "Fases Concluídas".
# - Fase 12 movida para o topo de "Roadmap Futuro" (sem "Em Andamento").
# - Ordenação lógica restaurada.
# ==============================================================================
DEV_DOC="DEVELOPMENT.md"
echo "📝 Reescrevendo $DEV_DOC com a ordem correta..."

cat > "$DEV_DOC" <<EOF
# Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 7.0 (Phase 11 Complete)
> **Versão do Software:** v0.11.0 (Export Stable)
> **Data:** $(date +%Y-%m-%d)
> **Pipeline:** 🟢 Verde (Lint, Types, Tests, Build, Smoke)

---

# 🗺️ Plano de Desenvolvimento Mestre (Rastreabilidade)

Estratégia: **Monorepo Strict Types** $\to$ **Backend First** $\to$ **UI Driven**.

## 1. Fases Concluídas (Histórico Técnico)

### ✅ Fase 1: Fundação e Governança
**Objetivo:** Setup do monorepo e pipeline.
- **Artefatos:** \`pnpm-workspace.yaml\`, \`tsconfig.base.json\`, \`42_pipeline_checklist.sh\`.
- **HUs:** 11.3, 5.4.

### ✅ Fase 2: Motor de Análise (Backend Core)
**Objetivo:** Servidor HTTP e Contratos de Tipos.
- **Artefatos:** \`server/src/index.ts\`, \`shared/src/types/*.ts\`.
- **HUs:** 1.1, 1.2, 1.4, 1.5, 1.7.

### ✅ Fase 3: Inteligência Artificial
**Objetivo:** Integração com LLM e Provider Pattern.
- **Artefatos:** \`analysis-agent/src/providers/*\`, \`analysis-agent/src/index.ts\`.
- **HUs:** 2.3, 3.1, 3.10, 12.3.

### ✅ Fase 4: Interface CLI
**Objetivo:** Validação funcional via terminal.
- **Artefatos:** \`cli/src/index.ts\`.
- **HUs:** 7.1, 7.2.

### ✅ Fase 5: Interface Visual (UI Shell)
**Objetivo:** Estrutura React baseada no wireframe.
- **Artefatos:** \`ui/src/App.tsx\`, \`ui/vite.config.ts\`.
- **HUs:** 9.1, 9.4, 13.1, 13.2, 13.3.

### ✅ Fase 6: Refinamento e UX
**Objetivo:** Interatividade, Feedback Visual e Testes de UI.
- **Artefatos:** \`ToastContext.tsx\`, \`Button.tsx\`, \`ExploreTimeline.tsx\`, \`DiscoveryNotes.tsx\`.
- **HUs:** 9.2, 9.3, 9.9, 9.10, 9.11, 9.12, 9.13, 9.16, 9.17, 13.4.

### ✅ Fase 7: Persistência e Histórico
**Objetivo:** Salvar dados em disco e histórico.
- **Artefatos:** \`server/src/services/persistence.ts\`, \`ui/src/components/analyze/HistoryPanel.tsx\`.
- **HUs:** 6.1, 6.2, 6.3, 13.5.

### ✅ Fase 8: Robustez do Backend (Hardening)
**Objetivo:** Documentação automática, controle de custos e tratamento de erros.
- **Artefatos:** \`server/src/schemas.ts\`, \`analysis-agent/src/utils/prompt-optimizer.ts\`, Swagger.
- **HUs:** 1.3, 1.6, 2.1, 2.2, 2.4, 12.2.

### ✅ Fase 9: Orquestração de Personas (O Cérebro)
**Objetivo:** Implementar lógica de IA complexa (Chain of Thought).
- **Artefatos:**
    - \`analysis-agent/src/personas/*.ts\` (8 classes especializadas).
- **HUs:** 3.2 a 3.9.

### ✅ Fase 10: Fluxo de Engenharia (Wizard)
**Objetivo:** Implementar o "Golden Path" de criação de projetos.
- **Artefatos:**
    - \`analysis-agent/src/services/discovery-service.ts\`.
    - \`ui/src/components/wizard/ProjectWizard.tsx\`.
- **HUs:** 9.6, 10.1 a 10.4, 10.7.

### ✅ Fase 11: Consolidação e Exportação (A Fábrica)
**Objetivo:** Materializar o projeto em arquivos reais e permitir download.
- **Artefatos:**
    - \`analysis-agent/src/services/consolidator-service.ts\` (Motor de geração).
    - \`server/src/controllers/export.controller.ts\` (Endpoint ZIP).
    - \`ui/src/components/settings/SettingsModal.tsx\` (Configuração).
- **HUs Entregues:**
    - **4.1, 4.2, 4.3, 4.6** (Core do Consolidador)
    - **8.3** (Settings/API Key UI)
    - **9.5** (Exportação na UI)

---

## 2. Roadmap Futuro (Backlog Pendente)

### 📅 Fase 12: Experiência do Usuário & Segurança
**Objetivo:** Polir a usabilidade para novos usuários e garantir segurança no tráfego de credenciais.
- **HUs Planejadas:**
    - [ ] **14.1** HU-Sec-API-Key-Handling-001 (Segurança Headers).
    - [ ] **14.2** HU-UI-QuickStart-Revamp-020 (Templates).
    - [ ] **14.3** HU-UI-Explore-Tour-019 (Tour Guiado).
    - [ ] **14.4** HU-Gov-User-Manual-001 (Manual Integrado).
    - [ ] **14.5** HU-UI-Settings-Models-021 (Seleção de Modelos).

### 📅 Fase 13: Acessibilidade e Polimento Visual
**Objetivo:** WCAG Compliance e Micro-interações.
- [ ] **9.8** HU-UI-Theme-System-008
- [ ] **9.14** HU-UI-Explore-Keyboard-Nav-014
- [ ] **9.15** HU-UI-Explore-Accessibility-015
- [ ] **9.18** HU-UI-Explore-Micro-Interactions-018

### 📅 Fase 14: Hardening e Produção
**Objetivo:** CI/CD e Release.
- [ ] **5.1** HU-Quality-Unit-Tests (Enforcement)
- [ ] **5.2** HU-Quality-Schema-Validation
- [ ] **5.3** HU-Quality-Smoke-Bats
- [ ] **11.1** HU-Gov-Release-Checklist
- [ ] **11.2** HU-Gov-Announcements
- [ ] **12.1** HU-Gov-CI-CD
- [ ] **12.4** HU-Quality-Coverage-Thresholds
- [ ] **12.5** HU-Quality-E2E-Flow
- [ ] **12.6** HU-Server-Metrics-Observability
EOF

# ==============================================================================
# 2. Reconstruir BACKLOG.md
# Correções aplicadas:
# - Remoção da seção de "Detalhamento".
# - Inclusão das novas HUs no Épico 14.
# - Atualização dos status da Fase 11.
# ==============================================================================
BACKLOG="docs/BACKLOG.md"
echo "📝 Reescrevendo $BACKLOG limpando detalhamentos..."

cat > "$BACKLOG" <<EOF
# Backlog de Histórias de Usuário — Mini-IDE

**Status Geral:** 84 HUs Totais.

## Legenda
- ✅ **Concluído**: Implementado e testado.
- 🚧 **Em Andamento**: Em desenvolvimento na fase atual.
- 📅 **Pendente**: Planejado para fases futuras.

---

## 1. Épico E-Server: API & Observabilidade
- ✅ **1.1 HU-Server-Analyze-200**: Endpoint POST /analyze (Happy Path).
- ✅ **1.2 HU-Server-Analyze-400**: Validações 4xx.
- ✅ **1.3 HU-Server-Analyze-500**: Tratamento 5xx e fallback.
- ✅ **1.4 HU-Server-Healthz**: Endpoint GET /healthz.
- ✅ **1.5 HU-Server-Logging-JSON**: Logs estruturados.
- ✅ **1.6 HU-Server-OpenAPI**: Documentação Swagger.
- ✅ **1.7 HU-Server-Analyze-Shape-Contract**: Contrato TypeScript compartilhado.

## 2. Épico E-Analysis: Gateway Único
- ✅ **2.1 HU-Analysis-CompactPrompt**: Otimização de prompt.
- ✅ **2.2 HU-Analysis-Budget-Check**: Controle de custos.
- ✅ **2.3 HU-Analysis-Context**: Estrutura de prompt no Agente.
- ✅ **2.4 HU-Analysis-RunId**: Rastreabilidade ponta a ponta.

## 3. Épico E-LLM: Orquestração 8 Personas
- ✅ **3.1 HU-LLM-Client-DeepSeek**: Cliente HTTP (com Mock fallback).
- ✅ **3.2 a 3.9**: Personas (Analysis, Product, Architect, Engine, UX, Quality, Ops, Fenix).
- ✅ **3.10 HU-LLM-Response-Schema**: Schema JSON de saída.

## 4. Épico E-Consolidator: Extração de Artefatos
- ✅ **4.1 HU-Consolidator-Parse**: Parser robusto.
- ✅ **4.2 HU-Consolidator-Extract-HUs**: Markdown generator.
- ✅ **4.3 HU-Consolidator-Extract-Code**: Code generator.
- 📅 **4.4 HU-Consolidator-Extract-Tests**: Test generator.
- 📅 **4.5 HU-Consolidator-Extract-Docs**: Docs generator.
- ✅ **4.6 HU-Consolidator-Extract-Scripts**: Script generator.

## 5. Épico E-Quality: Validação & Gates
- 📅 **5.1 HU-Quality-Unit-Tests**: Coverage enforcement.
- 📅 **5.2 HU-Quality-Schema-Validation**: Validação Zod profunda.
- 📅 **5.3 HU-Quality-Smoke-Bats**: Testes BATS.
- ✅ **5.4 HU-Quality-Pipeline-Checklist**: Script local de CI.

## 6. Épico E-Persistence: Bundles & Storage
- ✅ **6.1 HU-Persistence-Bundles**: Salvar JSON em disco.
- ✅ **6.2 HU-Persistence-Metadata**: Metadados no JSON salvo.
- ✅ **6.3 HU-Persistence-Logs**: Logs em arquivo (audit.log).

## 7. Épico E-CLI: Interface de Linha de Comando
- ✅ **7.1 HU-CLI-Analyze**: Comando básico.
- ✅ **7.2 HU-CLI-Config**: Configuração local.
- 📅 **7.3 HU-CLI-Workspace**: Gestão de múltiplos workspaces.

## 8. Épico E-UI: Interface do Usuário
- 📅 **8.1 HU-UI-Chat**: Interface dedicada de chat.
- 📅 **8.2 HU-UI-Results**: Tela de resultados detalhada.
- ✅ **8.3 HU-UI-Settings**: Tela de configurações (API Key).

## 9. Épico E-UI-Explore: Interface Explorar
- ✅ **9.1 a 9.4**: Layout base, Discovery Notes, Timeline, Tabs.
- ✅ **9.5 HU-UI-Export-005**: Botão Exportar (.zip).
- ✅ **9.6 HU-UI-Project-Creation-006**: Wizard de criação.
- 📅 **9.7 HU-UI-RealTime-Preview-007**: Preview de código.
- 📅 **9.8 HU-UI-Theme-System-008**: Temas.
- ✅ **9.9 a 9.13**: Ações, Fluxo Chat, Placeholders, Interações, Empty States.
- 📅 **9.14 HU-UI-Explore-Keyboard-Nav-014**: Acessibilidade Teclado.
- 📅 **9.15 HU-UI-Explore-Accessibility-015**: Acessibilidade Screen Reader.
- ✅ **9.16 HU-UI-Explore-Error-Handling-016**: Toasts de erro.
- ✅ **9.17 HU-UI-Explore-Loading-States-017**: Spinners.
- 📅 **9.18 HU-UI-Explore-Micro-Interactions-018**: Animações finas.

## 10. Épico E-Flow: Fluxo de Descoberta
- ✅ **10.1 a 10.4**: Geração HUs, Aprovação, Diretório, Scripts.
- 📅 **10.5 HU-MINI-IDE-Planning-005**: Planejamento.
- 📅 **10.6 HU-MINI-IDE-Dev-006**: Desenvolvimento.
- ✅ **10.7 HU-MINI-IDE-Gen-Quality-007**: Script de Pipeline para Usuário.

## 11. Épico E-Governança
- 📅 **11.1 HU-Gov-Release-Checklist**: Script de release.
- 📅 **11.2 HU-Gov-Announcements**: Templates.
- ✅ **11.3 HU-Gov-Docs-Minimas**: README/DEVELOPMENT.

## 12. Épico E-Hardening
- 📅 **12.1 HU-Gov-CI-CD**: GitHub Actions.
- ✅ **12.2 HU-Server-Budget-Per-Context**: Orçamento isolado.
- ✅ **12.3 HU-LLM-Provider-Abstraction**: Provider Pattern.
- 📅 **12.4 HU-Quality-Coverage-Thresholds**: Limites de cobertura.
- 📅 **12.5 HU-Quality-E2E-Flow**: Testes E2E.
- 📅 **12.6 HU-Server-Metrics-Observability**: Prometheus.

## 13. Épico E-UI-Backend-Bridge
- ✅ **13.1 a 13.5**: Proxy, Status, Playground, Contract Guard, History.

## 14. Épico E-Experience: Usabilidade & Segurança
- 📅 **14.1 HU-Sec-API-Key-Handling-001**: Segurança no Tráfego da API Key.
- 📅 **14.2 HU-UI-QuickStart-Revamp-020**: Refatoração do Quick Start.
- 📅 **14.3 HU-UI-Explore-Tour-019**: Tour Guiado (Onboarding).
- 📅 **14.4 HU-Gov-User-Manual-001**: Manual do Usuário Didático.
- 📅 **14.5 HU-UI-Settings-Models-021**: Expansão de Modelos LLM.
EOF

echo "✅ Documentação reorganizada com sucesso!"
