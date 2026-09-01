import { describe, expect, it } from 'vitest';

import { definitionAnimationsToTracks, tracksToDefinitionAnimation, isConstantTrack } from './keyframes';
import { DefinitionAnimation } from './types';

const collect = () => {
  const warnings: string[] = [];

  return { warnings, warn: (message: string) => warnings.push(message) };
};

describe('definitionAnimationsToTracks', () => {
  it('places keyframes in seconds and shifts easing onto the arrival', () => {
    const { warnings, warn } = collect();
    const { tracks, endTime } = definitionAnimationsToTracks(
      [
        {
          duration: 2,
          easing: 'easeOut',
          tracks: {
            translateX: {
              keyframes: [
                { at: 0, value: 0, easing: 'hold' },
                { at: 50, value: 12 },
                { at: 100, value: 0 },
              ],
            },
          },
        },
      ],
      warn,
    );

    expect(endTime).toBe(2);
    expect(warnings).toHaveLength(0);

    const keyframes = tracks.TRANSLATION_X?.keyframes ?? [];

    expect(keyframes.map((keyframe) => keyframe.timelinePosition)).toEqual([0, 1, 2]);
    // The first keyframe has no incoming segment. The second arrives through
    // the first keyframe's departure easing, the third through the block
    // default.
    expect(keyframes[0].easing).toBeUndefined();
    expect(keyframes[1].easing).toEqual({ type: 'HOLD' });
    expect(keyframes[2].easing).toEqual({ type: 'EASE_OUT' });
  });

  it('negates rotation values for Figma', () => {
    const { warn } = collect();
    const { tracks } = definitionAnimationsToTracks(
      [
        {
          duration: 1,
          tracks: {
            rotate: {
              keyframes: [
                { at: 0, value: 0 },
                { at: 100, value: 0 },
              ],
            },
          },
        },
      ],
      warn,
    );

    expect(tracks.ROTATION).toBeDefined();

    const { tracks: turned } = definitionAnimationsToTracks(
      [
        {
          duration: 1,
          tracks: {
            rotate: {
              keyframes: [
                { at: 0, value: 90 },
                { at: 100, value: 90 },
              ],
            },
          },
        },
      ],
      warn,
    );

    expect(turned.ROTATION?.keyframes[0].value).toEqual({ type: 'FLOAT', value: -90 });
  });

  it('clamps negative delays with a warning', () => {
    const { warnings, warn } = collect();
    const { tracks } = definitionAnimationsToTracks(
      [
        {
          duration: 2,
          delay: -1,
          tracks: {
            opacity: {
              keyframes: [
                { at: 0, value: 1 },
                { at: 100, value: 1 },
              ],
            },
          },
        },
      ],
      warn,
    );

    expect(tracks.OPACITY?.keyframes[0].timelinePosition).toBe(0);
    expect(warnings.some((message) => message.includes('Negative'))).toBe(true);
  });

  it('repeats loop-continuous shorter blocks up to the master cycle', () => {
    const { warn } = collect();
    const { tracks, endTime } = definitionAnimationsToTracks(
      [
        {
          duration: 4,
          tracks: {
            translateY: {
              keyframes: [
                { at: 0, value: 0 },
                { at: 100, value: 0 },
              ],
            },
          },
        },
        {
          duration: 2,
          tracks: {
            opacity: {
              keyframes: [
                { at: 0, value: 1 },
                { at: 50, value: 0.5 },
                { at: 100, value: 1 },
              ],
            },
          },
        },
      ],
      warn,
    );

    expect(endTime).toBe(4);

    const opacity = tracks.OPACITY?.keyframes ?? [];

    // Two cycles, with the duplicate boundary keyframe collapsed.
    expect(opacity.map((keyframe) => keyframe.timelinePosition)).toEqual([0, 1, 2, 3, 4]);
  });

  it('plays discontinuous tracks once with a warning', () => {
    const { warnings, warn } = collect();
    const { tracks } = definitionAnimationsToTracks(
      [
        {
          duration: 4,
          tracks: {
            translateY: {
              keyframes: [
                { at: 0, value: 0 },
                { at: 100, value: 0 },
              ],
            },
          },
        },
        {
          duration: 2,
          tracks: {
            rotate: {
              keyframes: [
                { at: 0, value: 0 },
                { at: 100, value: 360 },
              ],
            },
          },
        },
      ],
      warn,
    );

    expect(tracks.ROTATION?.keyframes.map((keyframe) => keyframe.timelinePosition)).toEqual([0, 2]);
    expect(warnings.some((message) => message.includes('play once and hold'))).toBe(true);
  });
});

describe('tracksToDefinitionAnimation', () => {
  it('drops the LINEAR easing Figma attaches to every keyframe', () => {
    const { warnings, warn } = collect();
    const animation = tracksToDefinitionAnimation(
      {
        ROTATION: {
          keyframes: [
            { timelinePosition: 0, value: { type: 'FLOAT', value: 0 } },
            { timelinePosition: 1, value: { type: 'FLOAT', value: Math.PI }, easing: { type: 'LINEAR' } },
            { timelinePosition: 2, value: { type: 'FLOAT', value: 0 }, easing: { type: 'EASE_IN' } },
          ],
        },
      },
      0,
      warn,
    );

    expect(warnings).toHaveLength(0);
    expect(animation?.tracks.rotate?.keyframes.map((k) => k.easing)).toEqual([undefined, 'easeIn', undefined]);
  });

  it('converts tracks back with percent positions and departure easings', () => {
    const { warnings, warn } = collect();
    const animation = tracksToDefinitionAnimation(
      {
        TRANSLATION_X: {
          keyframes: [
            { timelinePosition: 0, value: { type: 'FLOAT', value: 0 } },
            { timelinePosition: 1, value: { type: 'FLOAT', value: 12 }, easing: { type: 'HOLD' } },
            { timelinePosition: 2, value: { type: 'FLOAT', value: 0 }, easing: { type: 'EASE_OUT' } },
          ],
        },
      },
      0,
      warn,
    );

    expect(warnings).toHaveLength(0);
    expect(animation).toEqual({
      duration: 2,
      tracks: {
        translateX: {
          keyframes: [
            { at: 0, value: 0, easing: 'hold' },
            { at: 50, value: 12, easing: 'easeOut' },
            { at: 100, value: 0 },
          ],
        },
      },
    });
  });

  it('is a fixpoint for representable animations', () => {
    const { warn } = collect();
    const source: DefinitionAnimation = {
      duration: 2,
      easing: 'linear',
      tracks: {
        translateX: {
          keyframes: [
            { at: 0, value: 0 },
            { at: 50, value: 12, easing: 'easeIn' },
            { at: 100, value: 0 },
          ],
        },
        opacity: {
          keyframes: [
            { at: 0, value: 1 },
            { at: 25, value: 0.4 },
            { at: 100, value: 1 },
          ],
        },
      },
    };

    const { tracks } = definitionAnimationsToTracks([source], warn);
    const roundTripped = tracksToDefinitionAnimation(tracks as never, 0, warn);
    const { tracks: secondPass } = definitionAnimationsToTracks([roundTripped!], warn);
    const secondRoundTrip = tracksToDefinitionAnimation(secondPass as never, 0, warn);

    // The first round trip normalizes (explicit linear easings, unified
    // duration). From then on the conversion must be stable.
    expect(secondRoundTrip).toEqual(roundTripped);
  });

  it('materializes the leading hold of a delayed track', () => {
    const { warn } = collect();
    const animation = tracksToDefinitionAnimation(
      {
        OPACITY: {
          keyframes: [
            { timelinePosition: 1, value: { type: 'FLOAT', value: 1 } },
            { timelinePosition: 2, value: { type: 'FLOAT', value: 0.5 }, easing: { type: 'LINEAR' } },
          ],
        },
      },
      0,
      warn,
    );

    expect(animation?.tracks.opacity?.keyframes[0]).toEqual({ at: 0, value: 1 });
  });

  it('splits vector tracks into their scalar model tracks', () => {
    const { warn } = collect();
    const animation = tracksToDefinitionAnimation(
      {
        TRANSLATION_XY: {
          keyframes: [
            { timelinePosition: 0, value: { type: 'VECTOR', value: { x: 0, y: 0 } } },
            { timelinePosition: 1, value: { type: 'VECTOR', value: { x: 10, y: -4 } }, easing: { type: 'LINEAR' } },
          ],
        },
      },
      0,
      warn,
    );

    expect(animation?.tracks.translateX?.keyframes.map((keyframe) => keyframe.value)).toEqual([0, 10]);
    expect(animation?.tracks.translateY?.keyframes.map((keyframe) => keyframe.value)).toEqual([0, -4]);
  });

  it('drops constant single-keyframe tracks and unknown fields with warnings', () => {
    const { warnings, warn } = collect();
    const animation = tracksToDefinitionAnimation(
      {
        OPACITY: { keyframes: [{ timelinePosition: 1, value: { type: 'FLOAT', value: 0.5 } }] },
        PATH_TRIM_START: {
          keyframes: [
            { timelinePosition: 0, value: { type: 'FLOAT', value: 0 } },
            { timelinePosition: 1, value: { type: 'FLOAT', value: 1 } },
          ],
        },
      },
      0,
      warn,
    );

    expect(animation).toBeNull();
    expect(warnings).toHaveLength(2);
  });
});

describe('isConstantTrack', () => {
  const float = (value: number, timelinePosition = 0) => ({
    timelinePosition,
    value: { type: 'FLOAT' as const, value },
  });

  it('detects the span track the import writes', () => {
    expect(isConstantTrack([float(52, 0), float(52, 100)])).toBe(true);
  });

  it('keeps real motion', () => {
    expect(isConstantTrack([float(0, 0), float(12, 100)])).toBe(false);
  });

  it('compares vector values per axis', () => {
    const vec = (x: number, y: number, t = 0) => ({
      timelinePosition: t,
      value: { type: 'VECTOR' as const, value: { x, y } },
    });

    expect(isConstantTrack([vec(1, 2), vec(1, 2, 100)])).toBe(true);
    expect(isConstantTrack([vec(1, 2), vec(1, 3, 100)])).toBe(false);
  });

  it('treats mixed value types as motion', () => {
    expect(
      isConstantTrack([float(1), { timelinePosition: 100, value: { type: 'VECTOR' as const, value: { x: 1, y: 1 } } }]),
    ).toBe(false);
  });
});
