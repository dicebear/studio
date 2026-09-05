import { findStyleFrame } from '../selection/findStyleFrame';

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

export function getFrameSelection(): FrameNode {
  const frame = findStyleFrame();

  if (frame === null) {
    throw new NoFrameSelectedError();
  }

  return frame;
}
