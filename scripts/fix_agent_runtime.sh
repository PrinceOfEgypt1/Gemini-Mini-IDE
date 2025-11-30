#!/bin/bash

TARGET="packages/analysis-agent/src/agent.ts"

echo "🛡️ [Runtime Fix] Blindando Agent contra erros de JSON e Caminhos..."

node -e "
const fs = require('fs');
const filePath = '$TARGET';

try {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Correção: Tratamento de String Vazia do LLM
  // Problema: JSON.parse(\"\") quebra. O operador ?? ignora string vazia.
  // Solução: Mudar ?? \"{}\" para || \"{}\"
  // Regex: Procura por .content ?? \"{}\"
  const nullishRegex = /\.content \?\? \"\{\}\"/g;
  if (nullishRegex.test(content)) {
    content = content.replace(nullishRegex, '.content || \"{}\"');
    console.log('✅ Fallback de JSON corrigido (?? -> ||)');
    modified = true;
  }

  // 2. Correção: Normalização de Caminhos (Remover Trailing Slash)
  // Problema: 'src/backend/auth/' é tratado como arquivo
  // Solução: Adicionar .replace(/\/+$/, \"\")
  const pathRegex = /return rawPath\.trim\(\)\.replace\(\/\^\(\\\.\\\/\|\\\/\)\+\/,\s*\"\"\);/;
  const pathReplacement = 'return rawPath.trim().replace(/^(\\.\\/|\\/)+/, \"\").replace(/\\/+$/, \"\");';
  
  if (pathRegex.test(content)) {
    content = content.replace(pathRegex, pathReplacement);
    console.log('✅ Normalização de caminhos aprimorada (Remove trailing slashes)');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('💾 Arquivo agent.ts blindado.');
  } else {
    console.log('ℹ️ Nenhuma alteração necessária.');
  }

} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
}
"

echo "♻️ Reconstruindo o pacote para aplicar mudanças..."
pnpm --filter @mini-ide/analysis-agent build
