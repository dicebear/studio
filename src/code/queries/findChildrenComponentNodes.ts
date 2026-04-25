import { fastFindAll } from '../utils/fastFindAll';
import { isSupportedComponent } from '../utils/isSupportedComponent';

export function findChildrenComponentNodes(node: ChildrenMixin): ComponentNode[] {
  return fastFindAll(
    node.children,
    (v) => v !== undefined && v.type === 'COMPONENT' && isSupportedComponent(v),
  ) as ComponentNode[];
}
