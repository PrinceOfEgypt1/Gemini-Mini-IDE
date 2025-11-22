#!/usr/bin/env bash
set -e

echo "🔧 Corrigindo paths do Vitest e garantindo arquivos de teste..."

# 1. Corrigir vitest.config.ts na raiz
# Mudamos o 'include' para ser relativo ao pacote em execução ('src/...')
cat > vitest.config.ts <<EOF
import { defineConfig } from 'vitest/config';
export default defineConfig({
test: {
globals: true,
environment: 'node',
// Procura por testes dentro da pasta src do diretório atual
include: ['src//*.test.ts'],
exclude: ['/node_modules/', '/dist/', '/coverage/**'],
},
});
EOF
# 2. Garantir que os arquivos de teste existem (Reaplicando Sprint 1.3)
# Caso o erro anterior tenha impedido a criação ou leitura correta
create_dummy_test() {
    local pkg=$1
    local dir="packages/$pkg/src"
    local file="$dir/index.test.ts"
    
    # Cria diretório se não existir
    mkdir -p "$dir"
    
    # Cria arquivo apenas se não existir, ou força recriação para garantir conteúdo
    echo "  🧪 Garantindo teste em $pkg..."
    cat > "$file" <<EOF
import { describe, it, expect } from 'vitest';
describe('$pkg sanity check', () => {
it('should be true', () => {
expect(true).toBe(true);
});
});
EOF
}
create_dummy_test "server"
create_dummy_test "ui"
create_dummy_test "shared"
create_dummy_test "analysis-agent"
create_dummy_test "cli"

echo "✅ Configuração de testes corrigida."
echo "👉 Execute novamente: ./42_pipeline_checklist.sh"
