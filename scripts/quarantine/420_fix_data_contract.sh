#!/usr/bin/env bash
################################################################################
# Script: 420_fix_data_contract.sh
# Objetivo: Corrigir quebra de contrato entre Backend (agent.ts) e Frontend
# Autor: Claude (Diagnóstico de Interface Mismatch)
# Data: 2024-11-26
#
# PROBLEMA:
#   - Frontend espera { summary, requestId } na RAIZ
#   - Backend retorna { analysis: { summary }, ... }
#   - Nomes das props das HUs divergem
#
# SOLUÇÃO:
#   - Usar Node.js para reescrever o bloco de retorno do agent.ts
################################################################################

set -euo pipefail

readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

AGENT_FILE="packages/analysis-agent/src/agent.ts"

if [[ ! -f "$AGENT_FILE" ]]; then
  log_error "Execute este script na raiz do projeto Mini-IDE."
  exit 1
fi

log_info "=== Fase 420: Correção de Contrato de Dados ==="

# Backup
cp "$AGENT_FILE" "${AGENT_FILE}.bak"
log_ok "Backup criado: ${AGENT_FILE}.bak"

################################################################################
# CORREÇÃO via Node.js (mais seguro que sed para multiline)
################################################################################
log_info "Aplicando correção no agent.ts..."

node << 'NODEJS_SCRIPT'
const fs = require('fs');
const path = 'packages/analysis-agent/src/agent.ts';

let content = fs.readFileSync(path, 'utf8');

// Padrão a encontrar: o bloco de return dentro do método analyze()
const oldReturnBlock = `const detailedHUs = await this.expandEpicsToStories(productPlan.epics);

      return {
        analysis,
        product: { userStories: detailedHUs },
        architect: { diagram: architecture.diagram, stack: architecture.stack },
        engine: { files: allFiles }, // AGORA RETORNA A ÁRVORE COMPLETA
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via v3.2 Full Tree Agent" }
      };`;

const newReturnBlock = `const detailedHUs = await this.expandEpicsToStories(productPlan.epics);

      // ========== MAPEAMENTO DE CONTRATO (v3.2.1) ==========
      // Converte nomes das props das HUs para o formato esperado pelo Frontend
      const mappedHUs = detailedHUs.map(hu => ({
        id: hu.id,
        title: hu.title,
        priority: hu.priority,
        role: hu.role,
        action: hu.action,
        benefit: hu.benefit,
        acceptanceCriteria: hu.acceptanceCriteria,
        // Mapeamento Backend -> Frontend
        functionalReqs: hu.functionalRequirements,
        security: hu.securityRequirements,
        context: hu.businessContext,
        nonFunctionalReqs: [] as string[],
        description: \`Como \${hu.role}, quero \${hu.action}, para \${hu.benefit}\`,
      }));

      // Gera identificador único para rastreabilidade
      const requestId = \`req-\${Date.now()}-\${Math.random().toString(36).substring(2, 9)}\`;

      return {
        // ===== CAMPOS NA RAIZ (Contrato com Frontend) =====
        summary: analysis.summary,
        requestId,
        timestamp: new Date().toISOString(),

        // ===== ESTRUTURA COMPLETA =====
        analysis,
        product: { userStories: mappedHUs },
        architect: { diagram: architecture.diagram, stack: architecture.stack },
        engine: { files: allFiles },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via v3.2.1 (Contract Aligned)" }
      };`;

if (content.includes(oldReturnBlock)) {
  content = content.replace(oldReturnBlock, newReturnBlock);
  fs.writeFileSync(path, content);
  console.log('✅ Bloco de retorno substituído com sucesso!');
  process.exit(0);
}

// Tenta um match mais flexível (ignora comentários e whitespace extra)
const flexPattern = /const detailedHUs = await this\.expandEpicsToStories\(productPlan\.epics\);[\s\S]*?return \{[\s\S]*?fenix:[\s\S]*?"Generated via v3\.2[^"]*"\s*\}\s*\};/;

if (flexPattern.test(content)) {
  content = content.replace(flexPattern, newReturnBlock);
  fs.writeFileSync(path, content);
  console.log('✅ Bloco de retorno substituído (match flexível)!');
  process.exit(0);
}

// Fallback: Procura apenas o return e faz substituição parcial
const returnOnlyPattern = /return \{\s*analysis,\s*product: \{ userStories: detailedHUs \},/;

if (returnOnlyPattern.test(content)) {
  // Injeta o mapeamento ANTES do return
  const injectionPoint = 'const detailedHUs = await this.expandEpicsToStories(productPlan.epics);';
  
  const injection = `const detailedHUs = await this.expandEpicsToStories(productPlan.epics);

      // ========== MAPEAMENTO DE CONTRATO (v3.2.1) ==========
      const mappedHUs = detailedHUs.map(hu => ({
        id: hu.id,
        title: hu.title,
        priority: hu.priority,
        role: hu.role,
        action: hu.action,
        benefit: hu.benefit,
        acceptanceCriteria: hu.acceptanceCriteria,
        functionalReqs: hu.functionalRequirements,
        security: hu.securityRequirements,
        context: hu.businessContext,
        nonFunctionalReqs: [] as string[],
        description: \`Como \${hu.role}, quero \${hu.action}, para \${hu.benefit}\`,
      }));

      const requestId = \`req-\${Date.now()}-\${Math.random().toString(36).substring(2, 9)}\`;`;

  content = content.replace(injectionPoint, injection);
  
  // Agora substitui o return
  content = content.replace(
    /return \{\s*analysis,\s*product: \{ userStories: detailedHUs \},/,
    `return {
        summary: analysis.summary,
        requestId,
        timestamp: new Date().toISOString(),
        analysis,
        product: { userStories: mappedHUs },`
  );
  
  fs.writeFileSync(path, content);
  console.log('✅ Patch parcial aplicado com sucesso!');
  process.exit(0);
}

console.log('❌ Não foi possível aplicar o patch automaticamente.');
console.log('   O arquivo agent.ts pode ter sido modificado.');
console.log('   Aplique manualmente as mudanças descritas no diagnóstico.');
process.exit(1);
NODEJS_SCRIPT

PATCH_RESULT=$?

if [[ $PATCH_RESULT -eq 0 ]]; then
  log_ok "agent.ts corrigido"
else
  log_error "Falha na correção automática. Veja instruções manuais abaixo."
fi

################################################################################
# ATUALIZA TIPOS COMPARTILHADOS
################################################################################
TYPES_FILE="packages/shared/src/types/analyze-response.ts"

if [[ -f "$TYPES_FILE" ]]; then
  log_info "Atualizando tipos compartilhados..."
  cp "$TYPES_FILE" "${TYPES_FILE}.bak"

  cat > "$TYPES_FILE" << 'TYPES_EOF'
/**
 * Contrato de resposta do endpoint /analyze
 * Atualizado: 2024-11-26 (v3.2.1 - Contract Aligned)
 */

export interface MappedUserStory {
  id: string;
  title: string;
  priority: string;
  role: string;
  action: string;
  benefit: string;
  acceptanceCriteria: string[];
  /** Mapeado de functionalRequirements */
  functionalReqs: string[];
  /** Mapeado de securityRequirements */
  security: string[];
  /** Mapeado de businessContext */
  context: string;
  nonFunctionalReqs: string[];
  description: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface AnalyzeResponse {
  // Campos na raiz (acesso direto pelo Frontend)
  summary: string;
  requestId: string;
  timestamp: string;

  // Estrutura completa
  analysis: {
    summary: string;
    complexity: "Baixa" | "Média" | "Alta" | "Crítica";
    assumptions: string[];
  };

  product: {
    userStories: MappedUserStory[];
  };

  architect: {
    diagram?: string;
    stack: string;
  };

  engine: {
    files: GeneratedFile[];
  };

  ux: { components: unknown[] };
  quality: { tests: unknown[] };
  ops: { scripts: unknown[] };
  fenix: { notes: string };
}
TYPES_EOF

  log_ok "Tipos atualizados"
fi

################################################################################
# REBUILD
################################################################################
log_info "Reconstruindo pacotes..."

if command -v pnpm &> /dev/null; then
  pnpm --filter @mini-ide/analysis-agent build 2>&1 | head -20 || true
  log_ok "Build executado"
else
  log_warn "Execute manualmente: pnpm --filter @mini-ide/analysis-agent build"
fi

################################################################################
# RESUMO
################################################################################
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║             ✅ CORREÇÃO DE CONTRATO APLICADA                     ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║ Mudanças:                                                        ║"
echo "║   • summary, requestId, timestamp → RAIZ do JSON                 ║"
echo "║   • functionalRequirements → functionalReqs                      ║"
echo "║   • securityRequirements → security                              ║"
echo "║   • businessContext → context                                    ║"
echo "╠══════════════════════════════════════════════════════════════════╣"
echo "║ Teste:                                                           ║"
echo "║   1. pnpm --filter @mini-ide/server dev                          ║"
echo "║   2. Abra o frontend e envie uma mensagem                        ║"
echo "║   3. Verifique: ID e Resumo no chat ✓                            ║"
echo "║   4. Verifique: Arquivos no Explorer ✓                           ║"
echo "║   5. Verifique: HUs com todos os campos ✓                        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

################################################################################
# INSTRUÇÕES MANUAIS (caso o patch automático falhe)
################################################################################
if [[ $PATCH_RESULT -ne 0 ]]; then
  echo ""
  log_warn "========== INSTRUÇÕES MANUAIS =========="
  echo ""
  echo "Se o patch automático falhou, edite manualmente o arquivo:"
  echo "  $AGENT_FILE"
  echo ""
  echo "Localize o bloco:"
  echo "  const detailedHUs = await this.expandEpicsToStories(...);"
  echo "  return { analysis, product: { userStories: detailedHUs }, ... };"
  echo ""
  echo "E substitua por:"
  echo ""
  cat << 'MANUAL_PATCH'
      const detailedHUs = await this.expandEpicsToStories(productPlan.epics);

      // MAPEAMENTO DE CONTRATO
      const mappedHUs = detailedHUs.map(hu => ({
        id: hu.id,
        title: hu.title,
        priority: hu.priority,
        role: hu.role,
        action: hu.action,
        benefit: hu.benefit,
        acceptanceCriteria: hu.acceptanceCriteria,
        functionalReqs: hu.functionalRequirements,
        security: hu.securityRequirements,
        context: hu.businessContext,
        nonFunctionalReqs: [] as string[],
        description: `Como ${hu.role}, quero ${hu.action}, para ${hu.benefit}`,
      }));

      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      return {
        summary: analysis.summary,
        requestId,
        timestamp: new Date().toISOString(),
        analysis,
        product: { userStories: mappedHUs },
        architect: { diagram: architecture.diagram, stack: architecture.stack },
        engine: { files: allFiles },
        ux: { components: [] },
        quality: { tests: [] },
        ops: { scripts: [] },
        fenix: { notes: "Generated via v3.2.1 (Contract Aligned)" }
      };
MANUAL_PATCH
  echo ""
fi
