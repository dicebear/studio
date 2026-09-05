import { serializeToSvg } from '../figma-svg';
import { tick } from '@shared/tick';
import { createDicebearHooks } from './hooks';
import { createStyleCache } from './referenceColor';
import { hasAnimationTracks } from './nodeAnimation';
import { isMotionAvailable } from '../utils/motionSupport';

export type SerializeOptions = {
  warn: (message: string) => void;
};

/** Writes the SVG of one avatar frame or component. */
export type NodeSerializer = (root: FrameNode | ComponentNode) => Promise<string>;

/**
 * A serializer for one export, writing SVG from the layer data with the
 * DiceBear hooks applied.
 *
 * Built once per export, not once per component: the style lookups and the
 * `currentColor` probe are cached inside the hooks, and a style file resolves
 * the same handful of styles and components in every one of its variants.
 *
 * This is also the one place that reaches for the `figma` global. The
 * serializer and the hooks both take what they need from here, so they stay
 * testable without a plugin sandbox.
 *
 * Frames do not clip: the avatar clips at the canvas, and DiceBear moves
 * components at render time, which a baked clip would cut.
 */
export function createSerializer(options: SerializeOptions): NodeSerializer {
  const styles = createStyleCache((id) => figma.getStyleByIdAsync(id));
  const hooks = createDicebearHooks({ styles });

  return (root) => {
    // The root is exported by its contents, and the definition has no place
    // for an animation on the avatar or a component itself.
    if (isMotionAvailable(root) && hasAnimationTracks(root)) {
      options.warn(
        `The animation on "${root.name}" itself was not exported. Only the layers inside a component or the avatar frame can carry one.`,
      );
    }

    return serializeToSvg(root, {
      host: {
        mixed: figma.mixed,
        yield: tick,
      },
      hooks,
      warn: options.warn,
      clipFrames: false,
    });
  };
}
