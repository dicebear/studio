import { formatNumber } from './numbers';

/** Figma's row-major 2x3 transform: `[[m00, m01, m02], [m10, m11, m12]]`. */
export type Transform2x3 = readonly [readonly [number, number, number], readonly [number, number, number]];

/** SVG's `matrix(a b c d e f)`: `x' = a·x + c·y + e`, `y' = b·x + d·y + f`. */
export type Matrix = { a: number; b: number; c: number; d: number; e: number; f: number };

const EPSILON = 1e-9;

export const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

export function fromTransform(transform: Transform2x3): Matrix {
  return {
    a: transform[0][0],
    b: transform[1][0],
    c: transform[0][1],
    d: transform[1][1],
    e: transform[0][2],
    f: transform[1][2],
  };
}

function near(x: number, y: number): boolean {
  return Math.abs(x - y) < EPSILON;
}

export function isIdentity(m: Matrix): boolean {
  return isTranslation(m) && near(m.e, 0) && near(m.f, 0);
}

/** Whether the matrix only moves, without rotating, scaling, or skewing. */
export function isTranslation(m: Matrix): boolean {
  return near(m.a, 1) && near(m.b, 0) && near(m.c, 0) && near(m.d, 1);
}

export function multiply(m: Matrix, n: Matrix): Matrix {
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f,
  };
}

/** The inverse, or null when the matrix collapses the plane. */
export function invert(m: Matrix): Matrix | null {
  const det = m.a * m.d - m.b * m.c;

  if (Math.abs(det) < EPSILON) {
    return null;
  }

  return {
    a: m.d / det,
    b: -m.b / det,
    c: -m.c / det,
    d: m.a / det,
    e: (m.c * m.f - m.d * m.e) / det,
    f: (m.b * m.e - m.a * m.f) / det,
  };
}

export function apply(m: Matrix, x: number, y: number): { x: number; y: number } {
  return {
    x: m.a * x + m.c * y + m.e,
    y: m.b * x + m.d * y + m.f,
  };
}

/** The `transform` attribute value, or undefined for the identity. */
export function toAttribute(m: Matrix): string | undefined {
  if (isIdentity(m)) {
    return undefined;
  }

  if (isTranslation(m)) {
    return `translate(${formatNumber(m.e)} ${formatNumber(m.f)})`;
  }

  return `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map((v) => formatNumber(v)).join(' ')})`;
}
