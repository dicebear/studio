import { describe, expect, it } from 'vitest';
import { optimize } from 'svgo';

import { cleanupNumericValues } from './cleanupNumericValues';
import { convertPathToShape } from './convertPathToShape';
import { normalizeArcFlags } from './normalizeArcFlags';

/** The exact plugin list from createTemplateString, on a single path. */
const run = (d: string, precision = 3) =>
  optimize(`<svg><path d="${d}" fill="red"/></svg>`, {
    multipass: true,
    plugins: [
      'cleanupIds',
      { name: 'prefixIds', params: { prefix: 'test', delim: '-' } },
      'removeUselessDefs',
      'removeUnknownsAndDefaults',
      'removeUselessStrokeAndFill',
      'collapseGroups',
      { name: 'convertPathData', params: { floatPrecision: precision } },
      convertPathToShape({ floatPrecision: precision }),
      normalizeArcFlags(),
      { name: 'convertTransform', params: { floatPrecision: precision } },
      cleanupNumericValues({ floatPrecision: precision }),
      'mergePaths',
    ],
  }).data.replace(/<\/?svg>/g, '');

describe('convertPathToShape', () => {
  it('rebuilds a circle Figma exported as arcs', () => {
    // The same circle in the three spellings three consecutive round-trips
    // produced for it.
    expect(run('M10 20a7 7 0 1 0 0-14 7 7 0 0 0 0 14')).toBe('<circle cx="10" cy="13" r="7" fill="red"/>');
    expect(run('M10 20a7.001 7.001 0 0 0 4.95-11.95A7 7 0 1 0 10 20')).toBe(
      '<circle cx="10" cy="13" r="7" fill="red"/>',
    );
    expect(run('M10 20A7 7 0 1 0 8.635 6.135 7 7 0 0 0 10 20')).toBe('<circle cx="10" cy="13" r="7" fill="red"/>');
  });

  it('rebuilds a circle and an ellipse Figma exported as curves', () => {
    expect(run('M50 92c19.882 0 36-16.118 36-36S69.882 20 50 20 14 36.118 14 56s16.118 36 36 36')).toBe(
      '<circle cx="50" cy="56" r="36" fill="red"/>',
    );
    expect(run('M50 122c29.823 0 54-14.327 54-32S79.823 58 50 58-4 72.327-4 90s24.177 32 54 32')).toBe(
      '<ellipse cx="50" cy="90" rx="54" ry="32" fill="red"/>',
    );
  });

  it('pins the meaningless flag of a half circle', () => {
    // Both flags draw the same half circle, so the export stops flipping it.
    expect(run('M20 1H8a6 6 0 1 0 0 12h12a6 6 0 0 0 0-12')).toBe(
      '<path d="M20 1H8a6 6 0 0 0 0 12h12a6 6 0 0 0 0-12" fill="red"/>',
    );
    // A chord just short of the diameter picks a different center, so that
    // flag carries meaning and stays.
    expect(run('M8 1a6 6 0 1 0 0 11.998')).toContain('0 1 0 0 11.998');
  });

  it('leaves everything that is not a closed ellipse alone', () => {
    for (const d of [
      // Two arcs running against each other, which draws a lens.
      'M0 0a5 5 0 0 0 10 0 5 5 0 0 1-10 0',
      // A half circle that is one part of a larger outline.
      'M19 109.5v-48a34 34 0 1 1 68 0v48z',
      // Radii that disagree by more than a rounding rest.
      'M10 20a7 7 0 1 0 0-14 7.4 7.4 0 0 0 0 14',
      // Handles too short for a circle: a rounded blob has to stay one.
      'M50 10c22 0 40 18 40 40s-18 40-40 40-40-18-40-40 18-40 40-40z',
      // Rectangles keep their straight edges through Figma, so they are not
      // rebuilt either, rounded corners or not.
      'M16.5 6h-5A1.5 1.5 0 0 0 10 7.5V11a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 18 11V7.5A1.5 1.5 0 0 0 16.5 6',
      'M2 0h1v1H2z',
    ]) {
      expect(run(d)).toMatch(/^<path /);
    }
  });
});
