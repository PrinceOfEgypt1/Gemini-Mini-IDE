#!/usr/bin/env bash
set -euo pipefail

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok() { echo -e "${GREEN}[OK]${NC} $1"; }

BASE_DIR="packages/analysis-agent/src"

log_info "Iniciando Refatoração Estrutural (Fase 2.0)..."

# 1. Criar Nova Estrutura de Pastas
log_info "Criando diretórios de serviços..."
mkdir -p "$BASE_DIR/core"          # Lógica central (Orquestrador)
mkdir -p "$BASE_DIR/services/llm"  # Comunicação com IA
mkdir -p "$BASE_DIR/modules/parser"    # Tratamento de dados
mkdir -p "$BASE_DIR/modules/templates" # Templates estáticos

# 2. Implementar SmartParser (Isolamento da lógica de limpeza)
log_info "Implementando SmartParser com JSON Repair..."
cat > "$BASE_DIR/modules/parser/smart-parser.ts" << 'EOF'
import { z } from 'zod';

/**
 * Serviço responsável por transformar strings caóticas de LLM em objetos tipados seguros.
 */
export class SmartParser {
  /**
   * Tenta corrigir JSONs malformados usando heurísticas.
   */
  static cleanJson(input: string): string {
    // 1. Remove blocos markdown
    let clean = input.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    
    // 2. Heurísticas de reparo simples (para não depender de libs externas pesadas agora)
    // Se terminar abruptamente em string, tenta fechar
    if (clean.match(/"[^"]*$/)) clean += '"';
    
    // Balanceamento de chaves/colchetes (Básico)
    const openBraces = (clean.match(/{/g) || []).length;
    const closeBraces = (clean.match(/}/g) || []).length;
    const openBrackets = (clean.match(/\[/g) || []).length;
    const closeBrackets = (clean.match(/\]/g) || []).length;

    if (openBraces > closeBraces) clean += '}'.repeat(openBraces - closeBraces);
    if (openBrackets > closeBrackets) clean += ']'.repeat(openBrackets - closeBrackets);

    return clean;
  }

  /**
   * Faz o parse seguro e valida contra um schema Zod.
   * Se falhar, retorna um fallback seguro em vez de lançar erro.
   */
  static parse<T>(content: string, schema: z.ZodType<T>, fallback: T, contextName: string = "Parser"): T {
    try {
      const cleaned = this.cleanJson(content);
      const json = JSON.parse(cleaned);
      return schema.parse(json);
    } catch (error) {
      console.warn(`⚠️ [${contextName}] Falha no parse. Usando fallback.`, error);
      return fallback;
    }
  }
}
EOF

# 3. Implementar TemplateEngine (Definição de Stacks)
log_info "Implementando TemplateEngine (Determinismo)..."
cat > "$BASE_DIR/modules/templates/template-engine.ts" << 'EOF'
export interface TemplateFile {
  path: string;
  purpose: string;
  criticality: "Config" | "Core" | "Support";
  content?: string; // Conteúdo estático opcional
}

export interface StackTemplate {
  id: string;
  name: string;
  files: TemplateFile[];
}

/**
 * Repositório de Templates Estáticos.
 * Garante que a infraestrutura crítica nunca seja alucinada.
 */
export const STACKS: Record<string, StackTemplate> = {
  "node-react": {
    id: "node-react",
    name: "Node.js + React + TypeScript",
    files: [
      { path: "package.json", purpose: "Gerenciador de Dependências", criticality: "Config" },
      { path: "tsconfig.json", purpose: "Configuração TypeScript", criticality: "Config" },
      { path: "README.md", purpose: "Documentação do Projeto", criticality: "Config" },
      { path: ".gitignore", purpose: "Arquivos ignorados pelo Git", criticality: "Config" },
      { path: "vite.config.ts", purpose: "Configuração do Vite", criticality: "Config" },
      { path: "src/server/index.ts", purpose: "Entrypoint do Backend", criticality: "Core" },
      { path: "src/client/main.tsx", purpose: "Entrypoint do Frontend", criticality: "Core" },
      { path: "src/client/App.tsx", purpose: "Componente Raiz", criticality: "Core" }
    ]
  },
  "python-flask": {
    id: "python-flask",
    name: "Python Flask API",
    files: [
      { path: "requirements.txt", purpose: "Dependências Python", criticality: "Config" },
      { path: "app.py", purpose: "Entrypoint da Aplicação", criticality: "Core" },
      { path: "README.md", purpose: "Documentação", criticality: "Config" }
    ]
  }
};

export class TemplateEngine {
  /**
   * Retorna os arquivos base para uma determinada stack.
   * Se a stack não for reconhecida, retorna o padrão (node-react).
   */
  static getBaseFiles(stackName: string): TemplateFile[] {
    const normalized = stackName.toLowerCase();
    if (normalized.includes("python")) return STACKS["python-flask"].files;
    return STACKS["node-react"].files;
  }
}
EOF

# 4. Ajustar exports para facilitar importação
log_info "Atualizando exports do pacote..."
cat > "packages/analysis-agent/src/index.ts" << 'EOF'
// Exports principais
export { AnalysisAgent } from "./agent";
export { ConsolidatorService } from "./services/consolidator-service";
export { GeneratorService } from "./services/generator-service";

// Novos módulos (para testes e extensibilidade)
export { SmartParser } from "./modules/parser/smart-parser";
export { TemplateEngine } from "./modules/templates/template-engine";
EOF

log_ok "Estrutura base criada com sucesso."
echo "Próximo passo: Refatorar o LLMService e o Agente principal."
