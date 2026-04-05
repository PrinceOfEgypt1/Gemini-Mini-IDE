# Branch Protection Setup (Manual Configuration Required)

Este documento descreve as configurações de proteção de branch que DEVEM ser aplicadas manualmente no GitHub.

## Status: DEPENDÊNCIA EXTERNA

As configurações abaixo NÃO podem ser aplicadas via código. Requerem acesso admin ao repositório.

## Contexto operacional: repositório solo

Este repositório é mantido por um único mantenedor (`@PrinceOfEgypt1`).
A governança deve equilibrar proteção real com operabilidade solo:

- **Proteções automatizadas** (status checks, CI guards): MANTER — não dependem de revisão humana.
- **Aprovações obrigatórias**: REMOVER — o autor do PR é o único mantenedor e não pode aprovar o próprio PR no GitHub.
- **Code owner review obrigatório**: REMOVER — o code owner é o autor do PR; exigir review do code owner cria dependência impossível.
- **Enforce admins / Do not allow bypassing**: deve ser compatível com operação solo. Se approvals forem 0, enforce admins pode permanecer ativo sem bloquear o fluxo.

---

## Configurações Obrigatórias para `main`

### 1. Branch Protection Rules

Navegue para: Settings → Branches → Add branch protection rule

**Branch name pattern:** `main`

**Marcar as seguintes opções:**

- [x] **Require a pull request before merging**
  - Require approvals: **0** (zero — repositório solo, sem reviewer externo disponível)
  - [ ] Dismiss stale pull request approvals when new commits are pushed (N/A com 0 approvals)
  - [ ] Require review from Code Owners (DESMARCAR — code owner = autor do PR)

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Required status checks:**
    - `Quality Gate (BLOCKING)`
    - `Smoke Test (BLOCKING)`
    - `CI Status`

- [x] **Require conversation resolution before merging**

- [x] **Do not allow bypassing the above settings**

- [ ] **Allow force pushes** (DESMARCAR)

- [ ] **Allow deletions** (DESMARCAR)

### 2. Ruleset complementar (já ativa)

Ruleset `14243549` — `Protect main — restrict direct updates`:
- Enforcement: Active
- Target: `refs/heads/main`
- Rule: `update` (bloqueia push direto)
- Bypass mode: `pull_request` (permite merge via PR)

Esta ruleset complementa a branch protection impedindo atualizações diretas.

---

## Checklist de Verificação

Após configurar, verifique:

- [ ] PRs para main requerem CI verde (status checks)
- [ ] PRs para main NÃO exigem aprovação humana (0 approvals)
- [ ] Force push está desabilitado
- [ ] CODEOWNERS existe e registra ownership (sem enforcement de review obrigatório)
- [ ] Status checks aparecem como required
- [ ] O mantenedor solo consegue criar, passar CI e mergear um PR sem depender de terceiros

---

## Evidência de Configuração

Após configurar, registrar:

```
Data de configuração: ____
Configurado por: ____
Status checks required: Quality Gate (BLOCKING), Smoke Test (BLOCKING), CI Status
Approvals required: 0
Code owner review required: Não
Enforce admins: Sim (compatível porque approvals = 0)
```

---

## Nota Importante

**SEM ESTAS CONFIGURAÇÕES**, os workflows de CI são apenas informativos.
O bloqueio real só acontece com branch protection rules configuradas no GitHub.

## Histórico de mudanças

| Data | Mudança | Motivo |
|------|---------|--------|
| 2026-03-23 | Configuração inicial com 1 approval + code owner review | Setup original |
| 2026-04-05 | Approvals reduzido para 0, code owner review removido (P19) | Governança excessivamente rígida para repositório solo |
