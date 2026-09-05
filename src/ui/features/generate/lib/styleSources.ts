import { errorMessage } from '@shared/errors';
import type { LibraryItem } from '@shared/storage/library';
import { loadCollectionDefinition } from '@/lib/catalog';
import { library } from '@/lib/library';
import { renderDataUri } from '@/lib/render/renderAvatar';
import { getStyle, parseStyleKey, registerStyle, type StyleEntry, type StyleKey } from '@/lib/render/styleRegistry';
import { randomId } from '@/lib/randomId';
import { readDefinitionFile, titleFromFileName } from '@/lib/validateDefinition';
import { PREVIEW_SEED } from '@/lib/api';
import { useGenerateStore } from '@/store/generate';

/**
 * Loads a style into the registry from wherever its key points: the DiceBear
 * collection or the user's library. Reports the loading state on the way, so
 * the picker can show it.
 */
export async function ensureStyle(key: StyleKey, refresh = false): Promise<StyleEntry> {
  const known = getStyle(key);

  if (known && !refresh) {
    return known;
  }

  const store = useGenerateStore.getState();
  const parsed = parseStyleKey(key);

  if (!parsed) {
    throw new Error(`Unknown style "${key}".`);
  }

  store.setLoad(key, { status: 'loading' });

  try {
    let entry: StyleEntry;

    switch (parsed.kind) {
      case 'collection': {
        const { id, definition } = await loadCollectionDefinition(parsed.id, refresh);

        entry = registerStyle({ kind: 'collection', name: parsed.id, version: id }, definition);
        break;
      }

      case 'library': {
        const item = useGenerateStore.getState().library.items.find((i) => i.id === parsed.id);
        const definition = await library.load(parsed.id);

        entry = registerStyle({ kind: 'library', id: parsed.id, title: item?.title ?? parsed.id }, definition, {
          title: item?.title,
        });
        break;
      }
    }

    useGenerateStore.getState().setLoad(key, { status: 'ready' });

    return entry;
  } catch (error) {
    useGenerateStore.getState().setLoad(key, { status: 'error', error: errorMessage(error) });

    throw error;
  }
}

/** Validates an uploaded file and puts it in the library. */
export async function addLibraryFile(file: File): Promise<LibraryItem> {
  const definition = await readDefinitionFile(file);
  const id = randomId();
  const title = titleFromFileName(file.name);
  const entry = registerStyle({ kind: 'library', id, title }, definition, { title });
  const item: Omit<LibraryItem, 'bytes'> = {
    id,
    title,
    addedAt: Date.now(),
    licenseName: entry.license.name,
    creator: entry.creator.name,
    components: entry.componentCount,
    animated: entry.animated,
    preview: renderDataUri(entry, PREVIEW_SEED, 64, {}),
  };

  const items = await library.add(item, definition);

  useGenerateStore.getState().setLibrary({ items, status: 'ready' });
  useGenerateStore.getState().setLoad(entry.key, { status: 'ready' });

  return items.find((i) => i.id === id)!;
}
