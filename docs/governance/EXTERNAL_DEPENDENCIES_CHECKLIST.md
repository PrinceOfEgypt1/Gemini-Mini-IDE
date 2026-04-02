# External Dependencies Checklist

## Objetivo
Este documento lista todas as configuracoes que devem ser aplicadas **fora do repositorio** (GitHub UI, settings, etc.) para que a governanca do projeto funcione corretamente.

## Status
- [ ] = Pendente de aplicacao
- [x] = Aplicado e verificado

---

## 1. Branch Protection Rules

**Onde aplicar:** GitHub > Settings > Branches > Branch protection rules

### Branch: `main`
- [x] Require a pull request before merging
- [x] Require approvals (minimo: 1)
- [x] Require status checks to pass before merging
  - [x] Adicionar check: `CI Status`
  - [x] Adicionar check: `Quality Gate (BLOCKING)`
  - [x] Adicionar check: `Smoke Test (BLOCKING)`
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above settings

> **Verified:** 2026-03-23 — branch protection active on main, required reviews active,
> required status checks active and strict, enforce_admins active, force-push disabled,
> deletion disabled. Ruleset 14243549 active with update restriction. See DEVELOPMENT.md
> "External Step — Real Main Protection" for full evidence.

### Branch: `develop`
N/A — project uses only `main` as official branch. No `develop` branch exists.

---

## 2. Required Status Checks

**Jobs que devem ser required:**

| Job Name | Obrigatorio? | Observacoes |
|----------|--------------|-------------|
| `Quality Gate (BLOCKING)` | SIM | Lint, typecheck, tests, build |
| `Smoke Test (BLOCKING)` | SIM | Exports + server start |
| `CI Status` | SIM | Agregador final |
| `Critical Files Guard (BLOCKING)` | RECOMENDADO | Protege arquivos criticos |
| `Large Deletion Guard (BLOCKING)` | RECOMENDADO | Protege contra remocoes massivas |

---

## 3. Secrets e Environment Variables

**Onde aplicar:** GitHub > Settings > Secrets and variables > Actions

### Secrets necessarios para CI completo:
- [ ] `DEEPSEEK_API_KEY` (opcional - para testes de integracao)
- [ ] `OPENAI_API_KEY` (opcional - para testes de integracao)

**Nota:** O CI atual NAO depende de secrets para funcionar. Os secrets sao opcionais para testes de integracao com LLMs reais.

---

## 4. Actions Permissions

**Onde aplicar:** GitHub > Settings > Actions > General

- [ ] Actions permissions: Allow all actions
- [ ] Workflow permissions: Read and write permissions
- [ ] Allow GitHub Actions to create and approve pull requests: NAO (seguranca)

---

## 5. Rulesets (alternativa moderna ao branch protection)

Se preferir usar GitHub Rulesets em vez de Branch Protection:

- [ ] Criar ruleset para `main`
- [ ] Adicionar regra: Require status checks
- [ ] Adicionar regra: Require pull request

---

## Verificacao

Apos aplicar as configuracoes, verificar:

1. [x] Criar PR de teste para `main`
2. [x] Verificar que CI roda automaticamente
3. [x] Verificar que merge e bloqueado ate checks passarem
4. [x] Verificar que modificacao de arquivo critico exige justificativa

---

## Historico de aplicacao

| Data | Acao | Responsavel | Verificado? |
|------|------|-------------|-------------|
| 2026-03-23 | Branch protection, required reviews, required status checks, enforce_admins, force-push disabled, deletion disabled, ruleset 14243549 applied | Operator (external) | Yes — see DEVELOPMENT.md "External Step — Real Main Protection" |

---

**Ultima atualizacao:** 2026-04-02 (Prompt 20 — aligned with DEVELOPMENT.md evidence)
