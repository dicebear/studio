import { fastFindAll } from '../utils/fastFindAll';
import { canModifyPosition } from './canModifyPosition';

export type ModifiableInstance = {
  node: InstanceNode;
  // Size scale relative to the main component (instance.width / main.width).
  // Captured before any mutation so the compensation and resize stay in sync.
  scaleX: number;
  scaleY: number;
};

export async function collectMatchingInstances(
  eligibleVariantIds: Set<string>,
): Promise<{ modifiable: ModifiableInstance[]; lockedCount: number }> {
  const allInstances = fastFindAll(
    figma.root.children,
    (node) => node.type === 'INSTANCE',
  ) as InstanceNode[];

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

    modifiable.push({
      node: instance,
      scaleX: main.width !== 0 ? instance.width / main.width : 1,
      scaleY: main.height !== 0 ? instance.height / main.height : 1,
    });
  }

  return { modifiable, lockedCount };
}
