#!/usr/bin/env bash
set -e

echo "📚 Atualizando documentação de forma INCREMENTAL (v0.9.0)..."

# 1. Atualizar Versão e Status no README.md (Sem apagar o resto)
# -----------------------------------------------------
echo "📝 Atualizando versão no README.md..."
# Substitui v0.8.0 por v0.9.0
sed -i 's/v0.8.0/v0.9.0/g' README.md
# Atualiza o status textual
sed -i 's/Status Atual:.*Pipeline/Status Atual: v0.9.0 (Beta Intelligence) - Orquestração de Personas Ativa\n> **Pipeline/g' README.md

# 2. Atualizar BACKLOG.md (Marcar HUs como feitas)
# -----------------------------------------------------
echo "📝 Atualizando status das HUs no BACKLOG.md..."
sed -i 's/📅 \*\*3.2 HU-LLM-Persona-Analysis\*\*/✅ \*\*3.2 HU-LLM-Persona-Analysis\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*3.3 HU-LLM-Persona-Product\*\*/✅ \*\*3.3 HU-LLM-Persona-Product\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*3.4 HU-LLM-Persona-Architect\*\*/✅ \*\*3.4 HU-LLM-Persona-Architect\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*3.5 HU-LLM-Persona-Engine\*\*/✅ \*\*3.5 HU-LLM-Persona-Engine\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*3.6 HU-LLM-Persona-UX\*\*/✅ \*\*3.6 HU-LLM-Persona-UX\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*3.7 HU-LLM-Persona-Quality\*\*/✅ \*\*3.7 HU-LLM-Persona-Quality\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*3.8 HU-LLM-Persona-Ops\*\*/✅ \*\*3.8 HU-LLM-Persona-Ops\*\*/' docs/BACKLOG.md
sed -i 's/📅 \*\*3.9 HU-LLM-Persona-Fenix\*\*/✅ \*\*3.9 HU-LLM-Persona-Fenix\*\*/' docs/BACKLOG.md

# 3. Atualizar DEVELOPMENT.md (Incremental)
# -----------------------------------------------------
echo "📝 Atualizando DEVELOPMENT.md..."

# 3.1 Atualiza o cabeçalho de versão
sed -i 's/Versão do Software:.*$/Versão do Software: v0.9.0 (Multi-Persona Agent)/' DEVELOPMENT.md
sed -i "s/Data:.*$/Data: $(date +%Y-%m-%d)/" DEVELOPMENT.md

# 3.2 Atualiza o status da Fase 9 na tabela de resumo (se existir tabela)
# Procura a linha da Fase 9 e muda o ícone/texto
sed -i 's/9.*Personas.*📅 Pendente/9 | Orquestração de Personas | ✅ Concluído | Agente Multi-Persona/' DEVELOPMENT.md

# 3.3 Adiciona os detalhes técnicos da Fase 9 ao final do documento (Append)
cat >> DEVELOPMENT.md <<EOF

---

## 📋 Registro da Fase 9: Orquestração de Personas (Concluída)

**Objetivo:** Implementar lógica de IA complexa (Chain of Thought) substituindo o mock simples.

### Artefatos Técnicos Entregues
*   **Base de Personas:** \`analysis-agent/src/personas/base-persona.ts\` (Classe Abstrata).
*   **Personas Especializadas:** Implementadas 8 classes em \`analysis-agent/src/personas/*.ts\` (Analysis, Product, Architect, Engine, UX, Quality, Ops, Fenix).
*   **Orquestrador:** \`AnalysisAgent\` atualizado para chamar as personas sequencialmente, passando o contexto de uma para a outra.
*   **Mock Inteligente:** \`MockProvider\` atualizado para simular respostas específicas baseadas no prompt de cada persona, permitindo testes sem custo de API.

### Próximos Passos Imediatos (Fase 10)
*   Implementar geração de HUs sob demanda (Wizard).
*   Criar scripts de ambiente reais.
EOF

echo "✅ Documentação atualizada incrementalmente."
