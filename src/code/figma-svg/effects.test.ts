import { describe, expect, it } from 'vitest';

import { effectsToFilter } from './effects';

describe('effectsToFilter', () => {
  it('returns null without exportable effects', () => {
    const warnings: string[] = [];

    expect(
      effectsToFilter(
        [{ type: 'BACKGROUND_BLUR', radius: 4, visible: true }],
        { x: 0, y: 0, width: 10, height: 10 },
        'f',
        (m) => warnings.push(m),
      ),
    ).toBeNull();
    expect(warnings).toHaveLength(1);
  });

  it('turns a layer blur into a gaussian blur with a grown region', () => {
    const filter = effectsToFilter(
      [{ type: 'LAYER_BLUR', radius: 8, visible: true }],
      { x: 0, y: 0, width: 100, height: 50 },
      'f',
      () => {},
    )!;
    const blur = filter.children.find((child) => child.name === 'feGaussianBlur')!;

    expect(blur.attributes.stdDeviation).toBe('4');
    expect(filter.attributes).toMatchObject({
      id: 'f',
      filterUnits: 'userSpaceOnUse',
      x: '-12',
      y: '-12',
      width: '124',
      height: '74',
    });
  });

  it('writes the region in layer coordinates, grown by the reach, with a floor for a line', () => {
    const filter = effectsToFilter(
      [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 1 },
          offset: { x: 4, y: 0 },
          radius: 0,
          visible: true,
        },
      ],
      { x: -3, y: -3, width: 106, height: 6 },
      'f',
      () => {},
    )!;

    expect(filter.attributes).toMatchObject({
      filterUnits: 'userSpaceOnUse',
      x: '-7',
      y: '-3',
      width: '114',
      height: '6',
    });

    const bare = effectsToFilter(
      [{ type: 'LAYER_BLUR', radius: 0, visible: true }],
      { x: 0, y: 0, width: 100, height: 0 },
      'f',
      () => {},
    )!;

    expect(bare.attributes.height).toBe('1');
  });

  it('chains a drop shadow below the graphic', () => {
    const filter = effectsToFilter(
      [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          offset: { x: 0, y: 4 },
          radius: 4,
          visible: true,
        },
      ],
      { x: 0, y: 0, width: 100, height: 100 },
      'f',
      () => {},
    )!;
    const names = filter.children.map((child) => child.name);

    expect(names).toEqual([
      'feFlood',
      'feColorMatrix',
      'feOffset',
      'feGaussianBlur',
      'feComposite',
      'feColorMatrix',
      'feBlend',
      'feBlend',
    ]);
    expect(filter.children[filter.children.length - 1].attributes.in).toBe('SourceGraphic');
  });

  it('cuts an inner shadow against the layer and flips the spread', () => {
    const filter = effectsToFilter(
      [
        {
          type: 'INNER_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.5 },
          offset: { x: 2, y: 0 },
          radius: 6,
          spread: 3,
          visible: true,
        },
      ],
      { x: 0, y: 0, width: 100, height: 100 },
      'f',
      () => {},
    )!;
    const names = filter.children.map((child) => child.name);
    const morphology = filter.children.find((child) => child.name === 'feMorphology')!;
    const composite = filter.children.find((child) => child.name === 'feComposite')!;

    expect(names).toEqual([
      'feFlood',
      'feBlend',
      'feColorMatrix',
      'feMorphology',
      'feOffset',
      'feGaussianBlur',
      'feComposite',
      'feColorMatrix',
      'feBlend',
    ]);
    // A positive spread contracts an inner shadow and expands a drop shadow.
    expect(morphology.attributes.operator).toBe('erode');
    expect(composite.attributes).toMatchObject({ operator: 'arithmetic', k2: '-1', k3: '1' });
    // An inner shadow stays within the layer, so the region does not grow.
    expect(filter.attributes).toMatchObject({ x: '0', y: '0', width: '100', height: '100' });
  });
});
