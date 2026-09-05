import type { PluginEvent } from '@shared/messages';
import { postEvent } from './bridge';
import { restoreGenerateSettings } from './persistGenerate';
import { useAppStore } from '@/store';
import { useGenerateStore } from '@/store/generate';

/** Maps what the sandbox sends into store changes. */
export function handlePluginEvent(event: PluginEvent): void {
  const store = useAppStore.getState();

  switch (event.type) {
    case 'plugin:init':
      store.init(event);
      restoreGenerateSettings(event.fileSettings);
      break;

    case 'selection:changed': {
      // A hand-picked target holds until the selection changes kind, then the
      // selection decides again.
      const hadTargets = store.selection.targets.length > 0;
      const hasTargets = event.selection.targets.length > 0;

      store.setSelection(event.selection);

      if (hadTargets !== hasTargets) {
        useGenerateStore.getState().setModeOverride(null);
      }
      break;
    }

    case 'progress':
      store.setProgress({ message: event.message, fraction: event.progress ?? null });

      // The sandbox waits for this before its next step, so every step gets
      // on screen. The frame callback runs right before the paint that shows
      // the update, and the message reaches the sandbox after it.
      if (event.progress !== undefined) {
        const step = event.step;

        requestAnimationFrame(() => postEvent({ type: 'progress:painted', step }));
      }
      break;

    case 'style:loading':
      store.setStyleStatus('loading');
      break;

    case 'style:loaded':
      store.setStyleData(event.data);
      break;

    case 'style:none':
      store.setStyleStatus('none');
      break;

    case 'style:error':
      store.setStyleStatus('error', event.message);
      break;
  }
}
