import { isSupportedComponent } from '../utils/isSupportedComponent';

export type InstanceMatch = {
  instance: InstanceNode;
  mainComponent: ComponentNode;
};

export async function findAllInstanceNodes(node: ChildrenMixin): Promise<InstanceMatch[]> {
  // A manual walk instead of findAllWithCriteria: the walk stops at every
  // instance and never materializes its internals. Nested instances are
  // covered by their outer instance's swap anyway, and on a fresh clone of a
  // frame whose instances reference motion components, touching those
  // internals has crashed inside Figma (get_children: Unknown id "" in
  // createNode).
  const instances: InstanceNode[] = [];

  const walk = (parent: ChildrenMixin): void => {
    for (const child of parent.children) {
      if (child.type === 'INSTANCE') {
        instances.push(child);

        continue;
      }

      if ('children' in child) {
        walk(child);
      }
    }
  };

  walk(node);

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
