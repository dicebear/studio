import { NoFrameSelectedError } from './getFrameSelection';

export function processTask(cb: () => Promise<{ type: string; data: any }>) {
  figma.ui.postMessage({
    type: 'loading',
    data: {},
  });

  setTimeout(async () => {
    try {
      figma.ui.postMessage(await cb());
    } catch (e: any) {
      if (e instanceof NoFrameSelectedError) {
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
