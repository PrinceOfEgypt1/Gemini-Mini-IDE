#!/bin/bash

TARGET="packages/analysis-agent/src/agent.ts"

echo "🛡️ [Runtime Fix] Blindando Agent (Versão Segura)..."

# Script Node.js usando substituição exata de string (sem regex complexo)
node -e "
const fs = require('fs');
const filePath = '$TARGET';

try {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Correção: Tratamento de String Vazia do LLM (Linha ~461)
  // De: ...content ?? \"{}\"
  // Para: ...content || \"{}\"
  const targetJSON = 'const rawContent = completion.choices[0]?.message?.content ?? \"{}\";';
  const fixJSON = 'const rawContent = completion.choices[0]?.message?.content || \"{}\";';
  
  if (content.includes(targetJSON)) {
    content = content.replace(targetJSON, fixJSON);
    console.log('✅ Fallback de JSON corrigido (?? -> ||)');
    modified = true;
  } else if (content.includes('?? \"{}\"')) {
     // Fallback genérico se a linha exata não bater por espaçamento
     content = content.replace('?? \"{}\"', '|| \"{}\"');
     console.log('✅ Fallback de JSON corrigido (Genérico)');
     modified = true;
  }

  // 2. Correção: Normalização de Caminhos (Linha ~183)
  // Adiciona .replace(/\/+$/, \"\") ao final da cadeia
  const targetPath = 'return rawPath.trim().replace(/^(\\.\\/|\\/)+/, \"\");';
  const fixPath = 'return rawPath.trim().replace(/^(\\.\\/|\\/)+/, \"\").replace(/\\/+$/, \"\");';
  
  if (content.includes(targetPath)) {
    content = content.replace(targetPath, fixPath);
    console.log('✅ Normalização de caminhos aprimorada (Remove trailing slashes)');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('💾 Arquivo agent.ts salvo com sucesso.');
  } else {
    console.log('ℹ️ Nenhuma alteração necessária (o código já parece corrigido).');
  }

} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
}
"

echo "♻️ Reconstruindo o pacote..."
pnpm --filter @mini-ide/analysis-agent build
