/** Figma blend modes with a `mix-blend-mode` counterpart. */
const CSS_BLEND_MODES: Record<string, string> = {
  DARKEN: 'darken',
  MULTIPLY: 'multiply',
  COLOR_BURN: 'color-burn',
  LIGHTEN: 'lighten',
  SCREEN: 'screen',
  COLOR_DODGE: 'color-dodge',
  OVERLAY: 'overlay',
  SOFT_LIGHT: 'soft-light',
  HARD_LIGHT: 'hard-light',
  DIFFERENCE: 'difference',
  EXCLUSION: 'exclusion',
  HUE: 'hue',
  SATURATION: 'saturation',
  COLOR: 'color',
  LUMINOSITY: 'luminosity',
};

/**
 * The `style` attribute for a layer's blend mode, or undefined when it paints
 * normally. `LINEAR_BURN` and `LINEAR_DODGE` have no CSS counterpart and are
 * reported through `warn`.
 */
export function blendModeStyle(blendMode: string, warn: (message: string) => void): string | undefined {
  if (blendMode === 'NORMAL' || blendMode === 'PASS_THROUGH') {
    return undefined;
  }

  const css = CSS_BLEND_MODES[blendMode];

  if (css === undefined) {
    warn(`The blend mode "${blendMode}" has no SVG equivalent and was exported as normal.`);

    return undefined;
  }

  return `mix-blend-mode:${css}`;
}
