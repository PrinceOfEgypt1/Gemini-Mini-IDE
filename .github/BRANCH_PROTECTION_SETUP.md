# Proteção da Branch `main` — Referência Operacional

Este documento registra a configuração real de proteção da branch `main`, conforme
verificada via API do GitHub (rulesets) e via inspeção forense dos check runs reais
executados nos últimos PRs mergeados.

## Status: CONFIGURADA E ATIVA

A proteção da `main` está ativa. Ela é implementada por meio de **3 rulesets** no
GitHub e de um **agregador único de CI** (`CI Status`) que transita bloqueio para
todos os demais jobs do pipeline.

## Contexto operacional: repositório solo

Este repositório é mantido por um único mantenedor (`@PrinceOfEgypt1`).
A governança equilibra proteção real com operabilidade solo:

- **Proteções automatizadas** (status checks, CI guards): ATIVAS — não dependem
  de revisão humana.
- **Aprovações obrigatórias**: 0 — o autor do PR é o único mantenedor.
- **Code owner review obrigatório**: Não — o code owner é o autor do PR.

---

## Rulesets Ativas

### 1. Ruleset `13644761` — `main`

- **Enforcement:** Active
- **Target:** Default branch (`main`)
- **Regras:**
  - Required status checks (strict):
    - `Quality Gate (BLOCKING)`
    - `Smoke Test (BLOCKING)`
    - `CI Status`
  - `strict_required_status_checks_policy`: true
  - `do_not_enforce_on_create`: false

### 2. Ruleset `13621578` — `main-branch-protection`

- **Enforcement:** Active
- **Target:** Default branch (`main`)
- **Regras:**
  - `deletion` — impede exclusão da branch
  - `non_fast_forward` — impede force push

### 3. Ruleset `14243549` — `Protect main — restrict direct updates`

- **Enforcement:** Active
- **Target:** `refs/heads/main`
- **Regras:**
  - `update` — bloqueia push direto na `main`
  - Bypass mode: `pull_request` (permite merge via PR)

---

## Branch Protection Clássica

A API pública do GitHub retorna 401 para o endpoint de branch protection clássica
(`/branches/main/protection`), o que impede verificação sem credenciais admin.

As rulesets acima cobrem as proteções essenciais (status checks, force push,
deletion, direct push). Configurações adicionais que possam existir na branch
protection clássica (conversation resolution, enforce admins) não são verificáveis
externamente sem credenciais admin.

**Se houver necessidade de reconfigurar a proteção clássica**, as configurações
compatíveis com repositório solo são:

- Require a pull request before merging: **Sim**
- Required approvals: **0**
- Code owner review: **Não**
- Require conversation resolution: **Sim** (recomendado)
- Do not allow bypassing: **Sim**
- Enforce admins: **Sim** (compatível porque approvals = 0)

---

## Jobs do CI e Modelo de Bloqueio

O workflow `.github/workflows/ci.yml` define **7 jobs**. A partir do P28 o modelo
híbrido anterior (alguns jobs required via ruleset + outros que apenas falhavam o
job localmente) foi convergido em um **agregador único transitivo**: `CI Status`
depende dos 6 demais jobs, e `CI Status` é, por sua vez, required via ruleset
`13644761`. Isso torna **todos** os jobs transitivamente required.

| Job (key) | Nome no GitHub | Evento | `needs` de `ci-status`? | Bloqueante? |
|-----------|----------------|--------|-------------------------|-------------|
| `quality` | `Quality Gate (BLOCKING)` | push + PR | Sim | **Sim** — também listado diretamente no ruleset |
| `smoke-test` | `Smoke Test (BLOCKING)` | push + PR | Sim | **Sim** — também listado diretamente no ruleset |
| `doc-drift-enforcement` | `Doc Drift Enforcement (BLOCKING)` | push + PR | Sim | **Sim** — transitivamente via `CI Status` |
| `critical-files-guard` | `Critical Files Guard (BLOCKING)` | PR only | Sim (tolera `skipped` em push) | **Sim** — transitivamente via `CI Status` |
| `large-deletion-guard` | `Large Deletion Guard (BLOCKING)` | PR only | Sim (tolera `skipped` em push) | **Sim** — transitivamente via `CI Status` |
| `pr-template-compliance` | `PR Template Compliance (BLOCKING)` | PR only | Sim (tolera `skipped` em push) | **Sim** — transitivamente via `CI Status` |
| `ci-status` | `CI Status` | push + PR | — (é o próprio agregador) | **Sim** — required direto no ruleset |

### Semântica de `skipped`

Os três PR-only guards não executam em `push` para `main` (eles têm
`if: github.event_name == 'pull_request'`). Por isso, na lógica de agregação do
`ci-status`, o resultado `skipped` é explicitamente aceito para esses três jobs,
enquanto `quality`, `smoke-test` e `doc-drift-enforcement` exigem estritamente
`success`. Isso preserva o bloqueio real em PRs sem quebrar o caminho `push` para
`main`.

---

## Decisão explícita sobre required status checks

A lista formal de required status checks no ruleset `13644761` permanece **mínima
e estável** (`Quality Gate (BLOCKING)`, `Smoke Test (BLOCKING)`, `CI Status`), por
três razões técnicas:

1. **Robustez já maximizada via transitividade.** Após o P28, `CI Status`
   transita bloqueio para **todos** os demais jobs. Adicionar cada job individual
   no ruleset seria redundante e apenas aumentaria custo de manutenção quando
   jobs forem renomeados ou reorganizados.

2. **Compatibilidade com renomeação.** Required status checks no ruleset são
   matched por **nome exato** do job. Se um job for renomeado, ele deixa de
   bloquear silenciosamente. Concentrar a required list em `CI Status` — cujo
   nome é estável — e delegar a coordenação para `needs:` no YAML torna o modelo
   mais resistente a drifts futuros.

3. **Single source of truth.** Com `CI Status` como agregador único, a fonte
   de verdade operacional é o próprio `.github/workflows/ci.yml`. Nenhum
   conhecimento precisa ser duplicado na UI do GitHub para cobrir os 6 jobs
   subordinados.

### Lista canônica

**Formalmente required via ruleset** (matching por nome exato):

- `Quality Gate (BLOCKING)`
- `Smoke Test (BLOCKING)`
- `CI Status`

**Transitivamente required via `CI Status.needs`** (falha em qualquer um falha
`CI Status` e consequentemente bloqueia merge):

- `Doc Drift Enforcement (BLOCKING)`
- `Critical Files Guard (BLOCKING)`
- `Large Deletion Guard (BLOCKING)`
- `PR Template Compliance (BLOCKING)`

**Nenhum job do pipeline é puramente advisory.** O modelo híbrido anterior (em
que 3 guards eram "bloqueantes" apenas por narrativa documental mas não por
ruleset nem por `needs:`) foi eliminado no P28.

---

## Checklist de Verificação

- [x] PRs para main requerem CI verde (3 required status checks diretos +
      4 transitivos)
- [x] PRs para main NÃO exigem aprovação humana (0 approvals)
- [x] Force push desabilitado (ruleset 13621578)
- [x] Exclusão de branch desabilitada (ruleset 13621578)
- [x] Push direto bloqueado (ruleset 14243549)
- [x] CODEOWNERS registra ownership sem enforcement de review obrigatório
- [x] `CI Status` é o agregador transitivo único dos 6 demais jobs (P28)

---

## Fonte de verdade

A fonte de verdade para a configuração de proteção é a API do GitHub:
```
GET /repos/PrinceOfEgypt1/Gemini-Mini-IDE/rulesets
GET /repos/PrinceOfEgypt1/Gemini-Mini-IDE/pulls/{n}/commits/{sha}/check-runs
```

A fonte de verdade para o conjunto de jobs que o ruleset transita é o próprio
`.github/workflows/ci.yml` (em particular, o campo `needs:` do job `ci-status`).

Este documento é uma referência operacional derivada. Em caso de conflito, a
configuração real do GitHub e o YAML do workflow prevalecem.

### Limitação honesta da verificação automatizada

O ambiente de auditoria disponível em sessões de agente MCP não expõe o endpoint
`/rulesets` da API do GitHub. A verificação forense do P28 foi feita via:

1. Leitura direta do YAML versionado (`.github/workflows/ci.yml`).
2. Inspeção dos `check_runs` reais do último PR mergeado na `main` (PR #78),
   retornando literalmente os 7 jobs esperados, todos com `conclusion=success`.
3. Comparação com os IDs/metadados dos rulesets documentados nesta referência
   operacional.

Recomenda-se ao mantenedor solo validar periodicamente a lista de required status
checks no ruleset `13644761` via `gh api repos/:owner/:repo/rulesets/13644761`
para garantir que `Quality Gate (BLOCKING)`, `Smoke Test (BLOCKING)` e `CI Status`
permanecem explicitamente listados.

---

## Histórico de mudanças

| Data | Mudança | Motivo |
|------|---------|--------|
| 2026-03-23 | Configuração inicial com 1 approval + code owner review | Setup original |
| 2026-04-05 | Approvals reduzido para 0, code owner review removido (P19) | Governança excessivamente rígida para repositório solo |
| 2026-04-07 | Documento reescrito como referência operacional (P14) | Eliminação de drift: documento descrevia classic BP + 1 ruleset; realidade são 3 rulesets |
| 2026-04-12 | Convergência do modelo híbrido em agregador transitivo único (P28) | O doc listava 6 jobs, o workflow tinha 7 (Doc Drift Enforcement faltava); 3 guards eram advisory. O P28 expande `ci-status.needs` para cobrir os 6 jobs subordinados, atualiza a tabela para 7 jobs e reconcilia a linguagem com a realidade (sem narrativa de "auto-enforcement" para jobs que não eram, de fato, bloqueantes). |
