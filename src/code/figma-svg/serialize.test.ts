import { describe, expect, it } from 'vitest';
import { stringify } from 'svgson';

import { textNode } from './element';
import { serializeTree } from './serialize';
import type { SerializeOptions } from './types';

const MIXED = Symbol('mixed');

const IDENTITY = [
  [1, 0, 0],
  [0, 1, 0],
] as const;

function translate(x: number, y: number) {
  return [
    [1, 0, x],
    [0, 1, y],
  ] as const;
}

const solid = (r: number, g: number, b: number) => ({ type: 'SOLID', color: { r, g, b } });

/** A shape layer with the properties the serializer reads. */
function shape(type: string, props: Record<string, unknown>) {
  return {
    type,
    name: type.toLowerCase(),
    visible: true,
    opacity: 1,
    blendMode: 'PASS_THROUGH',
    isMask: false,
    maskType: 'ALPHA',
    effects: [],
    relativeTransform: IDENTITY,
    width: 10,
    height: 10,
    fills: [],
    strokes: [],
    fillStyleId: '',
    strokeStyleId: '',
    strokeWeight: 1,
    strokeAlign: 'CENTER',
    strokeCap: 'NONE',
    strokeJoin: 'MITER',
    strokeMiterLimit: 4,
    dashPattern: [],
    cornerRadius: 0,
    cornerSmoothing: 0,
    arcData: { startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0 },
    fillGeometry: [{ windingRule: 'NONZERO', data: 'M0 0H10V10H0Z' }],
    strokeGeometry: [],
    vectorPaths: [],
    ...props,
  } as unknown as SceneNode;
}

function container(type: string, children: SceneNode[], props: Record<string, unknown> = {}) {
  return shape(type, { children, fillGeometry: [], clipsContent: false, ...props });
}

function options(extra: Partial<SerializeOptions> = {}): SerializeOptions {
  return {
    host: { mixed: MIXED },
    ...extra,
  };
}

async function svg(root: SceneNode, extra: Partial<SerializeOptions> = {}): Promise<string> {
  return stringify(await serializeTree(root as SceneNode & ChildrenMixin, options(extra))).replace(
    /^<svg[^>]*>|<\/svg>$/g,
    '',
  );
}

describe('serializeTree', () => {
  it('writes a translated rectangle as a placed rect', async () => {
    const root = container('FRAME', [
      shape('RECTANGLE', { relativeTransform: translate(5, 6), fills: [solid(1, 0, 0)], width: 10, height: 4 }),
    ]);

    expect(await svg(root)).toBe('<rect width="10" height="4" fill="#ff0000" x="5" y="6"/>');
  });

  it('does not apply a group transform, its children already sit in frame coordinates', async () => {
    const child = shape('ELLIPSE', { relativeTransform: translate(20, 20), fills: [solid(0, 0, 1)] });
    const group = container('GROUP', [child], { relativeTransform: translate(20, 20) });

    expect(await svg(container('FRAME', [group]))).toBe('<circle cx="25" cy="25" r="5" fill="#0000ff"/>');
  });

  it('keeps a frame transform and clips its children when asked', async () => {
    const inner = container('FRAME', [shape('RECTANGLE', { fills: [solid(0, 1, 0)] })], {
      relativeTransform: translate(3, 0),
      clipsContent: true,
      fillGeometry: [{ windingRule: 'NONZERO', data: 'M0 0H10V10H0Z' }],
    });

    expect(await svg(container('FRAME', [inner]), { clipFrames: true })).toBe(
      '<g clip-path="url(#clip0)" transform="translate(3 0)"><rect width="10" height="10" fill="#00ff00"/></g>' +
        '<defs><clipPath id="clip0"><path d="M0 0H10V10H0Z"/></clipPath></defs>',
    );
    expect(await svg(container('FRAME', [inner]), { clipFrames: false })).toBe(
      '<rect width="10" height="10" fill="#00ff00" transform="translate(3 0)"/>',
    );
  });

  it('puts a center stroke on the element and clips an outlined inside stroke to the fill', async () => {
    const centered = shape('RECTANGLE', { fills: [solid(0, 0, 0)], strokes: [solid(1, 1, 1)], strokeWeight: 2 });
    // Figma outlines an inside stroke with twice the weight, the half outside
    // the fill has to go.
    const inside = shape('VECTOR', {
      fills: [solid(0, 0, 0)],
      strokes: [solid(1, 1, 1)],
      strokeAlign: 'INSIDE',
      strokeGeometry: [{ windingRule: 'EVENODD', data: 'M-1 -1H11V11H-1ZM1 1H9V9H1Z' }],
    });

    expect(await svg(container('FRAME', [centered]))).toBe(
      '<rect width="10" height="10" fill="#000000" stroke="#ffffff" stroke-width="2"/>',
    );
    expect(await svg(container('FRAME', [inside]))).toBe(
      '<path d="M0 0H10V10H0Z" fill="#000000"/>' +
        '<g clip-path="url(#clip0)">' +
        '<path d="M-1 -1H11V11H-1ZM1 1H9V9H1Z" fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd"/>' +
        '</g>' +
        '<defs><clipPath id="clip0"><path d="M0 0H10V10H0Z"/></clipPath></defs>',
    );
  });

  it('masks an outlined outside stroke by the fill', async () => {
    const outside = shape('VECTOR', {
      fills: [solid(0, 0, 0)],
      strokes: [solid(1, 1, 1)],
      strokeAlign: 'OUTSIDE',
      strokeWeight: 1,
      strokeGeometry: [{ windingRule: 'EVENODD', data: 'M-1 -1H11V11H-1ZM1 1H9V9H1Z' }],
    });

    expect(await svg(container('FRAME', [outside]))).toBe(
      '<path d="M0 0H10V10H0Z" fill="#000000"/>' +
        '<g mask="url(#mask0)">' +
        '<path d="M-1 -1H11V11H-1ZM1 1H9V9H1Z" fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd"/>' +
        '</g>' +
        '<defs><mask id="mask0">' +
        '<rect x="-4" y="-4" width="18" height="18" fill="#ffffff"/><path d="M0 0H10V10H0Z" fill="#000000"/>' +
        '</mask></defs>',
    );
  });

  it('runs an inside or outside stroke on a primitive along the moved primitive', async () => {
    const circle = shape('ELLIPSE', {
      relativeTransform: translate(40, 60),
      fills: [solid(1, 0, 0)],
      strokes: [solid(0, 0, 0)],
      strokeAlign: 'INSIDE',
      strokeWeight: 2,
      strokeGeometry: [{ windingRule: 'EVENODD', data: 'M0 0' }],
    });
    const rounded = shape('RECTANGLE', {
      relativeTransform: translate(3, 4),
      strokes: [solid(0, 0, 0)],
      strokeAlign: 'OUTSIDE',
      strokeWeight: 2,
      cornerRadius: 2,
      strokeGeometry: [{ windingRule: 'EVENODD', data: 'M0 0' }],
    });

    // An opaque stroke and the fill share one element: the moved circle with
    // the stroke on it shows the same pixels as Figma.
    expect(await svg(container('FRAME', [circle]))).toBe(
      '<circle cx="45" cy="65" r="4" fill="#ff0000" stroke="#000000" stroke-width="2"/>',
    );
    expect(await svg(container('FRAME', [rounded]))).toBe(
      '<rect x="2" y="3" width="12" height="12" rx="3" fill="none" stroke="#000000" stroke-width="2"/>',
    );
  });

  it('keeps the fill under a translucent aligned stroke on its own element', async () => {
    const rect = shape('RECTANGLE', {
      fills: [solid(1, 0, 0)],
      strokes: [{ ...solid(0, 0, 0), opacity: 0.5 }],
      strokeAlign: 'INSIDE',
      strokeWeight: 2,
      strokeGeometry: [{ windingRule: 'EVENODD', data: 'M0 0' }],
    });

    expect(await svg(container('FRAME', [rect]))).toBe(
      '<rect width="10" height="10" fill="#ff0000"/>' +
        '<rect x="1" y="1" width="8" height="8" fill="none" stroke="#000000" stroke-opacity="0.5" stroke-width="2"/>',
    );
  });

  it('masks the siblings above a mask with its white outline', async () => {
    const mask = shape('ELLIPSE', { isMask: true, maskType: 'VECTOR', fills: [solid(1, 0, 0)] });
    const above = shape('RECTANGLE', { fills: [solid(0, 0, 1)] });
    const below = shape('RECTANGLE', { fills: [solid(0, 1, 0)] });

    expect(await svg(container('FRAME', [below, mask, above]))).toBe(
      '<rect width="10" height="10" fill="#00ff00"/>' +
        '<g mask="url(#mask0)"><rect width="10" height="10" fill="#0000ff"/></g>' +
        '<defs><mask id="mask0" style="mask-type:alpha"><circle cx="5" cy="5" r="5" fill="#ffffff"/></mask></defs>',
    );
  });

  it('keeps a child opacity under a group opacity instead of replacing it', async () => {
    const child = shape('RECTANGLE', { opacity: 0.8, fills: [solid(0, 0, 0)] });

    expect(await svg(container('FRAME', [container('GROUP', [child], { opacity: 0.5 })]))).toBe(
      '<g opacity="0.5"><rect width="10" height="10" fill="#000000" opacity="0.8"/></g>',
    );
  });

  it('moves an outlined stroke on a primitive by a transform, not by position attributes', async () => {
    // A dashed inside stroke stays outlined, its dashes would shift on a
    // moved primitive. The outline is clipped to the fill like any other.
    const ring = shape('ELLIPSE', {
      relativeTransform: translate(40, 60),
      strokes: [solid(0, 0, 0)],
      strokeAlign: 'INSIDE',
      dashPattern: [2, 2],
      fillGeometry: [{ windingRule: 'NONZERO', data: 'M0 5A5 5 0 1 0 10 5A5 5 0 1 0 0 5Z' }],
      strokeGeometry: [
        { windingRule: 'EVENODD', data: 'M0 5A5 5 0 1 0 10 5A5 5 0 1 0 0 5ZM1 5A4 4 0 1 0 9 5A4 4 0 1 0 1 5Z' },
      ],
    });

    expect(await svg(container('FRAME', [ring]))).toBe(
      '<g clip-path="url(#clip0)" transform="translate(40 60)">' +
        '<path d="M0 5A5 5 0 1 0 10 5A5 5 0 1 0 0 5ZM1 5A4 4 0 1 0 9 5A4 4 0 1 0 1 5Z" fill="#000000" fill-rule="evenodd" clip-rule="evenodd"/>' +
        '</g>' +
        '<defs><clipPath id="clip0"><path d="M0 5A5 5 0 1 0 10 5A5 5 0 1 0 0 5Z"/></clipPath></defs>',
    );
  });

  it('outlines the children of a vector group mask and warns about an empty mask', async () => {
    const warnings: string[] = [];
    const inner = shape('RECTANGLE', { fills: [solid(1, 0, 0)] });
    const groupMask = container('GROUP', [inner], { isMask: true, maskType: 'VECTOR', name: 'group mask' });
    const above = shape('RECTANGLE', { fills: [solid(0, 0, 1)] });

    expect(await svg(container('FRAME', [groupMask, above]))).toBe(
      '<g mask="url(#mask0)"><rect width="10" height="10" fill="#0000ff"/></g>' +
        '<defs><mask id="mask0" style="mask-type:alpha"><rect width="10" height="10" fill="#ffffff"/></mask></defs>',
    );

    const emptyMask = shape('RECTANGLE', { isMask: true, maskType: 'ALPHA', name: 'empty' });

    expect(await svg(container('FRAME', [emptyMask, above]), { warn: (m) => warnings.push(m) })).toBe('');
    expect(warnings).toEqual(['The mask "empty" has no content, so the layers it masks were not exported.']);
  });

  it('writes the blend mode of a paint on its own element', async () => {
    const layered = shape('RECTANGLE', {
      fills: [solid(0, 0, 0), { ...solid(1, 1, 1), blendMode: 'SCREEN' }],
      strokes: [{ ...solid(1, 0, 0), blendMode: 'MULTIPLY' }],
      strokeWeight: 2,
    });

    expect(await svg(container('FRAME', [layered]))).toBe(
      '<rect width="10" height="10" fill="#000000"/>' +
        '<rect width="10" height="10" fill="#ffffff" style="mix-blend-mode:screen"/>' +
        '<rect width="10" height="10" fill="none" stroke="#ff0000" style="mix-blend-mode:multiply" stroke-width="2"/>',
    );
  });

  it('raises a line stroke above the layer and keeps its caps inside the width', async () => {
    const plain = shape('LINE', { height: 0, width: 10, strokes: [solid(0, 0, 0)], strokeWeight: 2 });
    const capped = shape('LINE', {
      height: 0,
      width: 10,
      strokes: [solid(0, 0, 0)],
      strokeWeight: 2,
      strokeCap: 'ROUND',
    });

    expect(await svg(container('FRAME', [plain]))).toBe(
      '<path d="M 0 -1 L 10 -1" fill="none" stroke="#000000" stroke-width="2"/>',
    );
    expect(await svg(container('FRAME', [capped]))).toBe(
      '<path d="M 1 -1 L 9 -1" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round"/>',
    );
  });

  it('writes a shape filter in layer coordinates and places the filtered group', async () => {
    const line = shape('LINE', {
      relativeTransform: translate(3, 4),
      height: 0,
      width: 10,
      strokes: [solid(0, 0, 0)],
      strokeWeight: 2,
      effects: [{ type: 'LAYER_BLUR', radius: 2, visible: true }],
    });
    const out = await svg(container('FRAME', [line]));

    expect(out).toContain('<g filter="url(#filter0)" transform="translate(3 4)">');
    expect(out).toContain(
      '<filter id="filter0" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" x="-4" y="-4" width="18" height="8">',
    );
  });

  it('places hook output, keeps its transform inside, and hands styles to the hook', async () => {
    const instance = shape('INSTANCE', { relativeTransform: translate(1, 2), opacity: 0.5, children: [] });
    const bound = shape('RECTANGLE', { fillStyleId: 'S:1', fills: [solid(0, 0, 0)] });
    const warnings: string[] = [];

    const result = await svg(container('FRAME', [instance, bound]), {
      warn: (m) => warnings.push(m),
      hooks: {
        resolveNode: (node) =>
          node.type === 'INSTANCE'
            ? [
                {
                  name: 'g',
                  type: 'element',
                  value: '',
                  attributes: { transform: 'scale(2 2)' },
                  children: [textNode('{{components.eyes}}')],
                },
              ]
            : undefined,
        resolveStyle: (_node, channel, styleId) =>
          styleId === 'S:1' ? [{ value: `{{colors.${channel}Group}}` }] : undefined,
        wrapNode: (node, elements) =>
          node.type === 'RECTANGLE'
            ? [{ name: 'g', type: 'element', value: '', attributes: { 'data-x': '1' }, children: elements }]
            : elements,
      },
    });

    expect(result).toBe(
      '<g transform="translate(1 2) scale(2 2)" opacity="0.5">{{components.eyes}}</g>' +
        '<g data-x="1"><rect width="10" height="10" fill="{{colors.fillGroup}}"/></g>',
    );
    expect(warnings).toEqual([]);
  });

  it('skips transparent layers by default and warns about unknown types', async () => {
    const warnings: string[] = [];
    const root = container('FRAME', [shape('RECTANGLE', { opacity: 0, fills: [solid(0, 0, 0)] }), shape('SLICE', {})]);

    expect(await svg(root, { warn: (m) => warnings.push(m) })).toBe('');
    expect(warnings).toEqual(['The layer "slice" (SLICE) has no SVG equivalent and was not exported.']);
  });
});
