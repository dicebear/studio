import { byteSize, type KeyValueStore } from './KeyValueStore';

/**
 * The definitions a user uploaded, kept across files. Never evicted, capped
 * with a clear message instead of a quota error.
 */

export const LIBRARY_INDEX_KEY = 'lib:index';
export const LIBRARY_PREFIX = 'lib:item:';
export const LIBRARY_CAP = 1.5 * 1024 * 1024;

export type LibraryItem = {
  id: string;
  title: string;
  /** Deflated size in the store. */
  bytes: number;
  addedAt: number;
  licenseName: string;
  creator: string;
  components: number;
  animated: boolean;
  /** A small rendered preview, as a data URI. */
  preview: string;
};

export type LibraryIndex = { v: 1; items: LibraryItem[] };

export const libraryKey = (id: string): string => `${LIBRARY_PREFIX}${id}`;

async function readIndex(store: KeyValueStore): Promise<LibraryIndex> {
  const raw = (await store.get(LIBRARY_INDEX_KEY)) as Partial<LibraryIndex> | undefined;

  if (raw && raw.v === 1 && Array.isArray(raw.items)) {
    return { v: 1, items: raw.items.filter((item) => typeof item.id === 'string') };
  }

  // No index, or a broken one: rebuild what can be rebuilt from the items.
  const keys = (await store.keys()).filter((key) => key.startsWith(LIBRARY_PREFIX));
  const values = await Promise.all(keys.map((key) => store.get(key)));
  const items = keys.map((key, index): LibraryItem => {
    const id = key.slice(LIBRARY_PREFIX.length);

    return {
      id,
      title: id,
      bytes: byteSize(values[index]),
      addedAt: 0,
      licenseName: '',
      creator: '',
      components: 0,
      animated: false,
      preview: '',
    };
  });

  return { v: 1, items };
}

export async function libraryList(store: KeyValueStore): Promise<LibraryItem[]> {
  return (await readIndex(store)).items;
}

export async function libraryGet(store: KeyValueStore, id: string): Promise<Uint8Array | null> {
  const value = await store.get(libraryKey(id));

  return value instanceof Uint8Array ? value : null;
}

export async function libraryPut(
  store: KeyValueStore,
  item: Omit<LibraryItem, 'bytes'>,
  bytes: Uint8Array,
  cap = LIBRARY_CAP,
): Promise<LibraryItem[]> {
  const index = await readIndex(store);
  const others = index.items.filter((entry) => entry.id !== item.id);
  const size = bytes.byteLength;

  if (others.reduce((sum, entry) => sum + entry.bytes, 0) + size > cap) {
    throw new Error(`The library is full (${(cap / 1024 / 1024).toFixed(1)} MB). Remove a style first.`);
  }

  await store.set(libraryKey(item.id), bytes);
  index.items = [...others, { ...item, bytes: size }];
  await store.set(LIBRARY_INDEX_KEY, index);

  return index.items;
}

export async function libraryRename(store: KeyValueStore, id: string, title: string): Promise<LibraryItem[]> {
  const index = await readIndex(store);

  index.items = index.items.map((item) => (item.id === id ? { ...item, title } : item));
  await store.set(LIBRARY_INDEX_KEY, index);

  return index.items;
}

export async function libraryDelete(store: KeyValueStore, id: string): Promise<LibraryItem[]> {
  const index = await readIndex(store);

  await store.delete(libraryKey(id));
  index.items = index.items.filter((item) => item.id !== id);
  await store.set(LIBRARY_INDEX_KEY, index);

  return index.items;
}
