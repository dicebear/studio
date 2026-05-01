import { isSupportedComponent } from '../utils/isSupportedComponent';

export type InstanceMatch = {
  instance: InstanceNode;
  mainComponent: ComponentNode;
};

export async function findAllInstanceNodes(node: ChildrenMixin): Promise<InstanceMatch[]> {
  const instances = node.findAllWithCriteria({ types: ['INSTANCE'] });

  if (instances.length === 0) {
    return [];
  }

  const mainComponents = await Promise.all(instances.map((i) => i.getMainComponentAsync()));

  const result: InstanceMatch[] = [];

  for (let i = 0; i < instances.length; i++) {
    const mainComponent = mainComponents[i];

    if (mainComponent === null || !isSupportedComponent(mainComponent)) {
      continue;
    }

    result.push({ instance: instances[i], mainComponent });
  }

  return result;
}
