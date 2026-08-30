import { roundTo } from '../utils/roundTo';
import { DefinitionAnimation, DefinitionAnimationKeyframe, DefinitionEasing } from './types';

/**
 * Figma always rotates and scales around a node's center; the Motion UI's
 * anchor point is invisible to the plugin API. So a non-center transform
 * origin is decomposed into its native equivalent before the tracks are
 * written: the rotation/scale stays center-based and a compensating
 * translation moves the node so the motion pivots around the origin. That
 * makes the Figma preview correct and every keyframe editable with Figma's
 * own tools — the origin as a concept simply does not travel to Figma.
 *
 * A scale-only origin decomposes exactly (the compensation is an affine
 * function of the scale value, so it shares the scale track's keyframes and
 * easings). As soon as a rotation is involved the compensation follows a
 * circular arc and is sampled instead, densely enough that the sampled
 * polyline stays within {@link TOLERANCE} of the true curve. Where a block
 * already animates the translation itself, the compensation is summed into
 * that track — exactly on segments whose keyframes line up, sampled
 * otherwise.
 */

/** Maximum deviation of a sampled polyline from the true curve, in pixels. */
const TOLERANCE = 0.1;

/** Bisection depth cap; bounds the keyframe count per segment to 2^6. */
const MAX_DEPTH = 6;

const KEYWORD_BEZIER: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

/** Solves a CSS easing bezier: eased progress for a time progress `p`. */
function bezierProgress(x1: number, y1: number, x2: number, y2: number, p: number): number {
  const sample = (t: number, a: number, b: number): number => {
    const inv = 1 - t;

    return 3 * inv * inv * t * a + 3 * inv * t * t * b + t * t * t;
  };

  // x(t) is monotone for CSS beziers (x1, x2 are clamped to 0..1), so a
  // plain bisection is robust enough.
  let low = 0;
  let high = 1;
  let t = p;

  for (let i = 0; i < 40; i++) {
    const x = sample(t, x1, x2);

    if (Math.abs(x - p) < 1e-7) {
      break;
    }

    if (x < p) {
      low = t;
    } else {
      high = t;
    }

    t = (low + high) / 2;
  }

  return sample(t, y1, y2);
}

function easedProgress(easing: DefinitionEasing | undefined, p: number): number {
  if (p <= 0) {
    return 0;
  }

  if (p >= 1) {
    return 1;
  }

  if (easing === undefined || easing === 'linear') {
    return p;
  }

  if (easing === 'hold') {
    return 0;
  }

  const [x1, y1, x2, y2] =
    typeof easing === 'string' ? (KEYWORD_BEZIER[easing] ?? [0, 0, 1, 1]) : [easing.x1, easing.y1, easing.x2, easing.y2];

  return bezierProgress(x1, y1, x2, y2, p);
}

/**
 * The track's value at `at` percent, honoring per-keyframe and block-default
 * easing. Outside the keyframe range the track holds its first/last value
 * (the renderer's endpoint padding).
 */
function trackValueAt(
  keyframes: DefinitionAnimationKeyframe[],
  defaultEasing: DefinitionEasing | undefined,
  at: number,
): number {
  if (at <= keyframes[0].at) {
    return keyframes[0].value;
  }

  const last = keyframes[keyframes.length - 1];

  if (at >= last.at) {
    return last.value;
  }

  for (let i = 0; i < keyframes.length - 1; i++) {
    const from = keyframes[i];
    const to = keyframes[i + 1];

    if (at <= to.at) {
      if (to.at === from.at) {
        return to.value;
      }

      const p = (at - from.at) / (to.at - from.at);

      return from.value + easedProgress(from.easing ?? defaultEasing, p) * (to.value - from.value);
    }
  }

  return last.value;
}

/**
 * Whether the track is constant over `[u, v]` for any easing: the enclosing
 * keyframe segment does not change its value (equal endpoint values do not
 * suffice — an overshooting bezier moves between them).
 */
function isConstantOn(keyframes: DefinitionAnimationKeyframe[], u: number, v: number): boolean {
  if (u >= keyframes[keyframes.length - 1].at || v <= keyframes[0].at) {
    return true;
  }

  for (let i = 0; i < keyframes.length - 1; i++) {
    const from = keyframes[i];
    const to = keyframes[i + 1];

    if (u >= from.at && v <= to.at) {
      return from.value === to.value;
    }
  }

  return false;
}

/**
 * The departure easing of the segment `[u, v]` when it coincides exactly with
 * one of the track's own segments; `null` when it is a split piece.
 */
function exactSegmentEasing(
  keyframes: DefinitionAnimationKeyframe[],
  u: number,
  v: number,
): { easing?: DefinitionEasing } | null {
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (keyframes[i].at === u && keyframes[i + 1].at === v) {
      return { easing: keyframes[i].easing };
    }
  }

  return null;
}

/**
 * Adds linearly-interpolated sample points of `f` between `u` and `v` (both
 * exclusive) to `out` until the polyline is within {@link TOLERANCE} of `f`.
 */
function subdivide(f: (at: number) => number, u: number, fu: number, v: number, fv: number, depth: number, out: DefinitionAnimationKeyframe[]): void {
  const mid = (u + v) / 2;
  const fmid = f(mid);

  if (depth >= MAX_DEPTH || Math.abs(fmid - (fu + fv) / 2) <= TOLERANCE) {
    return;
  }

  subdivide(f, u, fu, mid, fmid, depth + 1, out);
  out.push({ at: mid, value: fmid, easing: 'linear' });
  subdivide(f, mid, fmid, v, fv, depth + 1, out);
}

/** Drops interior keyframes of constant runs; between equal values every easing renders the same. */
function pruneConstantRuns(keyframes: DefinitionAnimationKeyframe[]): DefinitionAnimationKeyframe[] {
  return keyframes.filter((keyframe, index) => {
    if (index === 0 || index === keyframes.length - 1) {
      return true;
    }

    return !(keyframes[index - 1].value === keyframe.value && keyframes[index + 1].value === keyframe.value);
  });
}

function roundKeyframes(keyframes: DefinitionAnimationKeyframe[]): DefinitionAnimationKeyframe[] {
  return keyframes.map((keyframe) => ({
    ...keyframe,
    at: roundTo(keyframe.at, 4),
    value: roundTo(keyframe.value, 4),
  }));
}

/**
 * A sampled keyframe must not inherit a non-linear block default between its
 * linear samples; a keyframe that happens to fall on linear can rely on it.
 */
function normalizeLinear(
  keyframes: DefinitionAnimationKeyframe[],
  defaultEasing: DefinitionEasing | undefined,
): DefinitionAnimationKeyframe[] {
  if (defaultEasing === undefined || defaultEasing === 'linear') {
    return keyframes.map((keyframe) => (keyframe.easing === 'linear' ? { at: keyframe.at, value: keyframe.value } : keyframe));
  }

  return keyframes;
}

function isSameEasing(a: DefinitionEasing, b: DefinitionEasing): boolean {
  if (typeof a === 'string' || typeof b === 'string') {
    return a === b;
  }

  return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2;
}

/**
 * The pointwise sum of two tracks of the same block. Segments whose keyframes
 * line up keep their exact easing — the moving side's when the other side
 * holds still, the shared one when both sides move with the same easing (the
 * sum of two identically-eased segments is that segment over the summed
 * values). Everything else is sampled.
 */
function sumTracks(
  a: DefinitionAnimationKeyframe[],
  b: DefinitionAnimationKeyframe[],
  defaultEasing: DefinitionEasing | undefined,
): DefinitionAnimationKeyframe[] {
  const times = [...new Set([...a, ...b].map((keyframe) => keyframe.at))].sort((x, y) => x - y);
  const sumAt = (at: number): number => trackValueAt(a, defaultEasing, at) + trackValueAt(b, defaultEasing, at);

  const result: DefinitionAnimationKeyframe[] = [];

  for (let i = 0; i < times.length; i++) {
    const u = times[i];
    const keyframe: DefinitionAnimationKeyframe = { at: u, value: sumAt(u) };

    if (i === times.length - 1) {
      result.push(keyframe);

      break;
    }

    const v = times[i + 1];
    const aConstant = isConstantOn(a, u, v);
    const bConstant = isConstantOn(b, u, v);
    const segA = exactSegmentEasing(a, u, v);
    const segB = exactSegmentEasing(b, u, v);

    let exact: { easing?: DefinitionEasing } | null = null;

    if (aConstant && bConstant) {
      exact = {};
    } else if (aConstant && segB) {
      exact = segB;
    } else if (bConstant && segA) {
      exact = segA;
    } else if (segA && segB && isSameEasing(segA.easing ?? defaultEasing ?? 'linear', segB.easing ?? defaultEasing ?? 'linear')) {
      exact = segA;
    }

    if (exact) {
      if (exact.easing !== undefined) {
        keyframe.easing = exact.easing;
      }

      result.push(keyframe);

      continue;
    }

    keyframe.easing = 'linear';
    result.push(keyframe);
    subdivide(sumAt, u, keyframe.value, v, sumAt(v), 0, result);
  }

  return normalizeLinear(pruneConstantRuns(roundKeyframes(result)), defaultEasing);
}

export type NodeSize = {
  width: number;
  height: number;
};

/**
 * Rewrites every block with a non-center origin into its center-based
 * equivalent (see the module comment). The input is left untouched.
 */
export function decomposeOriginAnimations(
  animations: DefinitionAnimation[],
  size: NodeSize,
  warn: (message: string) => void,
): DefinitionAnimation[] {
  return animations.map((animation) => decomposeBlock(animation, size, warn));
}

function decomposeBlock(
  animation: DefinitionAnimation,
  size: NodeSize,
  warn: (message: string) => void,
): DefinitionAnimation {
  if (animation.origin === undefined) {
    return animation;
  }

  const { origin, tracks, ...rest } = animation;
  const result: DefinitionAnimation = { ...rest, tracks: { ...tracks } };

  // The origin offset from the center, in pixels of the node's own box (the
  // model's percent origin is relative to the fill-box, which is exactly the
  // imported node's bounds).
  const vx = ((origin.x - 50) / 100) * size.width;
  const vy = ((origin.y - 50) / 100) * size.height;

  const rotate = tracks.rotate;
  const scaleX = tracks.scaleX;
  const scaleY = tracks.scaleY;

  if ((vx === 0 && vy === 0) || (!rotate && !scaleX && !scaleY)) {
    return result;
  }

  const defaultEasing = animation.easing;
  let compX: DefinitionAnimationKeyframe[] | null = null;
  let compY: DefinitionAnimationKeyframe[] | null = null;

  if (!rotate) {
    // Scaling around the origin is scaling around the center plus the
    // translation (1 - s) * v — affine in the scale value, so the
    // compensation inherits the scale track's keyframes and easings exactly.
    // The axes stay independent.
    if (scaleX && vx !== 0) {
      compX = roundKeyframes(scaleX.keyframes.map((keyframe) => ({ ...keyframe, value: (1 - keyframe.value) * vx })));
    }

    if (scaleY && vy !== 0) {
      compY = roundKeyframes(scaleY.keyframes.map((keyframe) => ({ ...keyframe, value: (1 - keyframe.value) * vy })));
    }
  } else {
    // With a rotation the compensation v - R(θ)Sv follows a circular arc;
    // sample it (the union of the source keyframe times as the base grid,
    // subdivided until the polyline is faithful).
    warn(
      'A rotation around a shifted transform origin was expanded into sampled keyframes so Figma plays it correctly.',
    );

    const comp = (at: number): { x: number; y: number } => {
      const theta = (trackValueAt(rotate.keyframes, defaultEasing, at) * Math.PI) / 180;
      const sx = scaleX ? trackValueAt(scaleX.keyframes, defaultEasing, at) : 1;
      const sy = scaleY ? trackValueAt(scaleY.keyframes, defaultEasing, at) : 1;
      const x = sx * vx;
      const y = sy * vy;

      // The model rotates clockwise with the y axis pointing down.
      return {
        x: vx - (Math.cos(theta) * x - Math.sin(theta) * y),
        y: vy - (Math.sin(theta) * x + Math.cos(theta) * y),
      };
    };

    const sourceTimes = [
      ...new Set(
        [...rotate.keyframes, ...(scaleX?.keyframes ?? []), ...(scaleY?.keyframes ?? [])].map(
          (keyframe) => keyframe.at,
        ),
      ),
    ].sort((x, y) => x - y);

    const sampleAxis = (axis: 'x' | 'y'): DefinitionAnimationKeyframe[] => {
      const f = (at: number) => comp(at)[axis];
      const samples: DefinitionAnimationKeyframe[] = [];

      for (let i = 0; i < sourceTimes.length; i++) {
        const u = sourceTimes[i];

        samples.push({ at: u, value: f(u), easing: 'linear' });

        if (i < sourceTimes.length - 1) {
          const v = sourceTimes[i + 1];

          subdivide(f, u, f(u), v, f(v), 0, samples);
        }
      }

      delete samples[samples.length - 1].easing;

      return normalizeLinear(pruneConstantRuns(roundKeyframes(samples)), defaultEasing);
    };

    compX = sampleAxis('x');
    compY = sampleAxis('y');
  }

  const mergeInto = (trackName: 'translateX' | 'translateY', comp: DefinitionAnimationKeyframe[] | null): void => {
    if (!comp || comp.every((keyframe) => keyframe.value === 0)) {
      return;
    }

    const existing = result.tracks[trackName];

    result.tracks[trackName] = existing
      ? { keyframes: sumTracks(existing.keyframes, comp, defaultEasing) }
      : { keyframes: comp };
  };

  mergeInto('translateX', compX);
  mergeInto('translateY', compY);

  return result;
}
