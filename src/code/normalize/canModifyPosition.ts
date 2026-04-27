export function canModifyPosition(node: SceneNode): boolean {
  const parent = node.parent;

  if (parent && 'layoutMode' in parent && parent.layoutMode !== 'NONE') {
    const positioning = 'layoutPositioning' in node ? node.layoutPositioning : undefined;

    if (positioning !== 'ABSOLUTE') {
      return false;
    }
  }

  let walker: BaseNode | null = parent;

  while (walker) {
    if (walker.type === 'INSTANCE') {
      return false;
    }

    walker = walker.parent;
  }

  return true;
}
