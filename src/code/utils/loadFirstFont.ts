/**
 * The font a freshly created text node starts with. Figma refuses every write
 * to a text node whose current font is not loaded, so it has to be loaded even
 * when the node ends up with a different font.
 */
const DEFAULT_TEXT_FONT: FontName = { family: 'Inter', style: 'Regular' };

/**
 * Loads the first of the given fonts that is available, together with the font
 * new text nodes start with. Returns null when none of them can be loaded.
 */
export async function loadFirstFont(candidates: FontName[]): Promise<FontName | null> {
  try {
    await figma.loadFontAsync(DEFAULT_TEXT_FONT);
  } catch {
    // Without it the caller may still succeed, the candidates are tried next.
  }

  for (const candidate of candidates) {
    try {
      await figma.loadFontAsync(candidate);

      return candidate;
    } catch {
      // Try the next font.
    }
  }

  return null;
}
