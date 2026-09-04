import { describe, expect, it } from 'vitest';
import { parse } from 'svgson';

import { convertSvgsonToDefinition } from './convertSvgsonToDefinition';

const convert = async (svg: string) => convertSvgsonToDefinition(await parse(`<svg>${svg}</svg>`)).children?.[0];

describe('convertSvgsonToDefinition', () => {
  it('folds the color of a wrapping group onto the reference', async () => {
    const element = await convert('<g color="url(#color-stoneMid)"><use href="#component-stone"/></g>');

    expect(element).toMatchObject({
      type: 'component',
      name: 'stone',
      attributes: { color: { type: 'color', name: 'stoneMid' } },
    });
  });

  it('folds a plain color value the same way, next to a transform', async () => {
    const element = await convert('<g color="#ffffff" transform="scale(2)"><use href="#component-shape"/></g>');

    expect(element).toMatchObject({
      type: 'component',
      name: 'shape',
      attributes: { color: '#ffffff', transform: 'scale(2)' },
    });
  });

  it('keeps the group when it carries anything else, and hands the color down', async () => {
    const element = await convert('<g color="#ffffff" mask="url(#m)"><use href="#component-shape"/></g>');

    expect(element?.name).toBe('g');
    expect(element?.attributes).toEqual({ mask: 'url(#m)' });
    expect(element?.children?.[0]).toMatchObject({
      type: 'component',
      name: 'shape',
      attributes: { color: '#ffffff' },
    });
  });

  it('folds the opacity of a wrapping group onto the reference', async () => {
    const element = await convert('<g opacity=".38"><use href="#component-shape"/></g>');

    expect(element).toMatchObject({ type: 'component', name: 'shape', attributes: { opacity: '.38' } });
  });

  it('multiplies the opacity of a wrapping group with the one of the reference', async () => {
    const element = await convert('<g opacity=".5"><use href="#component-shape" opacity=".3"/></g>');

    expect(element).toMatchObject({ type: 'component', name: 'shape', attributes: { opacity: '0.15' } });
  });

  it('leaves the reference its own color', async () => {
    const element = await convert('<g color="#ffffff"><use href="#component-shape" color="#000000"/></g>');

    expect(element).toMatchObject({ type: 'component', attributes: { color: '#000000' } });
  });
});
