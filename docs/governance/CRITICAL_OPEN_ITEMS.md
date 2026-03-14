# CRITICAL_OPEN_ITEMS

## Objetivo
Manter uma lista viva e priorizada dos itens criticos ainda abertos no projeto **Gemini Mini-IDE**, para impedir perda de foco e impedir que a IA trate itens parciais como concluidos.

## Regras de uso
1. Este arquivo deve ser revisado no inicio e no fim de cada rodada.
2. Todo item critico deve ter:
   - severidade;
   - status;
   - area;
   - evidencia;
   - acao necessaria;
   - definicao de concluido.
3. Item critico com status **PARCIAL** continua sendo item aberto.
4. Documentar divida nao substitui resolver divida.

## Legenda
- **CRITICO** = afeta confianca, governanca, regressao, bloqueio de qualidade ou fidelidade do sistema.
- **ALTO** = afeta robustez, arquitetura, testes ou rastreabilidade de forma relevante.
- **MEDIO** = afeta qualidade, manutencao ou clareza, mas nao e o gargalo primario.
- **BAIXO** = melhoria desejavel, mas nao prioritaria neste momento.

---

## Itens FECHADOS na Rodada 3

### COI-003 - Smoke test bloqueante
- **Severidade:** CRITICO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 1
- **Evidencia:** `continue-on-error: true` REMOVIDO de `.github/workflows/ci.yml`

### COI-004 - Residuos de overfitting ao Prompt 7
- **Severidade:** CRITICO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 2
- **Evidencia:** Verificado que `selectDomainExamples` NAO e usada no pipeline principal; prompts sao genericos

### COI-005 - Estrategia de testes com lacunas
- **Severidade:** CRITICO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 3
- **Evidencia:** `vitest.config.ts` root e `packages/ui/vitest.config.ts` corrigidos para incluir `test/**/*.test.*`

### COI-006 - Testes de UI fora do escopo
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 3
- **Evidencia:** Config do UI agora inclui `test/**/*.test.ts` e `test/**/*.test.tsx`

### COI-007 - Higiene do repositorio incompleta
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 4
- **Evidencia:** `bundles/`, `logs/`, Zone.Identifier removidos do git; `.gitignore` atualizado

### COI-008 - Documentacao nao 100% fiel
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 5
- **Evidencia:** KNOWN_ISSUES.md corrigido para refletir estado real de domain-specific

### COI-011 - Checklist de dependencias externas
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 3 - Fase 1
- **Evidencia:** `docs/governance/EXTERNAL_DEPENDENCIES_CHECKLIST.md` criado

---

## Itens AINDA ABERTOS

### COI-001 - CI/CD ainda nao totalmente impeditivo
- **Severidade:** CRITICO
- **Area:** CI/CD / Governanca
- **Status:** PARCIAL
- **Evidencia resumida:** Workflow corrigido, mas branch protection nao aplicada
- **Acao necessaria:** Aplicar branch protection via GitHub UI
- **Definicao de concluido:** Branch protection ativa com required checks
- **Dependencia externa:** Sim - requer acao manual no GitHub

---

### COI-002 - Coverage gate ainda nao totalmente comprovado
- **Severidade:** MEDIO (rebaixado)
- **Area:** Testes / CI
- **Status:** PARCIAL (avancado na Rodada 11)
- **Evidencia resumida:** Thresholds root em 25%/15% ainda conservadores; shared agora tem thresholds por pacote (80% lines/branches/stmts, 50% funcs)
- **Acao necessaria:** Elevar thresholds root quando cli/server tiverem coverage > 0%; adicionar thresholds por pacote a outros pacotes
- **Definicao de concluido:** Thresholds reais por pacote em todos os pacotes com testes significativos
- **Nota:** Rodada 11 adicionou thresholds ao shared (0% -> 93.7% coverage + 80% threshold). Root nao pode ser elevado porque cli=0% e server=0%

---

---

### COI-012 - Exclusoes de testes no analysis-agent
- **Severidade:** MEDIO
- **Area:** Testes / Divida tecnica
- **Status:** PARCIAL
- **Evidencia resumida:** Exclui esaa.test.ts, agent.test.ts, index.test.ts por problemas de mocking
- **Acao necessaria:** Refatorar testes ou melhorar mocking de dependencias nativas
- **Definicao de concluido:** Testes executando ou exclusoes reduzidas

---

## Resumo pos-Rodada 3

| Categoria | Fechados | Abertos |
|-----------|----------|---------|
| CRITICO | 3 | 1 |
| ALTO | 4 | 0 |
| MEDIO | 0 | 4 |
| **Total** | **7** | **5** |

---

## Template para novos itens

### COI-XXX - Titulo do item
- **Severidade:** CRITICO / ALTO / MEDIO / BAIXO
- **Area:**
- **Status:** NAO CUMPRIDO / PARCIAL / COMPLETO
- **Evidencia resumida:**
- **Acao necessaria:**
- **Definicao de concluido:**

---

## Itens FECHADOS na Rodada 4/5

### COI-013 - Erros de build no analysis-agent
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 4
- **Evidencia:** `pnpm build` passa; PR #18 mergeado

### COI-014 - Erros de typecheck no server
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 4
- **Evidencia:** `pnpm typecheck` passa; project references removidos; type shim adicionado

### COI-015 - Validadores nao integrados ao runtime
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 5
- **Evidencia:** `baseProjectAuditor.auditAndFix()` em agent.ts:258; `categoryValidator.validate()` em agent.ts:261

---

## Itens FECHADOS na Rodada 6

### COI-010 - Motion system premium e acessivel
- **Severidade:** MEDIO
- **Status:** COMPLETO
- **Fechado em:** Rodada 6
- **Evidencia:**
  - Hook `useReducedMotion` criado em `packages/ui/src/hooks/useReducedMotion.ts`
  - `config/animations.ts` atualizado com helpers acessiveis
  - `App.tsx` integrado com suporte a prefers-reduced-motion
  - Build, typecheck, lint e 176 testes passando

---

## Itens FECHADOS na Rodada 7

### COI-009 - UI premium parcialmente integrada
- **Severidade:** MEDIO
- **Status:** COMPLETO
- **Fechado em:** Rodada 7
- **Evidencia:**
  - `AppRefactored.tsx` removido como codigo morto (nunca foi importado em main.tsx)
  - Hooks nao utilizados removidos: useProjectState, useChatState, useUIState, useProjectActions
  - `App.tsx` confirmado como UI principal verdadeira com Framer Motion e reduced motion
  - Ambiguidade arquitetural eliminada
  - Build, typecheck, lint e 176 testes passando

---

## Resumo pos-Rodada 7

| Categoria | Fechados | Abertos |
|-----------|----------|---------|
| CRITICO | 3 | 1 |
| ALTO | 7 | 0 |
| MEDIO | 2 | 2 |
| **Total** | **12** | **3** |

---

## Itens FECHADOS na Rodada 8

### COI-016 - Validacao real de runtime e coerencia de entrypoint
- **Severidade:** CRITICO
- **Status:** COMPLETO
- **Fechado em:** Rodada 8 - Fase 3-4
- **Evidencia:**
  - `packages/server/package.json` main e start corrigidos para `dist/server/src/index.js`
  - Server sobe com sucesso e `/healthz` responde `{"status":"ok"}`
  - CI smoke test atualizado: valida `/healthz` e coerencia de entrypoint
  - Pipeline local (`scripts/active/pipeline.sh`) com validacao de runtime
  - Prova concreta: `curl -sf http://localhost:3200/healthz` retorna 200

---

## Resumo pos-Rodada 8

| Categoria | Fechados | Abertos |
|-----------|----------|---------|
| CRITICO | 4 | 1 |
| ALTO | 7 | 0 |
| MEDIO | 2 | 2 |
| **Total** | **13** | **3** |

---

## Itens FECHADOS na Rodada 9

### COI-017 - Analise de impacto pre-mudanca
- **Severidade:** MEDIO
- **Status:** COMPLETO
- **Fechado em:** Rodada 9 - Fase 3-4
- **Evidencia:**
  - Script `scripts/active/impact-analysis.sh` criado e funcional
  - Classifica risco em 4 niveis: BAIXO, MEDIO, ALTO, CRITICO
  - Identifica areas afetadas e recomenda validacoes
  - 5 cenarios validados com sucesso (server, UI, CI, governance, shared+config)
  - Exit code 0 para risco baixo/medio, 1 para alto/critico

---

## Resumo pos-Rodada 9

| Categoria | Fechados | Abertos |
|-----------|----------|---------|
| CRITICO | 4 | 1 |
| ALTO | 7 | 0 |
| MEDIO | 3 | 2 |
| **Total** | **14** | **3** |

---

## Itens FECHADOS na Rodada 10

### COI-018 - Fonte unica de verdade para analise de impacto
- **Severidade:** ALTO
- **Status:** COMPLETO
- **Fechado em:** Rodada 10 - Fase 3-7
- **Evidencia:**
  - Nucleo TS em `packages/shared/src/impact-analysis/`
  - Wrapper bash, CLI, server e agent.ts usam o mesmo nucleo
  - 4 pontos de integracao validados com prova concreta

---

## Resumo pos-Rodada 10

| Categoria | Fechados | Abertos |
|-----------|----------|---------|
| CRITICO | 4 | 1 |
| ALTO | 8 | 0 |
| MEDIO | 3 | 2 |
| **Total** | **15** | **3** |

---

## Progresso na Rodada 11

### COI-002 avancado
- **Antes:** Thresholds root 25%/15% sem thresholds por pacote
- **Depois:** shared tem thresholds por pacote (80%/80%/80%/50%); 92 testes novos; shared coverage 0%->93.7%
- **Status:** Permanece PARCIAL (root nao pode ser elevado enquanto cli=0%, server=0%)

### COI-012 parcialmente atendido
- **Antes:** 3 exclusoes no analysis-agent; areas generation/ e validators/ sem testes
- **Depois:** generation/ e validators/ agora tem testes (batch-validator, context-accumulator, manifest-batcher, integrity-validator); exclusoes de esaa/agent/index permanecem (requerem refatoracao de sqlite/OpenAI mocking)
- **Status:** Permanece PARCIAL mas divida reduzida

---

## Resumo pos-Rodada 11

| Categoria | Fechados | Abertos |
|-----------|----------|---------|
| CRITICO | 4 | 1 |
| ALTO | 8 | 0 |
| MEDIO | 3 | 2 |
| **Total** | **15** | **3** |

Nota: Contagem total nao mudou, mas COI-002 e COI-012 tiveram progresso real.

---

**Ultima atualizacao:** 2026-03-14 (Rodada 11 - Fase 5)
