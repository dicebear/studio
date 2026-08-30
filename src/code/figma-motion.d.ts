/**
 * Ambient declarations for Figma's motion API, which `@figma/plugin-typings`
 * does not ship yet. Kept to the surface the plugin uses; delete this file
 * once the typings package carries the real definitions. The members exist at
 * runtime only for users with motion access — accessing them without it
 * throws, so every use sits behind `isMotionAvailable` or a try/catch.
 */

interface MotionEasing {
  type: string;
  easingFunctionCubicBezier?: { x1: number; y1: number; x2: number; y2: number };
  easingFunctionSpring?: { bounce: number };
}

interface MotionKeyframe {
  timelinePosition: number;
  value:
    | { type: 'FLOAT'; value: number }
    | { type: 'VECTOR'; value: { x: number; y: number } }
    | { type: 'COLOR'; value: { r: number; g: number; b: number; a: number } };
  easing?: MotionEasing;
}

interface MotionTrack {
  id?: string;
  keyframes: MotionKeyframe[];
}

interface MotionTimeline {
  id: string;
  duration: number;
}

type MotionTrackHandle = { type: 'PROPERTY'; name: string };

interface SceneNodeMixin {
  readonly timelines: MotionTimeline[];
  manualKeyframeTracks: Record<string, MotionTrack>;
  applyManualKeyframeTrack(handle: MotionTrackHandle, track: { keyframes: MotionKeyframe[] }): void;
  removeManualKeyframeTrack(handle: MotionTrackHandle): void;
  setTimelineDuration(id: string, durationSeconds: number): void;
}
