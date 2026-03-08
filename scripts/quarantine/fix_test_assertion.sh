#!/bin/bash

TARGET="packages/analysis-agent/src/agent.test.ts"

echo "🎯 [QA Fix] Ajustando asserções de texto (Acentuação) em: $TARGET"

# Script Node.js para correção semântica
node -e "
const fs = require('fs');
const filePath = '$TARGET';

try {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. Corrige o Mock de entrada (Input)
  // De: complexity: \"Media\" -> Para: complexity: \"Média\"
  if (content.includes('complexity: \"Media\"')) {
    content = content.replace('complexity: \"Media\"', 'complexity: \"Média\"');
    console.log('✅ Input do Mock ajustado: Media -> Média');
    modified = true;
  }

  // 2. Corrige a Expectativa do Teste (Assertion)
  // De: .toBe(\"Media\") -> Para: .toBe(\"Média\")
  if (content.includes('.toBe(\"Media\")')) {
    content = content.replace('.toBe(\"Media\")', '.toBe(\"Média\")');
    console.log('✅ Expectativa do Teste ajustada: Media -> Média');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('💾 Arquivo salvo com as correções.');
  } else {
    console.log('ℹ️ Nenhuma alteração necessária (já parece estar corrigido).');
  }

} catch (err) {
  console.error('❌ Erro ao processar arquivo:', err.message);
  process.exit(1);
}
"

echo "🚀 Executando Pipeline de Validação..."
bash 42_pipeline_checklist.sh
