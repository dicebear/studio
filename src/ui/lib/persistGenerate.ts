import { postEvent } from './bridge';
import { parseSnapshot, snapshotGenerate, useGenerateStore, type GenerateState } from '@/store/generate';

/** How long the settings wait for the next change before they are written. */
const WRITE_DEBOUNCE_MS = 400;

const PERSISTED: (keyof GenerateState)[] = ['styleKey', 'seeds', 'count', 'overrides', 'layout', 'modeOverride'];

let timer: ReturnType<typeof setTimeout> | null = null;

/** Puts what the document stored back into the store, if it stored anything. */
export function restoreGenerateSettings(stored: unknown): boolean {
  const snapshot = parseSnapshot(stored);

  if (!snapshot) {
    return false;
  }

  useGenerateStore.getState().restore(snapshot);

  return true;
}

/**
 * Writes the Generate settings onto the document whenever one of them
 * changes, so they are there again when the file is opened next. Returns
 * the unsubscribe.
 */
export function persistGenerateSettings(): () => void {
  return useGenerateStore.subscribe((state, previous) => {
    if (PERSISTED.every((key) => state[key] === previous[key])) {
      return;
    }

    if (timer !== null) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = null;
      postEvent({ type: 'file-settings:set', settings: snapshotGenerate(useGenerateStore.getState()) });
    }, WRITE_DEBOUNCE_MS);
  });
}
