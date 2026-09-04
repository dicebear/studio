import { NoFrameSelectedError } from './getFrameSelection';
import { resetProgress } from './postProgress';

/**
 * `welcomeOnNoFrame` belongs to the tasks that only mirror the current
 * selection. A task the user asked for, such as an export, has to report its
 * failure instead of quietly showing the welcome scene.
 */
export function processTask(cb: () => Promise<{ type: string; data: any }>, welcomeOnNoFrame = false) {
  resetProgress();
  figma.ui.postMessage({
    type: 'loading',
    data: {},
  });

  setTimeout(async () => {
    try {
      figma.ui.postMessage(await cb());
    } catch (e: any) {
      if (welcomeOnNoFrame && e instanceof NoFrameSelectedError) {
        figma.ui.postMessage({ type: 'welcome' });

        return;
      }

      figma.ui.postMessage({
        type: 'error',
        data: {
          message: e.message,
        },
      });
    }
  }, 250);
}
