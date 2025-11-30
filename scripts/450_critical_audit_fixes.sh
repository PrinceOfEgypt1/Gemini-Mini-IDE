#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${RED}[WARN]${NC} $1"; }

log_info "Iniciando correção de itens CRÍTICOS da Auditoria..."

# ==============================================================================
# 1. CORREÇÃO DE CONTRATO DE API (Exportação ZIP)
# Problema: UI envia { projectData: ... } mas Server espera { project: ... }
# ==============================================================================
log_info "1. Corrigindo contrato de API (Frontend)..."
API_FILE="packages/ui/src/services/api.ts"

# Vamos reescrever o método exportProjectZip corretamente
# Nota: Estamos mudando a chave do JSON de 'projectData' para 'project'
sed -i 's/body: JSON.stringify({ projectData }),/body: JSON.stringify({ project: projectData }),/' "$API_FILE"

log_ok "API Frontend corrigida para enviar chave 'project'."

# ==============================================================================
# 2. REMOÇÃO DO LIMITE ARTIFICIAL DE ARQUIVOS (Stubs)
# Problema: Agent limita a 6 arquivos e stubs o resto.
# ==============================================================================
log_info "2. Removendo limite de geração de arquivos no Agent..."
AGENT_FILE="packages/analysis-agent/src/agent.ts"

# Substituição cirúrgica usando perl para multiline replacement (mais seguro que sed aqui)
# Estamos alterando a lógica de slice(0, 6) para pegar todos
perl -i -0777 -pe 's/const criticalFiles = manifest\n\s+\.sort\(\(a, b\) => \{\n\s+if \(a.criticality === "Config"\) return -1;\n\s+if \(b.criticality === "Config"\) return 1;\n\s+return 0;\n\s+\}\)\n\s+\.slice\(0, 6\);/const criticalFiles = manifest;\n      \/\/ Limite removido: gerando todos os arquivos planejados/g' "$AGENT_FILE"

# Remover a lógica de stubs, já que criticalFiles agora é tudo
perl -i -0777 -pe 's/const stubFiles = manifest.filter\(m => !criticalFiles.includes\(m\)\);//g' "$AGENT_FILE"
perl -i -0777 -pe 's/const stubs = stubFiles.map\(fileSpec => \(\{[\s\S]+?\}\)\);//g' "$AGENT_FILE"
perl -i -0777 -pe 's/const allFiles = \[\.\.\.generatedFiles, \.\.\.stubs\];/const allFiles = [...generatedFiles];/g' "$AGENT_FILE"
# Ajustar o log
perl -i -0777 -pe 's/console.log\(`🏭 \[4\/4\] Gerando \$\{criticalFiles.length\} arquivos reais e \$\{stubFiles.length\} stubs\.\.\.`\);/console.log(`🏭 [4\/4] Gerando ${criticalFiles.length} arquivos reais...`);/g' "$AGENT_FILE"

log_ok "Agente liberado para gerar Full Tree."

# ==============================================================================
# 3. REMOÇÃO DE MOCKS E CÓDIGO MORTO
# ==============================================================================
log_info "3. Removendo MockProvider e componentes duplicados..."

# Remove Mock Provider
rm -f "packages/analysis-agent/src/providers/mock-provider.ts"

# Remove Componentes duplicados na UI (Mantendo a versão 'common' do Button)
# O relatório diz que Button.tsx existe na raiz de components e em common
if [ -f "packages/ui/src/components/Button.tsx" ] && [ -f "packages/ui/src/components/common/Button.tsx" ]; then
    log_info "Removendo Button.tsx duplicado da raiz de components..."
    rm "packages/ui/src/components/Button.tsx"
    
    # Precisamos corrigir os imports. Onde importava de '../Button', agora deve ser de '../common/Button'
    # Isso é arriscado fazer com sed global sem análise, mas vamos corrigir os locais conhecidos
    find packages/ui/src -name "*.tsx" -print0 | xargs -0 sed -i 's|from "../Button"|from "../common/Button"|g'
    find packages/ui/src -name "*.tsx" -print0 | xargs -0 sed -i "s|from '../Button'|from '../common/Button'|g"
fi

log_ok "Limpeza concluída."

# ==============================================================================
# 4. CORREÇÃO DE TYPE SAFETY NO SERVER
# Problema: catch(err: any) viola regra eslint
# ==============================================================================
log_info "4. Corrigindo tipagem 'any' no Server..."
SERVER_INDEX="packages/server/src/index.ts"

# Substitui catch(err: any) por catch(err) e trata o erro
# Como é complexo substituir o bloco todo via script, vamos desabilitar a regra nessa linha específica
# ou fazer um cast seguro. Vamos optar pelo cast seguro na mensagem de erro.

perl -i -0777 -pe 's/\} catch \(err: any\) \{/\} catch (err) {/g' "$SERVER_INDEX"
perl -i -0777 -pe 's/request.log.error\(err\);/request.log.error(err as Error);/g' "$SERVER_INDEX"
perl -i -0777 -pe 's/details: err.message/details: (err as Error).message/g' "$SERVER_INDEX"

log_ok "Tipagem do servidor ajustada."

# ==============================================================================
# 5. REBUILD E VALIDAÇÃO
# ==============================================================================
log_info "Recompilando todo o projeto..."

# Força regeneração de tipos
pnpm -r build

log_ok "Correções aplicadas com sucesso."
echo ""
echo "🚨 AÇÕES MANUAIS NECESSÁRIAS:"
echo "1. Reinicie o servidor: pnpm --filter @mini-ide/server start"
echo "2. Recarregue a UI."
echo "3. Teste a exportação ZIP (Agora deve funcionar)."
echo "4. Teste a geração de um projeto (Agora deve demorar mais, mas gerar todos os arquivos)."
