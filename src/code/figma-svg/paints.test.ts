import { describe, expect, it } from 'vitest';

import { resolvePaint } from './paints';

const nextId = (kind: string) => `paint0_${kind}`;

describe('resolvePaint', () => {
  it('writes a solid paint with its alpha', () => {
    const warn = () => {};

    expect(
      resolvePaint({ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }, { width: 10, height: 10 }, nextId, warn),
    ).toEqual({ value: '#ff0000', opacity: undefined });
    expect(
      resolvePaint(
        { type: 'SOLID', color: { r: 0, g: 0, b: 1 }, opacity: 0.5 },
        { width: 10, height: 10 },
        nextId,
        warn,
      ),
    ).toEqual({ value: '#0000ff', opacity: 0.5 });
    expect(
      resolvePaint(
        { type: 'SOLID', color: { r: 0, g: 0, b: 1 }, visible: false },
        { width: 10, height: 10 },
        nextId,
        warn,
      ),
    ).toBeNull();
  });

  it('maps a default linear gradient across the shape', () => {
    // Figma's default: top to bottom, which is the unit square rotated by a
    // quarter turn into gradient space.
    const paint = {
      type: 'GRADIENT_LINEAR' as const,
      gradientTransform: [
        [0, 1, 0],
        [-1, 0, 1],
      ] as const,
      gradientStops: [
        { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
        { position: 1, color: { r: 1, g: 1, b: 1, a: 0.5 } },
      ],
    };
    const resolved = resolvePaint(paint, { width: 100, height: 50 }, nextId, () => {})!;

    expect(resolved.value).toBe('url(#paint0_linear)');
    expect(resolved.def!.attributes).toEqual({
      id: 'paint0_linear',
      x1: '50',
      y1: '0',
      x2: '50',
      y2: '50',
      gradientUnits: 'userSpaceOnUse',
    });
    expect(resolved.def!.children.map((stop) => stop.attributes)).toEqual([
      { offset: '0', 'stop-color': '#000000' },
      { offset: '1', 'stop-color': '#ffffff', 'stop-opacity': '0.5' },
    ]);
  });

  it('maps a radial gradient onto the unit circle', () => {
    const paint = {
      type: 'GRADIENT_RADIAL' as const,
      gradientTransform: [
        [1, 0, 0],
        [0, 1, 0],
      ] as const,
      gradientStops: [{ position: 0, color: { r: 1, g: 1, b: 1, a: 1 } }],
      opacity: 0.5,
    };
    const resolved = resolvePaint(paint, { width: 100, height: 50 }, nextId, () => {})!;

    expect(resolved.def!.name).toBe('radialGradient');
    expect(resolved.def!.attributes.gradientTransform).toBe('matrix(50 0 0 25 50 25)');
    expect(resolved.def!.children[0].attributes['stop-opacity']).toBe('0.5');
  });

  it('falls back to the first stop for angular gradients', () => {
    const warnings: string[] = [];
    const resolved = resolvePaint(
      {
        type: 'GRADIENT_ANGULAR',
        gradientTransform: [
          [1, 0, 0],
          [0, 1, 0],
        ],
        gradientStops: [{ position: 0, color: { r: 0, g: 1, b: 0, a: 1 } }],
      },
      { width: 10, height: 10 },
      nextId,
      (m) => warnings.push(m),
    );

    expect(resolved).toEqual({ value: '#00ff00', opacity: undefined });
    expect(warnings).toHaveLength(1);
  });
});
