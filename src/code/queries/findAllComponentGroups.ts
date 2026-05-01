import { getNameParts } from '../utils/getNameParts';
import { isSupportedComponent } from '../utils/isSupportedComponent';

export type ComponentGroupsMap = Map<string, Map<string, ComponentNode>>;

export function findAllComponentGroups(): ComponentGroupsMap {
  const componentGroups: ComponentGroupsMap = new Map();
  const components = figma.root.findAllWithCriteria({ types: ['COMPONENT'] });

  for (const component of components) {
    if (!isSupportedComponent(component)) {
      continue;
    }

    const { group: componentGroupName, name: componentName } = getNameParts(component.name);

    let group = componentGroups.get(componentGroupName);

    if (group === undefined) {
      group = new Map();

      componentGroups.set(componentGroupName, group);
    }

    group.set(componentName, component);
  }

  return componentGroups;
}
