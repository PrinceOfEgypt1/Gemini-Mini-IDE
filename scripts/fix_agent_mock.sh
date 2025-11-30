#!/bin/bash

TARGET="packages/analysis-agent/src/agent.test.ts"

echo "🔧 [QA Fix] Corrigindo mocks da OpenAI em: $TARGET"

# Usa Node.js para injetar o Mock da OpenAI logo após a definição dos 'mocks'
node -e "
const fs = require('fs');
const filePath = '$TARGET';

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Verifica se já existe o mock do pacote 'openai'
  if (content.includes(\"vi.mock('openai'\")) {
    console.log('⚠️ O mock de OpenAI já parece existir. Verifique se está correto.');
    process.exit(0);
  }

  // Encontra o ponto de inserção: logo após o bloco vi.hoisted
  const hook = 'const mocks = vi.hoisted(() => ({';
  const endHookRegex = /generateText: vi\.fn\(\)\s*\}\)\);/;
  
  if (!endHookRegex.test(content)) {
     console.error('❌ Não foi possível localizar o bloco mocks inicial.');
     process.exit(1);
  }

  // O novo código do Mock que intercepta a OpenAI e redireciona para nossos mocks existentes
  const newMock = \`
// [QA Fix] Mockando a biblioteca OpenAI diretamente para evitar chamadas de rede (Erro 401)
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            // Reutiliza a fila de respostas do mock existente
            const result = await mocks.generateJSON(); 
            return {
              choices: [{ message: { content: result } }]
            };
          })
        }
      }
    }))
  };
});\`;

  // Insere o novo mock logo após o fechamento do hook mocks
  const newContent = content.replace(endHookRegex, (match) => match + \"\\n\" + newMock);

  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('✅ Mock da OpenAI injetado com sucesso!');

} catch (err) {
  console.error('❌ Erro crítico:', err.message);
  process.exit(1);
}
"

echo "🧪 Validando a correção..."
./node_modules/.bin/vitest run packages/analysis-agent/src/agent.test.ts
