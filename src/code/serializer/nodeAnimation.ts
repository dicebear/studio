import { isConstantTrack, tracksToDefinitionAnimation } from '../animation/keyframes';
import { animationNameFromLayer } from '../animation/names';
import { DefinitionAnimation } from '../animation/types';

/**
 * Whether a node carries a keyframe track with at least one keyframe. Reading
 * the tracks throws for a user without motion access, which counts as no
 * animation.
 */
export function hasAnimationTracks(node: SceneNode): boolean {
  try {
    const tracks = node.manualKeyframeTracks as Record<string, { keyframes?: unknown[] }> | undefined;

    return Object.values(tracks ?? {}).some((track) => (track?.keyframes?.length ?? 0) > 0);
  } catch {
    return false;
  }
}

export type NodeAnimation = {
  animations: DefinitionAnimation[];
  /** The value the opacity track starts at, when it is not 1. */
  restingOpacity?: number;
};

/**
 * The declarative animation a node's manual keyframe tracks describe, or null
 * when the node carries none. Throws nothing: a node whose tracks cannot be
 * read counts as unanimated.
 */
export function readNodeAnimation(node: SceneNode, warn: (message: string) => void): NodeAnimation | null {
  let rawTracks: Record<string, { keyframes?: unknown[] }> | undefined;

  try {
    rawTracks = node.manualKeyframeTracks as Record<string, { keyframes?: unknown[] }>;
  } catch {
    return null;
  }

  if (!rawTracks || Object.keys(rawTracks).length === 0) {
    return null;
  }

  const tracks: Record<string, { keyframes: any[] }> = {};

  for (const [field, track] of Object.entries(rawTracks)) {
    // `fills`, `strokes`, and `effects` hold index-keyed sub-tracks rather
    // than keyframe lists. They have no DiceBear equivalent.
    if (!track || !Array.isArray(track.keyframes)) {
      warn(`The animated Figma property "${field}" has no DiceBear equivalent and was not exported.`);

      continue;
    }

    const keyframes = track.keyframes as any[];

    // The import stretches an instance's playback clip with a constant span
    // track. It carries no motion and is not part of the design.
    if (isConstantTrack(keyframes)) {
      continue;
    }

    tracks[field] = { keyframes };
  }

  // The definition keeps the resting opacity as an attribute, Figma only in
  // the track, so it is read back from the first keyframe. A layer resting at
  // zero cannot live in Figma at all (the SVG export drops it), which is why
  // the import hands the track the whole job. Nothing in the API promises the
  // keyframes in timeline order, so the earliest one is picked, not the first
  // one.
  const opacityKeyframes = tracks.OPACITY?.keyframes;
  const firstOpacity = opacityKeyframes?.reduce(
    (earliest, keyframe) => (keyframe.timelinePosition < earliest.timelinePosition ? keyframe : earliest),
    opacityKeyframes[0],
  )?.value;
  const restingOpacity =
    firstOpacity?.type === 'FLOAT' && firstOpacity.value !== 1 ? (firstOpacity.value as number) : undefined;

  let animation = tracksToDefinitionAnimation(tracks, 0, warn);

  if (animation === null) {
    return null;
  }

  // The layer name carries the animation's name. The import writes it,
  // designers may edit it, and the export normalizes whatever they left
  // behind.
  const name = animationNameFromLayer(node.name);

  if (name !== undefined) {
    const { tracks, ...rest } = animation;

    animation = { name, ...rest, tracks };
  }

  return { animations: [animation], restingOpacity };
}
