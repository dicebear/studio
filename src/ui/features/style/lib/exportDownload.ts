import { request } from '@/lib/bridge';
import { downloadText } from '@/lib/download';
import { useAppStore } from '@/store';

/** Exports the selected style as a definition file and hands it to the browser. */
export async function exportDefinition(): Promise<void> {
  const store = useAppStore.getState();

  store.setWarnings('export', []);
  store.setStyleStatus('loading');

  try {
    const { name, content, warnings } = await request('export:run', {});

    downloadText(`${name}.json`, content);
    useAppStore.getState().setWarnings('export', warnings);
  } catch (error) {
    useAppStore.getState().setStyleStatus('error', error instanceof Error ? error.message : String(error));

    return;
  }

  // The style data is unchanged, the workspace comes back as it was.
  useAppStore.getState().setStyleStatus('loaded');
}
