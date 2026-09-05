/**
 * What `createNodeFromSvg` should not see: the metadata block and comments the
 * renderer writes, and the style block it emits for animations. The avatars
 * are rendered static, so no animation is lost.
 */
export function cleanSvg(svg: string): string {
  return svg
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}
