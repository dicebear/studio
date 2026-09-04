/**
 * Figma layers to SVG, read from the plugin API instead of `exportAsync`.
 *
 * Self-contained: nothing in this directory knows about DiceBear or touches
 * the `figma` global. What the environment provides comes in through
 * {@link SerializerHost}, what a caller wants to change through
 * {@link SerializeHooks}.
 */
export { serializeToSvg } from './serialize';
export { element, textNode } from './element';
export type {
  ChannelPaint,
  PaintChannel,
  SerializeContext,
  SerializeHooks,
  SerializeOptions,
  SerializerHost,
} from './types';
export { formatNumber } from './numbers';
export { hexColor } from './paints';
