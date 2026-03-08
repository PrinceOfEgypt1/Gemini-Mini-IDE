#!/usr/bin/env bash
################################################################################
# Script: 131_fix_export_controller_implementation.sh
# Objetivo: Criar/corrigir ExportController com headers CORS + ZIP corretos
# Diagnóstico: Controller pode estar faltando headers ou gerando ZIP inválido
# Data: 2024-11-23
################################################################################

set -euo pipefail

readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'

log_info() { echo -e "${BLUE}[info]${NC} $1"; }
log_ok() { echo -e "${GREEN}[ok]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
log_error() { echo -e "${RED}[erro]${NC} $1"; }

readonly CONTROLLER_DIR="packages/server/src/controllers"
readonly CONTROLLER_FILE="$CONTROLLER_DIR/export.controller.ts"

echo "════════════════════════════════════════════════════════════════"
log_info "FIX DEFINITIVO: Reescrevendo ExportController do zero"
echo "════════════════════════════════════════════════════════════════"
echo ""

################################################################################
# DIAGNÓSTICO CRÍTICO
################################################################################

log_warn "ANÁLISE DO PROBLEMA:"
echo "  ✓ Servidor responde 200 OK"
echo "  ✗ Navegador: 'No Access-Control-Allow-Origin header'"
echo "  ✗ Navegador: 'net::ERR_FAILED'"
echo ""
echo "  CAUSA PROVÁVEL:"
echo "  • ExportController não seta headers CORS"
echo "  • ExportController não seta Content-Type correto"
echo "  • ExportController pode gerar ZIP inválido/vazio"
echo ""

################################################################################
# CRIAR DIRETÓRIO SE NÃO EXISTIR
################################################################################

if [[ ! -d "$CONTROLLER_DIR" ]]; then
  log_info "Criando diretório de controllers..."
  mkdir -p "$CONTROLLER_DIR"
  log_ok "Diretório criado"
fi

################################################################################
# BACKUP SE ARQUIVO EXISTIR
################################################################################

if [[ -f "$CONTROLLER_FILE" ]]; then
  log_warn "Controller existente encontrado. Criando backup..."
  cp "$CONTROLLER_FILE" "${CONTROLLER_FILE}.bak"
  log_ok "Backup: ${CONTROLLER_FILE}.bak"
fi

################################################################################
# CRIAR CONTROLLER DEFINITIVO
################################################################################

log_info "Criando ExportController com CORS + ZIP corretos..."

cat > "$CONTROLLER_FILE" << 'EOF'
import { FastifyRequest, FastifyReply } from 'fastify';
import archiver from 'archiver';

export class ExportController {
  /**
   * Endpoint para exportar projeto como ZIP
   * FIX CRÍTICO: Headers CORS + Content-Type + Streaming correto
   */
  static async downloadZip(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      // HEADERS CRÍTICOS (ordem importa!)
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');
      reply.raw.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      reply.raw.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      reply.raw.setHeader('Content-Type', 'application/zip');
      reply.raw.setHeader('Content-Disposition', 'attachment; filename="mini-ide-project.zip"');
      
      // Status 200 explícito
      reply.raw.statusCode = 200;

      // Criar ZIP streamer
      const archive = archiver('zip', {
        zlib: { level: 9 } // Compressão máxima
      });

      // Pipe direto para a resposta HTTP
      archive.pipe(reply.raw);

      // Capturar erros do archiver
      archive.on('error', (err: Error) => {
        req.log.error({ err }, 'Erro ao gerar ZIP');
        if (!reply.raw.headersSent) {
          reply.code(500).send({ error: 'Erro ao gerar ZIP' });
        }
      });

      // Adicionar arquivos ao ZIP
      const body = req.body as any;
      const projectData = body?.projectData || { name: 'mini-ide-project' };

      // Arquivo 1: README.md
      archive.append(
        `# ${projectData.name || 'Mini-IDE Project'}\n\nProjeto exportado em ${new Date().toISOString()}\n`,
        { name: 'README.md' }
      );

      // Arquivo 2: project.json (metadados)
      archive.append(
        JSON.stringify(projectData, null, 2),
        { name: 'project.json' }
      );

      // Arquivo 3: .gitignore
      archive.append(
        'node_modules/\ndist/\n.env\n*.log\n',
        { name: '.gitignore' }
      );

      // Finalizar ZIP (fecha stream automaticamente)
      await archive.finalize();

      req.log.info('ZIP exportado com sucesso');
      
    } catch (err) {
      req.log.error({ err }, 'Erro crítico no downloadZip');
      
      // Só envia erro se headers ainda não foram enviados
      if (!reply.raw.headersSent) {
        reply.code(500).send({ error: 'Erro interno ao exportar' });
      }
    }
  }
}
EOF

log_ok "ExportController criado com implementação completa"

################################################################################
# VERIFICAR DEPENDÊNCIA ARCHIVER
################################################################################

log_info "Verificando dependência 'archiver'..."

if ! grep -q '"archiver"' packages/server/package.json; then
  log_warn "Archiver não encontrado! Adicionando..."
  
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('packages/server/package.json', 'utf8'));
    pkg.dependencies['archiver'] = '^7.0.1';
    if (!pkg.devDependencies['@types/archiver']) {
      pkg.devDependencies['@types/archiver'] = '^7.0.0';
    }
    fs.writeFileSync('packages/server/package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  
  log_ok "Archiver adicionado ao package.json"
  
  log_info "Instalando dependências..."
  pnpm install
  log_ok "Dependências instaladas"
else
  log_ok "Archiver já presente"
fi

################################################################################
# REBUILD COMPLETO
################################################################################

log_info "Limpando dist e reconstruindo..."
rm -rf packages/server/dist
pnpm --filter @mini-ide/server build

if [[ ! -f "packages/server/dist/controllers/export.controller.js" ]]; then
  log_error "FALHA: Controller não foi compilado!"
  exit 1
fi

log_ok "Build concluído - Controller compilado"

################################################################################
# VERIFICAR INDEX.TS
################################################################################

log_info "Verificando se index.ts importa o controller corretamente..."

if ! grep -q "ExportController" packages/server/src/index.ts; then
  log_error "AVISO: index.ts não importa ExportController!"
  log_warn "Execute o script 130 novamente ou adicione manualmente:"
  echo "  import { ExportController } from './controllers/export.controller';"
fi

################################################################################
# INSTRUÇÕES FINAIS
################################################################################

echo ""
echo "════════════════════════════════════════════════════════════════"
log_ok "✅ CONTROLLER RECRIADO COM SUCESSO"
echo "════════════════════════════════════════════════════════════════"
echo ""
log_info "Implementação:"
echo "  ✓ Headers CORS explícitos via reply.raw.setHeader"
echo "  ✓ Content-Type: application/zip"
echo "  ✓ Content-Disposition para download"
echo "  ✓ Streaming direto (archiver → HTTP response)"
echo "  ✓ ZIP com 3 arquivos: README.md, project.json, .gitignore"
echo ""
log_warn "PRÓXIMOS PASSOS OBRIGATÓRIOS:"
echo ""
echo "  1. MATE o servidor Node.js (Ctrl+C)"
echo ""
echo "  2. Reinicie LIMPO:"
echo "     $ cd packages/server"
echo "     $ pnpm start"
echo ""
echo "  3. Teste no navegador (F12 aberto):"
echo "     • Clique no botão 'Exportar ZIP'"
echo "     • Veja a aba Network se headers CORS aparecem"
echo "     • Resposta deve ser binary (application/zip)"
echo ""
log_info "Se AINDA falhar:"
echo "  • Cole o log COMPLETO do terminal do servidor"
echo "  • Cole o Response Headers da aba Network (F12)"
echo ""
