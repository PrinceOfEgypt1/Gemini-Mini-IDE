# RELATÓRIO FORENSE INTEGRAL — GEMINI-MINI-IDE

> **Classificação: DOCUMENTO HISTÓRICO**
> Este relatório é um snapshot forense do estado do projeto em 2026-03-15 (commit `e3729ce`).
> Não descreve o estado atual — consulte `README.md` e `DEVELOPMENT.md` para informações atuais.
> Para o backlog de itens de conformidade abertos, consulte `docs/governance/CRITICAL_OPEN_ITEMS.md`.

**Data:** 2026-03-15
**Branch:** `claude/comprehensive-project-audit-eVbB5`
**Commit:** `e3729ce`
**Working tree:** Limpa (sem divergência de origin/main)
**Natureza:** Auditoria investigativa — nenhuma correção aplicada

---

## 1. RESUMO EXECUTIVO

O Gemini-Mini-IDE é um monorepo TypeScript com 5 pacotes (analysis-agent, server, ui, cli, shared) que implementa uma IDE assistida por IA para geração de código. O sistema orquestra múltiplos LLMs através de um pipeline de agentes com governança de qualidade.

### Avaliação Geral

| Dimensão | Avaliação |
|----------|-----------|
| **Maturidade técnica** | FUNCIONAL MAS COM DÍVIDA RELEVANTE |
| **Maturidade documental** | DOCUMENTALMENTE MAIS MADURO DO QUE TECNICAMENTE |
| **Risco geral** | MÉDIO-ALTO |
| **Pipeline** | CONFIRMADO — lint, typecheck, build e testes passam |
| **Testes** | PARCIAL — 441 testes passam, mas cobertura desigual e exclusões críticas |
| **Arquitetura** | PARCIAL — bem desenhada, mas com código morto e violações pontuais |
| **Governança** | PARCIAL — framework sofisticado, mas dependente de configuração manual externa |

### Veredito Honesto

O projeto possui uma base arquitetural sólida com governança técnica sofisticada, mas apresenta uma **lacuna significativa entre o que a documentação promete e o que o código realmente entrega**. Existem componentes inteiros documentados como "prontos para produção" que foram removidos como código morto. O ESAA (Event Sourcing) está desabilitado por padrão. A cobertura de testes é desigual — excelente na governança do analysis-agent, mas crítica no UI (7.95%). O sistema funciona e compila, mas carrega dívida técnica relevante em áreas centrais.

---

## 2. INVENTÁRIO DO SISTEMA

### Pacotes

| Pacote | Responsabilidade | LOC Estimado | Testes | Status |
|--------|-----------------|-------------|--------|--------|
| **analysis-agent** | Motor de IA: agentes, governança, geração, ESAA, LLM clients | ~15.000 | 234 (16 files) | CONFIRMADO |
| **server** | API REST Fastify: rotas, export, orquestração | ~1.500 | 74 (3 files) | CONFIRMADO |
| **ui** | Frontend React + Vite + Tailwind | ~5.000 | 73 (14 files) | PARCIAL |
| **cli** | Interface de linha de comando | ~500 | 25 (1 file) | CONFIRMADO |
| **shared** | Tipos, validadores, impact analysis | ~1.000 | 35 (2 files) | CONFIRMADO |

**Total:** ~29.964 LOC | 441 testes passando | 36 arquivos de teste

### Pontos de Entrada

| Pacote | Entrada | Comando |
|--------|---------|---------|
| server | `packages/server/dist/server/src/index.js` | `pnpm start` (porta 3200) |
| ui | `packages/ui/src/main.tsx` | `pnpm dev` (porta 5173) |
| cli | `packages/cli/dist/index.js` | `mini-ide <command>` |
| analysis-agent | `packages/analysis-agent/dist/index.js` | Biblioteca (importada por server/cli) |
| shared | `packages/shared/dist/index.js` | Biblioteca (importada por todos) |

### Scripts Principais

| Script | Localização | Função |
|--------|-------------|--------|
| `pipeline.sh` | `scripts/active/` | Pipeline QA completo (lint, typecheck, test, build) |
| `impact-analysis.sh` | `scripts/active/` | Wrapper para análise de impacto |
| **331 scripts** | `scripts/quarantine/` | Scripts legados com padrão `cat >` perigoso — QUARENTENADOS |

### Dependências Relevantes

| Dependência | Pacote | Risco |
|-------------|--------|-------|
| `better-sqlite3` | analysis-agent | RISCO MÉDIO — módulo nativo, causa exclusões de teste |
| `openai` | analysis-agent | RISCO MÉDIO — API evolui, testes desatualizados |
| `framer-motion` | ui | RISCO BAIXO |
| `fastify` | server | RISCO BAIXO |
| `zod` | server, shared, analysis-agent | RISCO BAIXO — usado consistentemente |

---

## 3. ARQUITETURA REAL vs ARQUITETURA DECLARADA

### 3.1 Aderências Confirmadas

| Aspecto | Status | Evidência |
|---------|--------|-----------|
| Monorepo com pnpm workspaces | **CONFIRMADO** | `pnpm-workspace.yaml` e referências em todos `package.json` |
| Separação server/ui/shared/cli/analysis-agent | **CONFIRMADO** | 5 pacotes com responsabilidades distintas |
| Governança com validators genéricos | **CONFIRMADO** | `BaseProjectAuditor`, `CategoryValidator`, `CompletenessValidator`, `ContractValidator` |
| Pipeline de qualidade (lint/typecheck/build/test) | **CONFIRMADO** | Todos passam — verificado em execução real |
| Multi-model LLM support | **CONFIRMADO** | `openai-llm-client.ts` com suporte a baseUrl customizada |
| TypeScript strict mode | **CONFIRMADO** | `tsconfig.base.json` com `strict: true` |
| Zod validation em endpoints | **CONFIRMADO** | Usado em `/analyze`, `/impact-analysis`, `/export` |
| 8 personas de análise | **CONFIRMADO** | Prompts em `packages/analysis-agent/src/prompts/` |

### 3.2 Violações Confirmadas

| Violação | Severidade | Evidência |
|----------|-----------|-----------|
| **Arquivo de rotas não integrado** | RISCO ALTO | `routes/conversations.ts` (213 LOC) exporta `conversationRoutes()` mas **nunca é importado** em `index.ts`. Código morto com lógica duplicada. |
| **Singleton global ESAA** | RISCO MÉDIO | `esaa/orchestrator.ts:362-365` cria `globalESAAOrchestrator` como singleton no escopo do módulo. Viola testabilidade e injeção de dependência. |
| **Caching de orchestrator duplicado** | RISCO MÉDIO | `index.ts:35-51` e `routes/conversations.ts:24-31` implementam a mesma lógica com chaves de cache **diferentes**. |
| **ESAA desabilitado por default** | RISCO MÉDIO | `ESAA_ENABLED=false` — sistema de event sourcing inteiro é bypassed. Documentação descreve como arquitetura central, mas está desligado. |
| **`any` types no servidor** | RISCO MÉDIO | `server/src/index.ts:31-33` usa `any` para `InteractiveOrchestratorClass` e `orchestrators` Map, bypassando type safety. |
| **Backup files no repositório** | RISCO BAIXO | `agent.ts.bak_421` e `agent.ts.bak_422` — 843 LOC de código morto. |

### 3.3 Pontos Parciais

| Aspecto | Status | Detalhes |
|---------|--------|---------|
| **Frontend refatorado** | NAO CONFIRMADO | `FRONTEND_REFACTORING.md` e `IMPLEMENTATION_REPORT.md` declaram `AppRefactored.tsx` como "pronto para produção", mas o arquivo foi **removido como código morto** (CRITICAL_OPEN_ITEMS, Rodada 7). Os hooks declarados não existem mais. |
| **ESAA como arquitetura central** | PARCIAL | O código existe e é sofisticado (~2000 LOC), mas está **desabilitado por default**. Os testes estão **excluídos** do vitest. |
| **12 camadas de agentes** | NAO CONFIRMADO | `VISAO_ESTRATEGICA_TRANSFORMADORA.md` declara 12 camadas. O sistema real opera com 8 personas. Documento é aspiracional, não descritivo. |
| **NASA-standard governance** | NAO CONFIRMADO | `Relatório de Governança Padrão NASA` declara meta de 80-120 arquivos por prompt. Nenhuma evidência de que essa meta foi atingida. |
| **CI/CD completo** | PARCIAL | Workflow existe em `.github/workflows/` mas branch protection **não está aplicada** (COI-001, status PARCIAL). |

---

## 4. CÓDIGO

### 4.1 Pontos Fortes Reais

| Área | Evidência |
|------|-----------|
| **Governance validators** | `completeness-validator.ts` (31 testes), `contract-validator.ts` (17 testes), `category-validator.ts` (19 testes) — excelente qualidade |
| **Impact analysis** | `packages/shared/src/impact-analysis/` — algoritmo de classificação de risco bem testado (24 testes) |
| **User stories planner** | Lógica de clamping com invariantes matemáticas, 16 testes com edge cases |
| **Sandbox executor** | Execução segura com `execFile` (não `exec`), cleanup automático, 11 testes |
| **Zod schemas** | Validação consistente em endpoints principais |
| **TypeScript strict** | Compilação com `strict: true` em todos os pacotes — 0 erros de typecheck |

### 4.2 Pontos Frágeis

| Problema | Localização | Severidade |
|----------|-------------|-----------|
| **server/index.ts monolítico** | 601 LOC com rotas, middleware, ESAA endpoints, SSE, health check tudo junto | RISCO ALTO |
| **orchestrator-interactive.ts sem testes** | 680 LOC — lógica central do modo interativo sem nenhum teste | RISCO ALTO |
| **ESAA promotion/recovery sem testes** | `promotion-controller.ts` (568 LOC), `recovery-controller.ts` (507 LOC) | RISCO ALTO |
| **ConversationChat.tsx** | 611 LOC — componente monolítico com lógica de auth, state, UI misturados | RISCO MÉDIO |
| **54 eslint-disable em 13 arquivos** | Supressões de `no-console` predominam, mas mascaram problemas | RISCO MÉDIO |
| **5+ instâncias de `.catch(() => ({}))` silenciosas** | UI services e componentes engolem erros JSON | RISCO MÉDIO |

### 4.3 Código Morto / Duplicado / Órfão

| Item | Localização | LOC | Status |
|------|-------------|-----|--------|
| `agent.ts.bak_421` | analysis-agent/src/ | 421 | CÓDIGO MORTO |
| `agent.ts.bak_422` | analysis-agent/src/ | 422 | CÓDIGO MORTO |
| `routes/conversations.ts` | server/src/routes/ | 213 | CÓDIGO ÓRFÃO — nunca importado |
| Domain-specific prompts | analysis-agent/src/prompts/domain-specific/ | ~828 | EXPORTADOS MAS NÃO INTEGRADOS |
| `FRONTEND_REFACTORING.md` | raiz | N/A | DOCUMENTAÇÃO MORTA — descreve código que não existe mais |
| `IMPLEMENTATION_REPORT.md` | raiz | N/A | DOCUMENTAÇÃO PARCIALMENTE MORTA |

### 4.4 Arquivos que Exigem Atenção Prioritária

1. **`packages/server/src/index.ts`** (601 LOC) — God file com múltiplas responsabilidades
2. **`packages/analysis-agent/src/orchestrator-interactive.ts`** (680 LOC) — Sem testes
3. **`packages/analysis-agent/src/esaa/orchestrator.ts`** (366 LOC) — Testes excluídos
4. **`packages/ui/src/components/chat/ConversationChat.tsx`** (~611 LOC) — Monolítico

---

## 5. DOCUMENTAÇÃO E GOVERNANÇA

### 5.1 Documentos Confiáveis

| Documento | Status | Justificativa |
|-----------|--------|---------------|
| `CRITICAL_OPEN_ITEMS.md` | **CONFIRMADO** | Tracker honesto com 3 itens abertos, atualizado até Rodada 14 |
| `MASTER_COMPLIANCE_MATRIX.md` | **CONFIRMADO** | 28 itens rastreados com status realista (21 completos, 4 parciais) |
| `REMEDIATION_REPORT.md` | **CONFIRMADO** | Descreve recuperação de overfitting com evidências |
| `AI_POLICY.md` | **CONFIRMADO** | Política criada após incidente real documentado |
| `REVIEW_CHECKLIST.md` | **CONFIRMADO** | Checklist acionável e realista |
| `ADR-001` | **CONFIRMADO** | Decisão arquitetural bem documentada com trade-offs |
| `KNOWN_ISSUES.md` | **CONFIRMADO** | Lista honesta de issues conhecidas |
| `DEVELOPMENT.md` | **CONFIRMADO** | Guia de setup funcional |
| `DOSSIE-GEMINI-MINI-IDE.md` | **PARCIAL** | Visão geral útil, mas com métricas otimistas |

### 5.2 Documentos Desatualizados ou Enganosos

| Documento | Status | Problema |
|-----------|--------|---------|
| `FRONTEND_REFACTORING.md` | **NAO CONFIRMADO** | Declara "Versão 1.0.0 — Pronto para Produção" para `AppRefactored.tsx` que foi **removido como código morto**. Documento inteiro é sobre código que não existe mais. |
| `IMPLEMENTATION_REPORT.md` | **PARCIAL** | Declara "Implementação Completa" mas marca LLM Architecture como "Parcial". Componentes descritos foram parcialmente removidos. |
| `Relatório de Governança Padrão NASA...` | **NAO CONFIRMADO** | Declara meta de 80-120 arquivos por prompt sem evidência de que foi atingida. Linguagem hiperbólica ("NASA-standard") sem comprovação. |
| `VISAO_ESTRATEGICA_TRANSFORMADORA.md` | **PARCIAL** | Documento aspiracional tratado como se fosse roadmap validado. 12 camadas declaradas, 8 implementadas. |
| `GOVERNANCE_GATE_REPORT.md` | **PARCIAL** | Metrics de "47 testes" estão desatualizadas (agora são 234 só no analysis-agent). Claims corretos na época mas não refletem estado atual. |

### 5.3 Contradições Documentais Relevantes

| Claim | Documento Fonte | Contradição | Documento Contraditor |
|-------|----------------|-------------|----------------------|
| `AppRefactored.tsx` pronto para produção | FRONTEND_REFACTORING, IMPLEMENTATION_REPORT | Removido como código morto | CRITICAL_OPEN_ITEMS (Rodada 7) |
| Pipeline 100% green | DOSSIE | Pipeline falhando (lint 3 warnings) | AUDIT_PHASE0_MAP |
| ESAA como arquitetura central | ESAA_ARCHITECTURE | ESAA_ENABLED=false por default | .env.example, código |
| 95% do core funcional | DOSSIE | Recuperação extensiva necessária em 9 fases | REMEDIATION_REPORT |
| Governança NASA-standard | Relatório NASA | Nenhuma evidência de entrega 80-120 arquivos | Sem contraprova |
| 12 camadas de agentes | VISAO_ESTRATEGICA | Sistema opera com 8 personas | Código real em prompts/ |

### 5.4 Exageros Documentais

- **"NASA-standard governance"** — linguagem hiperbólica sem métrica verificável
- **"Pronto para Produção"** — aplicado a código que foi depois removido
- **"Implementação Completa"** com subitem "Parcial" no mesmo documento
- **"95% do Core Funcional"** — enquanto recovery report documenta 9 fases de saneamento

### 5.5 O Que Está Sólido na Governança

- `CRITICAL_OPEN_ITEMS.md` é honesto e atualizado
- `MASTER_COMPLIANCE_MATRIX.md` rastreia 28 itens com status realista
- `AI_POLICY.md` documenta incidente real e cria salvaguardas
- `REVIEW_CHECKLIST.md` é acionável
- O sistema de governança de código (validators) realmente funciona e está testado

---

## 6. TESTES E COBERTURA

### 6.1 Qualidade Real por Pacote

| Pacote | Arquivos | Testes | Qualidade | Nota |
|--------|----------|--------|-----------|------|
| **analysis-agent** | 16 | 234 | EXCELENTE na governança; AUSENTE em orchestrators | 3 arquivos de teste excluídos |
| **server** | 3 | 74 | BOA nos helpers; MOCKED nas rotas | Integração real não testada |
| **ui** | 14 | 73 | FRACA — muitos testes triviais | Sem threshold de coverage |
| **cli** | 1 | 25 | BOA — testa comandos reais | Cobertura de linhas 40% |
| **shared** | 2 | 35 | EXCELENTE no impact analysis | `index.test.ts` trivial (`expect(true).toBe(true)`) |

### 6.2 Cobertura Útil vs Cosmética

**Cobertura que protege de verdade:**
- `completeness-validator.test.ts` — 31 testes verificando detecção de TODO, @ts-ignore, `any`, placeholders
- `impact-analysis.test.ts` — 24/34 testes verificando classificação de risco
- `user-stories-planner.test.ts` — 16 testes com invariantes matemáticas
- `contract-validator.test.ts` — 17 testes de validação estrutural
- `esaa.test.ts` — 30+ testes de event sourcing (MAS EXCLUÍDOS)

**Cobertura cosmética (aparência de qualidade):**
- `shared/index.test.ts` — `expect(true).toBe(true)` (1 teste trivial)
- `server/index.test.ts` — 2 testes de range de porta
- `ui/contexts/ToastContext.test.tsx` — verifica se funções existem
- `ui/utils/fileTree.test.ts` — asserções mínimas
- `server/routes.test.ts` — 40 testes, mas com mock total do AnalysisAgent

### 6.3 Exclusões Relevantes

| Arquivo Excluído | Pacote | Razão | Impacto |
|-----------------|--------|-------|---------|
| `esaa.test.ts` | analysis-agent | `better-sqlite3` com mocking complexo | RISCO ALTO — coração do event sourcing sem teste no CI |
| `agent.test.ts` | analysis-agent | OpenAI client desatualizado | RISCO ALTO — orquestrador principal sem teste |
| `index.test.ts` | analysis-agent | Import chain com sqlite | RISCO MÉDIO |

### 6.4 Thresholds

| Nível | Lines | Functions | Branches | Statements | Avaliação |
|-------|-------|-----------|----------|------------|-----------|
| **Root** | 25% | 25% | 15% | 25% | MUITO BAIXO — quase qualquer código passa |
| **shared** | 80% | 50% | 80% | 80% | ADEQUADO |
| **server** | 40% | 30% | 55% | 40% | FRACO em functions |
| **cli** | 40% | 80% | 80% | 40% | BOM em functions, fraco em lines |
| **ui** | SEM CONFIG | — | — | — | CRÍTICO — sem enforcement |
| **analysis-agent** | Padrão root | — | — | — | INSUFICIENTE para pacote crítico |

### 6.5 Maiores Lacunas

1. **UI sem threshold de coverage** — pode ter 0% sem falha no CI
2. **`orchestrator-interactive.ts` (680 LOC)** — sem nenhum teste
3. **`promotion-controller.ts` (568 LOC)** — sem teste
4. **`recovery-controller.ts` (507 LOC)** — sem teste
5. **Rotas do server testadas apenas com mocks totais** — integração real nunca testada
6. **Root threshold de 15% em branches** — praticamente não verifica nada

---

## 7. PIPELINE, BUILD E RUNTIME

### 7.1 Resultado da Execução Real (2026-03-15)

| Etapa | Status | Detalhes |
|-------|--------|---------|
| **pnpm install** | CONFIRMADO | Lockfile atualizado, sem erros |
| **typecheck** | CONFIRMADO | 5/5 pacotes passam — 0 erros TypeScript |
| **lint** | CONFIRMADO | 5/5 pacotes passam — 0 warnings |
| **build** | CONFIRMADO | 5/5 pacotes compilam (UI: Vite 6.29s, demais: tsc) |
| **test** | CONFIRMADO | 441/441 testes passam (analysis-agent: 234, server: 74, ui: 73, shared: 35, cli: 25) |

### 7.2 O Que Está Sólido

- Pipeline completo funciona end-to-end
- TypeScript strict mode sem erros
- ESLint com max-warnings 0 no UI
- Build produz artifacts utilizáveis
- Testes executam de forma consistente

### 7.3 O Que Está Frágil

| Fragilidade | Detalhes |
|-------------|---------|
| **Sem pre-commit hooks** | Nenhum Husky ou lint-staged configurado — qualidade depende apenas do CI |
| **CI sem branch protection** | Workflow existe mas não é obrigatório (COI-001) |
| **Dependência de módulo nativo** | `better-sqlite3` causa problemas em testes e pode falhar em ambientes diferentes |
| **331 scripts quarentenados** | Não executados, mas presentes no repositório — peso e risco de execução acidental |
| **SSE endpoint sem progresso real** | `/generation/progress/:sessionId` envia apenas heartbeats, não progresso real |
| **Sem smoke test de runtime** | Nenhum teste verifica se o servidor realmente inicia e responde |

### 7.4 Dependência de Ambiente

| Dependência | Impacto |
|-------------|---------|
| `better-sqlite3` requer compilação nativa | Pode falhar em CI sem build tools |
| `ESAA_ENABLED` env var | Feature inteira desligada por default |
| `OPENAI_API_KEY` necessária | Sem fallback para modo offline/demo |
| Node.js 20+ obrigatório | Compatibilidade limitada |
| pnpm 9.12.2 obrigatório | Versão específica |

---

## 8. MATRIZ FORENSE DE RISCOS

### RISCO ALTO

| ID | Título | Probabilidade | Impacto | Evidência | Arquivo/Pacote | Prioridade |
|----|--------|--------------|---------|-----------|----------------|-----------|
| R01 | **orchestrator-interactive.ts sem testes** | ALTA | ALTO | 680 LOC de lógica central de conversação sem nenhum teste | analysis-agent/src/orchestrator-interactive.ts | P0 |
| R02 | **UI sem threshold de coverage** | ALTA | ALTO | Nenhuma configuração de coverage no vitest.config.ts do UI | packages/ui/vitest.config.ts | P0 |
| R03 | **ESAA testes excluídos** | ALTA | ALTO | 30+ testes excluídos via vitest.config.ts, coração do event sourcing sem CI | analysis-agent/vitest.config.ts | P1 |
| R04 | **server/index.ts monolítico** | MÉDIA | ALTO | 601 LOC com rotas, middleware, ESAA, SSE tudo misturado | server/src/index.ts | P1 |
| R05 | **Branch protection não aplicada** | ALTA | ALTO | CI/CD workflow existe mas merge para main não é bloqueado | .github/workflows/ + GitHub settings | P1 |
| R06 | **Routes/conversations.ts código órfão** | MÉDIA | MÉDIO | 213 LOC com lógica duplicada nunca importados — risco de confusão | server/src/routes/conversations.ts | P1 |

### RISCO MÉDIO

| ID | Título | Probabilidade | Impacto | Evidência | Arquivo/Pacote | Prioridade |
|----|--------|--------------|---------|-----------|----------------|-----------|
| R07 | **Root coverage threshold 25%/15%** | ALTA | MÉDIO | Threshold tão baixo que quase qualquer código passa | vitest.config.ts | P2 |
| R08 | **Documentação morta no repositório** | MÉDIA | MÉDIO | FRONTEND_REFACTORING.md descreve código que não existe mais | raiz | P2 |
| R09 | **`any` types no servidor** | MÉDIA | MÉDIO | `InteractiveOrchestratorClass: any` e `Map<string, any>` | server/src/index.ts:31-33 | P2 |
| R10 | **54 eslint-disable supressões** | MÉDIA | MÉDIO | 13 arquivos com supressões, predominantemente no-console | Múltiplos | P2 |
| R11 | **Backup files no VCS** | BAIXA | MÉDIO | agent.ts.bak_421 e bak_422 — 843 LOC mortos | analysis-agent/src/ | P2 |
| R12 | **Singleton global ESAA** | MÉDIA | MÉDIO | globalESAAOrchestrator criado em escopo de módulo | esaa/orchestrator.ts:362-365 | P2 |
| R13 | **Silent error catching no UI** | MÉDIA | MÉDIO | `.catch(() => ({}))` em 5+ locais | ui/src/services/, components/ | P3 |
| R14 | **ESAA endpoints sem validação Zod** | MÉDIA | MÉDIO | Type assertion ao invés de schema validation | server/src/index.ts:207-213 | P3 |
| R15 | **Sem pre-commit hooks** | ALTA | MÉDIO | Qualidade depende exclusivamente do CI | .git/hooks/ (apenas samples) | P3 |

### RISCO BAIXO

| ID | Título | Probabilidade | Impacto | Evidência | Arquivo/Pacote | Prioridade |
|----|--------|--------------|---------|-----------|----------------|-----------|
| R16 | **331 scripts quarentenados** | BAIXA | BAIXO | Pesados mas inativos | scripts/quarantine/ | P4 |
| R17 | **Domain-specific prompts não integrados** | BAIXA | BAIXO | ~828 LOC exportados mas não usados | analysis-agent/src/prompts/domain-specific/ | P4 |
| R18 | **Baseline-browser-mapping warning** | BAIXA | BAIXO | Warning no build do Vite | packages/ui build | P4 |
| R19 | **URL hardcoded no UI** | BAIXA | BAIXO | `http://localhost:3200` duplicado em 2 locais | ui/src/services/api.ts, ConversationChat.tsx | P4 |

---

## 9. CONTRADIÇÕES ENCONTRADAS

### Código vs Documentação

| # | Contradição | Severidade |
|---|-------------|-----------|
| C1 | `FRONTEND_REFACTORING.md` declara `AppRefactored.tsx` "Pronto para Produção" — código foi removido | RISCO ALTO |
| C2 | `IMPLEMENTATION_REPORT.md` declara "Implementação Completa" com subitem "Parcial" | RISCO MÉDIO |
| C3 | `DOSSIE` declara "100% Green Pipeline" — era falso na época (lint warnings) | RISCO MÉDIO |
| C4 | `DOSSIE` declara "95% do core funcional" — REMEDIATION_REPORT mostra 9 fases de recovery | RISCO MÉDIO |

### Documentação vs Governança

| # | Contradição | Severidade |
|---|-------------|-----------|
| C5 | Relatório NASA declara meta 80-120 arquivos — nenhuma evidência de atingimento | RISCO MÉDIO |
| C6 | `VISAO_ESTRATEGICA` declara 12 camadas — sistema opera com 8 | RISCO BAIXO (é aspiracional) |
| C7 | `GOVERNANCE_GATE_REPORT` cita 47 testes — agora são 234+ | RISCO BAIXO (desatualizado) |

### Arquitetura vs Implementação

| # | Contradição | Severidade |
|---|-------------|-----------|
| C8 | ESAA declarado como arquitetura central — desabilitado por default | RISCO ALTO |
| C9 | `routes/conversations.ts` exporta rotas — nunca integrado no servidor | RISCO MÉDIO |
| C10 | Orchestrator caching com chaves diferentes em 2 implementações | RISCO MÉDIO |

### Testes vs Realidade

| # | Contradição | Severidade |
|---|-------------|-----------|
| C11 | 441 testes "passam" — 30+ testes do ESAA estão excluídos da contagem | RISCO ALTO |
| C12 | Server routes "testadas" — 100% mockado, nenhuma integração real | RISCO MÉDIO |
| C13 | `shared/index.test.ts` — `expect(true).toBe(true)` conta como teste | RISCO BAIXO |

---

## 10. PRIORIDADES RECOMENDADAS

### Prioridade 0 — Bloqueantes para Evolução Segura

1. **Adicionar testes para `orchestrator-interactive.ts`** — 680 LOC de lógica central sem nenhuma proteção
2. **Adicionar threshold de coverage no UI** — Atualmente pode ter 0% sem falha no CI
3. **Aplicar branch protection no GitHub** — CI não bloqueia merge (dependência externa)

### Prioridade 1 — Dívida Técnica Crítica

4. **Resolver exclusão dos testes ESAA** — Coração do event sourcing sem validação no CI
5. **Refatorar `server/index.ts`** — Extrair rotas, middleware, ESAA em módulos separados
6. **Remover `routes/conversations.ts`** — Código órfão com lógica duplicada
7. **Remover backup files** — `agent.ts.bak_421` e `agent.ts.bak_422`

### Prioridade 2 — Saneamento Documental

8. **Remover ou atualizar `FRONTEND_REFACTORING.md`** — Descreve código inexistente
9. **Atualizar `IMPLEMENTATION_REPORT.md`** — Refletir estado real
10. **Elevar root coverage thresholds** — De 25%/15% para pelo menos 50%/30%
11. **Corrigir `any` types no servidor**
12. **Remover ou integrar domain-specific prompts**

### Prioridade 3 — Robustez Operacional

13. **Adicionar pre-commit hooks** (Husky + lint-staged)
14. **Adicionar validação Zod nos endpoints ESAA**
15. **Substituir `.catch(() => ({}))` silenciosos**
16. **Implementar smoke test de runtime** — Verificar que servidor inicia e responde
17. **Substituir console.log por logger estruturado** no analysis-agent

### Prioridade 4 — Limpeza

18. **Avaliar remoção dos 331 scripts quarentenados**
19. **Consolidar URLs hardcoded no UI**
20. **Atualizar baseline-browser-mapping**

---

## 11. VEREDITO FINAL

O projeto **Gemini-Mini-IDE** é classificado como:

### **DOCUMENTALMENTE MAIS MADURO DO QUE TECNICAMENTE**

A documentação é extensa, sofisticada e demonstra visão clara de governança. Porém, existe um gap relevante entre o que está documentado e o que está implementado/ativo. Documentos declaram "pronto para produção" para código que foi removido. O ESAA é documentado como arquitetura central mas está desabilitado. A VISÃO ESTRATÉGICA descreve 12 camadas que não existem.

### **FUNCIONAL MAS COM DÍVIDA RELEVANTE**

O sistema funciona: compila, passa lint, typecheck e 441 testes. A arquitetura base é sólida e a governança de código (validators) é genuinamente bem implementada e testada. Porém, existem lacunas críticas: orchestrator interativo sem testes, UI sem coverage enforcement, ESAA testes excluídos, server monolítico, código órfão.

### Não está pronto para evolução segura sem saneamento prévio.

A sequência mais inteligente é:
1. **Primeiro**: resolver os testes e coverage (P0) — sem isso, qualquer mudança é arriscada
2. **Segundo**: limpar código morto e duplicado (P1) — reduzir superfície de confusão
3. **Terceiro**: sanear documentação (P2) — alinhar narrativa com realidade
4. **Quarto**: robustez operacional (P3) — hooks, validação, logging
5. **Por último**: limpeza geral (P4) — scripts quarentenados, warnings menores

**Seria erro estratégico** adicionar features novas (como as 12 camadas da VISÃO ESTRATÉGICA) antes de resolver P0 e P1. A base precisa ser saneada antes de crescer.

---

*Auditoria concluída em 2026-03-15. Nenhuma correção foi aplicada. Este relatório é puramente investigativo e evidenciado.*
