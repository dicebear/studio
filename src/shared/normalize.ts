import type { NormalizeData, NormalizeVariant } from './types';

export const NORMALIZE_TOLERANCE = 0.001;

export function isClose(a: number, b: number): boolean {
  return Math.abs(a - b) < NORMALIZE_TOLERANCE;
}

export function isVariantAligned(variant: NormalizeVariant, data: NormalizeData): boolean {
  return (
    isClose(variant.currentWidth, data.targetWidth) &&
    isClose(variant.currentHeight, data.targetHeight) &&
    isClose(data.willTranslate.dx, 0) &&
    isClose(data.willTranslate.dy, 0)
  );
}

export function hasPendingChanges(data: NormalizeData): boolean {
  if (!isClose(data.willTranslate.dx, 0) || !isClose(data.willTranslate.dy, 0)) {
    return true;
  }

  for (const v of data.variants) {
    if (v.skipReason) {
      continue;
    }

    if (!isClose(v.currentWidth, data.targetWidth) || !isClose(v.currentHeight, data.targetHeight)) {
      return true;
    }
  }

  return false;
}
