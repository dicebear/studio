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
    // again. The animKey prefix in front of the payload is dropped. The
    // attribute goes in every case: it is not part of the definition format,
    // and a payload no longer worth reading is better dropped than fatal.
    const rawAnimations = result.attributes['data-dbanim'];

    if (typeof rawAnimations === 'string') {
      delete result.attributes['data-dbanim'];

      try {
        result.animations = JSON.parse(decodeURIComponent(rawAnimations.slice(rawAnimations.indexOf(':') + 1)));
      } catch {
        // An animation lost is better than an export that cannot finish.
      }
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
  // A wrapper animation moves onto the reference. When both carry animations,
  // the wrapper stays a real group so neither timeline is lost.
  if (
    result.type === 'element' &&
    result.name === 'g' &&
    result.children?.length === 1 &&
    result.children[0].type === 'component' &&
    !(result.animations && result.children[0].animations)
  ) {
    const parentAttributes = result.attributes ?? {};
    // `color` and `opacity` belong on the reference as much as `transform`
    // does: the first is what the reference passes down to the component's
    // `currentColor` layers, the second is the instance's own opacity, and a
    // group around a single child applies it the same way.
    const isMergeable = Object.keys(parentAttributes).every(
      (k) => k === 'transform' || k === 'color' || k === 'opacity',
    );

    if (isMergeable) {
      const [child] = result.children;
      const mergedAttributes = { ...(child.attributes ?? {}) };
      const transformParts = [parentAttributes.transform, mergedAttributes.transform].filter(
        (v): v is string => typeof v === 'string' && v.length > 0,
      );

      if (transformParts.length > 0) {
        mergedAttributes.transform = transformParts.join(' ');
      }

      if (parentAttributes.color !== undefined && mergedAttributes.color === undefined) {
        mergedAttributes.color = parentAttributes.color;
      }

      // Two opacities compose by multiplication, the group's and the child's.
      if (parentAttributes.opacity !== undefined) {
        mergedAttributes.opacity =
          mergedAttributes.opacity === undefined
            ? parentAttributes.opacity
            : String(Number(parentAttributes.opacity) * Number(mergedAttributes.opacity));
      }

      const animations = result.animations ?? child.animations;

      return { ...child, attributes: mergedAttributes, ...(animations ? { animations } : {}) };
    }

    // A group that has to stay, because of a mask for instance, still hands
    // its color down: on the reference it says what the component is tinted
    // with, on the group it only looks like a group property.
    const [child] = result.children;

    if (parentAttributes.color !== undefined && child.attributes?.color === undefined) {
      child.attributes = { ...(child.attributes ?? {}), color: parentAttributes.color };

      const { color, ...rest } = parentAttributes;

      result.attributes = rest;
    }
  }

  return result;
}
