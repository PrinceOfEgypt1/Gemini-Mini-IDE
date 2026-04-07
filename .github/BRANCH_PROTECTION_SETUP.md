# Proteção da Branch `main` — Referência Operacional

Este documento registra a configuração real de proteção da branch `main`, conforme verificada via API do GitHub.

## Status: CONFIGURADA E ATIVA

A proteção da `main` está ativa e é implementada por meio de **3 rulesets** no GitHub.

## Contexto operacional: repositório solo

Este repositório é mantido por um único mantenedor (`@PrinceOfEgypt1`).
A governança equilibra proteção real com operabilidade solo:

- **Proteções automatizadas** (status checks, CI guards): ATIVAS — não dependem de revisão humana.
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

A API pública do GitHub retorna 401 para o endpoint de branch protection clássica (`/branches/main/protection`), o que impede verificação sem credenciais admin.

As rulesets acima cobrem as proteções essenciais (status checks, force push, deletion, direct push). Configurações adicionais que podem existir na branch protection clássica (conversation resolution, enforce admins) não são verificáveis externamente.

**Se houver necessidade de reconfigurar a proteção clássica**, as configurações compatíveis com repositório solo são:

- Require a pull request before merging: **Sim**
- Required approvals: **0**
- Code owner review: **Não**
- Require conversation resolution: **Sim** (recomendado)
- Do not allow bypassing: **Sim**
- Enforce admins: **Sim** (compatível porque approvals = 0)

---

## Checks Bloqueantes no CI

O workflow `.github/workflows/ci.yml` define 6 jobs:

| Job | Nome no GitHub | Bloqueante por ruleset? |
|-----|---------------|------------------------|
| quality | Quality Gate (BLOCKING) | **Sim** — required status check |
| smoke-test | Smoke Test (BLOCKING) | **Sim** — required status check |
| ci-status | CI Status | **Sim** — required status check |
| critical-files-guard | Critical Files Guard (BLOCKING) | Não — auto-enforcement via falha do job |
| large-deletion-guard | Large Deletion Guard (BLOCKING) | Não — auto-enforcement via falha do job |
| pr-template-compliance | PR Template Compliance (BLOCKING) | Não — auto-enforcement via falha do job |

Os 3 primeiros são obrigatórios via ruleset. Os 3 últimos falham o PR diretamente se as condições não forem atendidas, mas não estão na lista de required status checks.

---

## Checklist de Verificação

- [x] PRs para main requerem CI verde (3 status checks obrigatórios)
- [x] PRs para main NÃO exigem aprovação humana (0 approvals)
- [x] Force push desabilitado (ruleset 13621578)
- [x] Exclusão de branch desabilitada (ruleset 13621578)
- [x] Push direto bloqueado (ruleset 14243549)
- [x] CODEOWNERS registra ownership sem enforcement de review obrigatório

---

## Fonte de verdade

A fonte de verdade para a configuração de proteção é a API do GitHub:
```
GET /repos/PrinceOfEgypt1/Gemini-Mini-IDE/rulesets
```

Este documento é uma referência operacional derivada. Em caso de conflito, a configuração real do GitHub prevalece.

---

## Histórico de mudanças

| Data | Mudança | Motivo |
|------|---------|--------|
| 2026-03-23 | Configuração inicial com 1 approval + code owner review | Setup original |
| 2026-04-05 | Approvals reduzido para 0, code owner review removido (P19) | Governança excessivamente rígida para repositório solo |
| 2026-04-07 | Documento reescrito como referência operacional (P14) | Eliminação de drift: documento descrevia classic BP + 1 ruleset; realidade são 3 rulesets |
