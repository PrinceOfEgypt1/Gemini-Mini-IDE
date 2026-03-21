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

  // Regras globais (warn: sinaliza sem bloquear nas áreas não críticas)
  // Nota: varsIgnorePattern e destructuredArrayIgnorePattern adicionados para cobrir
  // variáveis com prefixo _ em destructuring (ex: _removed, _id), não apenas args.
  {
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },

  // ── Hardening: Server (bootstrap, rotas, controllers, services) ──────────
  // Área crítica: borda HTTP — contratos tipados e logging estruturado são obrigatórios.
  // no-console: error    → servidor usa app.log (Fastify); console é canal errado aqui
  // no-explicit-any: error → rotas e handlers HTTP exigem tipos explícitos
  // no-unused-vars: error  → variáveis mortas em handlers de requisição são risco de regressão
  // Aplica-se apenas a código de produção; arquivos de teste mantêm nível global (warn).
  {
    files: ["packages/server/src/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }]
    }
  },

  // ── Hardening: Analysis-Agent (código de produção) ───────────────────────
  // Área crítica: engine central de análise — any implícito é risco de contrato quebrado.
  // no-explicit-any: error → engine de geração de código não pode ter tipos opacos
  // no-unused-vars: error  → código morto no pipeline de agentes é risco de regressão silenciosa
  // no-console: mantido em warn global — agentes e orquestrador têm console legítimo sem logger injetado.
  // Aplica-se apenas a código de produção; arquivos de teste mantêm nível global (warn).
  {
    files: ["packages/analysis-agent/src/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }]
    }
  },

  // ── Hardening extra: Sub-áreas de governança do analysis-agent ───────────
  // esaa, governance, generation, session, planning são infraestrutura de governança.
  // Essas sub-áreas não têm console legítimo e não devem introduzi-lo.
  // no-console: error → proibição explícita de console em infraestrutura de governança
  {
    files: [
      "packages/analysis-agent/src/esaa/**/*.ts",
      "packages/analysis-agent/src/governance/**/*.ts",
      "packages/analysis-agent/src/generation/**/*.ts",
      "packages/analysis-agent/src/session/**/*.ts",
      "packages/analysis-agent/src/planning/**/*.ts"
    ],
    ignores: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "no-console": "error"
    }
  },

  // Override específico para a CLI (Permite console.log e process.exit)
  {
    files: ["packages/cli/src/**/*.ts"],
    rules: {
      "no-console": "off",
      "no-process-exit": "off"
    }
  }
];
