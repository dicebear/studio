import { optimize } from 'svgo';
import { parse } from 'svgson';
import { describe, expect, it } from 'vitest';

import { convertSvgsonToDefinition } from '../utils/convertSvgsonToDefinition';

const pulse = [
  {
    // The user-selectable animation name must ride along untouched.
    name: 'pulse',
    duration: 3,
    tracks: {
      opacity: {
        keyframes: [
          { at: 0, value: 1 },
          { at: 50, value: 0.3 },
          { at: 100, value: 1 },
        ],
      },
    },
  },
];

const carrier = (key: number) => `${key}:${encodeURIComponent(JSON.stringify(pulse))}`;

describe('the data-dbanim carrier attribute', () => {
  it('decodes into the animations member and disappears', async () => {
    const svg = `<svg><rect width="4" height="4" data-dbanim="${carrier(0)}"/></svg>`;
    const definition = convertSvgsonToDefinition(await parse(svg));
    const [rect] = definition.children ?? [];

    expect(rect.animations).toEqual(pulse);
    expect(rect.attributes?.['data-dbanim']).toBeUndefined();
  });

  it('moves a wrapper animation onto the collapsed component reference', async () => {
    const svg =
      `<svg><g transform="matrix(1 0 0 1 10 20)" data-dbanim="${carrier(0)}">` +
      `<use href="#component-orb"/></g></svg>`;
    const definition = convertSvgsonToDefinition(await parse(svg));
    const [component] = definition.children ?? [];

    expect(component.type).toBe('component');
    expect(component.name).toBe('orb');
    expect(component.animations).toEqual(pulse);
    expect(component.attributes?.transform).toBe('matrix(1 0 0 1 10 20)');
  });

  it('keeps the wrapper when both it and the reference carry animations', async () => {
    const svg =
      `<svg><g data-dbanim="${carrier(0)}">` +
      `<g transform="translate(1 2)"><use href="#component-orb" data-dbanim="${carrier(1)}"/></g></g></svg>`;
    const definition = convertSvgsonToDefinition(await parse(svg));
    const [outer] = definition.children ?? [];

    // The inner transform-only group still collapses onto the reference, so
    // the reference carries its own animations. The outer wrapper keeps its
    // separate timeline as a real group.
    expect(outer.name).toBe('g');
    expect(outer.animations).toEqual(pulse);
    expect(outer.children?.[0].type).toBe('component');
    expect(outer.children?.[0].animations).toEqual(pulse);
  });

  it('survives the export svgo pass, and keeps identically animated siblings apart', () => {
    // The exact plugin list from createTemplateString.
    const result = optimize(
      `<svg><g><path d="M0 0h4v4H0z" data-dbanim="${carrier(0)}"/>` +
        `<path d="M0 0h4v4H0z" data-dbanim="${carrier(1)}"/></g></svg>`,
      {
        multipass: true,
        plugins: [
          'cleanupIds',
          { name: 'prefixIds', params: { prefix: 'test', delim: '-' } },
          'removeUselessDefs',
          'removeUnknownsAndDefaults',
          'removeUselessStrokeAndFill',
          'collapseGroups',
          { name: 'convertPathData', params: { floatPrecision: 3 } },
          { name: 'convertTransform', params: { floatPrecision: 3 } },
          'mergePaths',
        ],
      },
    ).data;

    expect(result.match(/data-dbanim/g)).toHaveLength(2);
  });
});
