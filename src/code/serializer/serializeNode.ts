import { serializeToSvg } from '../figma-svg';
import { tick } from '../utils/tick';
import { createDicebearHooks } from './hooks';
import { createStyleCache } from './referenceColor';

export type SerializeOptions = {
  aliasesEnabled: boolean;
  animationsEnabled: boolean;
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
  const hooks = createDicebearHooks({
    aliasesEnabled: options.aliasesEnabled,
    animationsEnabled: options.animationsEnabled,
    styles,
  });

  return (root) =>
    serializeToSvg(root, {
      host: {
        mixed: figma.mixed,
        getStyleById: styles,
        yield: tick,
      },
      hooks,
      warn: options.warn,
      clipFrames: false,
    });
}
