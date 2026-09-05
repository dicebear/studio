/**
 * What the plugin writes onto a node it filled or inserted, so a relaunch can
 * render the same avatar again or swap its style.
 */

export type AvatarSource =
  { kind: 'collection'; name: string; version: string } | { kind: 'library'; id: string; title: string };

export type AvatarRecord = {
  v: 1;
  source: AvatarSource;
  seed: string;
  /** What the user changed, on top of the style's own choices. */
  overrides: Record<string, unknown>;
  size: number;
  at: number;
};

export const AVATAR_DATA_KEY = 'dicebear';

export function encodeAvatarRecord(record: AvatarRecord): string {
  return JSON.stringify(record);
}

/** Reads a record back, `null` for anything the plugin did not write. */
export function decodeAvatarRecord(raw: string): AvatarRecord | null {
  if (!raw) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as Partial<AvatarRecord>;

    if (
      value === null ||
      typeof value !== 'object' ||
      value.v !== 1 ||
      typeof value.seed !== 'string' ||
      typeof value.size !== 'number' ||
      typeof value.source !== 'object' ||
      value.source === null ||
      typeof value.overrides !== 'object' ||
      value.overrides === null
    ) {
      return null;
    }

    return value as AvatarRecord;
  } catch {
    return null;
  }
}
