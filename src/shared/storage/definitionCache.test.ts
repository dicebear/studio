import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from './KeyValueStore';
import { CACHE_INDEX_KEY, cacheGet, cachePrune, cachePut, cacheKey, isStale } from './definitionCache';

const bytes = (n: number) => new Uint8Array(n);
const def = (n: number, id = 'x') => ({ id, bytes: bytes(n), fetchedAt: 0 });

describe('definitionCache', () => {
  it('round-trips a definition', async () => {
    const store = new MemoryKeyValueStore();

    await cachePut(store, 'lorelei', def(10, 'v1'));

    const hit = await cacheGet(store, 'lorelei');

    expect(hit?.id).toBe('v1');
    expect(hit?.bytes.byteLength).toBe(10);
    expect(await cacheGet(store, 'bottts')).toBeNull();
  });

  it('evicts the least recently used entry when the budget is spent', async () => {
    const store = new MemoryKeyValueStore();
    const budget = 300;

    await cachePut(store, 'a', def(100), budget, 1);
    await cachePut(store, 'b', def(100), budget, 2);
    await cacheGet(store, 'a', 3 + 60 * 60 * 1000 + 1);
    await cachePut(store, 'c', def(100), budget, 4 + 60 * 60 * 1000);

    expect(await store.get(cacheKey('a'))).toBeDefined();
    expect(await store.get(cacheKey('b'))).toBeUndefined();
    expect(await store.get(cacheKey('c'))).toBeDefined();
  });

  it('retries once after the store rejects for quota', async () => {
    const store = new MemoryKeyValueStore();

    store.quota = 330;
    await cachePut(store, 'a', def(100), 10_000, 1);
    await cachePut(store, 'b', def(100), 10_000, 2);

    expect(await store.get(cacheKey('a'))).toBeUndefined();
    expect(await store.get(cacheKey('b'))).toBeDefined();
  });

  it('prunes orphans in both directions', async () => {
    const store = new MemoryKeyValueStore();

    await cachePut(store, 'a', def(10));
    await store.set(cacheKey('orphan'), def(10));
    await store.delete(cacheKey('a'));
    await cachePrune(store);

    expect(await store.keys()).toEqual([CACHE_INDEX_KEY]);
  });

  it('knows when a definition is stale', () => {
    expect(isStale({ id: 'x', bytes: bytes(1), fetchedAt: 0 }, 1000)).toBe(false);
    expect(isStale({ id: 'x', bytes: bytes(1), fetchedAt: 0 }, 8 * 24 * 3600 * 1000)).toBe(true);
  });
});
