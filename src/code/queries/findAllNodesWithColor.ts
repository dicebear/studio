import { getColorsByNode } from '../utils/getColorsByNode';
import { NODE_TYPES_WITH_FILL } from '../utils/nodeTypes';

export async function findAllNodesWithColor(node: ChildrenMixin): Promise<SceneNode[]> {
  const candidates = node.findAllWithCriteria({ types: NODE_TYPES_WITH_FILL });

  if (candidates.length === 0) {
    return [];
  }

  const colorsByCandidate = await Promise.all(candidates.map((v) => getColorsByNode(v)));

  const result: SceneNode[] = [];

  for (let i = 0; i < candidates.length; i++) {
    if (colorsByCandidate[i].size > 0) {
      result.push(candidates[i]);
    }
  }

  return result;
}
