#!/usr/bin/env bash
set -e

echo "🔧 Atualizando configuração para ESLint v9 (Flat Config)..."

# 1. Remover configuração legada
rm -f .eslintrc.js

# 2. Instalar dependências para o novo formato do ESLint
echo "⬇️ Instalando pacotes de suporte ao ESLint 9..."
pnpm add -D -w globals @eslint/js typescript-eslint

# 3. Criar o novo arquivo de configuração (eslint.config.mjs) na raiz
echo "📝 Criando eslint.config.mjs..."
cat > eslint.config.mjs <<EOF
import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  // Ignorar pastas de build e dependências
  { ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"] },
  
  // Configurações globais
  { 
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: { 
      globals: { ...globals.node, ...globals.browser } 
    }
  },

  // Presets recomendados
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,

  // Regras customizadas do Mini-IDE
  {
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
];
EOF

# 4. Corrigir os scripts 'lint' nos package.json dos sub-pacotes
# O erro principal era o uso de "--ext .ts,.tsx", que foi removido no ESLint v9.
echo "u️ Atualizando scripts nos pacotes (removendo flags depreciadas)..."

update_pkg_lint() {
    local pkg_dir=$1
    if [ -f "$pkg_dir/package.json" ]; then
        # Remove a flag --ext e aponta apenas para o diretório src
        tmp=$(mktemp)
        jq '.scripts.lint = "eslint src/"' "$pkg_dir/package.json" > "$tmp" && mv "$tmp" "$pkg_dir/package.json"
        echo "  -> Atualizado $pkg_dir"
    fi
}

update_pkg_lint "packages/server"
update_pkg_lint "packages/ui"
update_pkg_lint "packages/shared"
update_pkg_lint "packages/analysis-agent"
update_pkg_lint "packages/cli"

# 5. Garantir que o checklist esteja na raiz (consertando seu passo anterior)
if [ -f "scripts/42_pipeline_checklist.sh" ]; then
    echo "🚚 Movendo checklist para a raiz (local correto)..."
    mv scripts/42_pipeline_checklist.sh ./42_pipeline_checklist.sh
    # Atualiza permissão
    chmod +x 42_pipeline_checklist.sh
fi

echo "✅ Correção do ESLint v9 concluída!"
echo "👉 Execute agora: ./42_pipeline_checklist.sh"
