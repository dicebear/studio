import { ComponentGroupSettings, RangeValue } from '../types';

type RangeKey = 'rotation' | 'scale' | 'translateX' | 'translateY';

// Legacy bare-number semantics: `n` meant ±n for rotation/translate, fixed `n` for scale.
function migrateLegacyRange(v: unknown, key: RangeKey): RangeValue {
  if (Array.isArray(v)) {
    if (v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number') {
      return { min: v[0], max: v[1] };
    }

    if (v.length === 3 && typeof v[0] === 'number' && typeof v[1] === 'number' && typeof v[2] === 'number') {
      return { min: v[0], max: v[1], step: v[2] };
    }

    return null;
  }

  if (typeof v === 'number') {
    return key === 'scale' ? { min: v, max: v } : { min: -v, max: v };
  }

  return v as RangeValue;
}

export function getComponentGroupSettings(frame: FrameNode, componentGroup: string): ComponentGroupSettings {
  const stored = JSON.parse(frame.getPluginData(`components/${componentGroup}/settings`) || '{}');

  if ('offsetX' in stored && !('translateX' in stored)) {
    stored.translateX = stored.offsetX;
  }

  if ('offsetY' in stored && !('translateY' in stored)) {
    stored.translateY = stored.offsetY;
  }

  delete stored.offsetX;
  delete stored.offsetY;

  for (const key of ['rotation', 'scale', 'translateX', 'translateY'] as const) {
    if (key in stored) {
      stored[key] = migrateLegacyRange(stored[key], key);
    }
  }

  return {
    defaults: {},
    weights: {},
    probability: null,
    rotation: null,
    scale: null,
    translateX: null,
    translateY: null,
    ...stored,
  };
}
