import type {
  ComponentGroupSettings,
  FrameSettings,
  RangeValue,
} from '../types';

export function sanitizeFrameSettings(settings: FrameSettings): void {
  settings.packageName = settings.packageName.replace(/[^a-z0-9@\-\/]/gi, '');
  settings.packageVersion = settings.packageVersion.replace(/[^0-9\.]/gi, '');
}

function clampRange(value: unknown, min: number, max: number): RangeValue {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return null;
    }

    return Math.max(min, Math.min(max, value));
  }

  if (Array.isArray(value) && value.length === 2) {
    const a = typeof value[0] === 'number' ? value[0] : Number(value[0]);
    const b = typeof value[1] === 'number' ? value[1] : Number(value[1]);

    if (Number.isNaN(a) || Number.isNaN(b)) {
      return null;
    }

    return [
      Math.max(min, Math.min(max, a)),
      Math.max(min, Math.min(max, b)),
    ];
  }

  return null;
}

function rangeEquals(a: RangeValue, b: RangeValue): boolean {
  if (a === b) {
    return true;
  }

  if (a === null || b === null) {
    return false;
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a === b;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return a[0] === b[0] && a[1] === b[1];
  }

  return false;
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
    : Math.max(0, Math.min(100, parsedProbability));

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
    const next = Number.isNaN(parsed)
      ? 1
      : Math.max(0, Math.min(1_000_000, parsed));

    if (weights[key] !== next) {
      weights[key] = next;
    }
  }
}
