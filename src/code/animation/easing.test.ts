import { describe, expect, it } from 'vitest';

import { definitionEasingToFigma, figmaEasingToDefinition } from './easing';
import { DefinitionEasing } from './types';

const noWarn = () => {
  throw new Error('unexpected warning');
};

describe('definitionEasingToFigma', () => {
  it('maps the named keywords', () => {
    expect(definitionEasingToFigma('linear')).toEqual({ type: 'LINEAR' });
    expect(definitionEasingToFigma('easeIn')).toEqual({ type: 'EASE_IN' });
    expect(definitionEasingToFigma('easeOut')).toEqual({ type: 'EASE_OUT' });
    expect(definitionEasingToFigma('easeInOut')).toEqual({ type: 'EASE_IN_AND_OUT' });
    expect(definitionEasingToFigma('hold')).toEqual({ type: 'HOLD' });
  });

  it('maps the CSS ease keyword to its defining bezier', () => {
    expect(definitionEasingToFigma('ease')).toEqual({
      type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
    });
  });

  it('maps bezier objects to custom cubic beziers', () => {
    expect(definitionEasingToFigma({ x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 })).toEqual({
      type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: { x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 },
    });
  });
});

describe('figmaEasingToDefinition', () => {
  it('round-trips every named easing exactly', () => {
    const named: DefinitionEasing[] = ['linear', 'easeIn', 'easeOut', 'easeInOut', 'hold', 'ease'];

    for (const easing of named) {
      expect(figmaEasingToDefinition(definitionEasingToFigma(easing), noWarn)).toEqual(easing);
    }
  });

  it('round-trips custom beziers exactly', () => {
    const bezier: DefinitionEasing = { x1: 0.1, y1: -0.5, x2: 0.9, y2: 1.5 };

    expect(figmaEasingToDefinition(definitionEasingToFigma(bezier), noWarn)).toEqual(bezier);
  });

  it('maps the back presets to beziers without warning', () => {
    expect(figmaEasingToDefinition({ type: 'EASE_OUT_BACK' }, noWarn)).toEqual({
      x1: 0.34,
      y1: 1.56,
      x2: 0.64,
      y2: 1,
    });
  });

  it('approximates springs with a warning', () => {
    const warnings: string[] = [];
    const result = figmaEasingToDefinition(
      { type: 'CUSTOM_SPRING', easingFunctionSpring: { bounce: 0.3 } },
      (message) => warnings.push(message),
    );

    expect(result).toEqual({ x1: 0.34, y1: 1 + 1.2 * 0.3, x2: 0.64, y2: 1 });
    expect(warnings).toHaveLength(1);
  });

  it('grows the spring overshoot with the bounce', () => {
    const warn = () => {};
    const low = figmaEasingToDefinition({ type: 'CUSTOM_SPRING', easingFunctionSpring: { bounce: 0.1 } }, warn);
    const high = figmaEasingToDefinition({ type: 'CUSTOM_SPRING', easingFunctionSpring: { bounce: 0.9 } }, warn);

    expect(typeof low).toBe('object');
    expect(typeof high).toBe('object');

    if (typeof low === 'object' && typeof high === 'object') {
      expect(high.y1).toBeGreaterThan(low.y1);
    }
  });

  it('falls back to linear for unknown types with a warning', () => {
    const warnings: string[] = [];

    expect(figmaEasingToDefinition({ type: 'SOMETHING_NEW' }, (message) => warnings.push(message))).toEqual('linear');
    expect(warnings).toHaveLength(1);
  });
});
