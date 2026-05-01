import rgbHex from 'rgb-hex';
import { Export, ExportColorGroup, ExportComponentGroup } from '../types';
import { findAllComponentGroups, type ComponentGroupsMap } from '../queries/findAllComponentGroups';
import { findAllColorGroups } from '../queries/findAllColorGroups';
import { getFrameSelection } from '../utils/getFrameSelection';
import { getFrameSettings } from '../settings/getFrameSettings';
import { getComponentGroupSettings } from '../settings/getComponentGroupSettings';
import { getColorGroupSettings } from '../settings/getColorGroupSettings';
import { findAllNodesWithColor } from '../queries/findAllNodesWithColor';
import { getColorsByNode } from '../utils/getColorsByNode';
import { getNameParts } from '../utils/getNameParts';
import { findAllInstanceNodes } from '../queries/findAllInstanceNodes';
import { resolveComponentName } from '../utils/resolveComponentName';
import { useDefinitionFile } from '../utils/useDefinitionFile';

export async function prepareExport() {
  await figma.loadAllPagesAsync();

  const componentGroups = findAllComponentGroups();
  const colorGroups = await findAllColorGroups();
  const frameSelection = getFrameSelection();
  const queue: ChildrenMixin[] = [frameSelection];

  const exportData: Export = {
    frame: {
      id: frameSelection.id,
      settings: getFrameSettings(frameSelection, [...colorGroups.keys()]),
    },
    components: {},
    colors: {},
  };

  const aliasesEnabled = useDefinitionFile(exportData.frame.settings.dicebearVersion);

  let queueItem;

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
          solidPaint.opacity === 1 ? undefined : solidPaint.opacity
        ),
      };
    }

    for (const _key of colorGroups.keys()) {
      if (typeof exportColorGroup.settings.notEqualTo !== 'object') {
        exportColorGroup.settings.notEqualTo = {};
      }

      exportColorGroup.settings.contrastTo ??= null;
    }
  }

  while ((queueItem = queue.pop())) {
    const allNodesWithColor = await findAllNodesWithColor(queueItem);

    for (let node of allNodesWithColor) {
      const nodeColors = await getColorsByNode(node);

      for (let color of nodeColors.values()) {
        const colorGroupName = getNameParts(color.name).group;

        exportData.colors[colorGroupName].isUsedByComponents = true;
      }
    }

    const allInstanceNodes = await findAllInstanceNodes(queueItem);

    for (let instance of allInstanceNodes) {
      const mainComponent = await instance.getMainComponentAsync();

      if (null === mainComponent) {
        continue;
      }

      const resolved = resolveComponentName(instance, mainComponent, aliasesEnabled);

      // Ensure the source group exists, regardless of whether this instance
      // is itself the source or an alias of it. Alias variants are inherited
      // from the source at render time, so the source must be exported.
      ensureBaseGroup(
        exportData,
        frameSelection,
        componentGroups,
        resolved.masterGroup,
        queue,
      );

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
          ...getComponentGroupSettings(frameSelection, componentMapKey),
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

  return exportData;
}

function ensureBaseGroup(
  exportData: Export,
  frame: FrameNode,
  componentGroups: ComponentGroupsMap,
  componentGroupName: string,
  queue: ChildrenMixin[],
): void {
  if (undefined !== exportData.components[componentGroupName]) {
    return;
  }

  const sourceComponents = componentGroups.get(componentGroupName);

  if (sourceComponents === undefined) {
    return;
  }

  const settings = getComponentGroupSettings(frame, componentGroupName);
  const componentGroup: ExportComponentGroup = (exportData.components[componentGroupName] = {
    settings: {
      ...settings,
      defaults: {},
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

    queue.push(component);
  }
}
