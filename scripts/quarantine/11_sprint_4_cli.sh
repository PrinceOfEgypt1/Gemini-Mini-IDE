#!/usr/bin/env bash
set -e

echo "🖥️ Iniciando Fase 4: Implementação da CLI..."

# 1. Instalar Dependências da CLI
# -----------------------------------------------------
echo "📦 Instalando dependências (commander, axios, chalk, ora)..."
pnpm --filter @mini-ide/cli add commander axios chalk ora
pnpm --filter @mini-ide/cli add -D @types/node

# 2. Implementar a CLI
# -----------------------------------------------------
echo "⚙️ Codificando a CLI..."

mkdir -p packages/cli/src

cat > packages/cli/src/index.ts <<EOF
#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';

// URL do servidor (padrão local)
const SERVER_URL = process.env.MINI_IDE_SERVER_URL || 'http://localhost:3200';

const program = new Command();

program
  .name('mini-ide')
  .description('CLI para o Mini-IDE - Ambiente de Desenvolvimento Assistido por IA')
  .version('0.0.1');

program
  .command('analyze')
  .description('Envia um arquivo ou texto para análise do agente')
  .argument('<input>', 'Caminho do arquivo ou string de texto')
  .option('-m, --max-len <number>', 'Tamanho máximo do resumo', '200')
  .option('--raw', 'Trata o input como texto puro, não arquivo')
  .action(async (input, options) => {
    let content = input;
    
    // Se não for modo raw, tenta ler como arquivo
    if (!options.raw) {
      try {
        const filePath = path.resolve(process.cwd(), input);
        // Verifica se arquivo existe
        await fs.access(filePath);
        content = await fs.readFile(filePath, 'utf-8');
        console.log(chalk.blue(\`📄 Lendo arquivo: \${filePath}\`));
      } catch (e) {
        // Se falhar, assume que é texto se não for muito longo, ou erro
        if (input.length < 255 && !input.includes('\n')) {
           console.log(chalk.yellow('⚠️  Arquivo não encontrado. Tratando como texto direto.'));
           content = input;
        } else {
           console.error(chalk.red('❌ Erro: Arquivo não encontrado e input inválido.'));
           process.exit(1);
        }
      }
    }

    const spinner = ora('Enviando para o Agente de Análise...').start();

    try {
      const response = await axios.post(\`\${SERVER_URL}/analyze\`, {
        text: content,
        maxLen: parseInt(options.maxLen)
      });

      spinner.succeed(chalk.green('Análise concluída!'));
      
      const data = response.data;
      
      console.log('\n' + chalk.bold('📊 Resultado da Análise:'));
      console.log(chalk.gray('------------------------------------------------'));
      console.log(chalk.white(data.summary));
      console.log(chalk.gray('------------------------------------------------'));
      console.log(chalk.cyan(\`ID: \${data.requestId}\`));
      console.log(chalk.dim(\`Tokens (Simulado): Entrou \${data.inputLength} / Saiu \${data.outputLength}\`));

    } catch (error: any) {
      spinner.fail(chalk.red('Falha na análise.'));
      if (error.code === 'ECONNREFUSED') {
        console.error(chalk.red(\`\n❌ Não foi possível conectar ao servidor em \${SERVER_URL}.\`));
        console.error(chalk.yellow('Dica: O servidor está rodando? (pnpm start no pacote server)'));
      } else {
        console.error(chalk.red(\`Erro: \${error.message}\`));
        if (error.response) {
            console.error(chalk.dim(JSON.stringify(error.response.data)));
        }
      }
      process.exit(1);
    }
  });

program.parse();
EOF

# 3. Configurar package.json para binário
# -----------------------------------------------------
echo "🔧 Configurando binário..."

# Adiciona configuração "bin" no package.json do CLI
tmp=$(mktemp)
jq '.bin = { "mini-ide": "./dist/index.js" }' packages/cli/package.json > "$tmp" && mv "$tmp" packages/cli/package.json

# 4. Build da CLI
# -----------------------------------------------------
echo "🏗️ Compilando CLI..."
pnpm --filter @mini-ide/cli build

# Dá permissão de execução ao arquivo compilado (necessário para rodar localmente via node)
chmod +x packages/cli/dist/index.js

echo "✅ Fase 4 concluída: CLI pronta!"
echo "👉 Teste agora com: node packages/cli/dist/index.js analyze \"Teste de CLI\""
