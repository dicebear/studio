export function getFrameSelection() {
  const { selection } = figma.currentPage;

  let current: BaseNode | null = selection.length === 1 ? selection[0] : null;

  while (current && current.type !== 'FRAME') {
    current = current.parent;
  }

  if (!current || current.type !== 'FRAME' || current.width !== current.height) {
    throw new Error('Please select a layer inside a square frame.');
  }

  return current;
}
