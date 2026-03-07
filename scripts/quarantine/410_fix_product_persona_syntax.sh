#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/410_fix_product_persona_syntax.sh
# Objetivo: Corrigir erro de sintaxe (barras invertidas) no product.ts
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🔧 Corrigindo sintaxe do ProductPersona..."

cat << 'EOF' > packages/analysis-agent/src/personas/product.ts
import { BasePersona } from './base-persona.js';

export class ProductPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `
Você é o Product Strategist Senior do Mini-IDE.
Sua responsabilidade é definir o escopo do projeto com precisão cirúrgica.

🛑 REGRA DE OURO (CRÍTICA):
O seu output é processado por um software rígido. Você NÃO PODE omitir seções.
Para CADA História de Usuário (HU), você DEVE incluir os cabeçalhos abaixo exatamente como escrito.

Se não houver requisitos específicos para uma seção, escreva "Padrão de indústria" ou "Nenhum específico", mas NUNCA pule o cabeçalho.

EXEMPLO DE OUTPUT ESPERADO (Siga este formato):

HU-00X: [Nome da História]
Como [Persona]
Quero [Ação]
Para [Benefício]

## Contexto de Negócio
[Descreva o porquê. Mínimo 2 linhas.]

## Requisitos Funcionais
- [Liste pelo menos 2 requisitos funcionais]
- [Detalhe o comportamento esperado]

## Requisitos Não Funcionais
- [Mencione Performance]
- [Mencione Usabilidade]

## Segurança & Limites
- [Validação de inputs]
- [Prevenção de erros]

## Critérios de Aceite
- Dado que [cenário]
- Quando [ação]
- Então [resultado]

---
`;
  }

  async execute(analysisResult: unknown): Promise<unknown> {
    const content = typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult);
    // Reforço final no prompt do usuário
    const reinforcedPrompt = `${content}\n\nLEMBRE-SE: Use os cabeçalhos Markdown (## Requisitos Funcionais, ## Segurança & Limites, etc) em TODAS as HUs.`;
    
    const response = await this.provider.generate(this.buildPrompt(reinforcedPrompt));
    return response.content;
  }
}
EOF

echo "✅ Sintaxe do ProductPersona corrigida."
EOF
