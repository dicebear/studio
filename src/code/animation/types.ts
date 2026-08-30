/**
 * Local mirror of the declarative animation model from `@dicebear/schema`.
 * The plugin converts between this shape and Figma's manual keyframe tracks.
 * Everything in this directory is pure and free of the `figma` global, so it
 * runs under vitest.
 */

export type DefinitionEasingKeyword = 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeInOut' | 'hold';

export type DefinitionEasingBezier = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type DefinitionEasing = DefinitionEasingKeyword | DefinitionEasingBezier;

export type DefinitionAnimationKeyframe = {
  at: number;
  value: number;
  /** Shapes the segment from this keyframe to the next one (CSS convention). */
  easing?: DefinitionEasing;
};

export type DefinitionAnimationTrack = {
  keyframes: DefinitionAnimationKeyframe[];
};

export type DefinitionAnimationTrackName = 'translateX' | 'translateY' | 'rotate' | 'scaleX' | 'scaleY' | 'opacity';

export type DefinitionAnimation = {
  /** Groups the timeline under a user-selectable animation name. */
  name?: string;
  duration: number;
  delay?: number;
  iterations?: 'infinite' | number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternateReverse';
  fill?: 'none' | 'forwards';
  easing?: DefinitionEasing;
  origin?: { x: number; y: number };
  tracks: Partial<Record<DefinitionAnimationTrackName, DefinitionAnimationTrack>>;
};

/** The subset of Figma's motion easing object the plugin reads and writes. */
export type FigmaEasing = {
  type: string;
  easingFunctionCubicBezier?: { x1: number; y1: number; x2: number; y2: number };
  easingFunctionSpring?: { bounce: number };
};

export type FigmaKeyframeValue =
  | { type: 'FLOAT'; value: number }
  | { type: 'VECTOR'; value: { x: number; y: number } };

export type FigmaKeyframe = {
  timelinePosition: number;
  value: FigmaKeyframeValue;
  /** Shapes the segment from the previous keyframe to this one. */
  easing?: FigmaEasing;
};

export type FigmaTrack = {
  keyframes: FigmaKeyframe[];
};

/** The scalar transform fields the import writes. */
export type FigmaTrackField = 'TRANSLATION_X' | 'TRANSLATION_Y' | 'ROTATION' | 'SCALE_X' | 'SCALE_Y' | 'OPACITY';

/** The vector fields the export splits into scalar model tracks. */
export type FigmaVectorTrackField = 'TRANSLATION_XY' | 'SCALE_XY';

export type FigmaTracks = Partial<Record<FigmaTrackField, FigmaTrack>>;
