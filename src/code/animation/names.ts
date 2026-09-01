import { normalizeName } from '../utils/normalizeName';

/**
 * The layer name of an animated node carries the timeline's name: `hop` is
 * both what a designer reads in the layer panel and what the export writes
 * back into the definition.
 *
 * Any layer name works. The export normalizes it the way component names are
 * normalized, so "Left eye" becomes `leftEye` and a designer never has to
 * know the definition's name format. Only a name that cannot yield a valid
 * one, such as "2 eyes", leaves the timeline unnamed.
 */

/** The `camelCaseName` format of the definition schema. */
const NAME_PATTERN = /^[a-z][a-zA-Z0-9]*$/;

/** The `camelCaseName` length limit of the definition schema. */
const NAME_MAX_LENGTH = 64;

/** The layer name for an animated node, named or not. */
export function animationLayerName(name: string | undefined): string {
  return name ?? 'Animated';
}

/** The animation name a layer name yields, or undefined when it yields none. */
export function animationNameFromLayer(layerName: string): string | undefined {
  const name = normalizeName(layerName);

  return NAME_PATTERN.test(name) && name.length <= NAME_MAX_LENGTH ? name : undefined;
}
