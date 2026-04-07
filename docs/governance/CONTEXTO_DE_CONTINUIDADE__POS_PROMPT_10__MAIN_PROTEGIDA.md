# CONTEXTO DE CONTINUIDADE — GEMINI-MINI-IDE

> **⚠ DOCUMENTO HISTÓRICO — NÃO REPRESENTA O ESTADO OFICIAL ATUAL**
>
> Este documento é um **marco histórico** registrado após a conclusão do Prompt 10
> (proteção real da main, 2026-03-23), com adendo de governança do P19 (2026-04-05).
> Os hashes, PRs e estados aqui refletem o momento do registro, **não** o estado
> corrente do projeto.
>
> **Fonte mantida de governança da main:** [`DEVELOPMENT.md` § External Step — Real Main Protection](../../DEVELOPMENT.md#external-step--real-main-protection)

## Estado oficial registrado (snapshot do momento do P10)
- Data do registro: `2026-03-23`
- Branch oficial única: `main`
- HEAD oficial de referência no momento do registro: `865f3e2` (`865f3e22c84afa6fc75bb5a07da01d6b9bc25599`)
- Último PR mergeado: `#49`
- Prompt técnico concluído: `Prompt 10 — BG-05 + FG-09`
- Passo externo concluído: `Proteção real da main`
- PRs abertos no momento do registro: `0`

## Governança efetiva da main

### Branch protection clássica

> **Estado registrado em 2026-03-23** (pré-P19):
> Pull request review obrigatório: habilitado, Aprovações mínimas: 1, Code owner review: habilitado, Enforce admins: habilitado.
>
> **Ajuste recomendado pelo P19 (2026-04-05):**
> Aprovações mínimas: 0, Code owner review: desabilitado.
> Motivo: configuração original incompatível com repositório de mantenedor solo.
> **AÇÃO MANUAL REQUERIDA** para aplicar no GitHub UI.

- Required status checks: `CI Status`, `Critical Files Guard (BLOCKING)`, `Large Deletion Guard (BLOCKING)`, `Quality Gate (BLOCKING)`, `Smoke Test (BLOCKING)`
- Strict checks: habilitado
- Pull request review obrigatório: habilitado (PR continua obrigatório)
- Aprovações mínimas: **0** (P19 — era 1, incompatível com solo)
- Code owner review: **desabilitado** (P19 — code owner = autor do PR)
- Dismiss stale reviews: N/A (com 0 approvals)
- Conversation resolution: habilitado
- Enforce admins: habilitado (compatível com 0 approvals)
- Force push: desabilitado
- Delete branch: desabilitado

### Ruleset adicional
- Ruleset ID: `14243549`
- Nome: `Protect main — restrict direct updates`
- Enforcement: `active`
- Target: `refs/heads/main`
- Rule: `update`
- Bypass mode: `pull_request`
- Efeito prático: bloqueio explícito de atualização direta da `main`, preservando bypass apenas via fluxo de pull request

## Interpretação operacional
A branch `main` está protegida por duas camadas complementares:
1. proteção clássica de PR + status checks (sem dependência de aprovação humana externa);
2. ruleset ativa de bloqueio explícito de update direto.

Isso estabelece a `main` como branch protegida do projeto, com governança proporcional ao contexto de mantenedor solo.

## Evidências CLI usadas neste registro
- `gh api repos/PrinceOfEgypt1/Gemini-Mini-IDE/branches/main/protection`
- `gh api repos/PrinceOfEgypt1/Gemini-Mini-IDE/rulesets/14243549`
- `gh api repos/PrinceOfEgypt1/Gemini-Mini-IDE/rules/branches/main`

## Remediação P19 — Governança Solo (2026-04-05)

O Prompt 19 identificou que a configuração original (1 approval + code owner review + enforce admins) era excessivamente rígida para repositório solo:
- O mantenedor não pode aprovar o próprio PR no GitHub.
- O code owner é o autor do PR, impossibilitando satisfazer o requisito.
- A combinação criava dependência de um reviewer externo inexistente.

**Ajuste documentado:** approvals → 0, code owner review → desabilitado.
**Status da aplicação remota:** PENDENTE DE AÇÃO MANUAL no GitHub UI.

## Princípios de governança registrados neste marco
Os princípios abaixo foram válidos no momento do registro e permanecem como referência histórica:
- `main` como única branch oficial
- proteção clássica ativa (PR obrigatório + status checks, sem approval humano)
- ruleset de restrict direct updates ativa
- mudanças somente via PR
- governança proporcional a repositório solo

> Para o estado oficial **atual** da governança de main, consulte
> [`DEVELOPMENT.md` § External Step — Real Main Protection](../../DEVELOPMENT.md#external-step--real-main-protection).
