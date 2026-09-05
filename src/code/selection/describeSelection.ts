import type { SelectionInfo } from '@shared/messages';
import { collectFillTargets, type FillCandidate } from './collectFillTargets';

/** The union of the nodes' absolute bounds, for placing inserted avatars. */
export function unionBounds(nodes: readonly SceneNode[]): SelectionInfo['bounds'] {
  let box: { x: number; y: number; width: number; height: number } | null = null;

  for (const node of nodes) {
    const b = node.absoluteBoundingBox;

    if (!b) {
      continue;
    }

    if (box === null) {
      box = { ...b };
    } else {
      const x = Math.min(box.x, b.x);
      const y = Math.min(box.y, b.y);
      const right = Math.max(box.x + box.width, b.x + b.width);
      const bottom = Math.max(box.y + box.height, b.y + b.height);

      box = { x, y, width: right - x, height: bottom - y };
    }
  }

  return box;
}

/**
 * What the window needs to know about the current selection. The fill
 * targets are only worth collecting for the Generate tab, the Style tab
 * reads the frame on its own.
 */
export function describeSelection(withTargets: boolean): SelectionInfo {
  const selection = figma.currentPage.selection;

  return {
    // Figma's nodes carry a stricter `findAllWithCriteria` signature than the
    // candidate shape needs, the call passes the same arrays either way.
    targets: withTargets ? collectFillTargets(selection as unknown as readonly FillCandidate[]) : [],
    selectedCount: selection.length,
    bounds: unionBounds(selection),
  };
}
