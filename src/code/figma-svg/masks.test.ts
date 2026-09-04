import { describe, expect, it } from 'vitest';

import { planMaskedSiblings } from './masks';

describe('planMaskedSiblings', () => {
  it('leaves an unmasked list flat', () => {
    const a = { isMask: false };
    const b = { isMask: false };

    expect(planMaskedSiblings([a, b], (c) => c.isMask)).toEqual([
      { kind: 'node', node: a },
      { kind: 'node', node: b },
    ]);
  });

  it('nests the siblings after a mask, and a second mask inside the first', () => {
    const below = { isMask: false };
    const mask1 = { isMask: true };
    const between = { isMask: false };
    const mask2 = { isMask: true };
    const top = { isMask: false };

    expect(planMaskedSiblings([below, mask1, between, mask2, top], (c) => c.isMask)).toEqual([
      { kind: 'node', node: below },
      {
        kind: 'masked',
        mask: mask1,
        children: [
          { kind: 'node', node: between },
          { kind: 'masked', mask: mask2, children: [{ kind: 'node', node: top }] },
        ],
      },
    ]);
  });
});
