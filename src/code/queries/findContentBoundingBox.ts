export type ContentBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function findContentBoundingBox(component: ComponentNode): ContentBoundingBox | null {
  const compBB = component.absoluteBoundingBox;

  if (!compBB || component.children.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const child of component.children) {
    if (!child.visible) {
      continue;
    }

    const renderBB = 'absoluteRenderBounds' in child ? child.absoluteRenderBounds : null;
    const bb = renderBB ?? child.absoluteBoundingBox;

    if (!bb) {
      continue;
    }

    minX = Math.min(minX, bb.x);
    minY = Math.min(minY, bb.y);
    maxX = Math.max(maxX, bb.x + bb.width);
    maxY = Math.max(maxY, bb.y + bb.height);
  }

  if (minX === Infinity) {
    return null;
  }

  return {
    x: minX - compBB.x,
    y: minY - compBB.y,
    width: maxX - minX,
    height: maxY - minY,
  };
}
