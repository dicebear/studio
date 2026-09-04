/**
 * Formats a number for an SVG attribute. Six decimals keep every value Figma
 * hands over, svgo rounds to the export precision afterwards. A value that
 * rounds to zero comes out as `0`, never as `-0`.
 */
export function formatNumber(value: number, decimals = 6): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const rounded = Number(value.toFixed(decimals));

  return rounded === 0 ? '0' : String(rounded);
}
