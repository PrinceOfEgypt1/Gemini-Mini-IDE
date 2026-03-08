#!/bin/bash

# Define o arquivo alvo
TARGET="packages/analysis-agent/src/agent.test.ts"

echo "🔧 [QA Fix] Reconstruindo Mock da OpenAI em: $TARGET"

# Script Node.js para substituição robusta via Regex
node -e "
const fs = require('fs');
const filePath = '$TARGET';

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove qualquer mock anterior do 'openai' (o que estava quebrado)
  // Regex: procura por vi.mock('openai', ...) até o fim do bloco
  const regexRemove = /vi\.mock\(['\"]openai['\"],\s*\(\)\s*=>\s*\{[\s\S]*?\}\);/g;
  
  if (regexRemove.test(content)) {
    content = content.replace(regexRemove, '');
    console.log('🧹 Limpou mock anterior (incorreto).');
  }

  // 2. Define o Mock CORRETO (Exportando 'OpenAI' e 'default')
  const correctMock = \`
// [QA Fix] Mock da OpenAI (Named Export + Default Export)
vi.mock('openai', () => {
  const MockClient = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async () => {
          // Redireciona para os mocks de comportamento definidos no teste
          const result = await mocks.generateJSON();
          return {
            choices: [{ message: { content: result } }]
          };
        })
      }
    }
  }));

  return {
    OpenAI: MockClient, // <--- A CHAVE QUE FALTAVA
    default: MockClient,
  };
});\`;

  // 3. Insere o novo mock no lugar certo (logo após a definição dos mocks locais)
  const anchorRegex = /const mocks = vi\.hoisted\(\(\) => \(\{[\s\S]*?\}\)\);/;
  
  if (anchorRegex.test(content)) {
    content = content.replace(anchorRegex, (match) => match + \"\\n\" + correctMock);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Mock corrigido injetado com sucesso!');
  } else {
    console.error('❌ Não foi possível encontrar o ponto de inserção (vi.hoisted).');
    process.exit(1);
  }

} catch (err) {
  console.error('❌ Erro ao manipular arquivo:', err.message);
  process.exit(1);
}
"

echo "🧪 Verificando a correção imediatamente..."
./node_modules/.bin/vitest run packages/analysis-agent/src/agent.test.ts
