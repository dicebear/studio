import { describe, expect, it } from 'vitest';

import { DefinitionElement, DefinitionFile } from '../types';
import { definitionPrecision } from './definitionPrecision';

const file = (elements: DefinitionElement[], rest: Partial<DefinitionFile> = {}): DefinitionFile => ({
  canvas: { width: 100, height: 100, elements },
  ...rest,
});

const path = (d: string, attributes: Record<string, string> = {}): DefinitionElement => ({
  type: 'element',
  name: 'path',
  attributes: { d, ...attributes },
});

describe('definitionPrecision', () => {
  it('counts the decimals of the element attributes', () => {
    expect(definitionPrecision(file([path('M0 0h10v10H0z')]))).toBe(0);
    expect(definitionPrecision(file([path('M0 0h10.5v10H0z')]))).toBe(1);
    expect(definitionPrecision(file([path('M0 0h10.5v10H0z'), path('M1.25 0h1v1H1.25z')]))).toBe(2);
  });

  it('looks into components and nested children', () => {
    expect(definitionPrecision(file([{ type: 'element', name: 'g', children: [path('M0 0h1.234v1H0z')] }]))).toBe(3);

    expect(
      definitionPrecision(
        file([], {
          components: {
            eyes: {
              width: 20,
              height: 12.5,
              variants: { open: { elements: [path('M0 0h1v1H0z')] } },
            },
            // An alias has no geometry of its own.
            look: { extends: 'eyes' },
          },
        }),
      ),
    ).toBe(1);
  });

  it('ignores an opacity that the export writes with two decimals anyway', () => {
    expect(definitionPrecision(file([path('M0 0h1v1H0z', { opacity: '.15' })]))).toBe(0);
    // Beyond those two it has to raise the setting like any other number.
    expect(definitionPrecision(file([path('M0 0h1v1H0z', { opacity: '.125' })]))).toBe(3);
  });

  it('counts what a transform moves, not what it scales', () => {
    // svgo rounds the factors with its own transformPrecision.
    expect(definitionPrecision(file([path('M0 0h1v1H0z', { transform: 'scale(.71048)' })]))).toBe(0);
    expect(definitionPrecision(file([path('M0 0h1v1H0z', { transform: 'translate(9 2.75)' })]))).toBe(2);
    expect(definitionPrecision(file([path('M0 0h1v1H0z', { transform: 'matrix(.85682 0 0 .85439 52 75.4)' })]))).toBe(
      1,
    );
  });

  it('leaves color and variable references alone', () => {
    expect(
      definitionPrecision(
        file([
          {
            type: 'element',
            name: 'path',
            attributes: { d: 'M0 0h1v1H0z', fill: { type: 'color', name: 'skin' } },
          },
        ]),
      ),
    ).toBe(0);
  });
});
