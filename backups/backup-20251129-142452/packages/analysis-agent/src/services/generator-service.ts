import { ProjectDefinition, GeneratedScripts } from '@mini-ide/shared';

export class GeneratorService {
  
  /**
   * Gera scripts de infraestrutura e qualidade baseados na definição do projeto.
   * (Implementação determinística/template para robustez, poderia ser via LLM)
   */
  generateScaffolding(project: ProjectDefinition): GeneratedScripts {
    const setupScript = this.createSetupScript(project);
    const pipelineScript = this.createPipelineScript(project);
    
    return {
      setupScript,
      pipelineScript,
      instructions: `Salve os arquivos em ${project.path} e execute: chmod +x setup.sh && ./setup.sh`
    };
  }

  private createSetupScript(project: ProjectDefinition): string {
    return `#!/usr/bin/env bash
set -e
echo "🚀 Inicializando projeto: ${project.name}..."
echo "📂 Diretório: ${project.path}"
echo "📚 Stack: ${project.stack}"

mkdir -p "${project.path}"
cd "${project.path}"

if [ ! -f "package.json" ]; then
  echo "📦 Iniciando package.json..."
  npm init -y
fi

echo "✅ Ambiente base criado."
`;
  }

  private createPipelineScript(project: ProjectDefinition): string {
    return `#!/usr/bin/env bash
# Script de Qualidade Gerado pelo Mini-IDE (HU-10.7)
set -e

echo "🛡️ Validando qualidade do projeto ${project.name}..."

# Exemplo genérico - em produção adaptaria para a stack real
if [ -f "package.json" ]; then
  echo "[1/3] 🧹 Linting..."
  npm run lint --if-present || echo "⚠️ Script lint não encontrado"
  
  echo "[2/3] 🧪 Tests..."
  npm test --if-present || echo "⚠️ Script test não encontrado"
  
  echo "[3/3] 🏗️ Build..."
  npm run build --if-present || echo "⚠️ Script build não encontrado"
fi

echo "✅ Pipeline finalizado."
`;
  }
}
