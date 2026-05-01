import { getColorsByNode } from '../utils/getColorsByNode';

export async function findAllNodesWithColor(node: ChildrenMixin): Promise<SceneNode[]> {
  // The type-list optimization in `findAllWithCriteria` misses nodes whose
  // type is not in our static list (e.g. flattened boolean operations on
  // some files that retain a `fillStyleId`). The runtime `in` check matches
  // every node Figma actually exposes the property on, regardless of type.
  const candidates = node.findAll((v) => 'fillStyleId' in v || 'strokeStyleId' in v) as SceneNode[];

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
