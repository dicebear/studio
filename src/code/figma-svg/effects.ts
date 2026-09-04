import type { INode } from 'svgson';

import { element } from './element';
import { formatNumber } from './numbers';
import type { RgbaLike } from './paints';

export type ShadowEffectLike = {
  type: 'DROP_SHADOW' | 'INNER_SHADOW';
  color: RgbaLike;
  offset: { x: number; y: number };
  radius: number;
  spread?: number;
  visible: boolean;
  showShadowBehindNode?: boolean;
};

export type BlurEffectLike = {
  type: 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  radius: number;
  visible: boolean;
};

export type OtherEffectLike = {
  type: string;
  visible: boolean;
};

export type EffectLike = ShadowEffectLike | BlurEffectLike | OtherEffectLike;

/** Turns every opaque pixel solid, the ground a shadow is cut from. */
const HARD_ALPHA = '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0';

/** Figma's blur radius is the full kernel, SVG wants the standard deviation. */
function stdDeviation(radius: number): number {
  return radius / 2;
}

/** A color matrix that paints every opaque pixel in one color. */
function colorMatrix(color: RgbaLike): string {
  return `0 0 0 0 ${formatNumber(color.r)} 0 0 0 0 ${formatNumber(color.g)} 0 0 0 0 ${formatNumber(color.b)} 0 0 0 ${formatNumber(color.a)} 0`;
}

/**
 * The box a filter is built around. A shape's box is its layer size plus the
 * `outset` its stroke adds, and the region is written in those coordinates.
 * A container's children can lie anywhere, so without an `outset` the region
 * follows the rendered content and is written in fractions of it.
 */
export type FilterBox = {
  width: number;
  height: number;
  /** How far a stroke reaches beyond the box. Given for shapes, not for containers. */
  outset?: number;
};

/** The smallest extent a region gets, so a line at zero height keeps its shadow. */
const MIN_REGION = 1;

/**
 * Builds the `<filter>` for a layer's effects, or null when none of them has
 * an SVG counterpart. The chain follows the one Figma writes: drop shadows
 * composite below the graphic, inner shadows on top of it, a layer blur over
 * the result. The filter region grows with the largest blur and offset so
 * nothing is cut off, see {@link FilterBox} for the two ways it is measured.
 */
export function effectsToFilter(
  effects: ReadonlyArray<EffectLike>,
  box: FilterBox,
  id: string,
  warn: (message: string) => void,
): INode | null {
  const dropShadows: ShadowEffectLike[] = [];
  const innerShadows: ShadowEffectLike[] = [];
  let blur: BlurEffectLike | null = null;

  for (const effect of effects) {
    if (!effect.visible) {
      continue;
    }

    switch (effect.type) {
      case 'DROP_SHADOW':
        dropShadows.push(effect as ShadowEffectLike);
        break;

      case 'INNER_SHADOW':
        innerShadows.push(effect as ShadowEffectLike);
        break;

      case 'LAYER_BLUR':
        if (blur !== null) {
          warn('Only one layer blur per layer can be exported. The others were skipped.');
        } else {
          blur = effect as BlurEffectLike;
        }
        break;

      default:
        warn(`The effect "${effect.type}" has no SVG equivalent and was not exported.`);
    }
  }

  if (dropShadows.length === 0 && innerShadows.length === 0 && blur === null) {
    return null;
  }

  const primitives: INode[] = [];
  let padX = 0;
  let padY = 0;
  let result = 0;

  const nextResult = (): string => `r${result++}`;

  const grow = (reach: number, dx: number, dy: number): void => {
    padX = Math.max(padX, reach + Math.abs(dx));
    padY = Math.max(padY, reach + Math.abs(dy));
  };

  /**
   * One shadow, as the chain of primitives Figma's own export writes. Both
   * kinds share the spine (hard alpha, spread, offset, blur, tint, blend) and
   * differ in two spots: the spread grows the alpha for a drop shadow and
   * shrinks it for an inner one, and the blurred copy is cut against the
   * layer the other way round. Returns the name of its result.
   */
  const shadowChain = (shadow: ShadowEffectLike, previous: string): string => {
    const spread = shadow.spread ?? 0;
    const inner = shadow.type === 'INNER_SHADOW';
    const hardAlpha = nextResult();

    if (!inner) {
      grow(3 * stdDeviation(shadow.radius) + Math.max(spread, 0), shadow.offset.x, shadow.offset.y);
    }

    primitives.push(
      element('feColorMatrix', { in: 'SourceAlpha', type: 'matrix', values: HARD_ALPHA, result: hardAlpha }),
    );

    if (spread !== 0) {
      primitives.push(
        element('feMorphology', {
          radius: formatNumber(Math.abs(spread)),
          operator: spread > 0 === inner ? 'erode' : 'dilate',
          in: 'SourceAlpha',
        }),
      );
    }

    primitives.push(element('feOffset', { dx: formatNumber(shadow.offset.x), dy: formatNumber(shadow.offset.y) }));
    primitives.push(element('feGaussianBlur', { stdDeviation: formatNumber(stdDeviation(shadow.radius)) }));

    if (inner) {
      primitives.push(element('feComposite', { in2: hardAlpha, operator: 'arithmetic', k2: '-1', k3: '1' }));
    } else if (!shadow.showShadowBehindNode) {
      // Figma knocks the shadow out behind the layer unless asked otherwise.
      primitives.push(element('feComposite', { in2: hardAlpha, operator: 'out' }));
    }

    primitives.push(element('feColorMatrix', { type: 'matrix', values: colorMatrix(shadow.color) }));

    const merged = nextResult();

    primitives.push(element('feBlend', { mode: 'normal', in2: previous, result: merged }));

    return merged;
  };

  // Drop shadows composite below the graphic, on empty ground.
  let below = nextResult();

  primitives.push(element('feFlood', { 'flood-opacity': '0', result: below }));

  for (const shadow of dropShadows) {
    below = shadowChain(shadow, below);
  }

  const shape = nextResult();

  primitives.push(element('feBlend', { mode: 'normal', in: 'SourceGraphic', in2: below, result: shape }));

  // Inner shadows sit on top of it.
  let above = shape;

  for (const shadow of innerShadows) {
    above = shadowChain(shadow, above);
  }

  if (blur !== null) {
    grow(3 * stdDeviation(blur.radius), 0, 0);
    primitives.push(
      element('feGaussianBlur', {
        in: above,
        stdDeviation: formatNumber(stdDeviation(blur.radius)),
        result: nextResult(),
      }),
    );
  }

  const attributes: Record<string, string> = { id, 'color-interpolation-filters': 'sRGB' };

  if (box.outset !== undefined) {
    // A shape's region in its own coordinates: the box, the stroke around it,
    // and the reach of the effects. The bounding box would miss the stroke and
    // collapse for a line.
    const reachX = padX + box.outset;
    const reachY = padY + box.outset;

    attributes.filterUnits = 'userSpaceOnUse';
    attributes.x = formatNumber(-reachX);
    attributes.y = formatNumber(-reachY);
    attributes.width = formatNumber(Math.max(box.width + 2 * reachX, MIN_REGION));
    attributes.height = formatNumber(Math.max(box.height + 2 * reachY, MIN_REGION));
  } else if (padX > 0 || padY > 0) {
    // The default region of ten percent around the content clips large blurs.
    const fractionX = box.width > 0 ? padX / box.width : 0;
    const fractionY = box.height > 0 ? padY / box.height : 0;

    attributes.x = formatNumber(-fractionX);
    attributes.y = formatNumber(-fractionY);
    attributes.width = formatNumber(1 + 2 * fractionX);
    attributes.height = formatNumber(1 + 2 * fractionY);
  }

  return element('filter', attributes, primitives);
}
