import type { RangeValue } from '../types';

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

  return [v[0], v[1]];
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

  return {
    minimum: Math.min(v[0], v[1]),
    maximum: Math.max(v[0], v[1]),
    default: [v[0], v[1]],
  };
}
