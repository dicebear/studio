import { getNameParts } from '../utils/getNameParts';
import { findChildrenComponentNodes } from './findChildrenComponentNodes';

export type ComponentGroupsMap = Map<string, Map<string, ComponentNode>>;

export function findAllComponentGroups(): ComponentGroupsMap {
  const componentGroups: ComponentGroupsMap = new Map();

  for (const page of figma.root.children) {
    const components = findChildrenComponentNodes(page);

    for (const component of components) {
      const { group: componentGroupName, name: componentName } = getNameParts(component.name);

      if (false === componentGroups.has(componentGroupName)) {
        componentGroups.set(componentGroupName, new Map());
      }

      componentGroups.get(componentGroupName)?.set(componentName, component);
    }
  }

  return componentGroups;
}
