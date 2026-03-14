#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import axios, { AxiosError } from 'axios';
import chalk from 'chalk';
import ora from 'ora';

// URL do servidor (padrão local)
const SERVER_URL = process.env["MINI_IDE_SERVER_URL"] ?? 'http://localhost:3200';

interface AnalyzeResponse {
  summary: string;
  requestId: string;
  inputLength?: number;
  outputLength?: number;
}

const program = new Command();

program
  .name('mini-ide')
  .description('CLI para o Gemini Gemini Mini-IDE - Ambiente de Desenvolvimento Assistido por IA')
  .version('0.0.1');

program
  .command('analyze')
  .description('Envia um arquivo ou texto para análise do agente')
  .argument('<input>', 'Caminho do arquivo ou string de texto')
  .option('-m, --max-len <number>', 'Tamanho máximo do resumo', '200')
  .option('--raw', 'Trata o input como texto puro, não arquivo')
  .action(async (input: string, options: { maxLen: string; raw?: boolean }) => {
    let content = input;
    
    // Se não for modo raw, tenta ler como arquivo
    if (!options.raw) {
      try {
        const filePath = path.resolve(process.cwd(), input);
        await fs.access(filePath);
        content = await fs.readFile(filePath, 'utf-8');
        console.log(chalk.blue(`📄 Lendo arquivo: ${filePath}`));
      } catch {
        // Se falhar, assume que é texto se não for muito longo
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
      const response = await axios.post<AnalyzeResponse>(`${SERVER_URL}/analyze`, {
        text: content,
        maxLen: parseInt(options.maxLen)
      });

      spinner.succeed(chalk.green('Análise concluída!'));
      
      const data = response.data;
      
      console.log('\n' + chalk.bold('📊 Resultado da Análise:'));
      console.log(chalk.gray('------------------------------------------------'));
      console.log(chalk.white(data.summary));
      console.log(chalk.gray('------------------------------------------------'));
      console.log(chalk.cyan(`ID: ${data.requestId}`));
      
      if (data.inputLength !== undefined && data.outputLength !== undefined) {
        console.log(chalk.dim(`Tokens: Entrada ${data.inputLength} / Saída ${data.outputLength}`));
      }

    } catch (error) {
      spinner.fail(chalk.red('Falha na análise.'));
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.code === 'ECONNREFUSED') {
          console.error(chalk.red(`\n❌ Não foi possível conectar ao servidor em ${SERVER_URL}.`));
          console.error(chalk.yellow('Dica: O servidor está rodando? (pnpm start no pacote server)'));
        } else {
          console.error(chalk.red(`Erro: ${axiosError.message}`));
          if (axiosError.response?.data) {
            console.error(chalk.dim(JSON.stringify(axiosError.response.data)));
          }
        }
      } else {
        const err = error as Error;
        console.error(chalk.red(`Erro: ${err.message}`));
      }
      process.exit(1);
    }
  });

program
  .command('health')
  .description('Verifica se o servidor está online')
  .action(async () => {
    const spinner = ora('Verificando servidor...').start();
    try {
      await axios.get(`${SERVER_URL}/healthz`);
      spinner.succeed(chalk.green(`Servidor online em ${SERVER_URL}`));
    } catch {
      spinner.fail(chalk.red(`Servidor offline em ${SERVER_URL}`));
      process.exit(1);
    }
  });

program
  .command('impact')
  .description('Analyzes impact of changed files and reports risk level')
  .argument('[files...]', 'Files to analyze (if empty, uses git diff against origin/main)')
  .option('--base <ref>', 'Git ref to diff against', 'origin/main')
  .option('--staged', 'Analyze staged changes')
  .option('--json', 'Output raw JSON instead of formatted report')
  .action(async (files: string[], options: { base: string; staged?: boolean; json?: boolean }) => {
    const spinner = ora('Analyzing impact...').start();
    try {
      const response = await axios.post<{ report: unknown; formatted: string }>(
        `${SERVER_URL}/impact-analysis`,
        { files, base: options.base, staged: options.staged ?? false }
      );

      spinner.stop();

      if (options.json) {
        console.log(JSON.stringify(response.data.report, null, 2));
      } else {
        console.log(response.data.formatted);
      }

      const report = response.data.report as { overallRisk: string };
      const highRisk = report.overallRisk === 'ALTO' || report.overallRisk === 'CRITICO';
      if (highRisk) {
        process.exit(1);
      }
    } catch (error) {
      spinner.fail(chalk.red('Impact analysis failed.'));
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.code === 'ECONNREFUSED') {
          console.error(chalk.red(`\nCannot connect to server at ${SERVER_URL}.`));
          console.error(chalk.yellow('Hint: Is the server running? (pnpm start)'));
        } else {
          console.error(chalk.red(`Error: ${axiosError.message}`));
        }
      } else {
        const err = error as Error;
        console.error(chalk.red(`Error: ${err.message}`));
      }
      process.exit(1);
    }
  });

program.parse();
