import { DefinitionEasing, DefinitionEasingBezier, FigmaEasing } from './types';

/** CSS's `ease` keyword as its defining bezier. */
const CSS_EASE: DefinitionEasingBezier = { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 };

function isSameBezier(a: DefinitionEasingBezier, b: DefinitionEasingBezier): boolean {
  return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2;
}

/**
 * A cubic bezier standing in for a spring. A bezier can express at most one
 * overshoot, so multi-oscillation springs flatten to a single settle; every
 * caller pairs this with a warning.
 */
function springBezier(bounce: number): DefinitionEasingBezier {
  if (bounce <= 0.15) {
    return { x1: 0.25, y1: 1 + bounce, x2: 0.4, y2: 1 };
  }

  return { x1: 0.34, y1: 1 + 1.2 * bounce, x2: 0.64, y2: 1 };
}

/**
 * Converts a definition easing to Figma's motion easing object. `hold`
 * becomes `HOLD`, the CSS `ease` keyword and bezier objects become custom
 * cubic beziers.
 */
export function definitionEasingToFigma(easing: DefinitionEasing): FigmaEasing {
  if (typeof easing !== 'string') {
    return { type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { ...easing } };
  }

  switch (easing) {
    case 'ease':
      return { type: 'CUSTOM_CUBIC_BEZIER', easingFunctionCubicBezier: { ...CSS_EASE } };
    case 'easeIn':
      return { type: 'EASE_IN' };
    case 'easeOut':
      return { type: 'EASE_OUT' };
    case 'easeInOut':
      return { type: 'EASE_IN_AND_OUT' };
    case 'hold':
      return { type: 'HOLD' };
    default:
      return { type: 'LINEAR' };
  }
}

/**
 * Converts a Figma motion easing back to the definition vocabulary. Springs
 * and the back presets have no CSS equivalent and come back as approximating
 * beziers; springs additionally warn, because their later oscillations are
 * lost.
 */
export function figmaEasingToDefinition(easing: FigmaEasing, warn: (message: string) => void): DefinitionEasing {
  switch (easing.type) {
    case 'LINEAR':
      return 'linear';
    case 'EASE_IN':
      return 'easeIn';
    case 'EASE_OUT':
      return 'easeOut';
    case 'EASE_IN_AND_OUT':
      return 'easeInOut';
    case 'HOLD':
      return 'hold';
    case 'CUSTOM_CUBIC_BEZIER': {
      const bezier = easing.easingFunctionCubicBezier;

      if (!bezier) {
        return 'linear';
      }

      return isSameBezier(bezier, CSS_EASE) ? 'ease' : { ...bezier };
    }
    case 'EASE_IN_BACK':
      return { x1: 0.36, y1: 0, x2: 0.66, y2: -0.56 };
    case 'EASE_OUT_BACK':
      return { x1: 0.34, y1: 1.56, x2: 0.64, y2: 1 };
    case 'EASE_IN_AND_OUT_BACK':
      return { x1: 0.68, y1: -0.6, x2: 0.32, y2: 1.6 };
    case 'GENTLE':
      warn('Spring easings were approximated with cubic beziers, their later oscillations are lost.');

      return { x1: 0.22, y1: 1, x2: 0.36, y2: 1 };
    case 'QUICK':
      warn('Spring easings were approximated with cubic beziers, their later oscillations are lost.');

      return { x1: 0.3, y1: 1, x2: 0.36, y2: 1 };
    case 'SLOW':
      warn('Spring easings were approximated with cubic beziers, their later oscillations are lost.');

      return { x1: 0.25, y1: 0.8, x2: 0.4, y2: 1 };
    case 'BOUNCY':
      warn('Spring easings were approximated with cubic beziers, their later oscillations are lost.');

      return springBezier(0.5);
    case 'CUSTOM_SPRING':
      warn('Spring easings were approximated with cubic beziers, their later oscillations are lost.');

      return springBezier(easing.easingFunctionSpring?.bounce ?? 0);
    default:
      warn(`The easing "${easing.type}" has no CSS equivalent and was exported as linear.`);

      return 'linear';
  }
}
