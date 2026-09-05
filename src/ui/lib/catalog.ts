import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { cacheGet, cachePut, isStale, type CachedDefinition } from '@shared/storage/definitionCache';
import { fetchDefinitionText, fetchThumbnail } from './api';
import { pluginStorage } from './storage';

/**
 * The collection as the plugin knows it: the style names and one preview
 * each, refreshed once a day, and the definitions the user opened, kept in
 * the store so they render offline.
 */

export const CATALOG_INDEX_KEY = 'catalog:index:svg';

/** How long the style list and previews are trusted before the API is asked again. */
const CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const THUMBNAIL_CONCURRENCY = 6;

export type CatalogIndex = {
  v: 1;
  styles: string[];
  thumbs: Record<string, string>;
  fetchedAt: number;
};

function isCatalogIndex(value: unknown): value is CatalogIndex {
  const index = value as Partial<CatalogIndex> | undefined;

  return (
    !!index &&
    index.v === 1 &&
    Array.isArray(index.styles) &&
    typeof index.thumbs === 'object' &&
    index.thumbs !== null &&
    typeof index.fetchedAt === 'number'
  );
}

export async function readCatalogIndex(): Promise<CatalogIndex | null> {
  try {
    const value = await pluginStorage.get(CATALOG_INDEX_KEY);

    return isCatalogIndex(value) ? value : null;
  } catch {
    return null;
  }
}

export function isCatalogStale(index: CatalogIndex, now = Date.now()): boolean {
  return now - index.fetchedAt > CATALOG_MAX_AGE_MS;
}

/**
 * Loads the previews that are missing from the index, a few at a time, and
 * reports each one as it lands so the picker fills up while it waits.
 */
export async function loadThumbnails(
  names: string[],
  thumbs: Record<string, string>,
  onThumbnail: (name: string, dataUri: string) => void,
): Promise<Record<string, string>> {
  const next = { ...thumbs };
  const queue = names.filter((name) => !next[name]);

  const worker = async () => {
    while (queue.length > 0) {
      const name = queue.shift()!;

      try {
        next[name] = await fetchThumbnail(name);
        onThumbnail(name, next[name]);
      } catch {
        // A missing preview is a blank card, not a failure of the catalog.
      }
    }
  };

  await Promise.all(Array.from({ length: THUMBNAIL_CONCURRENCY }, worker));

  return next;
}

export async function writeCatalogIndex(index: CatalogIndex): Promise<void> {
  try {
    await pluginStorage.set(CATALOG_INDEX_KEY, index);
  } catch {
    // The store may be full, the catalog then loads again next time.
  }
}

const definitions = new Map<string, { id: string; definition: unknown }>();

function decode(cached: CachedDefinition): { id: string; definition: unknown } {
  return { id: cached.id, definition: unpackDefinition(cached.bytes) };
}

function idOf(definition: unknown, name: string): string {
  const id = (definition as { $id?: unknown })?.$id;

  return typeof id === 'string' ? id : name;
}

/**
 * The definition of a collection style: from memory, then the store, then the
 * API. A stale copy is refreshed when the API answers and kept when it does
 * not.
 */
export async function loadCollectionDefinition(
  name: string,
  refresh = false,
): Promise<{ id: string; definition: unknown }> {
  const known = definitions.get(name);

  if (known && !refresh) {
    return known;
  }

  let cached: CachedDefinition | null = null;

  try {
    cached = await cacheGet(pluginStorage, name);
  } catch {
    cached = null;
  }

  const fromCache = () => {
    const value = decode(cached!);

    definitions.set(name, value);

    return value;
  };

  if (cached && !refresh && !isStale(cached)) {
    return fromCache();
  }

  let text: string;

  try {
    text = await fetchDefinitionText(name, refresh || cached !== null);
  } catch (error) {
    if (cached) {
      return fromCache();
    }

    throw error;
  }

  const definition = JSON.parse(text) as unknown;
  const value = { id: idOf(definition, name), definition };

  definitions.set(name, value);

  try {
    await cachePut(pluginStorage, name, { id: value.id, bytes: packDefinition(definition), fetchedAt: Date.now() });
  } catch {
    // Not cached, still usable.
  }

  return value;
}

/** Deflates a definition the way the library and cache keep it. */
export function packDefinition(definition: unknown): Uint8Array {
  return deflateSync(strToU8(JSON.stringify(definition)));
}

export function unpackDefinition(bytes: Uint8Array): unknown {
  return JSON.parse(strFromU8(inflateSync(bytes)));
}
