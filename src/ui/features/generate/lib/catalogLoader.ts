import { errorMessage } from '@shared/errors';
import { isCatalogStale, loadThumbnails, readCatalogIndex, writeCatalogIndex } from '@/lib/catalog';
import { fetchStyleNames } from '@/lib/api';
import { library } from '@/lib/library';
import { useGenerateStore } from '@/store/generate';

/** How long arriving previews collect before the store hears about them. */
const THUMBNAIL_BATCH_MS = 100;

let catalogStarted = false;

/** Fills the picker: the style list and previews, once per session. */
export async function loadCatalog(force = false): Promise<void> {
  if (catalogStarted && !force) {
    return;
  }

  catalogStarted = true;
  useGenerateStore.getState().setCatalog({ status: 'loading', error: undefined });

  const cached = await readCatalogIndex();

  if (cached) {
    useGenerateStore.getState().setCatalog({ names: cached.styles, thumbs: cached.thumbs, status: 'ready' });

    if (!force && !isCatalogStale(cached)) {
      return;
    }
  }

  let names: string[];

  try {
    names = await fetchStyleNames();
  } catch (error) {
    if (cached) {
      return;
    }

    useGenerateStore.getState().setCatalog({ status: 'error', error: errorMessage(error) });
    catalogStarted = false;

    return;
  }

  useGenerateStore.getState().setCatalog({ names, status: 'ready' });

  // The names alone are worth keeping: next time the list is there before
  // the network answers, previews or not.
  const known = cached?.thumbs ?? {};

  await writeCatalogIndex({ v: 1, styles: names, thumbs: known, fetchedAt: Date.now() });

  // Previews land a few at a time; one store update per batch keeps the
  // gallery from re-rendering for every single card.
  let pending: Record<string, string> = {};
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;

    if (Object.keys(pending).length > 0) {
      useGenerateStore.getState().addThumbnails(pending);
      pending = {};
    }
  };

  const thumbs = await loadThumbnails(names, known, (name, dataUri) => {
    pending[name] = dataUri;
    timer ??= setTimeout(flush, THUMBNAIL_BATCH_MS);
  });

  if (timer !== null) {
    clearTimeout(timer);
  }

  flush();

  await writeCatalogIndex({ v: 1, styles: names, thumbs, fetchedAt: Date.now() });
}

export async function loadLibrary(): Promise<void> {
  const store = useGenerateStore.getState();

  store.setLibrary({ status: 'loading' });

  try {
    store.setLibrary({ items: await library.list(), status: 'ready' });
  } catch (error) {
    useGenerateStore.getState().setLibrary({ status: 'error', error: errorMessage(error) });
  }
}
