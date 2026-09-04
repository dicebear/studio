import { tick } from './tick';

/** How long a step waits for the window to confirm the paint before moving on. */
const PAINT_TIMEOUT_MS = 150;

/** How often the task waits for a paint at most. Ten a second reads as smooth. */
const PAINT_INTERVAL_MS = 100;

let pendingPaint: (() => void) | null = null;
let lastPaint = 0;
let windowAnswers = true;

/** Called when the window has painted the last progress update. */
export function acknowledgeProgress(): void {
  const resolve = pendingPaint;

  pendingPaint = null;
  lastPaint = Date.now();
  resolve?.();
}

/** Forgets what the last task learned about the window. */
export function resetProgress(): void {
  pendingPaint = null;
  lastPaint = 0;
  windowAnswers = true;
}

/**
 * Tells the plugin window what a long task is doing, with how far along it is
 * as a fraction when the task can count its steps.
 *
 * A message alone does not put the update on screen. The window paints only
 * when the thread is idle at a frame boundary, and a task that gives it a
 * zero timeout between steps almost never is. So a step with a fraction waits
 * until the window reports the paint (after `requestAnimationFrame` on its
 * side). Waiting costs up to a frame per step, so steps that follow a paint
 * closely take a plain turn of the event loop instead, like every message
 * without a fraction. If a report never arrives, the wait is abandoned for
 * the rest of the task rather than paid on every step.
 */
export async function postProgress(message: string, progress?: number): Promise<void> {
  figma.ui.postMessage({ type: 'loading', data: { message, progress } });

  if (progress === undefined || !windowAnswers || Date.now() - lastPaint < PAINT_INTERVAL_MS) {
    await tick();

    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      windowAnswers = false;
      resolve();
    }, PAINT_TIMEOUT_MS);

    pendingPaint = () => {
      clearTimeout(timeout);
      resolve();
    };
  });
}
