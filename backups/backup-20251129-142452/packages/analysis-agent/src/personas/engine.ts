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
