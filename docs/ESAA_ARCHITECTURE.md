# ESAA Hardened v2 — Arquitetura

> **Classificação: FEATURE EXPERIMENTAL / CONTIDA (P27)**
> O ESAA existe no código (`packages/analysis-agent/src/esaa/`) mas está **desabilitado por padrão** (`ESAA_ENABLED=false`) **e** suas rotas HTTP **não são registradas** quando o flag está desabilitado (P27).
> Este documento descreve a arquitetura planejada, não o comportamento atual em produção.
> Não há trilha de promoção planejada para tornar o ESAA parte estável do produto.
> Para experimentar localmente: defina `ESAA_ENABLED=true` como variável de ambiente.

**Event-Sourced Agent Architecture** com orquestração determinística, promoção protegida por gates e capacidade de recovery.

---

## 0. Política de Contenção (P27)

O ESAA é **oficialmente classificado como experimental e contido**. Esta seção é a fronteira contratual canônica entre o que o ESAA é e o que ele não é.

### O que o ESAA é

- Um experimento arquitetural completo de event sourcing + intention gateway + promotion gates + recovery, vivo em `packages/analysis-agent/src/esaa/` (~2 000 LOC).
- Um conjunto de invariantes (INV-001 a INV-006) e gates de promoção (SYNTAX, COMPLETENESS, STRUCTURE, INTEGRITY, MANIFEST) implementados e exercitados por uma suíte de testes unitários (`esaa.test.ts`, 38 it()) que cobre EventStore, projeções, gateway, policy, invariantes, promoção e recovery.
- Um modo opt-in (`ESAA_ENABLED=true`) para experimentação local.

### O que o ESAA NÃO é

- **Não é parte da superfície estável do produto.** Nenhuma das 12 rotas HTTP `/esaa/*` é registrada com a default config; qualquer chamada retorna `404`. A prova executável está em `packages/server/src/routes/esaa.containment.test.ts`.
- **Não é consumido por nenhum fluxo de produção.** `AnalysisAgent`, `TransformativeOrchestrator`, `InteractiveOrchestrator`, a UI e o CLI **não importam** ESAA. `runPipeline()` nunca é invocado por código de produção.
- **Não tem trilha de promoção.** Não há cronograma, plano ou backlog para tornar o ESAA estável. A entrada "ESAA habilitado por padrão" foi removida do `Future Roadmap` em P27.
- **Não tem cliente.** Os 18 contratos HTTP em `packages/shared/src/esaa/contracts.ts` permanecem em disco como referência congelada, mas a partir do **P27.1 não compõem a superfície pública** de `@gemini-mini-ide/shared` — o barrel `packages/shared/src/index.ts` não os re-exporta. Nenhum cliente externo (UI, CLI, SDK) os consome.
- **Não compõe a superfície pública de `@gemini-mini-ide/analysis-agent`** (P27.1). Antes do P27.1 o barrel `packages/analysis-agent/src/index.ts` continha `export * from "./esaa/index.js"`, expondo todas as primitivas internas do ESAA (EventStore, IntentionGateway, WorkspaceExecutor, PromotionController, RecoveryController, ProjectionEngine, PolicyEngine, InvariantEngine, etc.) como API estável. P27.1 reduziu essa re-exportação ao mínimo absoluto exigido pelo único consumidor real, o pacote `server`: três símbolos (`getGlobalESAAOrchestrator` valor, e os tipos `ESAAOrchestrator` e `ESAAEventType`).

### Garantias de contenção (verificáveis)

| Garantia | Onde está enforçada | Como provar |
|---|---|---|
| Pipeline bypassed por padrão | `analysis-agent/src/esaa/orchestrator.ts` (`runPipeline` early return) | `esaa.test.ts` cobre `runPipeline`; `runPipeline` retorna `{ skipped: true }` quando `enabled === false` |
| Rotas HTTP não registradas por padrão | `server/src/index.ts` (`isESAAEnabled()` gate em `buildApp`) | `routes/esaa.containment.test.ts` boota `buildApp` sem `ESAA_ENABLED` e exige 404 em todas as 12 rotas |
| `isESAAEnabled()` é estrito | `server/src/index.ts` | `routes/esaa.containment.test.ts` rejeita `"TRUE"`, `"1"`, `"yes"`, etc. — apenas o literal `"true"` ativa |
| Superfície pública do `shared` sem ESAA (P27.1) | `packages/shared/src/index.ts` (sem `export * from './esaa/...'`) | `packages/shared/src/esaa-surface.test.ts` importa o barrel público e exige zero símbolos com prefixo `ESAA` |
| Superfície pública do `analysis-agent` reduzida ao mínimo (P27.1) | `packages/analysis-agent/src/index.ts` (3 re-exports explícitos em vez de wildcard) | `packages/analysis-agent/src/esaa-public-surface.test.ts` exige `getGlobalESAAOrchestrator` presente e nega EventStore/IntentionGateway/WorkspaceExecutor/PromotionController/RecoveryController/ProjectionEngine/PolicyEngine/InvariantEngine |
| Documentação alinhada ao código | README, DEVELOPMENT, este doc, .env.example | `scripts/active/doc-drift-check.sh` exige marcador `experimental` neste arquivo |

### Como ativar (estritamente local)

```bash
ESAA_ENABLED=true pnpm --filter @gemini-mini-ide/server start
```

Quando ativado, todas as 12 rotas `/esaa/*` documentadas em § 5 ficam disponíveis e o orchestrator executa o pipeline ESAA real. Esse modo é destinado **exclusivamente** a experimentação local e auditoria; não deve ser ativado em ambientes de produção, staging ou CI sem uma decisão arquitetural explícita que reverta a classificação de contenção.

### Como reverter a contenção (se um futuro ciclo decidir promover)

Promover o ESAA a feature estável exige, no mínimo:

1. um cliente real (UI, CLI, ou SDK) consumindo as rotas;
2. testes de integração ponta-a-ponta cobrindo o pipeline real (não apenas unit tests do core);
3. contrato HTTP estabilizado e versionado em `packages/shared/src/esaa/contracts.ts`;
4. auditoria de performance do EventStore SQLite sob carga;
5. atualização coordenada de README, DEVELOPMENT, este doc e da matriz de saneamento;
6. remoção do gate `isESAAEnabled()` em `server/src/index.ts` (ou conversão dele em uma kill-switch defensiva).

Até que esses seis pontos sejam atendidos por um ciclo dedicado, qualquer mudança que registre rotas `/esaa/*` na superfície padrão é uma regressão de governança e deve ser revertida.

---

## 1. Visão Geral

O ESAA Hardened v2 é a camada de orquestração do Gemini Mini IDE que garante que todo código gerado por agentes de IA passe por um processo auditável, reversível e seguro antes de ser persistido.

### Princípios Fundamentais

| Princípio | Descrição |
|-----------|-----------|
| **Event Sourcing** | O log de eventos é a fonte de verdade. Estado é derivado por replay. |
| **Intention-First** | Agentes propõem intenções, não executam diretamente. O sistema decide. |
| **Atomic Promotion** | Código gerado só é escrito após passar por todos os gates de qualidade. |
| **Recovery-First** | Toda operação pode ser desfeita. Snapshots habilitam rollback rápido. |
| **Auditability** | Toda decisão é rastreável por correlationId + causationId. |

---

## 2. Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESAAOrchestrator (Facade)                     │
└──────────┬──────────┬──────────┬──────────┬──────────┬──────────┘
           │          │          │          │          │
    ┌──────▼──┐  ┌────▼─────┐  ┌▼────────┐  ┌────────▼┐  ┌──────▼──────┐
    │Intention│  │  Policy  │  │Workspace│  │Promotion│  │  Recovery   │
    │ Gateway │  │  Engine  │  │Executor │  │Controller│  │ Controller  │
    └──────┬──┘  └────┬─────┘  └────┬────┘  └─────────┘  └─────────────┘
           │          │              │
    ┌──────▼──────────▼──────────────▼──────────────────────────────┐
    │                      Event Store (SQLite)                      │
    └───────────────────────────┬───────────────────────────────────┘
                                │
    ┌───────────────────────────▼───────────────────────────────────┐
    │                   Projection Engine                            │
    │          ┌───────────────┐    ┌───────────────┐              │
    │          │  Operational  │    │     Audit     │              │
    │          │  Projection   │    │  Projection   │              │
    │          └───────────────┘    └───────────────┘              │
    └───────────────────────────────────────────────────────────────┘
```

### 2.1 Event Store

**Arquivo:** `src/esaa/store/event-store.ts`

Banco de dados SQLite (via `node:sqlite` built-in) com as seguintes tabelas:

| Tabela | Propósito |
|--------|-----------|
| `events` | Log append-only de todos os eventos |
| `event_streams` | Controle de versão por stream (optimistic concurrency) |
| `snapshots` | Point-in-time snapshots para recovery rápido |
| `projections` | Estado atual das projeções (rebuilt via replay) |
| `promotion_batches` | Histórico de promoções com resultados de gates |
| `agent_registry` | Registro e status de agentes |

**Configuração:**
```bash
ESAA_DB_PATH=/path/to/events.db  # Padrão: .esaa-events.db
```

### 2.2 Projeções

**Dual projection system:**

**Operacional** (`src/esaa/projections/operational-projection.ts`)
- Estado ao vivo: agentes, intenções ativas, workspaces, promoções
- Hash SHA-256 usado pelo Concurrency Guard
- Reconstruída por replay incremental desde o último snapshot

**Auditoria** (`src/esaa/projections/audit-projection.ts`)
- Histórico imutável de todas as intenções e promoções
- Índice por correlationId para reconstrução de fluxos completos
- Nunca apaga entradas

### 2.3 Intention Gateway

**Arquivo:** `src/esaa/gateway/intention-gateway.ts`

Ponto único de entrada para todas as intenções.

**Fluxo:**
```
propose()
  → capturar hash atual da projeção
  → [opcional] verificar concurrência (baseProjectionHash)
  → classificar risco (PolicyEngine)
  → emitir INTENTION_PROPOSED
  → avaliar política
  → verificar invariantes
  → emitir INTENTION_APPROVED | INTENTION_REJECTED
```

### 2.4 Policy Engine

**Arquivo:** `src/esaa/policy/policy-engine.ts`

Avalia permissões e classifica risco:

| Tipo de Intenção | Risco Base |
|-----------------|------------|
| GENERATE_ANALYSIS | LOW |
| GENERATE_PRODUCT | LOW |
| GENERATE_ARCHITECTURE | MEDIUM |
| GENERATE_USER_STORIES | LOW |
| GENERATE_FILE | MEDIUM |
| AUDIT_MANIFEST | LOW |
| FULL_PIPELINE | HIGH |

**Escalação de risco:**
- Agente com 3+ falhas consecutivas → escalado um nível
- FULL_PIPELINE com >100 arquivos → CRITICAL

### 2.5 Invariant Engine

**Arquivo:** `src/esaa/policy/invariant-engine.ts`

Invariantes absolutas (não configuráveis):

| ID | Regra |
|----|-------|
| INV-001 | Agente não pode quarentenar a si mesmo |
| INV-002 | Não pode gerar o mesmo arquivo duas vezes simultaneamente |
| INV-003 | Intenção expirada não pode ser executada |
| INV-004 | Máximo de 5 workspaces ativos simultaneamente |
| INV-005 | Agente quarentenado não pode executar arquivos ou pipeline |
| INV-006 | Não pode haver dois lotes de promoção ativos para a mesma intenção |

### 2.6 Workspace Executor

**Arquivo:** `src/esaa/workspace/workspace-executor.ts`

Executa operações em diretório temporário isolado:
- Criado em `os.tmpdir()/esaa-workspace-{uuid}/`
- Arquivos escritos são mantidos em memória + disco
- Promoção atômica: todos os arquivos ou nenhum
- Auto-limpeza de workspaces expirados (>30min)

### 2.7 Promotion Controller

**Arquivo:** `src/esaa/promotion/promotion-controller.ts`

5 gates de qualidade em sequência:

| Gate | O que verifica |
|------|----------------|
| SYNTAX_VALIDATION | TypeScript sintaticamente válido |
| COMPLETENESS_VALIDATION | Sem TODO, `any`, stubs, exports ausentes |
| STRUCTURE_AUDIT | Arquivos essenciais presentes, exports válidos |
| INTEGRITY_CHECK | Sem duplicatas, sem arquivos vazios |
| MANIFEST_VALIDATION | Requisitos do prompt atendidos |

**Apenas se todos os gates passarem** os arquivos são copiados para o destino permanente.

### 2.8 Recovery Controller

**Arquivo:** `src/esaa/recovery/recovery-controller.ts`

Operações de recovery disponíveis:

| Operação | Descrição |
|----------|-----------|
| `createSnapshots()` | Snapshot de ambas as projeções |
| `rollbackToSnapshot(id)` | Restaura projeção para estado anterior |
| `rollbackLastPromotion(corrId)` | Remove arquivos da última promoção |
| `fullReplay()` | Reconstrói projeções do zero |
| `replayFromVersion(v)` | Replay incremental desde versão N |
| `quarantineAgent(id)` | Isola agente problemático |
| `reinstateAgent(id)` | Reintegra agente quarentenado |
| `checkAutoQuarantine(id)` | Quarentena automática após 5 falhas |

---

## 3. Rastreabilidade de Eventos

Cada evento carrega:

```typescript
{
  eventId: string       // UUID único do evento
  streamId: string      // Agrupa eventos de um aggregate
  correlationId: string // Rastreia um fluxo ponta-a-ponta
  causationId: string   // ID do evento que causou este
  version: number       // Sequência monotônica no stream
}
```

**Exemplo de fluxo completo:**

```
correlationId: "abc-123"

1. INTENTION_PROPOSED   (causationId: null)
2. INTENTION_APPROVED   (causationId: evt-1)
3. WORKSPACE_CREATED    (causationId: evt-2)
4. EXECUTION_STARTED    (causationId: evt-3)
5. EXECUTION_SUCCEEDED  (causationId: evt-4)
6. PROMOTION_REQUESTED  (causationId: evt-5)
7. PROMOTION_GATE_PASSED x4 (causationId: evt-6)
8. PROMOTION_APPROVED   (causationId: evt-6)
9. WORKSPACE_DESTROYED  (causationId: evt-8)
```

---

## 4. Concurrency Guard

Antes de executar uma intenção, o sistema verifica se a projeção mudou:

1. Agente calcula `baseProjectionHash` ao propor
2. Gateway compara com `currentProjectionHash`
3. Se diferir → emite `CONCURRENCY_CONFLICT` → rejeita intenção
4. Agente deve re-propor com o hash atualizado

---

## 5. API HTTP

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/esaa/health` | Status do sistema |
| GET | `/esaa/events` | Consulta eventos |
| GET | `/esaa/projections/operational` | Projeção operacional |
| GET | `/esaa/projections/audit/:correlationId` | Audit trail |
| GET | `/esaa/agents` | Lista agentes |
| POST | `/esaa/agents/:id/quarantine` | Quarentenar agente |
| POST | `/esaa/agents/:id/reinstate` | Reintegrar agente |
| GET | `/esaa/promotions/:batchId` | Status de promoção |
| POST | `/esaa/promotions/:batchId/rollback` | Reverter promoção |
| POST | `/esaa/recovery/snapshot` | Criar snapshots |
| POST | `/esaa/recovery/rollback` | Rollback |
| POST | `/esaa/recovery/replay` | Replay de eventos |

---

## 6. Configuração

```bash
# Habilitar ESAA (padrão: desabilitado para backward compat)
ESAA_ENABLED=true

# Caminho do banco de dados SQLite
ESAA_DB_PATH=/path/to/esaa-events.db
```

---

## 7. Diagrama de Fluxo: FULL_PIPELINE

```
AnalysisAgent.analyze(userPrompt)
      │
      ▼
ESAAOrchestrator.runPipeline()
      │
      ▼
IntentionGateway.propose("FULL_PIPELINE", { userPrompt })
      │
      ├── PolicyEngine.evaluate() ─→ REJECTED? → throw Error
      ├── InvariantEngine.check() ─→ VIOLATED? → REJECTED
      │
      ▼ APPROVED
WorkspaceExecutor.create()
      │
      ▼
execute(workspace) ─→ pipeline 5 etapas (Analysis→Product→Architecture→Stories→CodeGen)
      │
      ▼ EXECUTION_SUCCEEDED
PromotionController.promote()
      │
      ├── Gate 1: SYNTAX_VALIDATION
      ├── Gate 2: COMPLETENESS_VALIDATION
      ├── Gate 3: STRUCTURE_AUDIT
      ├── Gate 4: INTEGRITY_CHECK
      │
      ├── Todos passaram? → promoveFiles() → PROMOTION_APPROVED
      └── Algum falhou?  → PROMOTION_REJECTED → WorkspaceExecutor.destroy()
```

---

## 8. Decisões de Design

### Por que `node:sqlite` e não `better-sqlite3`?

O Node.js v22 inclui SQLite built-in (`node:sqlite`), eliminando dependências nativas e problemas de build em diferentes plataformas.

### Por que projeções persistidas além de em memória?

Cache em memória é perdido ao reiniciar o processo. Persistir as projeções no banco garante estado consistente mesmo após crashes, sem precisar de replay completo a cada start.

### Por que `ESAA_ENABLED=false` por padrão?

Backward compatibility: o endpoint `/analyze` existente continua funcionando sem mudanças. ESAA é ativado explicitamente via variável de ambiente. P27 endureceu essa decisão: além do pipeline ser bypassado, as rotas HTTP `/esaa/*` também só são registradas quando `ESAA_ENABLED=true`. Ver § 0 — Política de Contenção.

### Por que dois tipos de projeção?

- **Operacional**: otimizada para decisões rápidas (hash, check de concorrência)
- **Auditoria**: otimizada para observabilidade e compliance (histórico completo, nunca apaga)
