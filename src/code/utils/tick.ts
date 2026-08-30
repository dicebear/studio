/**
 * One turn of the event loop. Figma needs it in a few places: a freshly cloned
 * subtree is not always readable in the same tick, and a long import has to let
 * the UI repaint between steps.
 */
export function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
