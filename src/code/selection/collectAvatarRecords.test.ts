import { describe, expect, it } from 'vitest';
import { encodeAvatarRecord, type AvatarRecord } from '@shared/avatarRecord';
import { collectAvatarRecords, type RecordCandidate } from './collectAvatarRecords';

const record: AvatarRecord = {
  v: 1,
  source: { kind: 'collection', name: 'avataaars', version: '1' },
  seed: 'Kai',
  overrides: {},
  size: 128,
  at: 0,
};

function node(id: string, data: string | null, children: RecordCandidate[] = []): RecordCandidate {
  return {
    id,
    name: id,
    getPluginData: () => data ?? '',
    findAllWithCriteria: () => children,
  };
}

describe('collectAvatarRecords', () => {
  it('lists selected layers that carry a record and skips the rest', () => {
    const items = collectAvatarRecords([node('a', encodeAvatarRecord(record)), node('b', null), node('c', '{')]);

    expect(items.map((item) => item.id)).toEqual(['a']);
    expect(items[0].record.seed).toBe('Kai');
  });

  it('looks inside a selected group, but not inside an avatar', () => {
    const inner = node('inner', encodeAvatarRecord(record));
    const group = node('group', null, [inner]);
    const avatar = node('avatar', encodeAvatarRecord(record), [node('nested', encodeAvatarRecord(record))]);

    expect(collectAvatarRecords([group, avatar]).map((item) => item.id)).toEqual(['inner', 'avatar']);
  });

  it('lists a layer once when it is selected twice through a group', () => {
    const inner = node('inner', encodeAvatarRecord(record));

    expect(collectAvatarRecords([inner, node('group', null, [inner])])).toHaveLength(1);
  });
});
