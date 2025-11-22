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
