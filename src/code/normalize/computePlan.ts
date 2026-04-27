import { findContentBoundingBox, type ContentBoundingBox } from '../queries/findContentBoundingBox';
import { snap } from './constants';

export type VariantPlan = {
  variant: ComponentNode;
  name: string;
  currentWidth: number;
  currentHeight: number;
  contentBox: ContentBoundingBox | null;
  skipReason?: 'auto-layout' | 'no-children';
};

export type GroupPlan = {
  targetWidth: number;
  targetHeight: number;
  willTranslate: { dx: number; dy: number };
  variants: VariantPlan[];
  eligibleVariantIds: Set<string>;
};

export function computeGroupPlan(groupMap: Map<string, ComponentNode>): GroupPlan {
  const variants: VariantPlan[] = [];
  const eligibleVariantIds = new Set<string>();

  for (const [name, variant] of groupMap) {
    const base: VariantPlan = {
      variant,
      name,
      currentWidth: variant.width,
      currentHeight: variant.height,
      contentBox: null,
    };

    if (variant.layoutMode !== 'NONE') {
      variants.push({ ...base, skipReason: 'auto-layout' });

      continue;
    }

    const contentBox = findContentBoundingBox(variant);

    if (!contentBox) {
      variants.push({ ...base, skipReason: 'no-children' });

      continue;
    }

    variants.push({ ...base, contentBox });
    eligibleVariantIds.add(variant.id);
  }

  let minCx = Infinity;
  let minCy = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  for (const v of variants) {
    if (v.skipReason || !v.contentBox) {
      continue;
    }

    const { x: cx, y: cy, width: cw, height: ch } = v.contentBox;

    minCx = Math.min(minCx, cx);
    minCy = Math.min(minCy, cy);
    maxRight = Math.max(maxRight, cx + cw);
    maxBottom = Math.max(maxBottom, cy + ch);
  }

  if (minCx === Infinity) {
    return {
      targetWidth: 0,
      targetHeight: 0,
      willTranslate: { dx: 0, dy: 0 },
      variants,
      eligibleVariantIds,
    };
  }

  // Children shift by `(-minCx, -minCy)` so the union of content positions
  // starts at (0, 0). Variant frames and existing instances shift in the
  // OPPOSITE direction so visible content stays at its original world coords.
  return {
    targetWidth: maxRight - minCx,
    targetHeight: maxBottom - minCy,
    willTranslate: { dx: snap(-minCx), dy: snap(-minCy) },
    variants,
    eligibleVariantIds,
  };
}
