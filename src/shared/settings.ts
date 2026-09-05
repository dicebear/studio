import type { ComponentGroupSettings, DefinitionRange, RangeValue } from './types';

// A single variant tag: `category` or `category:value`, each segment camelCase.
export const VARIANT_TAG_PATTERN = /^[a-z][a-zA-Z0-9]*(:[a-z][a-zA-Z0-9]*)?$/;

// Schema bounds for a variant's tags (definition.json): at most 32 tags, each
// up to 129 characters.
export const MAX_VARIANT_TAGS = 32;
const MAX_VARIANT_TAG_LENGTH = 129;

// One tag is valid when it matches the grammar and stays within the length
// bound. Shared with the authoring UI so the chip input and the sanitizer use
// the same rule.
export function isValidVariantTag(tag: string): boolean {
  return tag.length <= MAX_VARIANT_TAG_LENGTH && VARIANT_TAG_PATTERN.test(tag);
}

function toFiniteNumber(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);

  return Number.isFinite(n) ? n : null;
}

export function clamp(v: number, min: number, max: number): number {
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

export function sanitizeComponentSettings(settings: ComponentGroupSettings): void {
  const rawProbability = settings.probability;
  const parsedProbability = typeof rawProbability === 'number' ? rawProbability : parseInt(String(rawProbability), 10);

  settings.probability = Number.isNaN(parsedProbability) ? null : clamp(parsedProbability, 0, 100);
  settings.rotation = clampRange(settings.rotation, -360, 360);
  settings.translateX = clampRange(settings.translateX, -1000, 1000);
  settings.translateY = clampRange(settings.translateY, -1000, 1000);

  const weights = settings.weights;

  for (const key of Object.keys(weights)) {
    const raw = weights[key];
    const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw));

    weights[key] = Number.isNaN(parsed) ? 1 : clamp(parsed, 0, 1_000_000);
  }

  // Keep authored variant tags schema-valid: a valid token, unique, capped per
  // variant. No `!` prefix. The exclusion form exists only in the render-option
  // filter, not the data.
  const tags = settings.tags;

  for (const key of Object.keys(tags)) {
    const raw = tags[key];

    // The common case is an already-valid (often empty) list. Skip it without
    // allocating a scratch Set and array, matching the weights loop above.
    if (Array.isArray(raw) && raw.length === 0) {
      continue;
    }

    const seen = new Set<string>();
    const next: string[] = [];

    if (Array.isArray(raw)) {
      for (const tag of raw) {
        if (typeof tag === 'string' && isValidVariantTag(tag) && !seen.has(tag)) {
          seen.add(tag);
          next.push(tag);

          if (next.length === MAX_VARIANT_TAGS) {
            break;
          }
        }
      }
    }

    // `next` is `raw` with invalid or duplicate entries dropped, so equal
    // lengths mean nothing changed.
    if (!Array.isArray(raw) || raw.length !== next.length) {
      tags[key] = next;
    }
  }
}
