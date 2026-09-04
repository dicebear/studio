import { describe, expect, it } from 'vitest';

import { componentTransform, Matrix, multiply } from './componentTransform';

const apply = (matrix: Matrix, x: number, y: number): [number, number] => [
  Math.round((matrix[0][0] * x + matrix[0][1] * y + matrix[0][2]) * 1000) / 1000,
  Math.round((matrix[1][0] * x + matrix[1][1] * y + matrix[1][2]) * 1000) / 1000,
];

describe('componentTransform', () => {
  it('returns null when the resolver picked the identity', () => {
    expect(componentTransform({}, 'eyes', 100, 50)).toBeNull();
    expect(componentTransform({ eyesRotate: 0, eyesScale: 1 }, 'eyes', 100, 50)).toBeNull();
  });

  it('rotates around the center of the box', () => {
    const matrix = componentTransform({ eyesRotate: 90 }, 'eyes', 100, 50)!;

    expect(apply(matrix, 50, 25)).toEqual([50, 25]);
    expect(apply(matrix, 0, 0)).toEqual([75, -25]);
  });

  it('scales around the center of the box', () => {
    const matrix = componentTransform({ eyesScale: 2 }, 'eyes', 100, 50)!;

    expect(apply(matrix, 50, 25)).toEqual([50, 25]);
    expect(apply(matrix, 0, 0)).toEqual([-50, -25]);
  });

  it('translates by a share of the box size', () => {
    const matrix = componentTransform({ eyesTranslateX: 10, eyesTranslateY: 20 }, 'eyes', 100, 50)!;

    expect(apply(matrix, 0, 0)).toEqual([10, 10]);
  });

  it('applies scale, then rotate, then translate, like the renderer', () => {
    const picks = { eyesRotate: 90, eyesScale: 2, eyesTranslateX: 10, eyesTranslateY: 20 };
    const matrix = componentTransform(picks, 'eyes', 100, 50)!;

    // (0, 0) scaled about the center lands on (-50, -25), rotated by 90
    // degrees about the center on (100, -75), shifted by (10, 10).
    expect(apply(matrix, 0, 0)).toEqual([110, -65]);
  });

  it('ignores picks that are not finite numbers', () => {
    expect(componentTransform({ eyesRotate: 'a lot', eyesScale: NaN }, 'eyes', 100, 50)).toBeNull();
  });
});

describe('multiply', () => {
  it('composes two translations', () => {
    const a: Matrix = [
      [1, 0, 5],
      [0, 1, 7],
    ];
    const b: Matrix = [
      [1, 0, -2],
      [0, 1, 3],
    ];

    expect(multiply(a, b)).toEqual([
      [1, 0, 3],
      [0, 1, 10],
    ]);
  });
});
