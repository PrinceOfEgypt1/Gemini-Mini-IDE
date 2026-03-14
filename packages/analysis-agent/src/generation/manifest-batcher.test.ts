import { describe, it, expect } from 'vitest';
import { ManifestBatcher } from './manifest-batcher.js';
import type { RichManifestItem } from '../types/rich-schemas.js';

describe('ManifestBatcher', () => {
  const batcher = new ManifestBatcher();

  const makeItem = (path: string): RichManifestItem => ({
    path,
    purpose: `Purpose of ${path}`,
    criticality: 'MEDIUM',
    category: 'DOMAIN',
  });

  const makeItems = (count: number): RichManifestItem[] =>
    Array.from({ length: count }, (_, i) => makeItem(`src/file${i}.ts`));

  it('should return empty array for empty manifest', () => {
    expect(batcher.createBatches([])).toEqual([]);
  });

  it('should return empty array for null input', () => {
    expect(batcher.createBatches(null as unknown as RichManifestItem[])).toEqual([]);
  });

  it('should create a single batch for items under limit', () => {
    const items = makeItems(5);
    const batches = batcher.createBatches(items);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(5);
  });

  it('should create a single batch for exactly 25 items', () => {
    const items = makeItems(25);
    const batches = batcher.createBatches(items);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(25);
  });

  it('should create two batches for 26 items', () => {
    const items = makeItems(26);
    const batches = batcher.createBatches(items);
    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(25);
    expect(batches[1]).toHaveLength(1);
  });

  it('should create multiple batches for large manifests', () => {
    const items = makeItems(75);
    const batches = batcher.createBatches(items);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(25);
    expect(batches[1]).toHaveLength(25);
    expect(batches[2]).toHaveLength(25);
  });

  it('should handle odd number of items', () => {
    const items = makeItems(53);
    const batches = batcher.createBatches(items);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(25);
    expect(batches[1]).toHaveLength(25);
    expect(batches[2]).toHaveLength(3);
  });

  it('should create batch for a single item', () => {
    const items = makeItems(1);
    const batches = batcher.createBatches(items);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
  });

  it('should preserve item data in batches', () => {
    const items = [makeItem('src/special.ts')];
    const batches = batcher.createBatches(items);
    expect(batches[0][0].path).toBe('src/special.ts');
    expect(batches[0][0].purpose).toBe('Purpose of src/special.ts');
  });
});
