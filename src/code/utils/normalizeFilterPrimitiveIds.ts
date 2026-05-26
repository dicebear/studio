import type { INode } from 'svgson';

// Rewrites filter-primitive identifiers (`result` and the `in`/`in2`
// references that resolve to them) to deterministic, filter-scoped names.
// Figma exports them with internal node-id suffixes (e.g.
// `effect1_foregroundBlur_2072_38`) that change between exports; SVGO leaves
// them alone because they are not `id` attributes.
function collectDescendantElements(node: INode, out: INode[] = []): INode[] {
  for (const child of node.children ?? []) {
    if (child.type === 'element') {
      out.push(child);
      collectDescendantElements(child, out);
    }
  }

  return out;
}

function normalizeFilter(filterNode: INode): void {
  const primitives = collectDescendantElements(filterNode);
  const mapping = new Map<string, string>();
  let counter = 0;

  for (const primitive of primitives) {
    const result = primitive.attributes?.result;

    if (typeof result === 'string' && result.length > 0 && !mapping.has(result)) {
      mapping.set(result, `r${counter++}`);
    }
  }

  if (mapping.size === 0) {
    return;
  }

  for (const primitive of primitives) {
    const attrs = primitive.attributes;

    if (!attrs) {
      continue;
    }

    for (const key of ['result', 'in', 'in2'] as const) {
      const value = attrs[key];

      if (typeof value === 'string' && mapping.has(value)) {
        attrs[key] = mapping.get(value)!;
      }
    }
  }
}

export function normalizeFilterPrimitiveIds(root: INode): void {
  const walk = (node: INode) => {
    if (node.type === 'element' && node.name === 'filter') {
      normalizeFilter(node);
    }

    for (const child of node.children ?? []) {
      walk(child);
    }
  };

  walk(root);
}
