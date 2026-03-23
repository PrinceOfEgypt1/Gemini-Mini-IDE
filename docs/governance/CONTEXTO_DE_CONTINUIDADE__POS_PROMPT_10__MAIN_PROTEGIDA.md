# CONTEXTO DE CONTINUIDADE — GEMINI-MINI-IDE

## Estado oficial registrado
- Data do registro: `2026-03-23`
- Branch oficial única: `main`
- HEAD oficial de referência no momento do registro: `865f3e2` (`865f3e22c84afa6fc75bb5a07da01d6b9bc25599`)
- Último PR mergeado: `#49`
- Prompt técnico concluído: `Prompt 10 — BG-05 + FG-09`
- Passo externo concluído: `Proteção real da main`
- PRs abertos no momento do registro: `0`

## Governança efetiva da main

### Branch protection clássica
- Required status checks: `CI Status`, `Critical Files Guard (BLOCKING)`, `Large Deletion Guard (BLOCKING)`, `Quality Gate (BLOCKING)`, `Smoke Test (BLOCKING)`
- Strict checks: habilitado
- Pull request review obrigatório: habilitado
- Aprovações mínimas: 1
- Dismiss stale reviews: habilitado
- Conversation resolution: habilitado
- Enforce admins: habilitado
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
1. proteção clássica de PR/review/checks;
2. ruleset ativa de bloqueio explícito de update direto.

Isso estabelece a `main` como branch sagrada do projeto.

## Evidências CLI usadas neste registro
- `gh api repos/PrinceOfEgypt1/Gemini-Mini-IDE/branches/main/protection`
- `gh api repos/PrinceOfEgypt1/Gemini-Mini-IDE/rulesets/14243549`
- `gh api repos/PrinceOfEgypt1/Gemini-Mini-IDE/rules/branches/main`

## Próxima referência de continuidade
Qualquer novo ciclo deve partir deste estado:
- `main` como única branch oficial
- proteção clássica ativa
- ruleset de restrict direct updates ativa
- mudanças somente via PR
