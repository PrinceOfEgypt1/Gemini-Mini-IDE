# Branch Protection Setup (Manual Configuration Required)

Este documento descreve as configurações de proteção de branch que DEVEM ser aplicadas manualmente no GitHub.

## Status: DEPENDÊNCIA EXTERNA

As configurações abaixo NÃO podem ser aplicadas via código. Requerem acesso admin ao repositório.

---

## Configurações Obrigatórias para `main`

### 1. Branch Protection Rules

Navegue para: Settings → Branches → Add branch protection rule

**Branch name pattern:** `main`

**Marcar as seguintes opções:**

- [x] **Require a pull request before merging**
  - [x] Require approvals: **1** (mínimo)
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners

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

### 2. Rulesets (Alternativa mais moderna)

Se preferir usar Rulesets ao invés de Branch Protection Rules:

1. Settings → Rules → Rulesets → New ruleset
2. Nome: `main-protection`
3. Enforcement: Active
4. Target: Include `refs/heads/main`
5. Rules:
   - Restrict deletions
   - Require linear history
   - Require signed commits (opcional)
   - Require a pull request before merging
   - Required status checks: `Quality Gate (BLOCKING)`, `CI Status`

---

## Checklist de Verificação

Após configurar, verifique:

- [ ] PRs para main requerem aprovação
- [ ] PRs para main requerem CI verde
- [ ] Force push está desabilitado
- [ ] CODEOWNERS está sendo respeitado
- [ ] Status checks aparecem como required

---

## Evidência de Configuração

Após configurar, tire um screenshot e adicione ao PR de setup ou documente:

```
Data de configuração: ____
Configurado por: ____
Status checks required: Quality Gate (BLOCKING), Smoke Test (BLOCKING), CI Status
Approvals required: 1
CODEOWNERS enforced: Sim/Não
```

---

## Nota Importante

**SEM ESTAS CONFIGURAÇÕES**, os workflows de CI são apenas informativos.
O bloqueio real só acontece com branch protection rules configuradas no GitHub.
