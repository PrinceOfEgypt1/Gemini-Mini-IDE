#!/bin/bash

# Define o arquivo alvo
TARGET="packages/analysis-agent/src/agent.test.ts"

echo "🔧 Aplicando patch de Timeout no arquivo: $TARGET"

# Usa Node.js para fazer a injeção cirúrgica do texto
node -e "
const fs = require('fs');
const filePath = '$TARGET';

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Verifica se já foi aplicado
  if (content.includes('vi.setConfig({ testTimeout: 30000 });')) {
    console.log('✅ O timeout já está configurado. Nenhuma alteração necessária.');
    process.exit(0);
  }

  // Define o ponto de ancoragem (logo após abrir o describe)
  const anchor = \"describe('AnalysisAgent (Orchestration)', () => {\";
  const injection = \"\\n  // [QA Fix] Aumenta timeout para suportar delays de batching do Agent v4.3\\n  vi.setConfig({ testTimeout: 30000 });\";

  if (content.includes(anchor)) {
    // Substitui a âncora pela âncora + a injeção
    const newContent = content.replace(anchor, anchor + injection);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('✅ Patch aplicado com sucesso!');
  } else {
    console.error('❌ Erro: Não foi possível encontrar o bloco describe principal.');
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Erro ao ler/gravar arquivo:', err.message);
  process.exit(1);
}
"

# Executa o teste imediatamente para validar
echo "🧪 Validando correção..."
./node_modules/.bin/vitest run packages/analysis-agent/src/agent.test.ts
