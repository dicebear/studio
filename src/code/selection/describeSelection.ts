import type { Mode, SelectionInfo } from '@shared/messages';
import { collectAvatarRecords, type RecordCandidate } from './collectAvatarRecords';
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
 * What the window needs to know about the current selection. Each tab gets
 * the part it reads, so the walks over the selection only run for the tab
 * that is open. The Style tab reads the frame on its own.
 */
export function describeSelection(mode: Mode): SelectionInfo {
  const selection = figma.currentPage.selection;

  return {
    // Figma's nodes carry stricter method signatures than the candidate
    // shapes need, the calls pass the same arrays either way.
    targets: mode === 'generate' ? collectFillTargets(selection as unknown as readonly FillCandidate[]) : [],
    selectedCount: selection.length,
    bounds: mode === 'generate' ? unionBounds(selection) : null,
    avatars: mode === 'inspect' ? collectAvatarRecords(selection as unknown as readonly RecordCandidate[]) : [],
  };
}
