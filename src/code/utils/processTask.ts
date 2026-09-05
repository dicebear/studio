import { errorMessage } from '@shared/errors';
import { postEvent } from '../bridge';
import { getExport } from '../export/exportCache';
import { NoFrameSelectedError } from './getFrameSelection';
import { resetProgress } from './postProgress';

let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * Reads the style around the current selection and tells the window what it
 * found: the export data, nothing usable (the welcome state), or an error.
 * A refresh that follows another within the delay replaces it, so a burst of
 * selection changes reads the frame once.
 */
export function refreshStyle(): void {
  resetProgress();
  postEvent({ type: 'style:loading' });

  if (pending !== null) {
    clearTimeout(pending);
  }

  pending = setTimeout(async () => {
    pending = null;

    try {
      postEvent({ type: 'style:loaded', data: await getExport() });
    } catch (e) {
      if (e instanceof NoFrameSelectedError) {
        postEvent({ type: 'style:none' });

        return;
      }

      postEvent({ type: 'style:error', message: errorMessage(e) });
    }
  }, 250);
}
