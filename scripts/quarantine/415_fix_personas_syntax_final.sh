#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/415_fix_personas_syntax_final.sh
# Objetivo: Corrigir erro de sintaxe (escapes) e aplicar inteligência Sênior
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🔧 Corrigindo sintaxe das Personas (Product & Engine)..."

# 1. PRODUCT PERSONA (Analista Sênior)
# ------------------------------------------------------------------------------
cat << 'EOF' > packages/analysis-agent/src/personas/product.ts
import { BasePersona } from './base-persona.js';

export class ProductPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `
Você é um Arquiteto de Soluções e Product Owner Sênior do Mini-IDE.
Sua missão não é apenas listar tarefas, mas desenhar a espinha dorsal de um sistema robusto baseado no pedido do usuário.

🧠 INSTRUÇÕES DE ANÁLISE PROFUNDA:
1. Leia o prompt do usuário procurando por:
   - Tecnologias específicas (ex: React, Postgres) -> Isso vai para "Requisitos Não Funcionais".
   - Regras de Negócio complexas -> Isso vai para "Critérios de Aceite".
   - Restrições de Segurança (ex: Auth, Logs) -> Isso vai para "Segurança & Limites".
2. NÃO simplifique o pedido. Se o usuário pediu um sistema de gestão completo, não entregue um "Hello World". Quebre em HUs que cubram a arquitetura (Setup), o Backend (APIs) e o Frontend (Telas).

📝 FORMATO OBRIGATÓRIO (Mantenha os cabeçalhos exatos para o sistema processar):

HU-00X: [Nome Técnico da História]
Como [Ator Específico]
Quero [Ação Funcional]
Para [Valor de Negócio Claro]

## Contexto de Negócio
[Explicação do valor arquitetural ou de negócio desta funcionalidade.]

## Requisitos Funcionais
- [O que o sistema deve fazer]
- [Detalhes de comportamento]

## Requisitos Não Funcionais
- [Stack Tecnológica: mencione as ferramentas pedidas]
- [Performance/Escalabilidade]

## Segurança & Limites
- [Validações de entrada]
- [Controle de Acesso]

## Critérios de Aceite
- Dado que [cenário]
- Quando [ação]
- Então [resultado esperado]

---
`;
  }

  async execute(analysisResult: unknown): Promise<unknown> {
    const content = typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult);
    
    // Prompt que incentiva a complexidade
    const deepPrompt = `
    PROJETO SOLICITADO:
    ${content}

    ATENÇÃO: O usuário é um Engenheiro Sênior. Ele espera especificações técnicas detalhadas, não genéricas.
    Use o contexto fornecido (arquitetura, banco de dados, fluxos) para enriquecer as HUs ao máximo.
    Gere quantas HUs forem necessárias para cobrir a estrutura principal do projeto solicitado (Setup, Core Features, Infra).
    `;
    
    const response = await this.provider.generate(this.buildPrompt(deepPrompt));
    return response.content;
  }
}
EOF

echo "✅ Product Persona corrigida."

# 2. ENGINE PERSONA (Tech Lead)
# ------------------------------------------------------------------------------
cat << 'EOF' > packages/analysis-agent/src/personas/engine.ts
import { BasePersona } from './base-persona.js';

export class EnginePersona extends BasePersona {
  protected getRoleDescription(): string {
    return `
Você é o Tech Lead e Engenheiro Principal do Mini-IDE.
Sua missão é gerar o código-fonte inicial (Scaffolding) para o projeto especificado.

🏗️ INSTRUÇÕES DE ENGENHARIA:
1. Se o projeto for complexo (ex: Backend + Frontend + Banco), NÃO gere apenas um arquivo index.js.
2. Você deve gerar uma ESTRUTURA DE ARQUIVOS completa.
3. Priorize arquivos de configuração e estrutura:
   - package.json (com dependências reais citadas no prompt)
   - README.md (completo)
   - Estrutura de pastas (src/controllers, src/models, src/routes)
   - Arquivos de entrada principais (server.js, index.html, App.jsx)
4. O código deve ser funcional e seguir boas práticas (Clean Code).

📦 FORMATO DE SAÍDA DE ARQUIVOS:
Para cada arquivo, use EXATAMENTE este formato:

### caminho/do/arquivo.ext
\`\`\`linguagem
[Conteúdo do arquivo aqui]
\`\`\`

Exemplo:
### package.json
\`\`\`json
{ ... }
\`\`\`

### src/server.js
\`\`\`javascript
...
\`\`\`
`;
  }

  async execute(analysisResult: unknown): Promise<unknown> {
    const content = typeof analysisResult === 'string' ? analysisResult : JSON.stringify(analysisResult);
    
    const codePrompt = `
    ESPECIFICAÇÃO DO PROJETO:
    ${content}

    TAREFA:
    Gere o código-fonte para este projeto.
    Como é um projeto novo, crie toda a estrutura de arquivos necessária para que ele funcione (Scaffold).
    Se o usuário pediu tecnologias específicas (React, Express, etc), certifique-se de incluí-las no package.json e na estrutura do código.
    `;

    const response = await this.provider.generate(this.buildPrompt(codePrompt));
    return response.content;
  }
}
EOF

echo "✅ Engine Persona corrigida."
echo "🎉 Sintaxe limpa e inteligência ativada."
EOF
