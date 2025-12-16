/**
 * User Stories Planner - Heurísticas genéricas para determinar quantidade e cobertura de User Stories
 *
 * Este módulo analisa o prompt e artefatos intermediários para calcular:
 * - Quantidade mínima de histórias necessárias (minStories)
 * - Range recomendado (targetRange)
 * - Rationale explicando os fatores de complexidade
 *
 * IMPORTANTE: Não usa hardcoding de números específicos por prompt.
 * Baseado em sinais genéricos de complexidade e cobertura.
 */

import { RichAnalysis, RichProductPlan, RichArchitecture } from "../types/rich-schemas.js";

/**
 * Sinais de complexidade extraídos do prompt
 */
interface ComplexitySignals {
  /** Palavras-chave de domínio/entidades (ex: "usuário", "produto", "pedido") */
  domainEntities: number;

  /** Palavras-chave de operações (ex: "cadastrar", "listar", "editar", "excluir") */
  operations: number;

  /** Palavras-chave de requisitos não-funcionais (ex: "segurança", "performance", "monitoramento") */
  nonFunctionalReqs: number;

  /** Palavras-chave de integração (ex: "API", "webhook", "notificação", "email") */
  integrations: number;

  /** Palavras-chave de estruturas/algoritmos (ex: "árvore", "grafo", "ordenação", "busca") */
  structuresAndAlgorithms: number;

  /** Tamanho do prompt (caracteres) */
  promptLength: number;

  /** Complexidade relativa (0-10) calculada a partir dos sinais */
  score: number;
}

/**
 * Resultado do planejamento
 */
export interface PlanningResult {
  /** Quantidade mínima de histórias necessárias */
  minStories: number;

  /** Range recomendado [min, max] */
  targetRange: [number, number];

  /** Explicação dos fatores que influenciaram o cálculo */
  rationale: string[];

  /** Sinais de complexidade detectados */
  signals: ComplexitySignals;
}

/**
 * User Stories Planner - Calcula quantidade necessária de HUs baseado em heurísticas
 */
export class UserStoriesPlanner {
  /**
   * Palavras-chave para detectar entidades de domínio
   */
  private readonly DOMAIN_KEYWORDS = [
    "usuário", "user", "cliente", "customer", "produto", "product", "pedido", "order",
    "paciente", "patient", "médico", "doctor", "consulta", "appointment", "agenda",
    "funcionário", "employee", "departamento", "department", "projeto", "project",
    "tarefa", "task", "categoria", "category", "tag", "comentário", "comment",
    "endereço", "address", "pagamento", "payment", "fatura", "invoice", "nota",
    "estoque", "inventory", "fornecedor", "supplier", "entrega", "delivery",
    "estrutura", "structure", "árvore", "tree", "grafo", "graph", "lista", "list",
    "vetor", "array", "fila", "queue", "pilha", "stack", "nó", "node", "vértice", "vertex"
  ];

  /**
   * Palavras-chave para detectar operações/ações
   */
  private readonly OPERATION_KEYWORDS = [
    "cadastrar", "criar", "create", "adicionar", "add", "inserir", "insert",
    "listar", "list", "buscar", "search", "filtrar", "filter", "pesquisar",
    "editar", "edit", "atualizar", "update", "modificar", "modify",
    "excluir", "delete", "remover", "remove", "deletar",
    "visualizar", "view", "exibir", "display", "mostrar", "show",
    "exportar", "export", "importar", "import", "gerar", "generate",
    "enviar", "send", "receber", "receive", "notificar", "notify",
    "validar", "validate", "aprovar", "approve", "rejeitar", "reject",
    "calcular", "calculate", "processar", "process", "executar", "execute",
    "implementar", "implement", "percorrer", "traverse", "ordenar", "sort"
  ];

  /**
   * Palavras-chave para requisitos não-funcionais
   */
  private readonly NFR_KEYWORDS = [
    "segurança", "security", "autenticação", "authentication", "autorização", "authorization",
    "performance", "desempenho", "otimização", "optimization", "cache", "caching",
    "monitoramento", "monitoring", "observabilidade", "observability", "log", "logging",
    "métrica", "metric", "alerta", "alert", "trace", "tracing",
    "escalabilidade", "scalability", "disponibilidade", "availability", "resiliência", "resilience",
    "backup", "recovery", "disaster", "auditoria", "audit", "compliance", "lgpd", "gdpr"
  ];

  /**
   * Palavras-chave para integrações
   */
  private readonly INTEGRATION_KEYWORDS = [
    "api", "rest", "graphql", "webhook", "http", "endpoint",
    "integração", "integration", "externo", "external", "terceiro", "third-party",
    "notificação", "notification", "email", "sms", "whatsapp", "push",
    "pagamento", "payment", "gateway", "stripe", "paypal",
    "storage", "s3", "bucket", "upload", "download"
  ];

  /**
   * Palavras-chave para estruturas de dados e algoritmos
   */
  private readonly STRUCTURE_ALGORITHM_KEYWORDS = [
    "árvore", "tree", "bst", "avl", "heap", "trie",
    "grafo", "graph", "dijkstra", "prim", "kruskal", "bfs", "dfs",
    "lista", "list", "linked", "ligada", "duplamente", "doubly",
    "fila", "queue", "pilha", "stack", "deque",
    "hash", "map", "set", "tabela", "table",
    "ordenação", "sort", "bubble", "quick", "merge", "heap",
    "busca", "search", "binary", "linear", "sequencial",
    "algoritmo", "algorithm", "complexidade", "complexity", "big-o"
  ];

  /**
   * Analisa o prompt e extrai sinais de complexidade
   */
  private analyzePrompt(prompt: string): ComplexitySignals {
    const lowerPrompt = prompt.toLowerCase();

    const domainEntities = this.countMatches(lowerPrompt, this.DOMAIN_KEYWORDS);
    const operations = this.countMatches(lowerPrompt, this.OPERATION_KEYWORDS);
    const nonFunctionalReqs = this.countMatches(lowerPrompt, this.NFR_KEYWORDS);
    const integrations = this.countMatches(lowerPrompt, this.INTEGRATION_KEYWORDS);
    const structuresAndAlgorithms = this.countMatches(lowerPrompt, this.STRUCTURE_ALGORITHM_KEYWORDS);
    const promptLength = prompt.length;

    // Calcula score de complexidade (0-10)
    let score = 0;

    // Entidades contribuem muito (cada entidade pode gerar várias histórias)
    score += Math.min(domainEntities * 0.5, 3);

    // Operações contribuem (cada operação pode ser uma história)
    score += Math.min(operations * 0.3, 2);

    // NFRs contribuem (requisitos não-funcionais geram histórias de infraestrutura)
    score += Math.min(nonFunctionalReqs * 0.4, 2);

    // Integrações contribuem (cada integração pode gerar várias histórias)
    score += Math.min(integrations * 0.4, 1.5);

    // Estruturas/algoritmos contribuem (cada estrutura pode ter múltiplos métodos)
    score += Math.min(structuresAndAlgorithms * 0.6, 2.5);

    // Tamanho do prompt contribui (prompts maiores tendem a ser mais complexos)
    if (promptLength > 2000) score += 1;
    else if (promptLength > 1000) score += 0.5;
    else if (promptLength > 500) score += 0.2;

    // Normaliza para 0-10
    score = Math.min(score, 10);

    return {
      domainEntities,
      operations,
      nonFunctionalReqs,
      integrations,
      structuresAndAlgorithms,
      promptLength,
      score
    };
  }

  /**
   * Conta quantas palavras-chave aparecem no texto
   */
  private countMatches(text: string, keywords: string[]): number {
    let count = 0;
    for (const keyword of keywords) {
      // Usar word boundary para evitar matches parciais
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        count += matches.length;
      }
    }
    return count;
  }

  /**
   * Calcula quantidade mínima de histórias baseado em heurísticas genéricas
   *
   * @param prompt - Prompt original do usuário
   * @param analysis - Análise de complexidade (opcional)
   * @param product - Plano de produto com épicos (opcional)
   * @param architecture - Arquitetura com manifest (opcional)
   * @returns Resultado do planejamento com minStories, targetRange e rationale
   */
  public plan(
    prompt: string,
    analysis?: RichAnalysis,
    product?: RichProductPlan,
    architecture?: RichArchitecture
  ): PlanningResult {
    const signals = this.analyzePrompt(prompt);
    const rationale: string[] = [];

    // Base: começar com mínimo absoluto de 3 histórias por épico
    let baseStoriesPerEpic = 3;
    let multiplier = 1.0;

    // Ajustar base por complexidade do prompt
    if (signals.score >= 7) {
      baseStoriesPerEpic = 10;
      multiplier = 1.5;
      rationale.push(`Alta complexidade detectada no prompt (score: ${signals.score.toFixed(1)}/10)`);
    } else if (signals.score >= 4) {
      baseStoriesPerEpic = 6;
      multiplier = 1.2;
      rationale.push(`Média complexidade detectada no prompt (score: ${signals.score.toFixed(1)}/10)`);
    } else {
      rationale.push(`Baixa complexidade detectada no prompt (score: ${signals.score.toFixed(1)}/10)`);
    }

    // Multiplicador extra por estruturas/algoritmos (cada um tem muitos métodos)
    if (signals.structuresAndAlgorithms > 5) {
      multiplier *= 2.0; // Dobrar quando tem muitas estruturas
      rationale.push(`Multiplicador 2x por alta quantidade de estruturas/algoritmos`);
    } else if (signals.structuresAndAlgorithms > 0) {
      multiplier *= 1.5;
    }

    // Multiplicador por entidades de domínio (cada uma requer CRUD + operações)
    if (signals.domainEntities > 3) {
      multiplier *= 1.3;
    }

    // Fator de entidades de domínio (cada entidade tende a ter CRUD + operações específicas)
    if (signals.domainEntities > 0) {
      rationale.push(`${signals.domainEntities} entidades de domínio detectadas`);
    }

    // Fator de estruturas/algoritmos (cada estrutura tem múltiplos métodos)
    if (signals.structuresAndAlgorithms > 0) {
      rationale.push(`${signals.structuresAndAlgorithms} estruturas/algoritmos detectados (cada um com múltiplos métodos)`);
    }

    // Fator de operações
    if (signals.operations > 0) {
      rationale.push(`${signals.operations} operações/ações identificadas`);
    }

    // Fator de NFRs (geram histórias de infraestrutura)
    if (signals.nonFunctionalReqs > 0) {
      rationale.push(`${signals.nonFunctionalReqs} requisitos não-funcionais identificados`);
    }

    // Fator de integrações
    if (signals.integrations > 0) {
      rationale.push(`${signals.integrations} integrações externas identificadas`);
    }

    // Usar informações dos artefatos intermediários se disponíveis
    let epicCount = 1;
    let avgRequirementsPerEpic = 5;

    if (product && product.epics.length > 0) {
      epicCount = product.epics.length;
      rationale.push(`${epicCount} épicos definidos no plano de produto`);

      // Calcular média de requirements por épico
      const totalReqs = product.epics.reduce((sum, epic) => sum + epic.requirements.length, 0);
      avgRequirementsPerEpic = Math.max(totalReqs / epicCount, 3);
      rationale.push(`Média de ${avgRequirementsPerEpic.toFixed(1)} requisitos por épico`);
    }

    // Usar complexidade da análise se disponível
    if (analysis) {
      const complexityMultiplier = analysis.complexity.level === "CRITICAL" ? 1.5
        : analysis.complexity.level === "HIGH" ? 1.3
        : analysis.complexity.level === "MEDIUM" ? 1.0
        : 0.8;

      baseStoriesPerEpic = Math.ceil(baseStoriesPerEpic * complexityMultiplier);
      rationale.push(`Complexidade da análise: ${analysis.complexity.level} (multiplicador: ${complexityMultiplier}x)`);
    }

    // Ajustar por tamanho do manifest (mais arquivos = mais cobertura necessária)
    if (architecture && architecture.manifest.length > 0) {
      const fileCount = architecture.manifest.length;
      if (fileCount > 30) {
        multiplier *= 1.4;
        rationale.push(`Arquitetura complexa (${fileCount} arquivos, multiplicador +40%)`);
      } else if (fileCount > 15) {
        multiplier *= 1.2;
        rationale.push(`Arquitetura média (${fileCount} arquivos, multiplicador +20%)`);
      }
    }

    // Aplicar multiplicador final
    baseStoriesPerEpic = Math.ceil(baseStoriesPerEpic * multiplier);

    // Calcular mínimo de histórias
    const minStories = Math.max(
      epicCount * baseStoriesPerEpic,
      Math.ceil(avgRequirementsPerEpic * epicCount * 0.8) // Pelo menos 80% dos requirements viram histórias
    );

    // Calcular range recomendado (min até 1.5x min, mas com upper bound)
    const targetMax = Math.min(minStories * 1.5, minStories + 50); // Não explodir em centenas
    const targetRange: [number, number] = [minStories, Math.ceil(targetMax)];

    rationale.push(`Mínimo calculado: ${minStories} histórias`);
    rationale.push(`Range recomendado: ${targetRange[0]}-${targetRange[1]} histórias`);

    return {
      minStories,
      targetRange,
      rationale,
      signals
    };
  }

  /**
   * Valida se a quantidade de histórias geradas atende ao mínimo
   */
  public validate(generatedStories: number, planningResult: PlanningResult): {
    valid: boolean;
    delta: number;
    message: string;
  } {
    const delta = planningResult.minStories - generatedStories;

    if (generatedStories >= planningResult.minStories) {
      return {
        valid: true,
        delta: 0,
        message: `✅ Quantidade adequada: ${generatedStories} histórias (mínimo: ${planningResult.minStories})`
      };
    }

    return {
      valid: false,
      delta,
      message: `❌ Quantidade insuficiente: ${generatedStories} histórias geradas, mas mínimo requerido é ${planningResult.minStories} (faltam ${delta})`
    };
  }
}
