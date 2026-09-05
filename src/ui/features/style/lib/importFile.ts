import { errorMessage } from '@shared/errors';
import { postEvent, request } from '@/lib/bridge';
import { computeThumbnailPicks } from '@/lib/thumbnailPicks';
import { readDefinitionFile, titleFromFileName } from '@/lib/validateDefinition';
import { useAppStore } from '@/store';

/** Reads a definition file, validates it and asks the sandbox to import it. */
export async function importDefinitionFile(file: File): Promise<void> {
  const store = useAppStore.getState();
  let definition: unknown;

  try {
    definition = await readDefinitionFile(file);
  } catch (error) {
    store.setStyleStatus('error', errorMessage(error));

    return;
  }

  store.setWarnings('import', []);
  store.setStyleStatus('loading');

  try {
    const { warnings } = await request('import:run', {
      // The file name becomes the style title, so a `.min.json` download does
      // not turn into a style called "bottts.min".
      name: titleFromFileName(file.name),
      definition,
      picksBySeed: computeThumbnailPicks(definition),
    });

    useAppStore.getState().setWarnings('import', warnings);
  } catch (error) {
    useAppStore.getState().setStyleStatus('error', errorMessage(error));

    return;
  }

  // The import selected the new avatar frame, this reads it.
  postEvent({ type: 'style:refresh' });
}
