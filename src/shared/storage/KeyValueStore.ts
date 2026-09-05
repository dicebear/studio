/**
 * The slice of `figma.clientStorage` the plugin uses, as an interface so the
 * cache and library logic run in tests and in the window alike.
 */
export interface KeyValueStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

export class MemoryKeyValueStore implements KeyValueStore {
  readonly data = new Map<string, unknown>();

  /** When set, `set` rejects once the stored bytes would exceed it. */
  quota: number | null = null;

  async get(key: string): Promise<unknown> {
    return this.data.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    if (this.quota !== null) {
      let total = byteSize(value);

      for (const [k, v] of this.data) {
        if (k !== key) {
          total += byteSize(v);
        }
      }

      if (total > this.quota) {
        throw new Error('quota exceeded');
      }
    }

    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async keys(): Promise<string[]> {
    return [...this.data.keys()];
  }
}

/**
 * Roughly what a value costs in the store: bytes as they are, everything else
 * as its JSON, the way Figma's documentation counts it.
 */
export function byteSize(value: unknown): number {
  if (value instanceof Uint8Array) {
    return value.byteLength;
  }

  if (Array.isArray(value)) {
    return 2 + value.reduce<number>((sum, item) => sum + byteSize(item) + 1, 0);
  }

  if (value && typeof value === 'object') {
    return 2 + Object.entries(value).reduce((sum, [key, item]) => sum + key.length + 3 + byteSize(item) + 1, 0);
  }

  return JSON.stringify(value ?? null).length;
}
