/**
 * `currentColor` travels through Figma as a paint style of its own.
 *
 * A definition can paint a component's layers with `currentColor` so every
 * reference tints the same shape differently. Figma has no such inheritance:
 * a layer holds a paint. Binding those layers to a style in this group keeps
 * them recognizable, so the export writes `currentColor` again instead of the
 * color they happen to show, and a layer inside an instance that carries a
 * palette style instead is the color that reference passes down.
 *
 * The group is not a palette slot and never lands in the definition's colors.
 */
export const CURRENT_COLOR_GROUP = 'currentColor';
