#!/usr/bin/env bash
set -e

echo "📚 Atualizando documentação para v0.8.0 (Fase 8 Concluída)..."

# 1. Atualizar README.md
cat > README.md <<EOF
# Mini-IDE (Monorepo)

Ambiente de desenvolvimento assistido por IA, capaz de transformar intenções em planos e código.

> **Status Atual:** v0.8.0 (Hardened Backend) - API Documentada + Controle de Custos + UI Beta
> **Pipeline:** 🟢 Passing (Lint, Types, Tests, Build, Smoke)

## 🚀 Funcionalidades Principais
1. **API Robusta:** Documentação Swagger (/docs), Tratamento de Erros, Validação.
2. **Inteligência:** Otimização de prompts e Controle de Orçamento.
3. **Interface Visual:** React + Vite com histórico persistente.
4. **Persistência:** Sistema de arquivos e logs de auditoria.

## 🛠️ Como Rodar

### 1. Iniciar o Cérebro (Backend)
Porta 3200. Swagger em http://localhost:3200/docs
\`\`\`bash
# Terminal 1
export DEEPSEEK_API_KEY="sua-chave" # Opcional
pnpm --filter @mini-ide/server start
\`\`\`

### 2. Iniciar a Interface (Frontend)
Porta 5173.
\`\`\`bash
# Terminal 2
pnpm --filter @mini-ide/ui dev
\`\`\`

### 3. CLI
\`\`\`bash
# Terminal 3
node packages/cli/dist/index.js analyze "Criar um CRUD"
\`\`\`
EOF

# 2. Atualizar DEVELOPMENT.md e BACKLOG.md
# (Mantemos a estrutura do script 50, apenas atualizando status)
# -----------------------------------------------------

# Atualiza status no BACKLOG.md
sed -i 's/📅 \*\*1.3 HU-Server-Analyze-500\*\*/✅ \*\*1.3 HU-Server-Analyze-500\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*1.6 HU-Server-OpenAPI\*\*/✅ \*\*1.6 HU-Server-OpenAPI\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*2.1 HU-Analysis-CompactPrompt\*\*/✅ \*\*2.1 HU-Analysis-CompactPrompt\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*2.2 HU-Analysis-Budget-Check\*\*/✅ \*\*2.2 HU-Analysis-Budget-Check\*\*/' docs/BACKLOG.md
# HU 2.4 (RunId) já foi implementada implicitamente com UUIDs nos logs e persistência
sed -i 's/📅 \*\*2.4 HU-Analysis-RunId\*\*/✅ \*\*2.4 HU-Analysis-RunId\*\*/' docs/BACKLOG.md
# HU 12.2 (Budget Context) implementada via BudgetService
sed -i 's/📅 \*\*12.2 HU-Server-Budget-Per-Context\*\*/✅ \*\*12.2 HU-Server-Budget-Per-Context\*\*/' docs/BACKLOG.md


cat > DEVELOPMENT.md <<EOF
# Mini-IDE — Manual de Engenharia

> **Versão do Documento:** 5.3 (Phase 8 Done)
> **Versão do Software:** v0.8.0
> **Data:** $(date +%Y-%m-%d)
> **Pipeline:** 🟢 Verde

---

## 1. Status das Fases

| Fase | Status | Entregáveis Recentes |
|---|---|---|
| **1-5** (Infra/MVP) | ✅ Concluído | Monorepo, CLI, UI Base. |
| **6** (UX) | ✅ Concluído | Feedback Visual, Timeline. |
| **7** (Persistência) | ✅ Concluído | Bundles em disco, Histórico. |
| **8** (Robustez) | ✅ Concluído | **Swagger**, **Budget**, **Optimizer**, **Global Error Handler**. |
| **9** (Personas) | 📅 Pendente | Especialização dos agentes. |

---

## 2. Detalhe da Fase 8 (Hardening)

Focamos em preparar o backend para produção e consumo externo.

*   **Documentação:** Swagger UI disponível em \`/docs\`.
*   **Economia:** \`PromptOptimizer\` remove gordura dos prompts; \`BudgetService\` impede gastos excessivos (limite diário mockado).
*   **Resiliência:** \`fastify.setErrorHandler\` captura exceções não tratadas e retorna JSON padronizado, evitando crash.
*   **Qualidade:** Novos testes unitários para os serviços de infraestrutura.

---

## 3. Próximos Passos (Fase 9)

Implementar a lógica das **8 Personas** no Agente de Análise para que ele deixe de dar respostas genéricas e passe a agir como um time de engenharia completo.
EOF

echo "✅ Documentação v0.8.0 atualizada."
