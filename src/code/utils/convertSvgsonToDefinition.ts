import { DefinitionElement } from '../types';
import { INode } from 'svgson';

export function convertSvgsonToDefinition(node: INode): DefinitionElement {
  const result: DefinitionElement = {
    name: node.name,
    type: node.type,
    value: node.value,
    attributes: { ...node.attributes },
  };

  if (result.attributes) {
    // The `data-dbanim` carrier attribute becomes the `animations` member
    // again; the animKey prefix in front of the payload is dropped.
    const rawAnimations = result.attributes['data-dbanim'];

    if (typeof rawAnimations === 'string') {
      delete result.attributes['data-dbanim'];

      result.animations = JSON.parse(decodeURIComponent(rawAnimations.slice(rawAnimations.indexOf(':') + 1)));
    }

    for (const key of Object.keys(result.attributes)) {
      const value = result.attributes[key];

      if (typeof value === 'string') {
        const colorMatch = value.match(/^url\(#color-([a-zA-Z0-9-]+)\)$/);

        if (colorMatch) {
          result.attributes[key] = {
            type: 'color',
            name: colorMatch[1],
          };
        }
      }
    }
  }

  if (result.name === 'use') {
    if (typeof result.attributes?.href === 'string') {
      const componentMatch = result.attributes.href.match(/^#component-([a-zA-Z0-9-]+)$/);

      if (componentMatch) {
        delete result.attributes.href;

        result.type = 'component';
        result.name = componentMatch[1];
      }
    }
  }

  if (node.children && node.children.length > 0) {
    result.children = node.children.map(convertSvgsonToDefinition);
  }

  // Skip collapse when the wrapping <g> carries mask/clip-path/filter/etc:
  // those establish rendering contexts that don't transfer to the child <use>.
  // A wrapper animation moves onto the reference; when both carry animations,
  // the wrapper stays a real group so neither timeline is lost.
  if (
    result.type === 'element' &&
    result.name === 'g' &&
    result.children?.length === 1 &&
    result.children[0].type === 'component' &&
    !(result.animations && result.children[0].animations)
  ) {
    const parentAttributes = result.attributes ?? {};
    const isTransformOnly = Object.keys(parentAttributes).every((k) => k === 'transform');

    if (isTransformOnly) {
      const [child] = result.children;
      const mergedAttributes = { ...(child.attributes ?? {}) };
      const transformParts = [parentAttributes.transform, mergedAttributes.transform].filter(
        (v): v is string => typeof v === 'string' && v.length > 0,
      );

      if (transformParts.length > 0) {
        mergedAttributes.transform = transformParts.join(' ');
      }

      const animations = result.animations ?? child.animations;

      return { ...child, attributes: mergedAttributes, ...(animations ? { animations } : {}) };
    }
  }

  return result;
}
