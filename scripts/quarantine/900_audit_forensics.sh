#!/usr/bin/env bash
# Não usamos 'set -e' aqui para garantir que o relatório seja completo mesmo se algo falhar.

echo "======================================================="
echo "🔎 AUDITORIA FORENSE: DIAGNÓSTICO DE UI/BUILD"
echo "======================================================="

echo ""
echo ">>> 1. ESTADO DO GIT"
git status
git log -1 --format="%h - %s (%ci)"

echo ""
echo ">>> 2. VERIFICAÇÃO DE ARTEFATOS DE BUILD (UI)"
# Verifica se o CSS e JS foram gerados fisicamente
if [ -d "packages/ui/dist" ]; then
    ls -R packages/ui/dist
else
    echo "❌ CRÍTICO: Pasta packages/ui/dist não existe."
fi

echo ""
echo ">>> 3. ANÁLISE DO INDEX.HTML GERADO"
# Verifica se o HTML final está chamando o CSS
if [ -f "packages/ui/dist/index.html" ]; then
    cat packages/ui/dist/index.html
else
    echo "❌ CRÍTICO: index.html não encontrado no build."
fi

echo ""
echo ">>> 4. CONFIGURAÇÃO DE BUILD (VITE)"
# Verifica como o Vite está configurado para gerar os assets
if [ -f "packages/ui/vite.config.ts" ]; then
    cat packages/ui/vite.config.ts
else
    echo "⚠️ Aviso: vite.config.ts não encontrado."
fi

echo ""
echo ">>> 5. COMO O SERVIDOR SERVE O FRONTEND"
# Verifica o código do servidor responsável por entregar os arquivos estáticos
if [ -f "packages/server/src/index.ts" ]; then
    # Busca linhas relacionadas a 'static', 'path' ou 'fastify-static'
    grep -nE "static|path\.join|dist" packages/server/src/index.ts || echo "⚠️ Nenhuma configuração estática óbvia encontrada no index.ts"
else
    echo "❌ CRÍTICO: packages/server/src/index.ts não encontrado."
fi

echo ""
echo ">>> 6. INTEGRIDADE DO CSS FONTE"
# Verifica se o arquivo fonte existe e tem conteúdo
head -n 5 packages/ui/src/index.css 2>/dev/null || echo "❌ packages/ui/src/index.css não encontrado ou vazio"

echo ""
echo "======================================================="
echo "FIM DA AUDITORIA"
