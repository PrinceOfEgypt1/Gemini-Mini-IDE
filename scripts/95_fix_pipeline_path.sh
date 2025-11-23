#!/usr/bin/env bash
set -e

echo "🚑 [Phase 10] Corrigindo caminho hardcoded no script de pipeline..."

TARGET_FILE="42_pipeline_checklist.sh"

# Verifica se o arquivo existe
if [ ! -f "$TARGET_FILE" ]; then
    echo "❌ Erro: $TARGET_FILE não encontrado na raiz."
    exit 1
fi

# Substitui 'dist/src/index.js' por 'dist/index.js'
# O comando sed abaixo funciona tanto em Linux quanto em ambientes bash padrão
echo "📝 Atualizando $TARGET_FILE..."
sed -i 's|packages/server/dist/src/index.js|packages/server/dist/index.js|g' "$TARGET_FILE"

# Verificação de segurança
if grep -q "dist/src/index.js" "$TARGET_FILE"; then
    echo "❌ A substituição falhou. Verifique o arquivo manualmente."
    exit 1
else
    echo "✅ Caminho corrigido com sucesso."
fi

echo "👉 Agora o pipeline deve encontrar o servidor corretamente."
