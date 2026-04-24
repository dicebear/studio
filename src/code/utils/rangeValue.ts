import type { RangeValue } from '../types';

function sortPair(a: number, b: number): [number, number] {
  return [Math.min(a, b), Math.max(a, b)];
}

export function isRangeEmpty(v: unknown): boolean {
  if (v === null || v === undefined) {
    return true;
  }

  if (typeof v === 'number') {
    return v === 0;
  }

  return Array.isArray(v) && v[0] === 0 && v[1] === 0;
}

export function toRangeArray(v: RangeValue): number[] | undefined {
  if (v === null || v === 0) {
    return undefined;
  }

  if (typeof v === 'number') {
    return [v * -1, v];
  }

  if (v[0] === 0 && v[1] === 0) {
    return undefined;
  }

  return sortPair(v[0], v[1]);
}

const SCALE_NEUTRAL = 1;

export function toScaleArray(v: RangeValue): number[] | undefined {
  if (v === null) {
    return undefined;
  }

  if (typeof v === 'number') {
    if (v === SCALE_NEUTRAL) {
      return undefined;
    }

    return [v, v];
  }

  if (v[0] === SCALE_NEUTRAL && v[1] === SCALE_NEUTRAL) {
    return undefined;
  }

  return sortPair(v[0], v[1]);
}

export type RangeSchemaBounds = {
  minimum: number;
  maximum: number;
  default: number[];
};

export function rangeSchemaBounds(v: RangeValue): RangeSchemaBounds | null {
  if (v === null || v === 0) {
    return null;
  }

  if (typeof v === 'number') {
    return {
      minimum: v * -1,
      maximum: v,
      default: [v * -1, v],
    };
  }

  if (v[0] === 0 && v[1] === 0) {
    return null;
  }

  const [lo, hi] = sortPair(v[0], v[1]);

  return {
    minimum: lo,
    maximum: hi,
    default: [lo, hi],
  };
}
