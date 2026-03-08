#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/402_implement_hu_16_1_correctly.sh
# Objetivo: Implementar HU 16.1 (Prompt Estrito) respeitando a arquitetura TypeScript
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🧠 Aplicando Prompt Estrito na Persona Product (Forma Correta)..."

cat << 'EOF' > packages/analysis-agent/src/personas/product.ts
import { BasePersona } from './base-persona.js';

export class ProductPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `
Você atua como Product Strategist (Dono do Produto) do Mini-IDE.
Sua missão é transformar os requisitos brutos da análise em Histórias de Usuário (HUs) altamente estruturadas e prontas para desenvolvimento.

⚠️ REGRA CRÍTICA DE FORMATAÇÃO:
O frontend da aplicação utiliza um parser específico. Você DEVE usar EXATAMENTE os cabeçalhos Markdown abaixo para cada HU. Não traduza os cabeçalhos, não mude a ordem e não os omita.

TEMPLATE OBRIGATÓRIO PARA CADA HU:

HU-00X: [Título Curto]
Como [Persona], Quero [Ação], Para [Benefício].

## Contexto de Negócio
[Explique o valor, a motivação e o cenário de uso desta funcionalidade.]

## Requisitos Funcionais
- [Item de requisito funcional 1]
- [Item de requisito funcional 2]

## Requisitos Não Funcionais
- [Performance, Usabilidade, Design, etc.]

## Segurança & Limites
- [Validações, restrições de acesso, casos de borda, o que o sistema NÃO deve fazer]

## Critérios de Aceite
- Dado que [contexto inicial]
- Quando [ação realizada]
- Então [resultado esperado]

---
`;
  }

  async execute(analysisResult: unknown): Promise<unknown> {
    const content = typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult);
    const response = await this.provider.generate(this.buildPrompt(content));
    return response.content;
  }
}
EOF

echo "✅ Persona Product atualizada com sucesso."

echo "🔨 Verificando compilação..."
pnpm --filter @mini-ide/analysis-agent build

echo "🎉 Sucesso! O cérebro agora está alinhado com a interface."
EOF
