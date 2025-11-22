# Backlog de Histórias de Usuário — Mini-IDE

**Status Geral:** 79 HUs Totais.

## Legenda
- ✅ **Concluído**: Implementado e testado.
- 🚧 **Em Andamento**: Em desenvolvimento na fase atual.
- 📅 **Pendente**: Planejado para fases futuras.

---

## 1. Épico E-Server: API & Observabilidade
- ✅ **1.1 HU-Server-Analyze-200**: Endpoint POST /analyze (Happy Path).
- ✅ **1.2 HU-Server-Analyze-400**: Validações 4xx.
- 📅 **1.3 HU-Server-Analyze-500**: Tratamento 5xx e fallback.
- ✅ **1.4 HU-Server-Healthz**: Endpoint GET /healthz.
- ✅ **1.5 HU-Server-Logging-JSON**: Logs estruturados.
- 📅 **1.6 HU-Server-OpenAPI**: Documentação Swagger.
- ✅ **1.7 HU-Server-Analyze-Shape-Contract**: Contrato TypeScript compartilhado.

## 2. Épico E-Analysis: Gateway Único
- 📅 **2.1 HU-Analysis-CompactPrompt**: Otimização de prompt.
- 📅 **2.2 HU-Analysis-Budget-Check**: Controle de custos.
- ✅ **2.3 HU-Analysis-Context**: Estrutura de prompt no Agente.
- 📅 **2.4 HU-Analysis-RunId**: Rastreabilidade ponta a ponta.

## 3. Épico E-LLM: Orquestração 8 Personas
- ✅ **3.1 HU-LLM-Client-DeepSeek**: Cliente HTTP (com Mock fallback).
- 📅 **3.2 HU-LLM-Persona-Analysis**: Persona Analista.
- 📅 **3.3 HU-LLM-Persona-Product**: Persona Produto.
- 📅 **3.4 HU-LLM-Persona-Architect**: Persona Arquiteto.
- 📅 **3.5 HU-LLM-Persona-Engine**: Persona Engenheiro.
- 📅 **3.6 HU-LLM-Persona-UX**: Persona UX.
- 📅 **3.7 HU-LLM-Persona-Quality**: Persona QA.
- 📅 **3.8 HU-LLM-Persona-Ops**: Persona DevOps.
- 📅 **3.9 HU-LLM-Persona-Fenix**: Consolidador.
- ✅ **3.10 HU-LLM-Response-Schema**: Schema JSON de saída.

## 4. Épico E-Consolidator: Extração de Artefatos
- 📅 **4.1 HU-Consolidator-Parse**: Parser robusto.
- 📅 **4.2 HU-Consolidator-Extract-HUs**: Markdown generator.
- 📅 **4.3 HU-Consolidator-Extract-Code**: Code generator.
- 📅 **4.4 HU-Consolidator-Extract-Tests**: Test generator.
- 📅 **4.5 HU-Consolidator-Extract-Docs**: Docs generator.
- 📅 **4.6 HU-Consolidator-Extract-Scripts**: Script generator.

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
- ✅ **7.2 HU-CLI-Config**: Configuração local (básica implementada).
- 📅 **7.3 HU-CLI-Workspace**: Gestão de múltiplos workspaces.

## 8. Épico E-UI: Interface do Usuário
- 📅 **8.1 HU-UI-Chat**: Interface dedicada de chat.
- 📅 **8.2 HU-UI-Results**: Tela de resultados detalhada.
- 📅 **8.3 HU-UI-Settings**: Tela de configurações.

## 9. Épico E-UI-Explore: Interface Explorar
- ✅ **9.1 HU-UI-Explore-Mode-001**: Layout base.
- ✅ **9.2 HU-UI-Discovery-Notes-002**: Painel lateral (Estrutura).
- ✅ **9.3 HU-UI-Timeline-003**: Componente Timeline.
- ✅ **9.4 HU-UI-Tabs-004**: Sistema de Abas.
- 📅 **9.5 HU-UI-Export-005**: Botão Exportar.
- 📅 **9.6 HU-UI-Project-Creation-006**: Wizard de criação.
- 📅 **9.7 HU-UI-RealTime-Preview-007**: Preview de código.
- 📅 **9.8 HU-UI-Theme-System-008**: Temas.
- ✅ **9.9 HU-UI-Explore-Primary-Actions-009**: Botões Header.
- ✅ **9.10 HU-UI-Explore-Chat-Flow-010**: Fluxo Chat->Timeline.
- ✅ **9.11 HU-UI-Explore-Tabs-Minimum-Content-011**: Placeholders.
- ✅ **9.12 HU-UI-Explore-Interactions-012**: Feedback Visual.
- ✅ **9.13 HU-UI-Explore-Empty-States-013**: Estados vazios.
- 📅 **9.14 HU-UI-Explore-Keyboard-Nav-014**: Acessibilidade Teclado.
- 📅 **9.15 HU-UI-Explore-Accessibility-015**: Acessibilidade Screen Reader.
- ✅ **9.16 HU-UI-Explore-Error-Handling-016**: Toasts de erro.
- ✅ **9.17 HU-UI-Explore-Loading-States-017**: Spinners.
- 📅 **9.18 HU-UI-Explore-Micro-Interactions-018**: Animações finas.

## 10. Épico E-Flow: Fluxo de Descoberta
- 📅 **10.1 HU-MINI-IDE-Discovery-001**: Geração de HUs.
- 📅 **10.2 HU-MINI-IDE-Discovery-002**: Aprovação de HUs.
- 📅 **10.3 HU-MINI-IDE-Env-003**: Solicitação de diretório.
- 📅 **10.4 HU-MINI-IDE-Env-004**: Scripts de ambiente.
- 📅 **10.5 HU-MINI-IDE-Planning-005**: Planejamento.
- 📅 **10.6 HU-MINI-IDE-Dev-006**: Desenvolvimento.
- 📅 **10.7 HU-MINI-IDE-Gen-Quality-007**: Script de Pipeline para Usuário.

## 11. Épico E-Governança
- 📅 **11.1 HU-Gov-Release-Checklist**: Script de release.
- 📅 **11.2 HU-Gov-Announcements**: Templates.
- ✅ **11.3 HU-Gov-Docs-Minimas**: README/DEVELOPMENT.

## 12. Épico E-Hardening
- 📅 **12.1 HU-Gov-CI-CD**: GitHub Actions.
- 📅 **12.2 HU-Server-Budget-Per-Context**: Orçamento isolado.
- ✅ **12.3 HU-LLM-Provider-Abstraction**: Provider Pattern.
- 📅 **12.4 HU-Quality-Coverage-Thresholds**: Limites de cobertura.
- 📅 **12.5 HU-Quality-E2E-Flow**: Testes E2E.
- 📅 **12.6 HU-Server-Metrics-Observability**: Prometheus.

## 13. Épico E-UI-Backend-Bridge
- ✅ **13.1 HU-UI-Server-BaseURL-Config**: Proxy.
- ✅ **13.2 HU-UI-Healthz-Status-Indicator**: Indicador Visual.
- ✅ **13.3 HU-UI-Analyze-Playground**: Chat integrado.
- ✅ **13.4 HU-UI-Analyze-Contract-Guard**: Validação TS.
- ✅ **13.5 HU-UI-Analyze-Result-History**: Painel Histórico.
