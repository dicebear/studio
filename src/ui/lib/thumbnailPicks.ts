import { Avatar, Style } from '@dicebear/core';
import { THUMBNAIL_SEEDS } from '@shared/thumbnailSeeds';

/**
 * What the renderer picks for every thumbnail seed: variants, colors and
 * transforms. The import applies them to clones of the avatar frame, so the
 * sample tiles match what the style renders. Empty when the renderer rejects
 * the definition, which the import reports as a warning.
 */
export function computeThumbnailPicks(definition: unknown): Record<string, Record<string, unknown>> {
  const picks: Record<string, Record<string, unknown>> = {};

  try {
    const style = new Style(definition as never);

    for (const seed of THUMBNAIL_SEEDS) {
      picks[seed] = new Avatar(style, { seed }).toJSON().options as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return picks;
}
