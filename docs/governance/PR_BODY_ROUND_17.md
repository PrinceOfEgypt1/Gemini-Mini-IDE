# PR — Rodada 17: OPERAÇÃO GUARDA DE COBERTURA

## Justificativa
UI e analysis-agent não possuíam thresholds locais de coverage, permitindo regressão silenciosa. Apenas 3 de 5 pacotes tinham governança de coverage. COI-002 permanecia aberto desde a Rodada 3. Esta rodada institucionaliza coverage governance em TODOS os pacotes do monorepo.

## Motivo
Completar a governança de coverage com thresholds por pacote em todos os 5 pacotes, fechando COI-002 e promovendo MC-005 a COMPLETO.

## Refactor
Nenhum refactor de código de produção. Apenas adição de seções `coverage` com `thresholds` nos vitest configs de UI e analysis-agent.

## Cleanup
Nenhuma remoção de código ou arquivo.

## Deletion
Nenhuma deleção.

---

## Tabela completa de coverage governance por pacote-alvo

| Pacote | Coverage antes (stmts/branch/funcs/lines) | Coverage depois (stmts/branch/funcs/lines) | Threshold antes (lines/branch/funcs/stmts) | Threshold depois (lines/branch/funcs/stmts) | Exclusões antes | Exclusões depois | Motivo da decisão |
|--------|-------------------------------------------|---------------------------------------------|----------------------------------------------|------------------------------------------------|-----------------|------------------|-------------------|
| shared | 93.7%/80%+/50%+/93.7% | Inalterado | 80/80/50/80 | Inalterado (80/80/50/80) | Nenhuma | Inalterado | Pacote maduro; threshold já adequado |
| server | 56.96%/55%+/30%+/56.96% | Inalterado | 40/55/30/40 | Inalterado (40/55/30/40) | Nenhuma | Inalterado | Threshold já adequado; rotas testadas via app.inject() |
| cli | 54.39%/80%+/80%+/54.39% | Inalterado | 40/80/80/40 | Inalterado (40/80/80/40) | Nenhuma | Inalterado | Threshold já adequado; entrypoint testado via factory |
| **ui** | **22.23/65.82/38.80/22.23** | **Inalterado** | **NENHUM** | **20/60/35/20** | **Nenhuma** | **Nenhuma (adicionado: coverage include/exclude)** | **Piso anti-regressão; margem ~2pp abaixo do atual** |
| **analysis-agent** | **16.66/73.42/51.25/16.66** | **Inalterado** | **NENHUM** | **15/70/45/15** | **esaa/*.test.ts, agent.test.ts, index.test.ts (teste)** | **Inalterado + coverage exclude: __mocks__/** | **Piso anti-regressão; margem ~1.6pp abaixo do atual** |
| root/global | N/A (agregado) | N/A (agregado) | 25/15/25/25 | Inalterado (25/15/25/25) | types/**, __mocks__/**, test/** | Inalterado | Safety net; governança local por pacote é mais eficaz |

## Tabela de decisões de threshold

| Pacote | Métrica | Coverage atual | Threshold definido | Margem | Justificativa |
|--------|---------|----------------|--------------------|---------|----|
| ui | lines | 22.23% | 20% | 2.23pp | Piso conservador anti-regressão; muitos componentes visuais sem teste unitário (esperado) |
| ui | branches | 65.82% | 60% | 5.82pp | Margem maior por volatilidade em branches de componentes React |
| ui | functions | 38.80% | 35% | 3.80pp | Piso conservador; hooks e utils testados, componentes visuais não |
| ui | statements | 22.23% | 20% | 2.23pp | Idêntico a lines (V8 provider) |
| analysis-agent | lines | 16.66% | 15% | 1.66pp | Margem menor mas suficiente; grandes áreas (esaa, prompts, services, session) sem testes por design |
| analysis-agent | branches | 73.42% | 70% | 3.42pp | Branches cobertos por testes de validators e rich-schemas |
| analysis-agent | functions | 51.25% | 45% | 6.25pp | Margem maior por volatilidade; funções de serviço e prompts não testadas |
| analysis-agent | statements | 16.66% | 15% | 1.66pp | Idêntico a lines (V8 provider) |
| shared | * | 93.7%+ | 80/80/50/80 | 13.7pp+ | Existente desde Rodada 11; sem alteração |
| server | * | 56.96%+ | 40/55/30/40 | 16.96pp+ | Existente desde Rodada 13; sem alteração |
| cli | * | 54.39%+ | 40/80/80/40 | 14.39pp+ | Existente desde Rodada 13; sem alteração |
| root/global | * | N/A | 25/15/25/25 | N/A | Existente desde Rodada 3; safety net; sem alteração |

## Tabela de itens preservados (sem alteração nesta rodada)

| Item | Localização | Motivo da preservação |
|------|-------------|----------------------|
| Thresholds shared | `packages/shared/vitest.config.ts` | Já adequados (80/80/50/80); coverage 93.7% |
| Thresholds server | `packages/server/vitest.config.ts` | Já adequados (40/55/30/40); coverage 56.96% |
| Thresholds cli | `packages/cli/vitest.config.ts` | Já adequados (40/80/80/40); coverage 54.39% |
| Thresholds root/global | `vitest.config.ts` | Safety net adequado (25/15/25/25); governança local é mais eficaz |
| Exclusões analysis-agent (testes) | `packages/analysis-agent/vitest.config.ts` | Dívida técnica documentada em DEVELOPMENT.md; esaa/agent/index dependem de sqlite/OpenAI mocking |
| Coverage excludes root | `vitest.config.ts` | types/**, __mocks__/**, test/** são padrão; sem motivo para alterar |
| Coverage provider V8 | Todos os configs | Provider consistente em todo o monorepo; sem motivo para alterar |
| perFile: false (root) | `vitest.config.ts` | Per-file enforcement não é objetivo desta rodada |

## Validação técnica

| Passo | Resultado |
|-------|-----------|
| pnpm lint | PASS |
| pnpm typecheck | PASS |
| pnpm build | PASS |
| pnpm test | PASS (441 testes: shared 35, ui 73, cli 25, analysis-agent 234, server 74) |
| scripts/active/pipeline.sh | PASS (6/6) |
| UI coverage > threshold | 22.23% > 20% PASS |
| Analysis-agent coverage > threshold | 16.66% > 15% PASS |

## Governança

| Item | Ação | Status |
|------|------|--------|
| MC-031 | Criado | COMPLETO |
| MC-005 | Promovido de PARCIAL a COMPLETO | COMPLETO |
| COI-002 | Fechado (5/5 pacotes com thresholds) | COMPLETO |
| RSL | Entrada Rodada 17 registrada | COMPLETO |

## Arquivos modificados (5 + 1 criado)

| # | Arquivo | Tipo | Descrição |
|---|---------|------|-----------|
| 1 | `packages/ui/vitest.config.ts` | MODIFICADO | Adicionada seção coverage com thresholds 20/60/35/20 |
| 2 | `packages/analysis-agent/vitest.config.ts` | MODIFICADO | Adicionada seção coverage com thresholds 15/70/45/15 |
| 3 | `docs/governance/MASTER_COMPLIANCE_MATRIX.md` | MODIFICADO | MC-031 criado, MC-005 promovido a COMPLETO |
| 4 | `docs/governance/ROUND_STATUS_LOG.md` | MODIFICADO | Entrada Rodada 17 |
| 5 | `docs/governance/CRITICAL_OPEN_ITEMS.md` | MODIFICADO | COI-002 fechado |
| 6 | `docs/governance/PR_BODY_ROUND_17.md` | CRIADO | Este arquivo (PR body) |

## Branch
- **Canônica:** `claude/round-17-operacao-guarda-de-cobertura`
- **Efetiva:** `claude/comprehensive-project-audit-eVbB5`
- **Divergência autorizada:** SIM — sistema de deploy exige sufixo de session ID

## Pendências pós-Rodada 17

| ID | Item | Severidade | Status | Próxima ação |
|----|------|------------|--------|--------------|
| COI-001 | Branch protection | CRITICA | PARCIAL | GitHub UI (dependência externa) |
| COI-012 | Exclusões de testes analysis-agent | MEDIA | PARCIAL | Refatoração sqlite/OpenAI mocking |

## Test plan
- [x] pnpm lint passes
- [x] pnpm typecheck passes
- [x] pnpm build passes
- [x] pnpm test passes (441 tests)
- [x] pipeline.sh 6/6 passes
- [x] UI coverage (22.23%) above threshold (20%)
- [x] Analysis-agent coverage (16.66%) above threshold (15%)
- [x] No production code changes
- [x] Governance documents updated (MCM, RSL, COI)

https://claude.ai/code/session_01MbySZTKaqaMZYpsLuJEAZ8
