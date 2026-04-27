import type { RangeValue } from '../types';

function sortPair(a: number, b: number): [number, number] {
  return [Math.min(a, b), Math.max(a, b)];
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isFiniteTuple(v: unknown): v is readonly [number, number] {
  return Array.isArray(v) && v.length === 2 && isFiniteNumber(v[0]) && isFiniteNumber(v[1]);
}

function normalizeRange(v: unknown): RangeValue {
  if (isFiniteNumber(v)) {
    return v;
  }

  if (isFiniteTuple(v)) {
    return v;
  }

  return null;
}

export function isRangeEmpty(v: unknown): boolean {
  const n = normalizeRange(v);

  if (n === null) {
    return true;
  }

  if (typeof n === 'number') {
    return n === 0;
  }

  return n[0] === 0 && n[1] === 0;
}

export function toRangeArray(v: RangeValue): number[] | undefined {
  const n = normalizeRange(v);

  if (n === null || n === 0) {
    return undefined;
  }

  if (typeof n === 'number') {
    return [n * -1, n];
  }

  if (n[0] === 0 && n[1] === 0) {
    return undefined;
  }

  return sortPair(n[0], n[1]);
}

const SCALE_NEUTRAL = 1;

export function toScaleArray(v: RangeValue): number[] | undefined {
  const n = normalizeRange(v);

  if (n === null) {
    return undefined;
  }

  if (typeof n === 'number') {
    if (n === SCALE_NEUTRAL) {
      return undefined;
    }

    return [n, n];
  }

  if (n[0] === SCALE_NEUTRAL && n[1] === SCALE_NEUTRAL) {
    return undefined;
  }

  return sortPair(n[0], n[1]);
}

export type RangeSchemaBounds = {
  minimum: number;
  maximum: number;
  default: number[];
};

export function rangeSchemaBounds(v: RangeValue): RangeSchemaBounds | null {
  const n = normalizeRange(v);

  if (n === null || n === 0) {
    return null;
  }

  if (typeof n === 'number') {
    return {
      minimum: n * -1,
      maximum: n,
      default: [n * -1, n],
    };
  }

  if (n[0] === 0 && n[1] === 0) {
    return null;
  }

  const [lo, hi] = sortPair(n[0], n[1]);

  return {
    minimum: lo,
    maximum: hi,
    default: [lo, hi],
  };
}
