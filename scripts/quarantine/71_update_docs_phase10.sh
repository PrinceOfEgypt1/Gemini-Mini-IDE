#!/usr/bin/env bash
set -e

echo "📚 Atualizando documentação para v0.10.0 (Fase 10 Concluída)..."

# 1. Atualizar README.md (Incremental)
# -----------------------------------------------------
echo "📝 Atualizando versão no README.md..."
sed -i 's/v0.9.0/v0.10.0/g' README.md
sed -i 's/Status Atual:.*Pipeline/Status Atual: v0.10.0 (Beta Wizard) - Criação de Projetos Guiada\n> **Pipeline/g' README.md

# Adicionar nova funcionalidade à lista
if ! grep -q "Wizard de Projetos" README.md; then
    sed -i '/Timeline:/a 5. **Wizard de Projetos:** Gere HUs e scripts de ambiente automaticamente.' README.md
fi

# 2. Atualizar BACKLOG.md (Marcar HUs da Fase 10 como Feitas)
# -----------------------------------------------------
echo "📝 Atualizando status das HUs no BACKLOG.md..."
sed -i 's/📅 \*\*10.1 HU-MINI-IDE-Discovery-001\*\*/✅ \*\*10.1 HU-MINI-IDE-Discovery-001\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*10.2 HU-MINI-IDE-Discovery-002\*\*/✅ \*\*10.2 HU-MINI-IDE-Discovery-002\*\*/' docs/BACKLOG.md
# HU 10.3 (Solicitação de diretório) coberta pelo Input do Wizard
sed -i 's/📅 \*\*10.3 HU-MINI-IDE-Env-003\*\*/✅ \*\*10.3 HU-MINI-IDE-Env-003\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*10.4 HU-MINI-IDE-Env-004\*\*/✅ \*\*10.4 HU-MINI-IDE-Env-004\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*9.6 HU-UI-Project-Creation-006\*\*/✅ \*\*9.6 HU-UI-Project-Creation-006\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*10.7 HU-MINI-IDE-Gen-Quality-007\*\*/✅ \*\*10.7 HU-MINI-IDE-Gen-Quality-007\*\*/' docs/BACKLOG.md

# 3. Atualizar DEVELOPMENT.md (Incremental)
# -----------------------------------------------------
echo "📝 Atualizando DEVELOPMENT.md..."

# Atualiza cabeçalho
sed -i 's/Versão do Documento:.*$/Versão do Documento: 5.6 (Phase 10 Done)/' DEVELOPMENT.md
sed -i 's/Versão do Software:.*$/Versão do Software: v0.10.0 (Project Wizard)/' DEVELOPMENT.md
sed -i "s/Data:.*$/Data: $(date +%Y-%m-%d)/" DEVELOPMENT.md

# Atualiza tabela de status
sed -i 's/10.*Wizard.*📅 Pendente/10 | Fluxo de Engenharia (Wizard) | ✅ Concluído | Geração de HUs e Scripts/' DEVELOPMENT.md

# Adiciona detalhes da Fase 10 ao final
cat >> DEVELOPMENT.md <<EOF

---

## 📋 Registro da Fase 10: Fluxo de Engenharia (Concluída)

**Objetivo:** Implementar o "Golden Path" de criação de projetos: Intenção -> HUs -> Scripts.

### Artefatos Técnicos Entregues
*   **Backend Services:**
    *   \`analysis-agent/src/services/discovery-service.ts\`: Gera HUs estruturadas via LLM.
    *   \`analysis-agent/src/services/generator-service.ts\`: Gera scripts Bash (\`setup.sh\`, \`pipeline.sh\`).
*   **API Endpoints:**
    *   \`POST /discovery/hus\`: Endpoint para gerar HUs a partir de intenção.
    *   \`POST /wizard/generate\`: Endpoint para gerar o pacote de scripts final.
*   **Frontend Wizard:**
    *   \`ui/src/components/wizard/ProjectWizard.tsx\`: Modal de 3 passos (Intenção, Revisão, Download).
    *   Integração com botão "Criar Projeto" no Header.

### Próximos Passos Imediatos (Fase 11)
*   Implementar o **Consolidator** para transformar o plano abstrato em código-fonte real (arquivos de projeto).
*   Permitir exportação do código gerado (.zip).
EOF

echo "✅ Documentação v0.10.0 atualizada com sucesso."
