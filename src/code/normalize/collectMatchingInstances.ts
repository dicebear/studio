import { canModifyPosition } from './canModifyPosition';

export type ModifiableInstance = {
  node: InstanceNode;
  // Captured before any mutation so compensation and resize stay in sync.
  scaleX: number;
  scaleY: number;
  // Linear 2×2 from relativeTransform — Figma stores rotation/flip here but
  // scale lives separately in width/height.
  linear: { a: number; b: number; c: number; d: number };
};

export async function collectMatchingInstances(
  eligibleVariantIds: Set<string>,
): Promise<{ modifiable: ModifiableInstance[]; lockedCount: number }> {
  const allInstances = figma.root.findAllWithCriteria({ types: ['INSTANCE'] });

  const mains = await Promise.all(allInstances.map((i) => i.getMainComponentAsync()));

  const modifiable: ModifiableInstance[] = [];
  let lockedCount = 0;

  for (let i = 0; i < allInstances.length; i++) {
    const main = mains[i];

    if (!main || !eligibleVariantIds.has(main.id)) {
      continue;
    }

    const instance = allInstances[i];

    if (!canModifyPosition(instance)) {
      lockedCount++;

      continue;
    }

    const transform = instance.relativeTransform;

    modifiable.push({
      node: instance,
      scaleX: main.width !== 0 ? instance.width / main.width : 1,
      scaleY: main.height !== 0 ? instance.height / main.height : 1,
      linear: {
        a: transform[0][0],
        b: transform[1][0],
        c: transform[0][1],
        d: transform[1][1],
      },
    });
  }

  return { modifiable, lockedCount };
}
