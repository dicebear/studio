import { describe, expect, it } from 'vitest';

import { animationLayerName, animationNameFromLayer } from './names';

describe('animation layer names', () => {
  it('round-trips a name through the layer name', () => {
    expect(animationLayerName('hop')).toBe('hop');
    expect(animationNameFromLayer('hop')).toBe('hop');
  });

  it('normalizes what a designer typed', () => {
    expect(animationNameFromLayer('Left eye')).toBe('leftEye');
    expect(animationNameFromLayer('Hop')).toBe('hop');
    expect(animationNameFromLayer('hop-2')).toBe('hop2');
  });

  it('leaves a layer name that yields no valid name unnamed', () => {
    expect(animationNameFromLayer('2 eyes')).toBeUndefined();
    expect(animationNameFromLayer('  ')).toBeUndefined();
  });

  it('leaves a name past the schema length limit unnamed', () => {
    expect(animationNameFromLayer('a'.repeat(64))).toBe('a'.repeat(64));
    expect(animationNameFromLayer('a'.repeat(65))).toBeUndefined();
  });

  it('names an unnamed timeline', () => {
    expect(animationLayerName(undefined)).toBe('Animated');
    expect(animationNameFromLayer(animationLayerName(undefined))).toBe('animated');
  });
});
