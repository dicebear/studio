/**
 * Thrown when nothing usable is selected. The UI shows the welcome scene for
 * this case instead of an error.
 */
export class NoFrameSelectedError extends Error {
  constructor() {
    super('Please select a layer inside a square frame.');
    this.name = 'NoFrameSelectedError';
  }
}

export function getFrameSelection() {
  const { selection } = figma.currentPage;

  let current: BaseNode | null = selection.length === 1 ? selection[0] : null;

  while (current && current.type !== 'FRAME') {
    current = current.parent;
  }

  if (!current || current.type !== 'FRAME' || current.width !== current.height) {
    throw new NoFrameSelectedError();
  }

  return current;
}
