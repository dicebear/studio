import { describe, expect, it, vi } from 'vitest';

import { decomposeOriginAnimations } from './decomposeOrigin';
import { DefinitionAnimation } from './types';

const SIZE = { width: 100, height: 100 };

describe('decomposeOriginAnimations', () => {
  it('passes blocks without an origin through untouched', () => {
    const block: DefinitionAnimation = {
      duration: 2,
      tracks: { translateX: { keyframes: [{ at: 0, value: 0 }, { at: 100, value: 10 }] } },
    };

    expect(decomposeOriginAnimations([block], SIZE, vi.fn())[0]).toBe(block);
  });

  it('drops a center origin without touching the tracks', () => {
    const block: DefinitionAnimation = {
      duration: 2,
      origin: { x: 50, y: 50 },
      tracks: { scaleY: { keyframes: [{ at: 0, value: 1 }, { at: 50, value: 0.5 }, { at: 100, value: 1 }] } },
    };

    const [result] = decomposeOriginAnimations([block], SIZE, vi.fn());

    expect(result.origin).toBeUndefined();
    expect(result.tracks).toEqual(block.tracks);
  });

  it('decomposes a scale-only origin exactly, sharing keyframes and easings', () => {
    const block: DefinitionAnimation = {
      name: 'squash',
      duration: 5.2,
      easing: 'easeOut',
      origin: { x: 50, y: 100 },
      tracks: {
        scaleY: {
          keyframes: [
            { at: 0, value: 1 },
            { at: 10, value: 0.9, easing: 'easeInOut' },
            { at: 20, value: 1 },
          ],
        },
      },
    };

    const [result] = decomposeOriginAnimations([block], SIZE, vi.fn());

    expect(result.origin).toBeUndefined();
    expect(result.name).toBe('squash');
    expect(result.tracks.scaleY).toEqual(block.tracks.scaleY);
    // vy = 50; comp = (1 - s) * 50 with the scale track's own timing.
    expect(result.tracks.translateY).toEqual({
      keyframes: [
        { at: 0, value: 0 },
        { at: 10, value: 5, easing: 'easeInOut' },
        { at: 20, value: 0 },
      ],
    });
    // origin.x is centered, so no horizontal compensation appears.
    expect(result.tracks.translateX).toBeUndefined();
  });

  it('sums the compensation into an existing translation track, exactly on aligned segments', () => {
    const block: DefinitionAnimation = {
      duration: 5.2,
      easing: 'easeOut',
      origin: { x: 50, y: 100 },
      tracks: {
        translateY: {
          keyframes: [
            { at: 0, value: 0 },
            { at: 20, value: 0 },
            { at: 30, value: -4, easing: 'linear' },
            { at: 40, value: 0 },
          ],
        },
        scaleY: {
          keyframes: [
            { at: 0, value: 1, easing: 'easeInOut' },
            { at: 10, value: 0.9 },
            { at: 20, value: 1 },
          ],
        },
      },
    };

    const [result] = decomposeOriginAnimations([block], SIZE, vi.fn());

    expect(result.tracks.translateY).toEqual({
      keyframes: [
        { at: 0, value: 0, easing: 'easeInOut' },
        { at: 10, value: 5 },
        { at: 20, value: 0 },
        { at: 30, value: -4, easing: 'linear' },
        { at: 40, value: 0 },
      ],
    });
  });

  it('samples a rotation around a shifted origin', () => {
    const warn = vi.fn();
    const block: DefinitionAnimation = {
      duration: 4,
      origin: { x: 100, y: 50 },
      tracks: {
        rotate: {
          keyframes: [
            { at: 0, value: 0 },
            { at: 100, value: 90 },
          ],
        },
      },
    };

    const [result] = decomposeOriginAnimations([block], SIZE, warn);

    expect(warn).toHaveBeenCalledOnce();
    expect(result.origin).toBeUndefined();
    expect(result.tracks.rotate).toEqual(block.tracks.rotate);

    // vx = 50: the pivot sits at the right edge. A clockwise quarter turn
    // moves the center to (compX, compY) = (50, -50).
    const compX = result.tracks.translateX!.keyframes;
    const compY = result.tracks.translateY!.keyframes;

    expect(compX[0]).toMatchObject({ at: 0, value: 0 });
    expect(compX[compX.length - 1]).toMatchObject({ at: 100, value: 50 });
    expect(compY[0]).toMatchObject({ at: 0, value: 0 });
    expect(compY[compY.length - 1]).toMatchObject({ at: 100, value: -50 });

    // The arc needs interior samples, and they follow v - R(θ)v.
    expect(compX.length).toBeGreaterThan(2);

    const mid = compX.find((keyframe) => keyframe.at === 50);

    expect(mid?.value).toBeCloseTo(50 - 50 * Math.cos(Math.PI / 4), 3);

    const midY = compY.find((keyframe) => keyframe.at === 50);

    expect(midY?.value).toBeCloseTo(-50 * Math.sin(Math.PI / 4), 3);
  });

  it('keeps aligned identically-eased segments exact when both sides move (the gaze hop)', () => {
    const at = [0, 58, 64, 73, 82, 90, 100];
    const keyframes = (values: number[]) => values.map((value, index) => ({ at: at[index], value }));
    const block: DefinitionAnimation = {
      name: 'hop',
      duration: 5.2,
      easing: 'easeOut',
      origin: { x: 50, y: 100 },
      tracks: {
        translateY: { keyframes: keyframes([0, 0, 0, -4, 0, 0, 0]) },
        scaleX: { keyframes: keyframes([1, 1, 1.06, 0.96, 1.05, 0.99, 1]) },
        scaleY: { keyframes: keyframes([1, 1, 0.94, 1.05, 0.95, 1.01, 1]) },
      },
    };

    const [result] = decomposeOriginAnimations([block], SIZE, vi.fn());

    // vy = 50: the jump and the squash compensation share every keyframe
    // time and the block easing, so the sum keeps the seven keyframes and
    // stays on the block default without sampled extras.
    expect(result.tracks.translateY).toEqual({
      keyframes: keyframes([0, 0, 3, -6.5, 2.5, -0.5, 0]),
    });
    // origin.x is centered: the scaleX wobble needs no compensation.
    expect(result.tracks.translateX).toBeUndefined();
    expect(result.tracks.scaleX).toEqual(block.tracks.scaleX);
    expect(result.tracks.scaleY).toEqual(block.tracks.scaleY);
  });

  it('keeps a linear sum linear without extra samples', () => {
    const block: DefinitionAnimation = {
      duration: 2,
      origin: { x: 50, y: 100 },
      tracks: {
        translateY: { keyframes: [{ at: 0, value: 0 }, { at: 100, value: 10 }] },
        scaleY: { keyframes: [{ at: 0, value: 1 }, { at: 50, value: 0.5 }, { at: 100, value: 1 }] },
      },
    };

    const [result] = decomposeOriginAnimations([block], SIZE, vi.fn());

    // vy = 50: comp peaks at 25 in the middle. Both sources are linear, so
    // the sum stays a three-point polyline.
    expect(result.tracks.translateY).toEqual({
      keyframes: [
        { at: 0, value: 0 },
        { at: 50, value: 30 },
        { at: 100, value: 10 },
      ],
    });
  });
});
