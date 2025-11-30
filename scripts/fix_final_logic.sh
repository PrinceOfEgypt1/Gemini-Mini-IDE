#!/bin/bash

TARGET="packages/analysis-agent/src/agent.test.ts"

echo "🐛 [QA Logic Fix] Preenchendo Manifesto vazio em: $TARGET"

# Script Node.js para preencher o array manifest: [] com 8 itens
node -e "
const fs = require('fs');
const filePath = '$TARGET';

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Encontra o mock que retorna 'manifest: []' e o substitui por um com 8 itens
  // Isso força o Agente a iterar 8 vezes e gerar os 8 arquivos esperados
  const target = 'manifest: []';
  
  // Cria um array string com 8 itens
  const replacement = 'manifest: [\"f1\",\"f2\",\"f3\",\"f4\",\"f5\",\"f6\",\"f7\",\"f8\"]';

  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Manifesto corrigido: Agora retorna 8 arquivos planejados.');
  } else {
    // Caso o array já tenha algo ou a formatação seja diferente, tentamos regex mais flexível
    const regex = /manifest:\s*\[\s*\]/g;
    if (regex.test(content)) {
         content = content.replace(regex, replacement);
         fs.writeFileSync(filePath, content, 'utf8');
         console.log('✅ Manifesto corrigido via Regex.');
    } else {
         console.log('ℹ️ Não foi necessário alterar (manifesto já parece preenchido ou não encontrado).');
    }
  }

} catch (err) {
  console.error('❌ Erro:', err.message);
  process.exit(1);
}
"

echo "🚀 Rodando Pipeline..."
bash 42_pipeline_checklist.sh
