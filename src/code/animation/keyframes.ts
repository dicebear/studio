import { roundTo } from '../utils/roundTo';
import { definitionEasingToFigma, figmaEasingToDefinition } from './easing';
import {
  DefinitionAnimation,
  DefinitionAnimationKeyframe,
  DefinitionAnimationTrack,
  DefinitionAnimationTrackName,
  FigmaEasing,
  FigmaKeyframe,
  FigmaTrackField,
  FigmaTracks,
} from './types';

/** Timeline positions closer than this count as the same moment. */
const EPSILON = 0.0005;

const FIELD_BY_TRACK: Record<DefinitionAnimationTrackName, FigmaTrackField> = {
  translateX: 'TRANSLATION_X',
  translateY: 'TRANSLATION_Y',
  rotate: 'ROTATION',
  scaleX: 'SCALE_X',
  scaleY: 'SCALE_Y',
  opacity: 'OPACITY',
};

const TRACK_BY_FIELD: Record<FigmaTrackField, DefinitionAnimationTrackName> = {
  TRANSLATION_X: 'translateX',
  TRANSLATION_Y: 'translateY',
  ROTATION: 'rotate',
  SCALE_X: 'scaleX',
  SCALE_Y: 'scaleY',
  OPACITY: 'opacity',
};

/**
 * The definition stores a rotation as CSS sees it (positive turns clockwise),
 * Figma's ROTATION field turns counter-clockwise for positive values.
 */
function toFigmaValue(track: DefinitionAnimationTrackName, value: number): number {
  return track === 'rotate' ? -value : value;
}

function toDefinitionValue(track: DefinitionAnimationTrackName, value: number): number {
  return track === 'rotate' ? -value : value;
}

export type ConvertedTracks = {
  tracks: FigmaTracks;
  /** The end of the longest converted track in seconds. */
  endTime: number;
};

/**
 * Converts a definition element's animation blocks to Figma manual keyframe
 * tracks.
 *
 * One Figma timeline pass represents one master cycle: `T`, the longest
 * block's `delay + duration`. Blocks whose first and last keyframe values
 * match (loop-continuous, the common case) are repeated in whole cycles up to
 * `T`; a block that ends away from its start cannot repeat on a finite
 * timeline without a jump, so it plays once and holds. Everything lossy warns.
 *
 * The definition attaches a keyframe's easing to the departure (CSS
 * convention), Figma to the arrival — the conversion shifts by one keyframe.
 */
export function definitionAnimationsToTracks(
  animations: DefinitionAnimation[],
  warn: (message: string) => void,
): ConvertedTracks {
  const tracks: FigmaTracks = {};

  // The master cycle length. Negative delays shift the phase in CSS but have
  // no Figma counterpart; they are clamped when the keyframes are placed, so
  // the cycle length ignores them as well.
  let masterCycle = 0;

  for (const animation of animations) {
    masterCycle = Math.max(masterCycle, Math.max(animation.delay ?? 0, 0) + animation.duration);
  }

  let endTime = 0;

  for (const animation of animations) {
    let delay = animation.delay ?? 0;

    if (delay < 0) {
      warn('Negative animation delays cannot be represented on the Figma timeline and were clamped to 0.');
      delay = 0;
    }

    if (delay > 0) {
      warn(
        'Animation delays become a leading hold on the Figma timeline; when the preview loops, the hold repeats with it.',
      );
    }

    if ((animation.direction ?? 'normal') !== 'normal') {
      warn('Animation directions other than "normal" cannot be represented on the Figma timeline and were ignored.');
    }

    if (animation.iterations !== undefined && animation.iterations !== 'infinite') {
      warn('Finite iteration counts cannot be represented on the Figma timeline; the animation loops with the preview.');
    }

    const defaultEasing = animation.easing ?? 'linear';

    for (const [trackName, track] of Object.entries(animation.tracks) as [
      DefinitionAnimationTrackName,
      DefinitionAnimationTrack,
    ][]) {
      const keyframes = track.keyframes;

      if (keyframes.length === 0) {
        continue;
      }

      const first = keyframes[0];
      const last = keyframes[keyframes.length - 1];
      const loopContinuous = first.value === last.value;
      const cycleEnd = delay + animation.duration;
      let repetitions = 1;

      if (loopContinuous && animation.duration > 0) {
        repetitions = Math.max(1, Math.floor((masterCycle - delay + EPSILON) / animation.duration));
      } else if (cycleEnd < masterCycle - EPSILON) {
        warn(
          'Animation tracks that end away from their starting value cannot repeat on the Figma timeline; they play once and hold.',
        );
      }

      if (repetitions > 1 && repetitions * animation.duration + delay < masterCycle - EPSILON) {
        warn(
          'Animation tracks with mixed durations hold their final value until the end of the Figma timeline pass.',
        );
      }

      const figmaKeyframes: FigmaKeyframe[] = [];

      for (let repetition = 0; repetition < repetitions; repetition++) {
        const offset = delay + repetition * animation.duration;

        for (let i = 0; i < keyframes.length; i++) {
          const keyframe = keyframes[i];
          const timelinePosition = roundTo(offset + (keyframe.at / 100) * animation.duration, 4);
          const previous = figmaKeyframes[figmaKeyframes.length - 1];

          // At a repetition boundary an explicit 100% keyframe and the next
          // cycle's 0% keyframe land on the same moment with the same value;
          // one of them is enough.
          if (previous && Math.abs(previous.timelinePosition - timelinePosition) < EPSILON) {
            continue;
          }

          const figmaKeyframe: FigmaKeyframe = {
            timelinePosition,
            value: { type: 'FLOAT', value: toFigmaValue(trackName, keyframe.value) },
          };

          // The arrival easing is the departure easing of the preceding
          // definition keyframe; the first keyframe of the timeline has no
          // incoming segment.
          if (figmaKeyframes.length > 0) {
            const departure = i === 0 ? keyframes[keyframes.length - 1] : keyframes[i - 1];

            figmaKeyframe.easing = definitionEasingToFigma(departure.easing ?? defaultEasing);
          }

          figmaKeyframes.push(figmaKeyframe);
        }
      }

      const lastKeyframe = figmaKeyframes[figmaKeyframes.length - 1];

      endTime = Math.max(endTime, lastKeyframe.timelinePosition);

      const field = FIELD_BY_TRACK[trackName];

      if (tracks[field]) {
        warn(`Two animation blocks animate "${trackName}" on the same element; only the first one was imported.`);

        continue;
      }

      tracks[field] = { keyframes: figmaKeyframes };
    }
  }

  return { tracks, endTime };
}

type RawFigmaTrack = {
  keyframes: FigmaKeyframe[];
};

/**
 * Converts the manual keyframe tracks read from one Figma node back into a
 * definition animation block.
 *
 * All tracks of a node share one block whose duration covers the longest
 * track (or the timeline, whichever is longer). Leading holds become an
 * explicit copy of the first keyframe at 0%. Vector tracks split into their
 * two scalar model tracks. Constant single-keyframe tracks carry no motion
 * and are dropped with a warning.
 */
export function tracksToDefinitionAnimation(
  rawTracks: Record<string, RawFigmaTrack>,
  timelineDuration: number,
  warn: (message: string) => void,
): DefinitionAnimation | null {
  let duration = timelineDuration;

  for (const raw of Object.values(rawTracks)) {
    for (const keyframe of raw.keyframes) {
      duration = Math.max(duration, keyframe.timelinePosition);
    }
  }

  if (duration <= 0) {
    return null;
  }

  const tracks: DefinitionAnimation['tracks'] = {};

  const addTrack = (
    trackName: DefinitionAnimationTrackName,
    keyframes: { timelinePosition: number; value: number; easing?: FigmaEasing }[],
  ): void => {
    if (keyframes.length < 2) {
      warn(`A single-keyframe "${trackName}" track carries no motion and was not exported.`);

      return;
    }

    const converted: DefinitionAnimationKeyframe[] = keyframes.map((keyframe, index) => {
      const result: DefinitionAnimationKeyframe = {
        at: roundTo((keyframe.timelinePosition / duration) * 100, 4),
        value: roundTo(toDefinitionValue(trackName, keyframe.value), 5),
      };

      // The incoming easing of the NEXT Figma keyframe is this definition
      // keyframe's departure easing. Figma attaches a LINEAR easing to every
      // keyframe; `linear` is the model's segment fallback anyway, so writing
      // it out would only bloat the definition.
      const arrival = keyframes[index + 1]?.easing;

      if (arrival) {
        const easing = figmaEasingToDefinition(arrival, warn);

        if (easing !== 'linear') {
          result.easing = easing;
        }
      }

      return result;
    });

    // Figma holds the first keyframe's value back to the start of the
    // timeline; the model expresses that as an explicit constant segment.
    if (converted[0].at > 0) {
      converted.unshift({ at: 0, value: converted[0].value });
    }

    tracks[trackName] = { keyframes: converted };
  };

  for (const [field, raw] of Object.entries(rawTracks)) {
    if (field === 'TRANSLATION_XY' || field === 'SCALE_XY') {
      const axes: ['translateX' | 'scaleX', 'translateY' | 'scaleY'] =
        field === 'TRANSLATION_XY' ? ['translateX', 'translateY'] : ['scaleX', 'scaleY'];

      addTrack(
        axes[0],
        raw.keyframes.map((keyframe) => ({
          timelinePosition: keyframe.timelinePosition,
          value: keyframe.value.type === 'VECTOR' ? keyframe.value.value.x : 0,
          easing: keyframe.easing,
        })),
      );
      addTrack(
        axes[1],
        raw.keyframes.map((keyframe) => ({
          timelinePosition: keyframe.timelinePosition,
          value: keyframe.value.type === 'VECTOR' ? keyframe.value.value.y : 0,
          easing: keyframe.easing,
        })),
      );

      continue;
    }

    const trackName = TRACK_BY_FIELD[field as FigmaTrackField];

    if (!trackName) {
      warn(`The animated Figma property "${field}" has no DiceBear equivalent and was not exported.`);

      continue;
    }

    addTrack(
      trackName,
      raw.keyframes.map((keyframe) => ({
        timelinePosition: keyframe.timelinePosition,
        value: keyframe.value.type === 'FLOAT' ? keyframe.value.value : 0,
        easing: keyframe.easing,
      })),
    );
  }

  if (Object.keys(tracks).length === 0) {
    return null;
  }

  return {
    duration: roundTo(duration, 4),
    tracks,
  };
}

/**
 * Whether every keyframe of a Figma track carries the same value. The import
 * spans an instance's playback clip with such a track (see the importer);
 * it carries no motion and must not come back as an animation on export.
 */
export function isConstantTrack(keyframes: FigmaKeyframe[]): boolean {
  if (keyframes.length === 0) {
    return true;
  }

  const first = keyframes[0].value;

  return keyframes.every((keyframe) => {
    const value = keyframe.value;

    if (value.type === 'FLOAT' && first.type === 'FLOAT') {
      return value.value === first.value;
    }

    if (value.type === 'VECTOR' && first.type === 'VECTOR') {
      return value.value.x === first.value.x && value.value.y === first.value.y;
    }

    return false;
  });
}
