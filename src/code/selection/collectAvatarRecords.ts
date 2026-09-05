import { AVATAR_DATA_KEY, decodeAvatarRecord } from '@shared/avatarRecord';
import type { InspectItem } from '@shared/messages';

/** The part of a scene node the collector reads, so tests can pass plain objects. */
export type RecordCandidate = {
  id: string;
  name: string;
  getPluginData(key: string): string;
  findAllWithCriteria?(criteria: { pluginData: { keys: string[] } }): RecordCandidate[];
};

/** More than this many avatars is a page, not an inspection. */
const LIMIT = 100;

/**
 * The generated avatars in the selection: a selected layer that carries a
 * record, or every such layer inside a selected group or frame. Each layer
 * is listed once, in selection order.
 */
export function collectAvatarRecords(selection: readonly RecordCandidate[]): InspectItem[] {
  const items: InspectItem[] = [];
  const seen = new Set<string>();

  const add = (node: RecordCandidate) => {
    if (seen.has(node.id) || items.length >= LIMIT) {
      return;
    }

    const record = decodeAvatarRecord(node.getPluginData(AVATAR_DATA_KEY));

    if (record) {
      seen.add(node.id);
      items.push({ id: node.id, name: node.name, record });
    }
  };

  for (const node of selection) {
    if (items.length >= LIMIT) {
      break;
    }

    add(node);

    if (!seen.has(node.id) && node.findAllWithCriteria) {
      node.findAllWithCriteria({ pluginData: { keys: [AVATAR_DATA_KEY] } }).forEach(add);
    }
  }

  return items;
}
