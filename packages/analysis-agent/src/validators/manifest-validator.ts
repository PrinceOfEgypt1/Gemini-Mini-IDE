import type { RichManifestItem } from "../types/rich-schemas.js";
import type { ProjectTypeDetectionResult } from "../planning/project-type-detector.js";
import { projectTypeDetector } from "../planning/project-type-detector.js";

export interface ValidationError {
  structure: string;
  type:
    | "INSUFFICIENT_METHODS"
    | "MISSING_ALGORITHM"
    | "MISSING_STRUCTURE"
    | "INSUFFICIENT_FILES"
    | "MISSING_VISUALIZATION"
    | "MISSING_ANIMATION"
    | "MISSING_TESTS"
    | "MISSING_CATEGORY";
  expected: number | string;
  actual: number | string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  projectTypeDetection?: ProjectTypeDetectionResult;
}

interface StructureRequirement {
  name: string;
  patterns: string[]; // Regex patterns to match in manifest paths
  minMethods: number;
  requiredAlgorithms?: string[]; // e.g., ["dijkstra", "prim", "bfs", "dfs"]
}

/**
 * Extrai requisitos de estruturas de dados do prompt do usuário
 */
export function extractStructureRequirements(userPrompt: string): StructureRequirement[] {
  const requirements: StructureRequirement[] = [];
  const lowerPrompt = userPrompt.toLowerCase();

  // Detectar requisito de "10 métodos" ou "pelo menos X métodos"
  const methodCountMatch = lowerPrompt.match(/pelo menos (\d+) métodos/i) ||
                           lowerPrompt.match(/≥\s*(\d+)\s*métodos/i) ||
                           lowerPrompt.match(/minimum (\d+) methods/i);
  const minMethods = methodCountMatch ? parseInt(methodCountMatch[1]) : 10;

  // Array/Vetor
  if (lowerPrompt.includes('array') || lowerPrompt.includes('vetor')) {
    requirements.push({
      name: 'Array',
      patterns: ['Array\\.ts', 'CustomArray', 'SimulatedArray'],
      minMethods
    });
  }

  // Lista Ligada Simples
  if (lowerPrompt.includes('lista ligada simples') || lowerPrompt.includes('singly linked list')) {
    requirements.push({
      name: 'LinkedList',
      patterns: ['LinkedList\\.ts', 'SinglyLinkedList'],
      minMethods
    });
  }

  // Lista Duplamente Ligada
  if (lowerPrompt.includes('lista duplamente ligada') ||
      lowerPrompt.includes('doubly linked list') ||
      lowerPrompt.includes('lista dupla')) {
    requirements.push({
      name: 'DoublyLinkedList',
      patterns: ['DoublyLinkedList\\.ts', 'DoubleLinkedList'],
      minMethods
    });
  }

  // Árvore Binária
  if (lowerPrompt.includes('árvore') || lowerPrompt.includes('tree') || lowerPrompt.includes('bst')) {
    requirements.push({
      name: 'BinarySearchTree',
      patterns: ['BinarySearchTree\\.ts', 'BST\\.ts', 'Tree\\.ts', 'AVL'],
      minMethods,
      requiredAlgorithms: [] // Pode adicionar preOrder, postOrder, etc. se especificados
    });
  }

  // Grafo
  if (lowerPrompt.includes('grafo') || lowerPrompt.includes('graph')) {
    const requiredAlgorithms: string[] = [];

    // Verificar algoritmos específicos mencionados
    if (lowerPrompt.includes('dijkstra')) requiredAlgorithms.push('dijkstra');
    if (lowerPrompt.includes('prim')) requiredAlgorithms.push('prim');
    if (lowerPrompt.includes('bfs') || lowerPrompt.includes('breadth')) requiredAlgorithms.push('bfs');
    if (lowerPrompt.includes('dfs') || lowerPrompt.includes('depth')) requiredAlgorithms.push('dfs');
    if (lowerPrompt.includes('kruskal')) requiredAlgorithms.push('kruskal');
    if (lowerPrompt.includes('bellman')) requiredAlgorithms.push('bellman');

    requirements.push({
      name: 'Graph',
      patterns: ['Graph\\.ts', 'Grafo\\.ts'],
      minMethods,
      requiredAlgorithms: requiredAlgorithms.length > 0 ? requiredAlgorithms : undefined
    });
  }

  return requirements;
}

/**
 * Conta métodos mencionados no purpose/description de um arquivo.
 *
 * ESTRATÉGIA: Prioriza contagem explícita no formato "(N methods)" ou "(N métodos)"
 * e fallback para contagem de métodos listados separados por vírgula.
 *
 * IMPORTANTE: Prioriza formato explícito do LLM sobre keyword matching.
 */
function countMethodsInDescription(description: string): number {
  if (!description) return 0;

  const lowerDesc = description.toLowerCase();

  // ESTRATÉGIA 1: Procurar contagem explícita no formato "(N methods)" ou "(N métodos)"
  const explicitCountMatch = description.match(/\((\d+)\s+m[eé]todos?\)/i);
  if (explicitCountMatch) {
    const count = parseInt(explicitCountMatch[1], 10);
    if (!isNaN(count) && count > 0) {
      return count;
    }
  }

  // ESTRATÉGIA 2: Procurar lista de métodos no formato "with methods: m1, m2, m3, ..."
  const methodsListMatch = description.match(/with methods:\s*([^(]+)/i);
  if (methodsListMatch) {
    const methodsList = methodsListMatch[1];
    // Contar métodos separados por vírgula
    const methods = methodsList
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0 && /^[a-zA-Z_][a-zA-Z0-9_]*/.test(m)); // Validação de nome de método

    if (methods.length > 0) {
      return methods.length;
    }
  }

  // ESTRATÉGIA 3: Fallback - procurar métodos comuns em lista hardcoded
  const commonMethods = [
    'insert', 'remove', 'delete', 'search', 'find', 'get', 'set', 'update',
    'add', 'push', 'pop', 'peek', 'enqueue', 'dequeue',
    'clear', 'size', 'length', 'isempty', 'isfull',
    'traverse', 'foreach', 'map', 'filter', 'reduce',
    'reverse', 'sort', 'min', 'max', 'sum',
    'contains', 'indexof', 'toarray', 'tolist',
    'inorder', 'preorder', 'postorder', 'levelorder',
    'height', 'depth', 'balance', 'rotate',
    'findmin', 'findmax', 'getmin', 'getmax',
    'addnode', 'addedge', 'removenode', 'removeedge',
    'bfs', 'dfs', 'dijkstra', 'prim', 'kruskal',
    'haspath', 'shortestpath', 'mst', 'topologicalsort',
    'getneighbors', 'getvertices', 'getedges', 'isconnected'
  ];

  const foundMethods = new Set<string>();

  for (const method of commonMethods) {
    const patterns = [
      new RegExp(`\\b${method}\\b`, 'i'),
      new RegExp(`método\\s+${method}`, 'i'),
      new RegExp(`${method}\\(`, 'i')
    ];

    if (patterns.some(pattern => pattern.test(lowerDesc))) {
      foundMethods.add(method);
    }
  }

  return foundMethods.size;
}

/**
 * Verifica se algoritmos específicos estão presentes na descrição
 */
function checkAlgorithmsPresent(description: string, requiredAlgorithms: string[]): string[] {
  const lowerDesc = description.toLowerCase();
  const missing: string[] = [];

  for (const algo of requiredAlgorithms) {
    const patterns = [
      new RegExp(`\\b${algo}\\b`, 'i'),
      new RegExp(`algoritmo\\s+${algo}`, 'i'),
      new RegExp(`${algo}\\(`, 'i')
    ];

    if (!patterns.some(pattern => pattern.test(lowerDesc))) {
      missing.push(algo);
    }
  }

  return missing;
}

/**
 * Valida o manifest contra os requisitos extraídos do prompt
 */
export function validateManifest(
  manifest: RichManifestItem[],
  userPrompt: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // 1. Extrair requisitos do prompt
  const requirements = extractStructureRequirements(userPrompt);

  if (requirements.length === 0) {
    warnings.push('Nenhum requisito de estrutura de dados detectado no prompt');
    return { valid: true, errors, warnings };
  }

  // 2. Para cada requisito, validar no manifest
  for (const req of requirements) {
    // Encontrar arquivo da estrutura no manifest
    const structureFile = manifest.find(item =>
      req.patterns.some(pattern => new RegExp(pattern, 'i').test(item.path))
    );

    if (!structureFile) {
      errors.push({
        structure: req.name,
        type: 'MISSING_STRUCTURE',
        expected: 'Arquivo da estrutura',
        actual: 'Não encontrado',
        message: `Estrutura "${req.name}" não encontrada no manifest. Padrões procurados: ${req.patterns.join(', ')}`
      });
      continue;
    }

    // Contar métodos no purpose
    const methodCount = countMethodsInDescription(structureFile.purpose);

    if (methodCount < req.minMethods) {
      errors.push({
        structure: req.name,
        type: 'INSUFFICIENT_METHODS',
        expected: req.minMethods,
        actual: methodCount,
        message: `${req.name} tem apenas ${methodCount} métodos, esperado >= ${req.minMethods}. Arquivo: ${structureFile.path}`
      });
    }

    // Verificar algoritmos específicos (se houver)
    if (req.requiredAlgorithms && req.requiredAlgorithms.length > 0) {
      const missingAlgos = checkAlgorithmsPresent(
        structureFile.purpose,
        req.requiredAlgorithms
      );

      for (const algo of missingAlgos) {
        errors.push({
          structure: req.name,
          type: 'MISSING_ALGORITHM',
          expected: algo,
          actual: 'Não encontrado',
          message: `${req.name} não menciona algoritmo obrigatório: ${algo}. Arquivo: ${structureFile.path}`
        });
      }
    }
  }

  // 3. Detectar tipo de projeto para validações semânticas
  const projectDetection = projectTypeDetector.detect(userPrompt);

  // 4. Validar requisitos específicos para projetos de visualização
  // (visualizadores, animação, testes, categorias — verificações semânticas, não contagem arbitrária)
  if (
    projectDetection.primaryType === "VISUALIZATION" ||
    projectDetection.primaryType === "EDUCATIONAL"
  ) {
    const vizValidation = validateVisualizationRequirements(
      manifest,
      projectDetection
    );
    errors.push(...vizValidation.errors);
    warnings.push(...vizValidation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    projectTypeDetection: projectDetection
  };
}

/**
 * Valida requisitos específicos para projetos de visualização
 */
function validateVisualizationRequirements(
  manifest: RichManifestItem[],
  projectDetection: ProjectTypeDetectionResult
): { errors: ValidationError[]; warnings: string[] } {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const manifestPaths = manifest.map((m) => m.path.toLowerCase());

  // 1. Verificar arquivos de visualização para cada estrutura de dados
  for (const ds of projectDetection.dataStructures) {
    const dsId = ds.id.replace(/-/g, "").toLowerCase();
    const dsName = ds.name.toLowerCase();

    // Verificar se existe visualizador
    const hasVisualizer = manifestPaths.some(
      (p) =>
        p.includes("visualizer") &&
        (p.includes(dsId) ||
          p.includes(dsName) ||
          p.includes(ds.id.split("-")[0]))
    );

    if (!hasVisualizer && ds.needsVisualization) {
      errors.push({
        structure: ds.name,
        type: "MISSING_VISUALIZATION",
        expected: `Visualizer component for ${ds.name}`,
        actual: "Not found",
        message: `Missing visualizer component for ${ds.name}. Expected file matching pattern: *${ds.id}*visualizer* or similar`,
      });
    }
  }

  // 2. Verificar componentes de animação se necessário
  if (projectDetection.flags.needsAnimation) {
    const animationPatterns = [
      "animation",
      "frame",
      "step",
      "timeline",
      "controller",
    ];
    const hasAnimationFiles = animationPatterns.some((pattern) =>
      manifestPaths.some((p) => p.includes(pattern))
    );

    if (!hasAnimationFiles) {
      errors.push({
        structure: "ANIMATION",
        type: "MISSING_ANIMATION",
        expected: "Animation engine files",
        actual: "Not found",
        message:
          "Missing animation engine files. Expected files for: AnimationController, StepBuilder, Timeline, etc.",
      });
    }
  }

  // 3. Verificar componentes de controle (play/pause/etc.)
  if (projectDetection.flags.needsPlaybackControls) {
    const controlPatterns = ["control", "playback", "toolbar", "panel"];
    const hasControlFiles = controlPatterns.some((pattern) =>
      manifestPaths.some((p) => p.includes(pattern))
    );

    if (!hasControlFiles) {
      warnings.push(
        "Missing playback control components. Consider adding: ControlsBar, PlaybackControls, etc."
      );
    }
  }

  // 4. Verificar pseudocódigo se necessário
  if (projectDetection.flags.needsPseudocode) {
    const hasPseudocode = manifestPaths.some(
      (p) => p.includes("pseudocode") || p.includes("pseudo")
    );

    if (!hasPseudocode) {
      warnings.push(
        "Missing pseudocode components. Consider adding: PseudocodePanel, PseudocodeRegistry, etc."
      );
    }
  }

  // 5. Verificar operações registradas para cada estrutura
  for (const ds of projectDetection.dataStructures) {
    const dsId = ds.id.replace(/-/g, "").toLowerCase();

    // Verificar se existe arquivo de operações
    const hasOperations = manifestPaths.some(
      (p) =>
        (p.includes("operations") || p.includes("registry")) &&
        (p.includes(dsId) || p.includes(ds.id.split("-")[0]))
    );

    if (!hasOperations) {
      warnings.push(
        `Consider adding operations registry for ${ds.name}: ${ds.id}.operations.ts or ${ds.id}.registry.ts`
      );
    }
  }

  // 6. Verificar testes para estruturas de dados
  const testFiles = manifest.filter((m) => m.category === "TESTS");
  const expectedMinTests = projectDetection.dataStructures.length * 2;

  if (testFiles.length < expectedMinTests) {
    errors.push({
      structure: "TESTS",
      type: "MISSING_TESTS",
      expected: expectedMinTests,
      actual: testFiles.length,
      message: `Insufficient test files. Expected at least ${expectedMinTests} test files for ${projectDetection.dataStructures.length} data structures. Found: ${testFiles.length}`,
    });
  }

  // 7. Verificar distribuição de categorias
  const categoryCount: Record<string, number> = {};
  for (const item of manifest) {
    categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
  }

  const requiredCategories = [
    "DOMAIN",
    "APPLICATION",
    "CONFIG",
    "TESTS",
    "DOCS",
  ];
  for (const cat of requiredCategories) {
    if (!categoryCount[cat] || categoryCount[cat] < 1) {
      errors.push({
        structure: "MANIFEST",
        type: "MISSING_CATEGORY",
        expected: cat,
        actual: "0 files",
        message: `Missing files in category: ${cat}. Every project should have at least one file in this category.`,
      });
    }
  }

  // 8. Verificar páginas/rotas para cada estrutura
  if (
    projectDetection.primaryType === "VISUALIZATION" ||
    projectDetection.primaryType === "EDUCATIONAL"
  ) {
    const pageFiles = manifestPaths.filter(
      (p) => p.includes("page") || p.includes("route")
    );
    const expectedPages = projectDetection.dataStructures.length + 1; // +1 for home

    if (pageFiles.length < projectDetection.dataStructures.length) {
      warnings.push(
        `Consider adding a dedicated page for each data structure. Expected ~${expectedPages} page files, found ${pageFiles.length}`
      );
    }
  }

  return { errors, warnings };
}
