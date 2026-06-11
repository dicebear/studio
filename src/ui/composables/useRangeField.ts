import { computed } from 'vue';
import type { RangeValue } from '../types';

type Indexable = Record<string, unknown>;

export function useRangeField<T extends object>(target: T) {
  function read(key: string): RangeValue {
    return (target as Indexable)[key] as RangeValue;
  }

  function write(key: string, value: RangeValue): void {
    (target as Indexable)[key] = value;
  }

  function resetRangeField(key: keyof T & string) {
    write(key, null);
  }

  function rangeComputed(key: keyof T & string, fallback: number | (() => number)) {
    const resolve = typeof fallback === 'function' ? fallback : () => fallback;

    return computed<[number, number]>({
      get: () => {
        const val = read(key);

        if (val !== null) {
          return [val.min, val.max] as [number, number];
        }

        const single = resolve();

        return [single, single] as [number, number];
      },
      set: ([min, max]: [number, number]) => {
        const step = read(key)?.step;

        write(key, step !== undefined ? { min, max, step } : { min, max });
      },
    });
  }

  function stepComputed(key: keyof T & string) {
    return computed<number | null>({
      get: () => {
        const step = read(key)?.step;

        return step !== undefined && step > 0 ? step : null;
      },
      set: (next: number | null) => {
        const val = read(key);

        if (val === null) {
          return;
        }

        write(
          key,
          next !== null && next > 0 ? { min: val.min, max: val.max, step: next } : { min: val.min, max: val.max },
        );
      },
    });
  }

  return {
    resetRangeField,
    rangeComputed,
    stepComputed,
  };
}
