import type { LibraryItem } from '@shared/storage/library';
import { libraryDelete, libraryGet, libraryList, libraryPut, libraryRename } from '@shared/storage/library';
import { packDefinition, unpackDefinition } from './catalog';
import { pluginStorage } from './storage';

/** The user's uploaded definitions, kept in the plugin store across files. */
export const library = {
  list: (): Promise<LibraryItem[]> => libraryList(pluginStorage),

  load: async (id: string): Promise<unknown> => {
    const bytes = await libraryGet(pluginStorage, id);

    if (!bytes) {
      throw new Error('The style is no longer in the library.');
    }

    return unpackDefinition(bytes);
  },

  add: (item: Omit<LibraryItem, 'bytes'>, definition: unknown): Promise<LibraryItem[]> =>
    libraryPut(pluginStorage, item, packDefinition(definition)),

  rename: (id: string, title: string): Promise<LibraryItem[]> => libraryRename(pluginStorage, id, title),

  remove: (id: string): Promise<LibraryItem[]> => libraryDelete(pluginStorage, id),
};
