import { reactive, computed } from 'vue';
import type { RangeValue } from '../types';

type Indexable = Record<string, unknown>;

export function useRangeField<T extends object>(target: T) {
  const rangeMode = reactive<Record<string, boolean>>({});

  function read(key: string): RangeValue {
    return (target as Indexable)[key] as RangeValue;
  }

  function write(key: string, value: RangeValue): void {
    (target as Indexable)[key] = value;
  }

  function isRangeMode(key: keyof T & string): boolean {
    if (rangeMode[key] !== undefined) {
      return rangeMode[key];
    }

    return Array.isArray(read(key));
  }

  function toggleRangeMode(key: keyof T & string, fallback: number) {
    const wasRange = isRangeMode(key);

    rangeMode[key] = !wasRange;

    if (wasRange) {
      const val = read(key);
      const single = Array.isArray(val)
        ? val[0]
        : typeof val === 'number'
          ? val
          : fallback;

      write(key, single);
    } else {
      const val = read(key);
      const single = typeof val === 'number' ? val : fallback;

      write(key, [single, single]);
    }
  }

  function singleComputed(key: keyof T & string, fallback: number) {
    return computed<number>({
      get: () => {
        const val = read(key);

        return typeof val === 'number' ? val : fallback;
      },
      set: (val: number) => {
        write(key, val);
      },
    });
  }

  function rangeComputed(
    key: keyof T & string,
    fallback: number | readonly number[],
  ) {
    return computed<[number, number]>({
      get: () => {
        const val = read(key);

        if (Array.isArray(val) && val.length === 2) {
          return [val[0], val[1]] as [number, number];
        }

        if (typeof val === 'number') {
          return [val, val] as [number, number];
        }

        if (Array.isArray(fallback) && fallback.length === 2) {
          return [fallback[0], fallback[1]] as [number, number];
        }

        const fb = typeof fallback === 'number' ? fallback : 0;

        return [fb, fb] as [number, number];
      },
      set: (val: [number, number]) => {
        write(key, [val[0], val[1]]);
      },
    });
  }

  return {
    rangeMode,
    isRangeMode,
    toggleRangeMode,
    singleComputed,
    rangeComputed,
  };
}
