/**
 * User Stories Planner - Planejamento determinístico baseado em artefatos estruturados
 *
 * Este módulo calcula a quantidade mínima de User Stories necessárias baseado em:
 * 1. **Fonte Primária**: RichProductPlan (épicos + requirements por épico)
 * 2. **Ajustes Limitados**: Complexidade da análise, sinais do prompt (com clamps)
 * 3. **Clamps Obrigatórios**: Multiplicadores, per-epic cap, global cap, prompt fallback cap
 *
 * IMPORTANTE:
 * - Deriva principalmente de estruturas (ProductPlan), NÃO de texto bruto
 * - Nunca explode para centenas sem justificativa estrutural
 * - Todos os multiplicadores têm limites superiores (clamps)
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
 * User Stories Planner - Planejamento determinístico baseado em artefatos estruturados
 */
export class UserStoriesPlanner {
  // ==================== CLAMPS OBRIGATÓRIOS ====================
  /** Multiplicador mínimo (nunca reduz abaixo de 90%) */
  private readonly MULTIPLIER_MIN = 0.9;

  /** Multiplicador máximo (nunca aumenta acima de 140%) */
  private readonly MULTIPLIER_MAX = 1.4;

  /** Máximo de histórias por épico (evita explosão em um único épico) */
  private readonly MAX_STORIES_PER_EPIC = 20;

  /** Máximo global de histórias (limite absoluto, independente da quantidade de épicos) */
  private readonly MAX_GLOBAL_STORIES = 100;

  /** Contribuição máxima do prompt quando não há ProductPlan (fallback) */
  private readonly MAX_PROMPT_FALLBACK_STORIES = 10;

  /** Mínimo absoluto de histórias (mesmo para prompts triviais) */
  private readonly MIN_ABSOLUTE_STORIES = 3;

  // ==================== PESOS PARA FÓRMULA GENÉRICA ====================
  /** Histórias base por épico (mínimo antes de ajustes) */
  private readonly BASE_STORIES_PER_EPIC = 3;

  /** Peso de cada requirement (% de requirements que viram histórias) */
  private readonly WEIGHT_REQUIREMENT = 0.8;

  /**
   * Palavras-chave para detectar entidades de domínio (usadas apenas em fallback)
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
   * Calcula quantidade mínima de histórias baseado em artefatos estruturados
   *
   * FÓRMULA GENÉRICA:
   * Para cada épico:
   *   storiesPerEpic = BASE_STORIES_PER_EPIC + (requirements.length * WEIGHT_REQUIREMENT)
   *   storiesPerEpic = min(storiesPerEpic, MAX_STORIES_PER_EPIC)
   *
   * minStories = Σ_epics (storiesPerEpic) * multiplier (clamped)
   * minStories = clamp(minStories, MIN_ABSOLUTE_STORIES, MAX_GLOBAL_STORIES)
   *
   * @param prompt - Prompt original do usuário (usado apenas em fallback)
   * @param analysis - Análise de complexidade (opcional)
   * @param product - Plano de produto com épicos (FONTE PRIMÁRIA)
   * @param architecture - Arquitetura com manifest (opcional)
   * @returns Resultado do planejamento com minStories, targetRange e rationale
   */
  public plan(
    prompt: string,
    analysis?: RichAnalysis,
    product?: RichProductPlan,
    _architecture?: RichArchitecture
  ): PlanningResult {
    const rationale: string[] = [];
    let minStories = 0;
    let multiplier = 1.0;

    // ==================== FASE 1: DERIVAR DE ARTEFATOS ESTRUTURADOS ====================
    if (product && product.epics.length > 0) {
      // FONTE PRIMÁRIA: RichProductPlan
      rationale.push(`📋 Derivando de ProductPlan: ${product.epics.length} épicos`);

      let totalStoriesFromEpics = 0;

      for (const epic of product.epics) {
        // Fórmula: base + (requirements * weight)
        const reqCount = epic.requirements.length;
        let epicStories = this.BASE_STORIES_PER_EPIC + Math.ceil(reqCount * this.WEIGHT_REQUIREMENT);

        // CLAMP: Per-epic cap
        epicStories = Math.min(epicStories, this.MAX_STORIES_PER_EPIC);

        totalStoriesFromEpics += epicStories;

        rationale.push(
          `  - ${epic.id}: ${reqCount} reqs → ${epicStories} histórias (cap: ${this.MAX_STORIES_PER_EPIC})`
        );
      }

      minStories = totalStoriesFromEpics;
      rationale.push(`📊 Total de épicos: ${minStories} histórias`);

      // Ajustar multiplier pela complexidade da análise (se disponível)
      if (analysis) {
        const rawMultiplier = analysis.complexity.level === "CRITICAL" ? 1.4
          : analysis.complexity.level === "HIGH" ? 1.3
          : analysis.complexity.level === "MEDIUM" ? 1.0
          : 0.9;

        // CLAMP: Multiplicador tem limites superiores e inferiores
        multiplier = Math.max(this.MULTIPLIER_MIN, Math.min(rawMultiplier, this.MULTIPLIER_MAX));

        rationale.push(
          `🎚️  Complexidade: ${analysis.complexity.level} → multiplicador ${rawMultiplier.toFixed(1)}x (clamped: ${multiplier.toFixed(1)}x)`
        );

        minStories = Math.ceil(minStories * multiplier);
      }

      // CLAMP: Global cap (limite absoluto)
      if (minStories > this.MAX_GLOBAL_STORIES) {
        rationale.push(
          `⚠️  Aplicando clamp global: ${minStories} → ${this.MAX_GLOBAL_STORIES} (limite máximo)`
        );
        minStories = this.MAX_GLOBAL_STORIES;
      }
    } else {
      // ==================== FASE 2: FALLBACK (SEM PRODUCT PLAN) ====================
      rationale.push(`⚠️  Fallback: ProductPlan não disponível, usando sinais do prompt (LIMITADOS)`);

      const signals = this.analyzePrompt(prompt);
      rationale.push(`📝 Score do prompt: ${signals.score.toFixed(1)}/10`);

      // Fallback com contribuição MUITO LIMITADA
      // Base: 3 histórias + até 5 histórias baseadas no score (máximo 8)
      const promptContribution = Math.min(signals.score * 0.5, 5);
      minStories = this.MIN_ABSOLUTE_STORIES + Math.ceil(promptContribution);

      // CLAMP: Fallback nunca pode gerar mais que MAX_PROMPT_FALLBACK_STORIES
      minStories = Math.min(minStories, this.MAX_PROMPT_FALLBACK_STORIES);

      rationale.push(
        `🔢 Fallback calculado: ${this.MIN_ABSOLUTE_STORIES} (base) + ${Math.ceil(promptContribution)} (prompt) = ${minStories} histórias (cap: ${this.MAX_PROMPT_FALLBACK_STORIES})`
      );

      // Retornar signals para observability
      const targetRange: [number, number] = [minStories, Math.ceil(minStories * 1.2)];
      return {
        minStories,
        targetRange,
        rationale,
        signals
      };
    }

    // ==================== FASE 3: CLAMPS FINAIS ====================
    // Garantir mínimo absoluto
    if (minStories < this.MIN_ABSOLUTE_STORIES) {
      rationale.push(`⬆️  Aplicando mínimo absoluto: ${minStories} → ${this.MIN_ABSOLUTE_STORIES}`);
      minStories = this.MIN_ABSOLUTE_STORIES;
    }

    // Calcular range recomendado (min até 1.2x min, mas respeitando global cap)
    const targetMax = Math.min(
      Math.ceil(minStories * 1.2),
      this.MAX_GLOBAL_STORIES
    );
    const targetRange: [number, number] = [minStories, targetMax];

    rationale.push(`✅ Mínimo final: ${minStories} histórias`);
    rationale.push(`📈 Range recomendado: ${targetRange[0]}-${targetRange[1]} histórias`);

    // Signals vazio quando deriva de ProductPlan (não usado)
    const signals = this.analyzePrompt(prompt);

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
