import { findAllComponentGroups } from '../queries/findAllComponentGroups';

export async function loadGroupMap(groupName: string): Promise<Map<string, ComponentNode>> {
  await figma.loadAllPagesAsync();

  const groupMap = findAllComponentGroups().get(groupName);

  if (!groupMap) {
    throw new Error(`Component group "${groupName}" not found.`);
  }

  return groupMap;
}
