/**
 * Model Strategy - Estratégia de seleção de modelo por tipo de tarefa
 *
 * Este arquivo define qual tier de modelo (PREMIUM, STANDARD, LOCAL) deve ser
 * usado para cada tipo de tarefa no Analysis Agent, balanceando custo e qualidade.
 *
 * Princípios da estratégia:
 * - PREMIUM: Tarefas críticas que exigem raciocínio complexo (arquitetura, HUs)
 * - STANDARD: Tarefas repetitivas ou com padrões claros (arquivos simples)
 * - LOCAL: Desenvolvimento local ou testes (se disponível)
 *
 * @module config/model-strategy
 */

import { ModelTier } from "../types/model-tiers.js";

/**
 * Tipos de tarefas executadas pelo Analysis Agent
 */
export enum TaskType {
  /** Análise de complexidade inicial do projeto */
  COMPLEXITY = "Complexity",

  /** Geração da arquitetura do sistema */
  ARCHITECTURE = "Architecture",

  /** Expansão de épicos em User Stories */
  USER_STORIES = "UserStories",

  /** Geração de arquivo de código complexo (>100 linhas, lógica crítica) */
  FILE_COMPLEX = "FileComplex",

  /** Geração de arquivo de código simples (≤100 linhas, padrões conhecidos) */
  FILE_SIMPLE = "FileSimple",

  /** Geração de arquivo de configuração (.env, tsconfig, etc.) */
  FILE_CONFIG = "FileConfig",

  /** Geração de arquivo de testes */
  FILE_TEST = "FileTest",

  /** Geração de documentação */
  FILE_DOCS = "FileDocs",
}

/**
 * Mapeamento de tipo de tarefa para tier de modelo
 *
 * Define qual tier usar para cada tipo de tarefa, considerando:
 * 1. Complexidade da tarefa
 * 2. Criticidade do output
 * 3. Custo-benefício
 *
 * @example
 * ```typescript
 * const tier = MODEL_STRATEGY[TaskType.ARCHITECTURE]; // ModelTier.PREMIUM
 * const tier2 = MODEL_STRATEGY[TaskType.FILE_SIMPLE]; // ModelTier.STANDARD
 * ```
 */
export const MODEL_STRATEGY: Record<TaskType, ModelTier> = {
  /**
   * Complexity Analysis - PREMIUM
   * Justificativa: Análise inicial crítica que determina todo o fluxo seguinte.
   * Erro aqui propaga para todas as etapas. Score correto é essencial.
   */
  [TaskType.COMPLEXITY]: ModelTier.PREMIUM,

  /**
   * Architecture Design - PREMIUM
   * Justificativa: Decisões arquiteturais definem a estrutura do projeto.
   * Requer raciocínio profundo sobre trade-offs, padrões e escalabilidade.
   * Gera 30-50 arquivos - custo ~$0.10, mas evita refatoração cara depois.
   */
  [TaskType.ARCHITECTURE]: ModelTier.PREMIUM,

  /**
   * User Stories Generation - PREMIUM
   * Justificativa: HUs bem escritas são documentação viva do projeto.
   * Requer entendimento profundo de domínio e casos de uso.
   * Gera 50+ HUs detalhadas - custo ~$0.08, mas economiza horas de PM.
   */
  [TaskType.USER_STORIES]: ModelTier.PREMIUM,

  /**
   * Complex File Generation - PREMIUM
   * Justificativa: Arquivos com lógica crítica (domain entities, use cases)
   * exigem raciocínio sobre regras de negócio, validações e edge cases.
   * Exemplos: Patient.ts, CreatePatientUseCase.ts, AuthService.ts
   */
  [TaskType.FILE_COMPLEX]: ModelTier.PREMIUM,

  /**
   * Simple File Generation - STANDARD
   * Justificativa: Arquivos com padrões estabelecidos (DTOs, interfaces básicas,
   * controllers CRUD) podem ser gerados com modelos mais econômicos.
   * Exemplos: PatientDTO.ts, IPatientRepository.ts (interface simples)
   * Economia: $0.15 vs $5 por 1M tokens input (33x mais barato)
   */
  [TaskType.FILE_SIMPLE]: ModelTier.STANDARD,

  /**
   * Config File Generation - STANDARD
   * Justificativa: Arquivos de configuração seguem templates conhecidos.
   * Exemplos: .env.example, tsconfig.json, .eslintrc.json, package.json
   * Modelos standard são suficientes para gerar configs válidas.
   */
  [TaskType.FILE_CONFIG]: ModelTier.STANDARD,

  /**
   * Test File Generation - STANDARD
   * Justificativa: Testes seguem padrões (AAA, Given-When-Then).
   * Modelos standard conseguem gerar testes válidos baseados em templates.
   * Exceção: Testes E2E complexos podem precisar de PREMIUM (decidir caso a caso).
   */
  [TaskType.FILE_TEST]: ModelTier.STANDARD,

  /**
   * Documentation Generation - STANDARD
   * Justificativa: README, ADRs e docs seguem estruturas conhecidas.
   * Modelos standard são suficientes para documentação clara.
   * Exceção: Documentação arquitetural complexa pode usar PREMIUM (já coberta em Architecture).
   */
  [TaskType.FILE_DOCS]: ModelTier.STANDARD,
};

/**
 * Determina o tipo de tarefa baseado no contexto da chamada LLM
 *
 * Analisa a string de contexto passada para callLLM() e determina qual
 * tipo de tarefa está sendo executado, para então selecionar o tier correto.
 *
 * @param context - String de contexto da chamada (ex: "Complexity", "Architecture", "UserStories")
 * @returns Tipo de tarefa identificado
 *
 * @example
 * ```typescript
 * getTaskTypeFromContext("Complexity"); // TaskType.COMPLEXITY
 * getTaskTypeFromContext("Architecture"); // TaskType.ARCHITECTURE
 * getTaskTypeFromContext("File: src/domain/entities/Patient.ts"); // TaskType.FILE_COMPLEX
 * getTaskTypeFromContext("File: tests/unit/patient.test.ts"); // TaskType.FILE_TEST
 * ```
 */
export function getTaskTypeFromContext(context: string): TaskType {
  const ctx = context.trim();

  // Casos diretos (análise de complexidade, arquitetura, HUs)
  if (ctx.includes("Complexity")) return TaskType.COMPLEXITY;
  if (ctx.includes("Architecture")) return TaskType.ARCHITECTURE;
  if (ctx.includes("HUs") || ctx.includes("UserStories") || ctx.includes("Stories")) {
    return TaskType.USER_STORIES;
  }

  // Casos de geração de arquivos
  if (ctx.includes("File:") || ctx.includes("file:") || ctx.includes("Generating")) {
    return classifyFileTask(ctx);
  }

  // Fallback: Se não identificado, assume complexo (PREMIUM) por segurança
  console.warn(`[ModelStrategy] Tipo de tarefa não identificado em contexto: "${ctx}" - usando FILE_COMPLEX`);
  return TaskType.FILE_COMPLEX;
}

/**
 * Classifica uma tarefa de geração de arquivo em FILE_COMPLEX, FILE_SIMPLE,
 * FILE_CONFIG, FILE_TEST ou FILE_DOCS baseado no path e propósito
 *
 * @param context - String de contexto contendo informações sobre o arquivo
 * @returns Tipo de tarefa de arquivo
 *
 * @internal
 */
function classifyFileTask(context: string): TaskType {
  const lowerCtx = context.toLowerCase();

  // 1. Arquivos de teste
  if (
    lowerCtx.includes("/test/") ||
    lowerCtx.includes("/tests/") ||
    lowerCtx.includes(".test.") ||
    lowerCtx.includes(".spec.") ||
    lowerCtx.includes("e2e") ||
    lowerCtx.includes("integration")
  ) {
    return TaskType.FILE_TEST;
  }

  // 2. Arquivos de documentação
  if (
    lowerCtx.includes(".md") ||
    lowerCtx.includes("readme") ||
    lowerCtx.includes("changelog") ||
    lowerCtx.includes("/docs/") ||
    lowerCtx.includes("documentation")
  ) {
    return TaskType.FILE_DOCS;
  }

  // 3. Arquivos de configuração
  if (
    lowerCtx.includes(".json") ||
    lowerCtx.includes(".yml") ||
    lowerCtx.includes(".yaml") ||
    lowerCtx.includes(".env") ||
    lowerCtx.includes("tsconfig") ||
    lowerCtx.includes("package.json") ||
    lowerCtx.includes("eslint") ||
    lowerCtx.includes("prettier") ||
    lowerCtx.includes("docker") ||
    lowerCtx.includes(".github/workflows")
  ) {
    return TaskType.FILE_CONFIG;
  }

  // 4. Arquivos complexos vs simples (código TypeScript/JavaScript)
  // Heurísticas para determinar complexidade:

  // 4.1. Arquivos complexos (domain, use cases, services críticos)
  if (
    lowerCtx.includes("/domain/") ||
    lowerCtx.includes("/entities/") ||
    lowerCtx.includes("/use-case") ||
    lowerCtx.includes("/usecase") ||
    lowerCtx.includes("service") ||
    lowerCtx.includes("aggregate") ||
    lowerCtx.includes("value-object") ||
    lowerCtx.includes("/application/") ||
    lowerCtx.includes("auth") ||
    lowerCtx.includes("security")
  ) {
    return TaskType.FILE_COMPLEX;
  }

  // 4.2. Arquivos simples (DTOs, interfaces, types, controllers CRUD)
  if (
    lowerCtx.includes("dto") ||
    lowerCtx.includes("interface") ||
    lowerCtx.includes("/types/") ||
    lowerCtx.includes("/interfaces/") ||
    lowerCtx.includes("controller") ||
    lowerCtx.includes("/routes/") ||
    lowerCtx.includes("schema") ||
    lowerCtx.includes("validation")
  ) {
    return TaskType.FILE_SIMPLE;
  }

  // 4.3. Baseado no propósito (se mencionado no contexto)
  if (lowerCtx.includes("purpose:")) {
    const purposeMatch = lowerCtx.match(/purpose:\s*(.+)/);
    if (purposeMatch) {
      const purpose = purposeMatch[1];
      // Se o propósito menciona "regras", "lógica", "validação complexa" → COMPLEX
      if (
        purpose.includes("regras") ||
        purpose.includes("lógica") ||
        purpose.includes("validação complexa") ||
        purpose.includes("business logic") ||
        purpose.includes("orchestrat")
      ) {
        return TaskType.FILE_COMPLEX;
      }
    }
  }

  // 4.4. Baseado na criticidade (se mencionada)
  if (lowerCtx.includes("criticality: high") || lowerCtx.includes("criticality: core")) {
    return TaskType.FILE_COMPLEX;
  }

  // Fallback: Arquivos em /infrastructure/ geralmente são simples (adapters, repos)
  if (lowerCtx.includes("/infrastructure/") || lowerCtx.includes("/infra/")) {
    return TaskType.FILE_SIMPLE;
  }

  // Último recurso: Se não conseguimos classificar, assume complexo por segurança
  console.warn(`[ModelStrategy] Arquivo não classificado: "${context}" - usando FILE_COMPLEX por segurança`);
  return TaskType.FILE_COMPLEX;
}

/**
 * Obtém o tier recomendado para uma tarefa
 *
 * @param taskType - Tipo da tarefa
 * @returns Tier de modelo recomendado
 *
 * @example
 * ```typescript
 * const tier = getTierForTask(TaskType.ARCHITECTURE); // ModelTier.PREMIUM
 * const tier2 = getTierForTask(TaskType.FILE_CONFIG); // ModelTier.STANDARD
 * ```
 */
export function getTierForTask(taskType: TaskType): ModelTier {
  return MODEL_STRATEGY[taskType];
}

/**
 * Determina o tier de modelo baseado no contexto da chamada (função conveniente)
 *
 * Combina getTaskTypeFromContext() e getTierForTask() em uma única função.
 *
 * @param context - String de contexto da chamada LLM
 * @returns Tier de modelo a ser usado
 *
 * @example
 * ```typescript
 * const tier = determineTierFromContext("Architecture"); // ModelTier.PREMIUM
 * const tier2 = determineTierFromContext("File: package.json"); // ModelTier.STANDARD
 * ```
 */
export function determineTierFromContext(context: string): ModelTier {
  const taskType = getTaskTypeFromContext(context);
  return getTierForTask(taskType);
}

/**
 * Estimativa de economia de custo ao usar a estratégia de tiers
 *
 * Cálculo baseado em um projeto típico de complexidade MEDIUM:
 * - 1 análise de complexidade (PREMIUM)
 * - 1 geração de arquitetura (PREMIUM)
 * - 5 épicos → 50 HUs (PREMIUM)
 * - 50 arquivos: 15 complexos (PREMIUM) + 35 simples (STANDARD)
 *
 * Custo SEM estratégia (tudo PREMIUM com gpt-4o):
 * - Complexity: ~5K tokens input × $5/1M = $0.025
 * - Architecture: ~15K tokens input × $5/1M = $0.075
 * - 50 HUs: ~50K tokens input × $5/1M = $0.25
 * - 50 arquivos: ~400K tokens input × $5/1M = $2.00
 * - TOTAL: ~$2.35
 *
 * Custo COM estratégia (PREMIUM + STANDARD mix):
 * - Complexity: $0.025 (PREMIUM)
 * - Architecture: $0.075 (PREMIUM)
 * - 50 HUs: $0.25 (PREMIUM)
 * - 15 arquivos complexos: ~120K tokens × $5/1M = $0.60 (PREMIUM)
 * - 35 arquivos simples: ~280K tokens × $0.15/1M = $0.042 (STANDARD - gpt-4o-mini)
 * - TOTAL: ~$0.992
 *
 * ECONOMIA: $2.35 - $0.99 = $1.36 (58% de redução)
 *
 * @returns Objeto com estimativas de custo
 */
export function estimateCostSavings() {
  return {
    withoutStrategy: {
      complexity: 0.025,
      architecture: 0.075,
      userStories: 0.25,
      files: 2.0,
      total: 2.35,
    },
    withStrategy: {
      complexity: 0.025,
      architecture: 0.075,
      userStories: 0.25,
      filesComplex: 0.6,
      filesSimple: 0.042,
      total: 0.992,
    },
    savings: {
      absolute: 1.358,
      percentage: 57.8,
    },
  };
}
