#!/bin/bash

TARGET="packages/analysis-agent/src/agent.test.ts"

echo "🧠 [QA Logic Fix] Injetando Mock Inteligente (JSON/Text Router) em: $TARGET"

# Script Node.js para substituir o mock "burro" pelo "inteligente"
node -e "
const fs = require('fs');
const filePath = '$TARGET';

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove o Mock da OpenAI anterior (seja qual for a versão)
  const regexRemove = /vi\.mock\(['\"]openai['\"],\s*\(\)\s*=>\s*\{[\s\S]*?\}\);/g;
  
  if (regexRemove.test(content)) {
    content = content.replace(regexRemove, '');
    console.log('🧹 Mock antigo removido.');
  }

  // 2. Define o Mock INTELIGENTE
  const smartMock = \`
// [QA Fix] Mock Inteligente da OpenAI (Routing JSON vs Text)
vi.mock('openai', () => {
  const MockClient = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async (params) => {
          // Detecta se o Agente pediu JSON ou Texto
          const isJson = params?.response_format?.type === 'json_object';
          
          // Roteia para a fila de mocks correta
          const result = isJson 
            ? await mocks.generateJSON() 
            : await mocks.generateText();
          
          // Retorna fallback seguro se a fila estiver vazia para evitar crash
          const content = result !== undefined ? result : (isJson ? '{}' : '');

          return {
            choices: [{ message: { content: content } }]
          };
        })
      }
    }
  }));

  return {
    OpenAI: MockClient,
    default: MockClient,
  };
});\`;

  // 3. Insere o novo mock logo após o bloco 'mocks'
  const anchorRegex = /const mocks = vi\.hoisted\(\(\) => \(\{[\s\S]*?\}\)\);/;
  
  if (anchorRegex.test(content)) {
    content = content.replace(anchorRegex, (match) => match + \"\\n\" + smartMock);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Mock Inteligente injetado com sucesso!');
  } else {
    console.error('❌ Erro: Ponto de inserção (vi.hoisted) não encontrado.');
    process.exit(1);
  }

} catch (err) {
  console.error('❌ Erro ao processar arquivo:', err.message);
  process.exit(1);
}
"

echo "🧪 Verificando se os testes lógicos agora passam..."
./node_modules/.bin/vitest run packages/analysis-agent/src/agent.test.ts
