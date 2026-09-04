import type { INode } from 'svgson';
import rgbHex from 'rgb-hex';

import { element } from './element';
import { apply, fromTransform, invert, type Transform2x3 } from './matrix';
import { formatNumber } from './numbers';

export type RgbLike = { r: number; g: number; b: number };
export type RgbaLike = RgbLike & { a: number };

export type SolidPaintLike = {
  type: 'SOLID';
  color: RgbLike;
  opacity?: number;
  visible?: boolean;
};

export type GradientPaintLike = {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  gradientTransform: Transform2x3;
  gradientStops: ReadonlyArray<{ position: number; color: RgbaLike }>;
  opacity?: number;
  visible?: boolean;
};

export type OtherPaintLike = {
  type: string;
  opacity?: number;
  visible?: boolean;
};

export type PaintLike = SolidPaintLike | GradientPaintLike | OtherPaintLike;

/** What a paint becomes on an element: the attribute value and its alpha. */
export type ResolvedPaint = {
  /** The `fill` or `stroke` value: a hex color or a `url(#id)` reference. */
  value: string;
  /** The `*-opacity` the paint adds, when it is not 1. */
  opacity?: number;
  /** The gradient definition the value references, when it does. */
  def?: INode;
};

export function hexColor(color: RgbLike): string {
  return `#${rgbHex(Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255))}`;
}

function stops(paint: GradientPaintLike): INode[] {
  const paintOpacity = paint.opacity ?? 1;

  return paint.gradientStops.map((stop) => {
    const attributes: Record<string, string> = {
      offset: formatNumber(stop.position),
      'stop-color': hexColor(stop.color),
    };
    const alpha = stop.color.a * paintOpacity;

    if (alpha !== 1) {
      attributes['stop-opacity'] = formatNumber(alpha);
    }

    return element('stop', attributes);
  });
}

/**
 * Resolves one Figma paint for a shape of the given size.
 *
 * Figma describes a gradient by the transform that takes the shape's unit
 * square into gradient space, where a linear gradient runs from x=0 to x=1 and
 * a radial one fills the unit circle around (0.5, 0.5). Inverting that
 * transform and scaling by the shape's size gives the gradient's geometry in
 * the shape's own coordinates, which is what `userSpaceOnUse` expects.
 *
 * Angular and diamond gradients have no SVG counterpart. They fall back to
 * their first stop as a solid color, with a warning. Image and other paints
 * resolve to null.
 */
export function resolvePaint(
  paint: PaintLike,
  size: { width: number; height: number },
  nextId: (kind: string) => string,
  warn: (message: string) => void,
): ResolvedPaint | null {
  if (paint.visible === false) {
    return null;
  }

  if (paint.type === 'SOLID') {
    const solid = paint as SolidPaintLike;
    const opacity = solid.opacity ?? 1;

    return { value: hexColor(solid.color), opacity: opacity === 1 ? undefined : opacity };
  }

  if (paint.type === 'GRADIENT_LINEAR' || paint.type === 'GRADIENT_RADIAL') {
    const gradient = paint as GradientPaintLike;
    const inverse = invert(fromTransform(gradient.gradientTransform));

    if (inverse === null || gradient.gradientStops.length === 0) {
      warn('A gradient without extent or stops was exported as transparent.');

      return null;
    }

    const toShape = (u: number, v: number): { x: number; y: number } => {
      const point = apply(inverse, u, v);

      return { x: point.x * size.width, y: point.y * size.height };
    };

    if (paint.type === 'GRADIENT_LINEAR') {
      const id = nextId('linear');
      const start = toShape(0, 0.5);
      const end = toShape(1, 0.5);

      return {
        value: `url(#${id})`,
        def: element(
          'linearGradient',
          {
            id,
            x1: formatNumber(start.x),
            y1: formatNumber(start.y),
            x2: formatNumber(end.x),
            y2: formatNumber(end.y),
            gradientUnits: 'userSpaceOnUse',
          },
          stops(gradient),
        ),
      };
    }

    // The unit circle maps onto the ellipse through one matrix: its center is
    // the translation, its two radius vectors are the columns.
    const id = nextId('radial');
    const center = toShape(0.5, 0.5);
    const radiusX = toShape(1, 0.5);
    const radiusY = toShape(0.5, 1);
    const matrix = [
      radiusX.x - center.x,
      radiusX.y - center.y,
      radiusY.x - center.x,
      radiusY.y - center.y,
      center.x,
      center.y,
    ];

    return {
      value: `url(#${id})`,
      def: element(
        'radialGradient',
        {
          id,
          cx: '0',
          cy: '0',
          r: '1',
          gradientUnits: 'userSpaceOnUse',
          gradientTransform: `matrix(${matrix.map((v) => formatNumber(v)).join(' ')})`,
        },
        stops(gradient),
      ),
    };
  }

  if (paint.type === 'GRADIENT_ANGULAR' || paint.type === 'GRADIENT_DIAMOND') {
    const gradient = paint as GradientPaintLike;
    const first = gradient.gradientStops[0];

    if (first === undefined) {
      return null;
    }

    warn(
      `${paint.type === 'GRADIENT_ANGULAR' ? 'Angular' : 'Diamond'} gradients have no SVG equivalent. The first stop was exported as a solid color.`,
    );

    const opacity = first.color.a * (gradient.opacity ?? 1);

    return { value: hexColor(first.color), opacity: opacity === 1 ? undefined : opacity };
  }

  warn(`Paints of type "${paint.type}" have no SVG equivalent and were not exported.`);

  return null;
}
