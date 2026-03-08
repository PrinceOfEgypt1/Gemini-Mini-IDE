#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

log_info "Aprimorando consciência contextual do Chat no Agente..."

# Vamos alterar o método generateTextResponse para incluir o contexto do projeto
# Usamos perl para substituição multiline cirúrgica no agent.ts

# 1. Ler o arquivo atual
CURRENT_CONTENT=$(cat "$AGENT_FILE")

# 2. Definir a nova implementação do método generateTextResponse
# Agora ele recebe o 'context' completo (arquivos + resumo), não apenas o summary string
NEW_METHOD='  private async generateTextResponse(prompt: string, context?: ProjectContext) {
    let systemContext = "Você é um assistente técnico inteligente (Mini-IDE).";
    
    if (context && context.files && context.files.length > 0) {
        const fileList = context.files.map(f => f.path).join(", ");
        systemContext += `\n\nCONTEXTO DO PROJETO ATUAL:\nArquivos Gerados: ${fileList}\nResumo: ${context.summary || "N/A"}\n\nINSTRUÇÃO: Responda perguntas com base nestes arquivos. Se o usuário pedir para ver algo, diga o nome do arquivo onde está.`;
    } else {
        systemContext += "\n\nINSTRUÇÃO: Ainda não há projeto gerado. Responda genericamente ou sugira criar um projeto.";
    }

    const completion = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemContext },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
    });
    return completion.choices[0].message.content || "Sem resposta.";
  }'

# 3. Aplicar a substituição
# Como o método antigo tinha assinatura diferente (contextSummary?: string), o replace vai funcionar
# Estamos mudando a assinatura e o corpo.

# Padrão antigo para busca (aproximado)
SEARCH_PATTERN='private async generateTextResponse\(prompt: string, contextSummary\?: string\) \{[\s\S]*?return completion\.choices\[0\]\.message\.content \|\| "Sem resposta\.";\s*\}'

# Usando perl para substituir
perl -i -0777 -pe "s/$SEARCH_PATTERN/$NEW_METHOD/g" "$AGENT_FILE"

# 4. Ajustar a chamada no método analyze
# Onde estava: const answer = await this.generateTextResponse(userPrompt, context?.summary);
# Deve ficar: const answer = await this.generateTextResponse(userPrompt, context);
sed -i 's/this.generateTextResponse(userPrompt, context?.summary)/this.generateTextResponse(userPrompt, context)/g' "$AGENT_FILE"

log_ok "Agente agora tem consciência dos arquivos gerados durante o chat."

# Recompilação
log_info "Recompilando..."
cd packages/analysis-agent
../../node_modules/.bin/tsc -b
log_ok "Compilado."

# Restart
log_info "Reiniciando servidor..."
fuser -k 3200/tcp > /dev/null 2>&1 || true

log_ok "Correção aplicada. Agora, ao perguntar 'Mostre os documentos', o Agente saberá listar os arquivos reais."
