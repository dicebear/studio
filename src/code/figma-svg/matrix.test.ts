import { describe, expect, it } from 'vitest';

import { apply, fromTransform, invert, isIdentity, isTranslation, multiply, toAttribute } from './matrix';

describe('matrix', () => {
  it('reads Figma transforms into SVG order', () => {
    const m = fromTransform([
      [0, -1, 10],
      [1, 0, 20],
    ]);

    expect(m).toEqual({ a: 0, b: 1, c: -1, d: 0, e: 10, f: 20 });
    expect(apply(m, 1, 0)).toEqual({ x: 10, y: 21 });
  });

  it('inverts a rotation with translation', () => {
    const m = fromTransform([
      [0, -1, 10],
      [1, 0, 20],
    ]);
    const inverse = invert(m)!;
    const roundTrip = multiply(m, inverse);

    expect(isIdentity(roundTrip)).toBe(true);
  });

  it('returns null for a collapsed matrix', () => {
    expect(invert({ a: 0, b: 0, c: 0, d: 0, e: 1, f: 1 })).toBeNull();
  });

  it('writes the shortest attribute', () => {
    expect(toAttribute({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toBeUndefined();
    expect(toAttribute({ a: 1, b: 0, c: 0, d: 1, e: 3, f: -4.5 })).toBe('translate(3 -4.5)');
    expect(toAttribute({ a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 })).toBe('matrix(0 1 -1 0 0 0)');
    expect(isTranslation({ a: 1, b: 0, c: 0, d: 1, e: 3, f: 0 })).toBe(true);
  });
});
