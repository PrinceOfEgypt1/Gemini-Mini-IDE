import type { RichManifestItem } from "../types/rich-schemas.js";

export interface ValidationError {
  structure: string;
  type: 'INSUFFICIENT_METHODS' | 'MISSING_ALGORITHM' | 'MISSING_STRUCTURE';
  expected: number | string;
  actual: number | string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
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
 * Conta métodos mencionados no purpose/description de um arquivo
 */
function countMethodsInDescription(description: string): number {
  if (!description) return 0;

  const lowerDesc = description.toLowerCase();

  // Métodos comuns em estruturas de dados
  const commonMethods = [
    'insert', 'remove', 'delete', 'search', 'find', 'get', 'set', 'update',
    'add', 'push', 'pop', 'peek', 'enqueue', 'dequeue',
    'clear', 'size', 'length', 'isempty', 'isfull',
    'traverse', 'foreach', 'map', 'filter', 'reduce',
    'reverse', 'sort', 'min', 'max', 'sum',
    'contains', 'indexof', 'toarray', 'tolist',
    // Árvores
    'inorder', 'preorder', 'postorder', 'levelorder',
    'height', 'depth', 'balance', 'rotate',
    'findmin', 'findmax', 'getmin', 'getmax',
    // Grafos
    'addnode', 'addedge', 'removenode', 'removeedge',
    'bfs', 'dfs', 'dijkstra', 'prim', 'kruskal',
    'haspath', 'shortestpath', 'mst', 'topologicalsort',
    'getneighbors', 'getvertices', 'getedges', 'isconnected'
  ];

  // Contar quantos métodos únicos aparecem na descrição
  const foundMethods = new Set<string>();

  for (const method of commonMethods) {
    // Buscar padrões como: "método insert", "insert()", "método de inserção"
    const patterns = [
      new RegExp(`\\b${method}\\b`, 'i'),
      new RegExp(`método\\s+${method}`, 'i'),
      new RegExp(`${method}\\(`, 'i')
    ];

    if (patterns.some(pattern => pattern.test(lowerDesc))) {
      foundMethods.add(method);
    }
  }

  // Se a descrição menciona explicitamente quantidade (ex: "10 métodos")
  const explicitCountMatch = description.match(/(\d+)\s+métodos?/i);
  if (explicitCountMatch) {
    const explicitCount = parseInt(explicitCountMatch[1]);
    return Math.max(foundMethods.size, explicitCount);
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

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
