import { describe, expect, it } from 'vitest';
import { stringify } from 'svgson';

import { serializeTree } from '../figma-svg/serialize';
import { createDicebearHooks } from './hooks';

const MIXED = Symbol('mixed');

const IDENTITY = [
  [1, 0, 0],
  [0, 1, 0],
] as const;

/** A layer with the properties the serializer reads. */
function layer(type: string, props: Record<string, unknown>) {
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

/** A local component on a page, the kind an instance may reference. */
function component(name: string) {
  const child = layer('RECTANGLE', { fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] });

  return {
    ...layer('COMPONENT', { name, children: [child] }),
    id: name,
    parent: { type: 'PAGE' },
    remote: false,
    findAll: () => [child],
  } as unknown as ComponentNode;
}

function instanceOf(main: ComponentNode, props: Record<string, unknown> = {}) {
  return layer('INSTANCE', {
    name: main.name,
    children: [],
    getMainComponentAsync: async () => main,
    ...props,
  });
}

async function svg(children: SceneNode[]): Promise<string> {
  const root = layer('FRAME', { children, fillGeometry: [], clipsContent: false }) as SceneNode & ChildrenMixin;
  const hooks = createDicebearHooks({ aliasesEnabled: true, animationsEnabled: false, styles: async () => null });
  const tree = await serializeTree(root, { host: { mixed: MIXED }, hooks, clipFrames: false });

  return stringify(tree).replace(/^<svg[^>]*>|<\/svg>$/g, '');
}

describe('createDicebearHooks', () => {
  it('writes an instance as its component placeholder', async () => {
    const mouth = component('mouth/variant01');

    expect(await svg([instanceOf(mouth)])).toBe('<g>{{components.mouth}}</g>');
  });

  it('keeps the placeholder of an instance that masks its siblings', async () => {
    const mouth = component('mouth/variant01');
    const above = layer('RECTANGLE', { fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }] });

    expect(await svg([instanceOf(mouth, { isMask: true }), above])).toBe(
      '<g mask="url(#mask0)"><rect width="10" height="10" fill="#ff0000"/></g>' +
        '<defs><mask id="mask0" style="mask-type:alpha"><g>{{components.mouth}}</g></mask></defs>',
    );
  });
});
