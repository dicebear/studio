export type Overrides = Record<string, unknown>;

/** Whether a value means "the style decides", so it does not count as an override. */
export function isEmptyOverride(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

/**
 * The options one avatar renders with: the seed and size the plugin picks,
 * the animation switched off because the output is a still image, and what
 * the user changed on top.
 */
export function buildAvatarOptions(overrides: Overrides, seed: string, size: number): Record<string, unknown> {
  return { seed, size, animation: false, ...overrides };
}

const fingerprints = new WeakMap<Overrides, string>();

/**
 * A stable string for memoising renders. The store replaces the overrides
 * object on every change, so the identity is the cache key.
 */
export function optionsFingerprint(overrides: Overrides): string {
  let fingerprint = fingerprints.get(overrides);

  if (fingerprint === undefined) {
    fingerprint = JSON.stringify(overrides, Object.keys(overrides).sort());
    fingerprints.set(overrides, fingerprint);
  }

  return fingerprint;
}

/** Only the palette choices, which are what a component preview depends on. */
export function colorOverrides(overrides: Overrides): Overrides {
  return Object.fromEntries(Object.entries(overrides).filter(([name]) => name.endsWith('Color')));
}
