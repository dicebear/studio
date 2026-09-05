import { describe, expect, it } from 'vitest';
import { decodeAvatarRecord, encodeAvatarRecord, type AvatarRecord } from './avatarRecord';

const record: AvatarRecord = {
  v: 1,
  source: { kind: 'collection', name: 'lorelei', version: '11.0.0' },
  seed: 'Felix',
  overrides: { hairColor: ['000000'] },
  size: 256,
  at: 1,
};

describe('avatarRecord', () => {
  it('round-trips a record', () => {
    expect(decodeAvatarRecord(encodeAvatarRecord(record))).toEqual(record);
  });

  it('rejects what the plugin did not write', () => {
    expect(decodeAvatarRecord('')).toBeNull();
    expect(decodeAvatarRecord('garbage')).toBeNull();
    expect(decodeAvatarRecord('{"v":2}')).toBeNull();
    expect(decodeAvatarRecord(JSON.stringify({ ...record, seed: 1 }))).toBeNull();
  });
});
