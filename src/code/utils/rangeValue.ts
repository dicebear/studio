import type { DefinitionRange, RangeValue } from '../types';

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isFiniteRange(v: unknown): v is DefinitionRange {
  if (typeof v !== 'object' || v === null) {
    return false;
  }

  const r = v as { min?: unknown; max?: unknown; step?: unknown };

  if (!isFiniteNumber(r.min) || !isFiniteNumber(r.max)) {
    return false;
  }

  return r.step === undefined || (isFiniteNumber(r.step) && r.step > 0);
}

function normalizeRange(v: unknown): RangeValue {
  return isFiniteRange(v) ? v : null;
}

function sortRange(r: DefinitionRange): DefinitionRange {
  const min = Math.min(r.min, r.max);
  const max = Math.max(r.min, r.max);

  return r.step === undefined ? { min, max } : { min, max, step: r.step };
}

// Returns undefined when the range collapses to `neutral` — a no-op transform
// the schema treats as absent.
function toDefinitionRange(v: RangeValue, neutral: number): DefinitionRange | undefined {
  const n = normalizeRange(v);

  if (n === null || (n.min === neutral && n.max === neutral)) {
    return undefined;
  }

  return sortRange(n);
}

export function toRangeObject(v: RangeValue): DefinitionRange | undefined {
  return toDefinitionRange(v, 0);
}

export function toScaleObject(v: RangeValue): DefinitionRange | undefined {
  return toDefinitionRange(v, 1);
}
