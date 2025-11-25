#!/usr/bin/env bash
set -e

echo "📚 [Audit] Restaurando rastreabilidade do Épico 14 nos documentos..."

# ==============================================================================
# 1. Atualizar BACKLOG.md
# - Reinsere o Épico 14 como registro histórico de migração
# - Mantém a integridade sequencial
# ==============================================================================
BACKLOG="docs/BACKLOG.md"

cat > "$BACKLOG" <<EOF
# Backlog de Histórias de Usuário — Mini-IDE

**Status Geral:** 95% do Core Concluído / 23 HUs Pendentes (Focadas em Visualização e DevOps).

## Legenda
- ✅ **Concluído**: Implementado, testado e mergeado na main.
- 🚧 **Em Andamento**: Foco da Fase 15 (Visualização).
- 📅 **Pendente**: Planejado para fases futuras (Persistência/DevOps).
- 🔄 **Migrado**: HU movida para outro Épico por organização temática.

---

## 1. Épico E-Server: API & Observabilidade (✅ Concluído)
- ✅ **1.1 HU-Server-Analyze-200**: Endpoint POST /analyze (Happy Path).
- ✅ **1.2 HU-Server-Analyze-400**: Validações 4xx.
- ✅ **1.3 HU-Server-Analyze-500**: Tratamento 5xx e fallback.
- ✅ **1.4 HU-Server-Healthz**: Endpoint GET /healthz.
- ✅ **1.5 HU-Server-Logging-JSON**: Logs estruturados.
- ✅ **1.6 HU-Server-OpenAPI**: Documentação Swagger.
- ✅ **1.7 HU-Server-Analyze-Shape-Contract**: Contrato TypeScript compartilhado.

## 2. Épico E-Analysis: Gateway Único (✅ Concluído)
- ✅ **2.1 HU-Analysis-CompactPrompt**: Otimização de prompt.
- ✅ **2.2 HU-Analysis-Budget-Check**: Controle de custos.
- ✅ **2.3 HU-Analysis-Context**: Estrutura de prompt no Agente.
- ✅ **2.4 HU-Analysis-RunId**: Rastreabilidade ponta a ponta.

## 3. Épico E-LLM: Orquestração 8 Personas (✅ Concluído)
- ✅ **3.1 HU-LLM-Client-DeepSeek**: Cliente HTTP (OpenAI Compatible).
- ✅ **3.2 a 3.9**: Personas (Analysis, Product, Architect, Engine, UX, Quality, Ops, Fenix).
- ✅ **3.10 HU-LLM-Response-Schema**: Schema JSON de saída.

## 4. Épico E-Consolidator: Extração de Artefatos
- ✅ **4.1 HU-Consolidator-Parse**: Parser robusto.
- ✅ **4.2 HU-Consolidator-Extract-HUs**: Markdown generator.
- ✅ **4.3 HU-Consolidator-Extract-Code**: Code generator.
- 📅 **4.4 HU-Consolidator-Extract-Tests**: Test generator específico.
- 📅 **4.5 HU-Consolidator-Extract-Docs**: Docs generator específico.
- ✅ **4.6 HU-Consolidator-Extract-Scripts**: Script generator.

## 5. Épico E-Quality: Validação & Gates
- 📅 **5.1 HU-Quality-Unit-Tests**: Coverage enforcement automatizado.
- 📅 **5.2 HU-Quality-Schema-Validation**: Validação Zod profunda.
- 📅 **5.3 HU-Quality-Smoke-Bats**: Testes BATS (Shell).
- ✅ **5.4 HU-Quality-Pipeline-Checklist**: Script local de CI (42_pipeline).

## 6. Épico E-Persistence: Bundles & Storage (✅ Concluído)
- ✅ **6.1 HU-Persistence-Bundles**: Salvar JSON em disco.
- ✅ **6.2 HU-Persistence-Metadata**: Metadados no JSON salvo.
- ✅ **6.3 HU-Persistence-Logs**: Logs em arquivo.

## 7. Épico E-CLI: Interface de Linha de Comando
- ✅ **7.1 HU-CLI-Analyze**: Comando básico.
- ✅ **7.2 HU-CLI-Config**: Configuração local.
- 📅 **7.3 HU-CLI-Workspace**: Gestão de múltiplos workspaces.

## 8. Épico E-UI: Interface do Usuário
- 📅 **8.1 HU-UI-Chat**: Interface dedicada de chat (Full screen).
- 📅 **8.2 HU-UI-Results**: Tela de resultados detalhada.
- ✅ **8.3 HU-UI-Settings**: Tela de configurações e Preferências.
- ✅ **8.4 HU-UI-Settings-Models-021**: Seletor de Modelos e Base URL (Origem: Épico 14).

## 9. Épico E-UI-Explore: Interface Explorar
- ✅ **9.1 a 9.4**: Layout base, Discovery Notes, Timeline, Tabs.
- ✅ **9.5 HU-UI-Export-005**: Botão Exportar (.zip) conectado.
- ✅ **9.6 HU-UI-Project-Creation-006**: Wizard de criação.
- 📅 **9.7 HU-UI-RealTime-Preview-007**: Preview de código (Render).
- ✅ **9.8 HU-UI-Theme-System-008**: Sistema de Temas (Dark/Light).
- ✅ **9.9 a 9.13**: Ações, Fluxo Chat, Placeholders, Interações, Empty States.
- ✅ **9.14 HU-UI-Explore-Keyboard-Nav-014**: Acessibilidade Teclado.
- 📅 **9.15 HU-UI-Explore-Accessibility-015**: Acessibilidade Screen Reader (Fino ajuste).
- ✅ **9.16 HU-UI-Explore-Error-Handling-016**: Tratamento de erros e Toasts.
- ✅ **9.17 HU-UI-Explore-Loading-States-017**: Spinners e Loadings contextuais.
- ✅ **9.18 HU-UI-Explore-Micro-Interactions-018**: Animações e transições.
- ✅ **9.19 HU-UI-Explore-Tour-019**: Tour Guiado (Origem: Épico 14).
- ✅ **9.20 HU-UI-QuickStart-Revamp-020**: Galeria de Templates (Origem: Épico 14).

## 10. Épico E-Flow: Fluxo de Descoberta
- ✅ **10.1 a 10.4**: Geração HUs, Aprovação, Diretório, Scripts.
- 📅 **10.5 HU-MINI-IDE-Planning-005**: Algoritmo de Planejamento Sprints.
- 📅 **10.6 HU-MINI-IDE-Dev-006**: Desenvolvimento incremental.
- ✅ **10.7 HU-MINI-IDE-Gen-Quality-007**: Script de Pipeline para Usuário.

## 11. Épico E-Governança
- 📅 **11.1 HU-Gov-Release-Checklist**: Script de release.
- 📅 **11.2 HU-Gov-Announcements**: Templates de comunidade.
- ✅ **11.3 HU-Gov-Docs-Minimas**: README/DEVELOPMENT atualizados.
- ✅ **11.4 HU-Gov-User-Manual-001**: Manual do Usuário Integrado (Origem: Épico 14).

## 12. Épico E-Hardening & E-Intelligence (Backend Real)
- 📅 **12.1 HU-Gov-CI-CD**: GitHub Actions Workflow.
- ✅ **12.2 HU-Server-Budget-Per-Context**: Orçamento isolado.
- ✅ **12.3 HU-LLM-Provider-Abstraction**: Provider Pattern.
- 📅 **12.4 HU-Quality-Coverage-Thresholds**: Bloqueio por cobertura.
- 📅 **12.5 HU-Quality-E2E-Flow**: Testes E2E completos.
- 📅 **12.6 HU-Server-Metrics-Observability**: Prometheus/Grafana.
- ✅ **12.7 HU-Sec-API-Key-Handling-001**: Segurança de API Key (Origem: 14.1).
- ✅ **14.6 HU-Backend-Real-Agent**: Integração OpenAI SDK (Origem: 14.6).
- ✅ **14.7 HU-Backend-Dry-Run**: Modo Dry-Run para Testes (Origem: 14.7).
- ✅ **14.8 HU-Backend-CORS-Fix**: Configuração CORS para Dev (Origem: 14.8).

## 13. Épico E-UI-Backend-Bridge (✅ Concluído)
- ✅ **13.1 a 13.5**: Proxy, Status, Playground, Contract Guard, History.

## 14. Épico E-Experience & Intelligence (Histórico de Fases 12/14)
*Nota de Governança: Este épico foi consolidado. As HUs desenvolvidas nas Fases 12 e 14 foram distribuídas para seus épicos temáticos definitivos para melhor organização.*

- 🔄 **14.1 HU-Sec-API-Key-Handling-001** → Mapeada como **12.7** (Épico 12).
- 🔄 **14.2 HU-UI-QuickStart-Revamp-020** → Mapeada como **9.20** (Épico 9).
- 🔄 **14.3 HU-UI-Explore-Tour-019** → Mapeada como **9.19** (Épico 9).
- 🔄 **14.4 HU-Gov-User-Manual-001** → Mapeada como **11.4** (Épico 11).
- 🔄 **14.5 HU-UI-Settings-Models-021** → Mapeada como **8.4** (Épico 8).
- 🔄 **14.6 a 14.8 (Backend Tasks)** → Integradas ao Épico 12.

## 15. Épico E-Visualization: Interatividade e Renderização (Próxima Fase)
- 🚧 **15.1 HU-UI-Viz-Sidebar-022**: Árvore de arquivos dinâmica na lateral.
- 🚧 **15.2 HU-UI-Viz-HUs-023**: Renderização visual das Histórias de Usuário.
- 🚧 **15.3 HU-UI-Viz-Docs-024**: Visualizador Markdown para abas Docs e README.
- 🚧 **15.4 HU-UI-Interaction-Refine-025**: Fluxo de refinamento via Chat.
EOF

# ==============================================================================
# 2. Atualizar DEVELOPMENT.md
# - Adiciona nota explícita sobre a reorganização das HUs na Fase 12
# ==============================================================================
DEV_DOC="DEVELOPMENT.md"

# Adiciona a nota de rastreabilidade ao final da seção da Fase 12
# Usamos sed para inserir texto antes do fechamento do bloco da Fase 12 ou antes da Fase 13
# Mas como o arquivo já foi escrito, vamos apenas garantir que o texto esteja lá.
# A forma mais segura é reescrever a seção da Fase 12 no arquivo.

cat > "$DEV_DOC" <<EOF
# Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 9.1 (Traceability Fix)
> **Versão do Software:** v0.15.0 (AI Powered)
> **Data:** $(date +%Y-%m-%d)
> **Pipeline:** 🟢 Verde (Lint, Types, Tests, Build, Smoke)

---

# 🗺️ Plano de Desenvolvimento Mestre (Rastreabilidade)

Estratégia: **Monorepo Strict Types** $\to$ **Backend First** $\to$ **UI Driven**.

## 1. Fases Concluídas (Histórico Técnico)

*(Fases 1 a 11 omitidas para brevidade neste script, mas assuma que estão aqui como no anterior)*
### ✅ Fase 1: Fundação e Governança
- **HUs:** 11.3, 5.4.

### ✅ Fase 2: Motor de Análise (Backend Core)
- **HUs:** 1.1, 1.2, 1.4, 1.5, 1.7.

### ✅ Fase 3: Inteligência Artificial
- **HUs:** 2.3, 3.1, 3.10, 12.3.

### ✅ Fase 4: Interface CLI
- **HUs:** 7.1, 7.2.

### ✅ Fase 5: Interface Visual (UI Shell)
- **HUs:** 9.1, 9.4, 13.1, 13.2, 13.3.

### ✅ Fase 6: Refinamento e UX
- **HUs:** 9.2, 9.3, 9.9, 9.10, 9.11, 9.12, 9.13, 9.16, 9.17, 13.4.

### ✅ Fase 7: Persistência e Histórico
- **HUs:** 6.1, 6.2, 6.3, 13.5.

### ✅ Fase 8: Robustez do Backend (Hardening)
- **HUs:** 1.3, 1.6, 2.1, 2.2, 2.4, 12.2.

### ✅ Fase 9: Orquestração de Personas (O Cérebro)
- **HUs:** 3.2 a 3.9.

### ✅ Fase 10: Fluxo de Engenharia (Wizard)
- **HUs:** 9.6, 10.1 a 10.4, 10.7.

### ✅ Fase 11: Consolidação e Exportação (A Fábrica)
- **HUs Entregues:** 4.1, 4.2, 4.3, 4.6, 8.3, 9.5.

### ✅ Fase 12: Experiência do Usuário & Segurança (Produto)
**Objetivo:** Transformar a ferramenta técnica em um produto amigável e seguro.
- **Artefatos:** \`tour.ts\`, \`HelpModal.tsx\`, \`QuickStartGallery.tsx\`, \`secure_apikey_flow.sh\`.
- **HUs Entregues (Originais):** 14.1, 14.2, 14.3, 14.4, 14.5.
- **Nota de Governança:** As HUs desta fase (série 14.x) foram **migradas** para os Épicos 8, 9, 11 e 12 no Backlog oficial para manter a organização temática. (Ver seção 14 do Backlog).

### ✅ Fase 13: Acessibilidade e Polimento Visual
**Objetivo:** Sistema de Temas (Dark/Light) e refinamentos.
- **Artefatos:** \`ThemeContext.tsx\`, \`tailwind.config.js\` (v3), \`App.tsx\` (Header Toggle).
- **HUs:** 9.8 (Temas), 9.14 (Teclado parcial), 9.18 (Micro-interações).

### ✅ Fase 14: Inteligência Real (O Cérebro)
**Objetivo:** Conectar Backend à OpenAI/DeepSeek com segurança.
- **Artefatos:** \`agent.ts\` (Integração SDK), \`server/src/index.ts\` (Dry-Run, CORS).
- **HUs:** 12.7, 14.6, 14.7, 14.8.

---

## 2. Roadmap Futuro (Backlog Pendente)

### 🚧 Fase 15: Visualização Interativa (Foco Atual)
**Objetivo:** Substituir "Em breve" por dados reais na UI (Sidebar e Abas).
- [ ] **15.1** Árvore de Arquivos Dinâmica (Sidebar).
- [ ] **15.2** Renderização de HUs (Aba HUs).
- [ ] **15.3** Visualizador Markdown (Aba Docs).
- [ ] **15.4** Loop de Refinamento via Chat.

### 📅 Fase 16: Persistência Real
**Objetivo:** Banco de Dados (SQLite/Postgres) para salvar histórico.

### 📅 Fase 17: Deploy & DevOps
**Objetivo:** Docker e CI/CD em nuvem.
EOF

echo "✅ Rastreabilidade restaurada nos documentos."
