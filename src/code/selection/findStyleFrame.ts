/**
 * The square frame the Style tools work on: the nearest frame around a single
 * selected layer, when that frame is square. Null when the selection is
 * anything else.
 */
export function findStyleFrame(selection: readonly SceneNode[] = figma.currentPage.selection): FrameNode | null {
  let current: BaseNode | null = selection.length === 1 ? selection[0] : null;

  while (current && current.type !== 'FRAME') {
    current = current.parent;
  }

  if (!current || current.type !== 'FRAME' || current.width !== current.height) {
    return null;
  }

  return current;
}
