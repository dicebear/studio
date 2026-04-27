import { fastFindAll } from '../utils/fastFindAll';
import { canModifyPosition } from './canModifyPosition';

export async function collectMatchingInstances(
  eligibleVariantIds: Set<string>,
): Promise<{ modifiable: InstanceNode[]; lockedCount: number }> {
  const allInstances = fastFindAll(
    figma.root.children,
    (node) => node.type === 'INSTANCE',
  ) as InstanceNode[];

  const mains = await Promise.all(allInstances.map((i) => i.getMainComponentAsync()));

  const modifiable: InstanceNode[] = [];
  let lockedCount = 0;

  for (let i = 0; i < allInstances.length; i++) {
    const main = mains[i];

    if (!main || !eligibleVariantIds.has(main.id)) {
      continue;
    }

    if (canModifyPosition(allInstances[i])) {
      modifiable.push(allInstances[i]);
    } else {
      lockedCount++;
    }
  }

  return { modifiable, lockedCount };
}
