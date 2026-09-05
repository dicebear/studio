import { describe, expect, it } from 'vitest';
import { MemoryKeyValueStore } from './KeyValueStore';
import { libraryDelete, libraryGet, libraryKey, libraryList, libraryPut, libraryRename } from './library';

const item = (id: string) => ({
  id,
  title: id,
  addedAt: 0,
  licenseName: 'MIT',
  creator: 'me',
  components: 1,
  animated: false,
  preview: '',
});

describe('library', () => {
  it('adds, renames and removes items', async () => {
    const store = new MemoryKeyValueStore();

    await libraryPut(store, item('a'), new Uint8Array(5));
    await libraryPut(store, item('b'), new Uint8Array(5));
    expect((await libraryList(store)).map((i) => i.id)).toEqual(['a', 'b']);

    await libraryRename(store, 'a', 'Alpha');
    expect((await libraryList(store))[0].title).toBe('Alpha');

    await libraryDelete(store, 'a');
    expect((await libraryList(store)).map((i) => i.id)).toEqual(['b']);
    expect(await libraryGet(store, 'a')).toBeNull();
    expect((await libraryGet(store, 'b'))?.byteLength).toBe(5);
  });

  it('refuses to grow past the cap', async () => {
    const store = new MemoryKeyValueStore();

    await libraryPut(store, item('a'), new Uint8Array(60), 100);
    await expect(libraryPut(store, item('b'), new Uint8Array(60), 100)).rejects.toThrow(/library is full/);
    // Replacing an item counts only the new size.
    await libraryPut(store, item('a'), new Uint8Array(90), 100);
  });

  it('rebuilds the index from the items when it is missing', async () => {
    const store = new MemoryKeyValueStore();

    await store.set(libraryKey('x'), new Uint8Array(3));
    const items = await libraryList(store);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'x', title: 'x', bytes: 3 });
  });
});
