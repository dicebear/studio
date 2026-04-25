import { getNameParts } from './getNameParts';
import { normalizeName } from './normalizeName';

/**
 * Decides which `components` map key a Figma instance contributes to.
 *
 * Default-named drops (the layer still carries the master's group prefix or
 * matches the master's group exactly) collapse onto the master group, so
 * multiple drops share one variant per seed (legacy behavior).
 *
 * Once the user renames a layer to anything else, the normalized layer name
 * becomes the key — and the caller is expected to register an alias entry
 * `{ extends: masterGroup }` for that key. When `aliasesEnabled` is false
 * (e.g. the 9.x npm-package export path) renames are ignored and every
 * instance collapses onto its master group.
 */
export function resolveComponentName(
  instanceNode: InstanceNode,
  mainComponent: ComponentNode,
  aliasesEnabled: boolean,
): { componentName: string; masterGroup: string; isAlias: boolean } {
  const masterGroup = getNameParts(mainComponent.name).group;

  if (!aliasesEnabled) {
    return { componentName: masterGroup, masterGroup, isAlias: false };
  }

  const layerGroup = getNameParts(instanceNode.name).group;

  if (layerGroup === masterGroup) {
    return { componentName: masterGroup, masterGroup, isAlias: false };
  }

  const layerNameNorm = normalizeName(instanceNode.name);

  if (layerNameNorm === masterGroup) {
    return { componentName: masterGroup, masterGroup, isAlias: false };
  }

  return { componentName: layerNameNorm, masterGroup, isAlias: true };
}
