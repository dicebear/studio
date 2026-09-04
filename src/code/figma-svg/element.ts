import type { INode } from 'svgson';

/** An svgson element node. */
export function element(name: string, attributes: Record<string, string> = {}, children: INode[] = []): INode {
  return { name, type: 'element', value: '', attributes, children };
}

/** An svgson text node, for content that is written out verbatim. */
export function textNode(value: string): INode {
  return { name: '', type: 'text', value, attributes: {}, children: [] };
}
