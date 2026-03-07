#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/409_force_product_structure.sh
# Objetivo: Forçar Persona Product a incluir TODAS as seções via Few-Shot Prompting
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🧠 Aplicando 'Few-Shot Prompting' na Persona Product..."

cat << 'EOF' > packages/analysis-agent/src/personas/product.ts
import { BasePersona } from './base-persona.js';

export class ProductPersona extends BasePersona {
  protected getRoleDescription(): string {
    return \`
Você é o Product Strategist Senior do Mini-IDE.
Sua responsabilidade é definir o escopo do projeto com precisão cirúrgica.

🛑 REGRA DE OURO (CRÍTICA):
O seu output é processado por um software rígido. Você NÃO PODE omitir seções.
Para CADA História de Usuário (HU), você DEVE incluir os cabeçalhos abaixo exatamente como escrito.

Se não houver requisitos específicos para uma seção, escreva "Padrão de indústria" ou "Nenhum específico", mas NUNCA pule o cabeçalho.

EXEMPLO DE OUTPUT ESPERADO (Siga este formato):

HU-001: Nome da História
Como [Persona]
Quero [Ação]
Para [Benefício]

## Contexto de Negócio
Esta funcionalidade é essencial para garantir que o usuário possa...

## Requisitos Funcionais
- O sistema deve validar X.
- O botão deve fazer Y.

## Requisitos Não Funcionais
- Tempo de resposta < 200ms.
- Interface responsiva.

## Segurança & Limites
- Validar inputs contra XSS.
- Rate limit de 10 req/s.

## Critérios de Aceite
- Dado que X, Quando Y, Então Z.

---

(Repita para as próximas HUs...)
\`;
  }

  async execute(analysisResult: unknown): Promise<unknown> {
    const content = typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult);
    // Adiciona um reforço final no prompt do usuário
    const reinforcedPrompt = \`\${content}\n\nLEMBRE-SE: Use os cabeçalhos Markdown (## Requisitos Funcionais, ## Segurança & Limites, etc) em TODAS as HUs.\`;
    
    const response = await this.provider.generate(this.buildPrompt(reinforcedPrompt));
    return response.content;
  }
}
EOF

echo "✅ Persona Product re-treinada com exemplos explícitos."
EOF
