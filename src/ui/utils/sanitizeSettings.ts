import type {
  ComponentGroupSettings,
  DefinitionRange,
  FrameSettings,
  RangeValue,
} from '../types';

export function sanitizeFrameSettings(settings: FrameSettings): void {
  settings.packageName = settings.packageName.replace(/[^a-z0-9@\-\/]/gi, '');
  settings.packageVersion = settings.packageVersion.replace(/[^0-9\.]/gi, '');
}

function toFiniteNumber(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);

  return Number.isFinite(n) ? n : null;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function clampRange(value: unknown, min: number, max: number): RangeValue {
  if (value === null || value === undefined || value === '' || typeof value !== 'object') {
    return null;
  }

  const obj = value as { min?: unknown; max?: unknown; step?: unknown };
  const a = toFiniteNumber(obj.min);
  const b = toFiniteNumber(obj.max);

  if (a === null || b === null) {
    return null;
  }

  const sanitized: DefinitionRange = {
    min: clamp(a, min, max),
    max: clamp(b, min, max),
  };
  const step = toFiniteNumber(obj.step);

  if (step !== null && step > 0) {
    sanitized.step = Math.min(Math.abs(max - min), step);
  }

  return sanitized;
}

function rangeEquals(a: RangeValue, b: RangeValue): boolean {
  if (a === b) {
    return true;
  }

  if (a === null || b === null) {
    return false;
  }

  return a.min === b.min && a.max === b.max && a.step === b.step;
}

function assignIfChanged<K extends 'rotation' | 'translateX' | 'translateY'>(
  settings: ComponentGroupSettings,
  key: K,
  next: RangeValue,
): void {
  if (!rangeEquals(settings[key], next)) {
    settings[key] = next;
  }
}

export function sanitizeComponentSettings(settings: ComponentGroupSettings): void {
  const rawProbability = settings.probability;
  const parsedProbability =
    typeof rawProbability === 'number' ? rawProbability : parseInt(String(rawProbability), 10);
  const nextProbability = Number.isNaN(parsedProbability)
    ? null
    : clamp(parsedProbability, 0, 100);

  if (settings.probability !== nextProbability) {
    settings.probability = nextProbability;
  }

  assignIfChanged(settings, 'rotation', clampRange(settings.rotation, -360, 360));
  assignIfChanged(settings, 'translateX', clampRange(settings.translateX, -1000, 1000));
  assignIfChanged(settings, 'translateY', clampRange(settings.translateY, -1000, 1000));

  const weights = settings.weights;

  for (const key of Object.keys(weights)) {
    const raw = weights[key];
    const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw));
    const next = Number.isNaN(parsed) ? 1 : clamp(parsed, 0, 1_000_000);

    if (weights[key] !== next) {
      weights[key] = next;
    }
  }
}
