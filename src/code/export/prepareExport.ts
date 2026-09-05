import rgbHex from 'rgb-hex';
import { Export, ExportColorGroup, ExportComponentGroup } from '../types';
import { findAllComponentGroups, type ComponentGroupsMap } from '../queries/findAllComponentGroups';
import { findAllColorGroups } from '../queries/findAllColorGroups';
import { getFrameSettings } from '../settings/getFrameSettings';
import { getComponentGroupSettings } from '../settings/getComponentGroupSettings';
import { getColorGroupSettings } from '../settings/getColorGroupSettings';
import { CURRENT_COLOR_GROUP } from '../utils/currentColor';
import { getColorsByNode } from '../utils/getColorsByNode';
import { getNameParts } from '../utils/getNameParts';
import { isSupportedComponent } from '../utils/isSupportedComponent';
import { resolveComponentName } from '../utils/resolveComponentName';

export async function prepareExport(frameSelection: FrameNode): Promise<Export> {
  await figma.loadAllPagesAsync();

  const componentGroups = findAllComponentGroups();
  const colorGroups = await findAllColorGroups();

  // `currentColor` is a marker, not a palette slot: it tells the export which
  // layers a reference tints, and it never appears in the definition's colors.
  colorGroups.delete(CURRENT_COLOR_GROUP);

  const exportData: Export = {
    frame: {
      id: frameSelection.id,
      settings: getFrameSettings(frameSelection, [...colorGroups.keys()]),
    },
    components: {},
    colors: {},
  };

  for (const [colorGroupName, colorGroup] of colorGroups) {
    const exportColorGroup: ExportColorGroup = (exportData.colors[colorGroupName] = {
      settings: getColorGroupSettings(frameSelection, colorGroupName),
      isUsedByComponents: false,
      collection: {},
    });

    for (const [colorName, color] of colorGroup) {
      const solidPaint = color.paints[0] as SolidPaint;

      exportColorGroup.collection[colorName] = {
        id: color.id,
        name: color.name,
        value: rgbHex(
          Math.round(solidPaint.color.r * 255),
          Math.round(solidPaint.color.g * 255),
          Math.round(solidPaint.color.b * 255),
          solidPaint.opacity === 1 ? undefined : solidPaint.opacity,
        ),
      };
    }

    if (typeof exportColorGroup.settings.notEqualTo !== 'object') {
      exportColorGroup.settings.notEqualTo = {};
    }

    exportColorGroup.settings.contrastTo ??= null;
  }

  // Source components can embed instances of other groups, so the walk
  // continues until no new groups are pushed.
  const visitedGroups = new Set<string>();
  const pending: ChildrenMixin[] = [frameSelection];
  let item: ChildrenMixin | undefined;

  while ((item = pending.pop())) {
    await scanItem(item, exportData, frameSelection, componentGroups, visitedGroups, pending);
  }

  return exportData;
}

async function scanItem(
  item: ChildrenMixin,
  exportData: Export,
  frame: FrameNode,
  componentGroups: ComponentGroupsMap,
  visitedGroups: Set<string>,
  pending: ChildrenMixin[],
): Promise<void> {
  // The runtime `in` check matches every node Figma exposes the property on
  // (incl. flattened booleans whose type isn't covered by a static list).
  // INSTANCE nodes also satisfy this check, so a single walk covers both
  // color tracking and instance/alias resolution.
  const candidates = item.findAll((v) => 'fillStyleId' in v || 'strokeStyleId' in v) as SceneNode[];

  if (candidates.length === 0) {
    return;
  }

  const instances: InstanceNode[] = [];

  for (const node of candidates) {
    if (node.type === 'INSTANCE') {
      instances.push(node);
    }
  }

  const [colorsByNode, mainComponents] = await Promise.all([
    Promise.all(candidates.map((c) => getColorsByNode(c))),
    Promise.all(instances.map((i) => i.getMainComponentAsync())),
  ]);

  for (const colors of colorsByNode) {
    for (const color of colors.values()) {
      const colorGroupName = getNameParts(color.name).group;
      const exportGroup = exportData.colors[colorGroupName];

      if (exportGroup) {
        exportGroup.isUsedByComponents = true;
      }
    }
  }

  for (let i = 0; i < instances.length; i++) {
    const mainComponent = mainComponents[i];

    if (mainComponent === null || !isSupportedComponent(mainComponent)) {
      continue;
    }

    const instance = instances[i];
    const resolved = resolveComponentName(instance, mainComponent);

    ensureMasterGroupRegistered(exportData, frame, componentGroups, resolved.masterGroup, visitedGroups, pending);

    if (!resolved.isAlias) {
      continue;
    }

    const componentMapKey = resolved.componentName;

    // Alias name collides with a master group on the page — the rename
    // would shadow that group at render time.
    if (componentGroups.has(componentMapKey)) {
      throw new Error(
        `Layer name "${componentMapKey}" collides with the existing component group "${componentMapKey}". ` +
          `Rename the instance to a unique identifier or revert the rename.`,
      );
    }

    const existing = exportData.components[componentMapKey];

    if (existing && existing.extendsGroup && existing.extendsGroup !== resolved.masterGroup) {
      throw new Error(
        `Two instances are renamed to "${componentMapKey}" but reference different source ` +
          `components ("${existing.extendsGroup}" and "${resolved.masterGroup}"). Rename one of them.`,
      );
    }

    if (existing) {
      if (existing.aliasInstanceIds && !existing.aliasInstanceIds.includes(instance.id)) {
        existing.aliasInstanceIds.push(instance.id);
      }

      continue;
    }

    const sourceGroup = exportData.components[resolved.masterGroup];

    if (sourceGroup === undefined) {
      continue;
    }

    exportData.components[componentMapKey] = {
      settings: {
        ...getComponentGroupSettings(frame, componentMapKey),
        defaults: { ...sourceGroup.settings.defaults },
      },
      collection: sourceGroup.collection,
      width: sourceGroup.width,
      height: sourceGroup.height,
      extendsGroup: resolved.masterGroup,
      aliasInstanceIds: [instance.id],
    };
  }
}

function ensureMasterGroupRegistered(
  exportData: Export,
  frame: FrameNode,
  componentGroups: ComponentGroupsMap,
  groupName: string,
  visitedGroups: Set<string>,
  pending: ChildrenMixin[],
): void {
  if (visitedGroups.has(groupName)) {
    return;
  }

  visitedGroups.add(groupName);

  const sourceComponents = componentGroups.get(groupName);

  if (sourceComponents === undefined) {
    return;
  }

  const settings = getComponentGroupSettings(frame, groupName);
  const componentGroup: ExportComponentGroup = (exportData.components[groupName] = {
    settings: {
      ...settings,
      defaults: {},
      weights: {},
      tags: {},
    },
    collection: {},
    width: 0,
    height: 0,
  });

  for (const [componentName, component] of sourceComponents) {
    componentGroup.width = component.width;
    componentGroup.height = component.height;

    componentGroup.collection[componentName] = {
      id: component.id,
      name: component.name,
    };

    componentGroup.settings.defaults[componentName] = settings.defaults[componentName] ?? true;
    componentGroup.settings.weights[componentName] = settings.weights[componentName] ?? 1;
    componentGroup.settings.tags[componentName] = settings.tags[componentName] ?? [];

    pending.push(component);
  }
}
