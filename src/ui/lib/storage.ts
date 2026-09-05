import type { KeyValueStore } from '@shared/storage/KeyValueStore';
import { request } from './bridge';

/** `figma.clientStorage`, reached through the sandbox. */
export const pluginStorage: KeyValueStore = {
  get: (key) => request('storage:get', { key }).then((reply) => reply.value),
  set: (key, value) => request('storage:set', { key, value }).then(() => undefined),
  delete: (key) => request('storage:delete', { key }).then(() => undefined),
  keys: () => request('storage:keys', {}).then((reply) => reply.keys),
};
