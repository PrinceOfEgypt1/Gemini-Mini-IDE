/**
 * Array Utilities - Funções auxiliares para manipulação de arrays
 *
 * Este arquivo fornece utilitários para trabalhar com arrays, especialmente
 * para processamento paralelo em lotes (batching/chunking).
 *
 * @module utils/array
 */

/**
 * Divide um array em chunks (lotes) de tamanho especificado
 *
 * Útil para processar grandes arrays em paralelo sem sobrecarregar
 * recursos (APIs, memória, etc.). Garante que nenhum item seja perdido
 * e que o último chunk possa ter menos itens que o tamanho especificado.
 *
 * @template T - Tipo dos elementos do array
 * @param array - Array a ser dividido em chunks
 * @param chunkSize - Tamanho de cada chunk (deve ser > 0)
 * @returns Array de chunks, onde cada chunk é um array de elementos
 *
 * @throws {Error} Se chunkSize for menor ou igual a 0
 *
 * @example
 * ```typescript
 * const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const chunks = chunk(numbers, 3);
 * // Resultado: [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]
 * ```
 *
 * @example
 * ```typescript
 * const files = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"];
 * const batches = chunk(files, 2);
 * // Resultado: [["a.ts", "b.ts"], ["c.ts", "d.ts"], ["e.ts"]]
 *
 * // Processar cada batch em paralelo:
 * for (const batch of batches) {
 *   await Promise.all(batch.map(file => generateFile(file)));
 * }
 * ```
 */
export function chunk<T>(array: T[], chunkSize: number): T[][] {
  // Validação de entrada
  if (chunkSize <= 0) {
    throw new Error(`chunk(): chunkSize deve ser > 0, recebido: ${chunkSize}`);
  }

  if (array.length === 0) {
    return [];
  }

  const chunks: T[][] = [];

  // Dividir array em chunks do tamanho especificado
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunkEnd = Math.min(i + chunkSize, array.length);
    const currentChunk = array.slice(i, chunkEnd);
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Executa uma função assíncrona em cada elemento de um array, em batches paralelos
 *
 * Processa o array em lotes (chunks), executando cada lote em paralelo via Promise.all(),
 * mas esperando cada lote completar antes de iniciar o próximo. Isso limita a concorrência
 * para evitar sobrecarga de recursos (ex: rate limits de APIs).
 *
 * @template T - Tipo dos elementos do array de entrada
 * @template R - Tipo dos resultados retornados pela função
 * @param array - Array de elementos a processar
 * @param batchSize - Número de elementos a processar em paralelo por vez
 * @param fn - Função assíncrona a executar em cada elemento
 * @returns Promise que resolve para array com todos os resultados, na mesma ordem do input
 *
 * @example
 * ```typescript
 * const urls = ["url1", "url2", "url3", "url4", "url5", "url6"];
 *
 * // Fazer fetch de 2 URLs por vez, evitando sobrecarga:
 * const results = await processBatches(urls, 2, async (url) => {
 *   const response = await fetch(url);
 *   return response.json();
 * });
 *
 * // Execução:
 * // Batch 1: url1, url2 (paralelo)
 * // Aguarda batch 1 completar
 * // Batch 2: url3, url4 (paralelo)
 * // Aguarda batch 2 completar
 * // Batch 3: url5, url6 (paralelo)
 * ```
 *
 * @example
 * ```typescript
 * // Gerar 50 arquivos em batches de 10:
 * const fileSpecs = [...Array(50)].map((_, i) => ({ path: `file${i}.ts` }));
 *
 * const generatedFiles = await processBatches(fileSpecs, 10, async (spec) => {
 *   return await generateFile(spec.path);
 * });
 *
 * console.log(`Gerados ${generatedFiles.length} arquivos`);
 * ```
 */
export async function processBatches<T, R>(
  array: T[],
  batchSize: number,
  fn: (item: T, index: number, array: T[]) => Promise<R>
): Promise<R[]> {
  if (array.length === 0) {
    return [];
  }

  const batches = chunk(array, batchSize);
  const results: R[] = [];

  let processedCount = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    // eslint-disable-next-line no-console
    console.info(
      `[processBatches] Batch ${batchIndex + 1}/${batches.length}: processando ${batch.length} itens...`
    );

    // Processar batch em paralelo
    const batchResults = await Promise.all(
      batch.map((item, indexInBatch) => {
        const originalIndex = processedCount + indexInBatch;
        return fn(item, originalIndex, array);
      })
    );

    results.push(...batchResults);
    processedCount += batch.length;

    // eslint-disable-next-line no-console
    console.info(
      `[processBatches] Batch ${batchIndex + 1}/${batches.length}: completo (${processedCount}/${array.length} total)`
    );
  }

  return results;
}

/**
 * Executa múltiplas promises com limite de concorrência
 *
 * Similar a Promise.all(), mas limita o número de promises executando
 * simultaneamente. Útil para controlar rate limits e uso de recursos.
 *
 * @template T - Tipo do resultado das promises
 * @param tasks - Array de funções que retornam promises
 * @param concurrencyLimit - Número máximo de promises executando simultaneamente
 * @returns Promise que resolve para array com todos os resultados
 *
 * @example
 * ```typescript
 * const tasks = urls.map(url => () => fetch(url));
 *
 * // Executar no máximo 5 fetches simultaneamente:
 * const results = await promiseAllWithLimit(tasks, 5);
 * ```
 */
export async function promiseAllWithLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrencyLimit: number
): Promise<T[]> {
  if (tasks.length === 0) {
    return [];
  }

  if (concurrencyLimit <= 0) {
    throw new Error(`promiseAllWithLimit(): concurrencyLimit deve ser > 0, recebido: ${concurrencyLimit}`);
  }

  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    // Criar promise que executa a task e guarda o resultado
    const promise = task().then((result) => {
      results[i] = result;
    });

    executing.push(promise);

    // Se atingiu o limite de concorrência, aguardar uma promise completar
    if (executing.length >= concurrencyLimit) {
      await Promise.race(executing);
      // Remover promises completadas
      const stillExecuting = executing.filter((p) => {
        let resolved = false;
        p.then(() => { resolved = true; }).catch(() => { resolved = true; });
        return !resolved;
      });
      executing.length = 0;
      executing.push(...stillExecuting);
    }
  }

  // Aguardar todas as promises restantes completarem
  await Promise.all(executing);

  return results;
}

/**
 * Divide um array em N grupos aproximadamente iguais
 *
 * Útil para distribuir trabalho uniformemente entre workers/threads.
 * Garante que todos os grupos tenham tamanho similar (diferença máxima de 1).
 *
 * @template T - Tipo dos elementos do array
 * @param array - Array a ser dividido
 * @param groupCount - Número de grupos a criar
 * @returns Array de grupos
 *
 * @example
 * ```typescript
 * const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
 * const groups = splitIntoGroups(items, 3);
 * // Resultado: [[1, 2, 3, 4], [5, 6, 7], [8, 9, 10]]
 * // Grupos com tamanhos 4, 3, 3 (distribuição uniforme)
 * ```
 */
export function splitIntoGroups<T>(array: T[], groupCount: number): T[][] {
  if (groupCount <= 0) {
    throw new Error(`splitIntoGroups(): groupCount deve ser > 0, recebido: ${groupCount}`);
  }

  if (array.length === 0) {
    return [];
  }

  // Se groupCount > array.length, criar 1 grupo por elemento
  const actualGroupCount = Math.min(groupCount, array.length);

  const groups: T[][] = Array.from({ length: actualGroupCount }, () => []);
  const baseSize = Math.floor(array.length / actualGroupCount);
  const remainder = array.length % actualGroupCount;

  let currentIndex = 0;

  for (let groupIndex = 0; groupIndex < actualGroupCount; groupIndex++) {
    // Primeiros 'remainder' grupos recebem 1 elemento extra
    const groupSize = baseSize + (groupIndex < remainder ? 1 : 0);

    for (let i = 0; i < groupSize; i++) {
      groups[groupIndex].push(array[currentIndex]);
      currentIndex++;
    }
  }

  return groups;
}
