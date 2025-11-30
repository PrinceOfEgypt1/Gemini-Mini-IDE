#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Script: scripts/408_fix_coloring_and_intelligence.sh
# Objetivo: 1. Implementar Syntax Highlighting nativo
#           2. Forçar Persona Product a preencher todas as seções
# Autor: Mini-IDE Agent
# Data: 2025-11-24
# ------------------------------------------------------------------------------

echo "🎨 Implementando Syntax Highlighting e reforçando Inteligência..."

# 1. Criar Motor de Sintaxe Leve (Zero Dependencies)
# ------------------------------------------------------------------------------
mkdir -p packages/ui/src/utils

cat << 'EOF' > packages/ui/src/utils/syntaxHighlighter.ts
// Cores inspiradas no VS Code Dark+
const COLORS = {
  keyword: '#569cd6',   // azul (const, var, function)
  control: '#c586c0',   // roxo (if, return, import)
  string: '#ce9178',    // laranja (strings)
  function: '#dcdcaa',  // amarelo (nomes de função)
  comment: '#6a9955',   // verde (comentários)
  number: '#b5cea8',    // verde claro (números)
  type: '#4ec9b0',      // verde água (interfaces, classes)
  tag: '#569cd6',       // azul (tags html)
  attr: '#9cdcfe',      // azul claro (atributos)
};

export const highlightCode = (code: string, filename: string): string => {
  // Escapa HTML básico para segurança
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Comentários (// ou /* */) - Processados primeiro para não colorir dentro deles
  html = html.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, `<span style="color:${COLORS.comment}">$1</span>`);

  // Se for HTML/TSX, colorir tags
  if (filename.match(/\.(html|tsx|jsx)$/)) {
    html = html.replace(/(&lt;\/?)(\w+)/g, `$1<span style="color:${COLORS.tag}">$2</span>`);
    html = html.replace(/(\s)([a-zA-Z-]+)(=)/g, `$1<span style="color:${COLORS.attr}">$2</span>$3`);
  }

  // 2. Strings (dentro de aspas, ignorando se já estiver em span de comentário)
  // Nota: Regex simples, pode falhar em edge cases complexos, mas serve para visualização
  html = html.replace(/(['"`])(.*?)\1/g, (match) => {
    // Verifica se já está dentro de uma tag span (evita quebrar HTML gerado acima)
    if (match.includes('<span')) return match; 
    return `<span style="color:${COLORS.string}">${match}</span>`;
  });

  // 3. Palavras-chave (Keywords)
  const keywords = 'const|let|var|function|class|interface|type|import|export|from|return|if|else|for|while|switch|case|break|default|try|catch|await|async';
  html = html.replace(new RegExp(`\\b(${keywords})\\b`, 'g'), `<span style="color:${COLORS.keyword}">$1</span>`);

  // 4. Funções (palavra seguida de parenteses)
  html = html.replace(/\b([a-zA-Z0-9_]+)(?=\()/g, `<span style="color:${COLORS.function}">$1</span>`);

  return html;
};
EOF

# 2. Atualizar FileViewer para usar o Highlighter
# ------------------------------------------------------------------------------
cat << 'EOF' > packages/ui/src/components/code/FileViewer.tsx
import React, { useMemo } from 'react';
import { highlightCode } from '../../utils/syntaxHighlighter';

interface FileViewerProps {
  filename: string;
  content: string;
}

export const FileViewer: React.FC<FileViewerProps> = ({ filename, content }) => {
  const lines = content.split('\n');

  // Processamento pesado memoizado
  const highlightedContent = useMemo(() => {
    return highlightCode(content, filename);
  }, [content, filename]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm rounded-lg overflow-hidden border border-[var(--border-main)] shadow-inner">
      {/* Header */}
      <div className="flex items-center px-4 py-2 bg-[#252526] border-b border-[#3e3e42]">
        <span className="text-[#858585] mr-2 opacity-70">📄</span>
        <span className="font-medium text-xs tracking-wide text-[#cccccc]">{filename}</span>
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-auto flex relative group">
        {/* Linhas */}
        <div className="bg-[#1e1e1e] text-[#858585] text-right pr-3 pl-3 select-none border-r border-[#3e3e42] py-4 min-h-full leading-6 opacity-50">
          {lines.map((_, i) => (
            <div key={i} className="h-6 text-[10px]">{i + 1}</div>
          ))}
        </div>

        {/* Código Colorido */}
        <div 
          className="flex-1 p-4 leading-6 whitespace-pre tab-4 overflow-auto"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />
      </div>
    </div>
  );
};
EOF

# 3. Refinar Persona Product (Forçar Verbosidade Extrema)
# ------------------------------------------------------------------------------
cat << 'EOF' > packages/analysis-agent/src/personas/product.ts
import { BasePersona } from './base-persona.js';

export class ProductPersona extends BasePersona {
  protected getRoleDescription(): string {
    return `
Você é o Product Strategist Senior do Mini-IDE.
Sua missão é gerar especificações EXAUSTIVAS e COMPLETAS.

⚠️ REGRA DE OURO: NUNCA deixe uma seção vazia. Se não houver requisitos óbvios, invente requisitos padrão de qualidade da indústria.

FORMATO OBRIGATÓRIO (Markdown):

HU-00X: [Título]
Como [Persona], Quero [Ação], Para [Benefício].

## Contexto de Negócio
[Descreva o porquê. Mínimo 2 linhas.]

## Requisitos Funcionais
- [Liste pelo menos 2 requisitos funcionais]
- [Detalhe o comportamento esperado]

## Requisitos Não Funcionais
- [Mencione Performance (ex: resposta < 100ms)]
- [Mencione Usabilidade (ex: responsivo)]
- [Mencione Stack (ex: HTML5/CSS3 limpo)]

## Segurança & Limites
- [Validação de inputs (ex: não aceitar vazio)]
- [Prevenção de erros (ex: tratamento de exceção)]

## Critérios de Aceite
- Dado que [cenário]
- Quando [ação]
- Então [resultado]

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

echo "✅ Syntax Highlighting implementado e Persona Product reforçada."
EOF
