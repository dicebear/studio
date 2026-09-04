/**
 * A Figma mask hides every sibling listed after it in its parent. The plan
 * turns a flat list of siblings into the nesting the SVG needs: the mask
 * itself becomes a `<mask>` definition, the siblings after it a group that
 * references it. A second mask further up starts a nested group inside the
 * first, so it is masked by the first as well.
 */
export type MaskPlanItem<T> = { kind: 'node'; node: T } | { kind: 'masked'; mask: T; children: MaskPlanItem<T>[] };

export function planMaskedSiblings<T>(children: readonly T[], isMask: (child: T) => boolean): MaskPlanItem<T>[] {
  const plan: MaskPlanItem<T>[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (isMask(child)) {
      plan.push({ kind: 'masked', mask: child, children: planMaskedSiblings(children.slice(i + 1), isMask) });

      break;
    }

    plan.push({ kind: 'node', node: child });
  }

  return plan;
}
