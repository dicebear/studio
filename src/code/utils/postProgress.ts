import { tick } from './tick';

/** How long a step waits for the window to confirm the paint before moving on. */
const PAINT_TIMEOUT_MS = 150;

/** How often the task waits for a paint at most. Ten a second reads as smooth. */
const PAINT_INTERVAL_MS = 100;

let pendingPaint: (() => void) | null = null;
let pendingStep = 0;
let lastStep = 0;
let lastPaint = 0;
let windowAnswers = true;

/**
 * Called when the window has painted a progress update. The window reports
 * every update, also the ones no step waited for, so a report only counts for
 * the step that is waiting for it: a late one for an earlier step would
 * otherwise release the current step before its own paint.
 */
export function acknowledgeProgress(step: number | undefined): void {
  if (step !== pendingStep) {
    return;
  }

  const resolve = pendingPaint;

  pendingPaint = null;
  lastPaint = Date.now();
  resolve?.();
}

/**
 * Forgets what the last task learned about the window. A step still waiting
 * is released first: its timeout would otherwise fire into the new task and
 * mark the window as silent.
 */
export function resetProgress(): void {
  acknowledgeProgress(pendingStep);
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
  const step = ++lastStep;

  figma.ui.postMessage({ type: 'loading', data: { message, progress, step } });

  if (progress === undefined || !windowAnswers || Date.now() - lastPaint < PAINT_INTERVAL_MS) {
    await tick();

    return;
  }

  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      pendingPaint = null;
      windowAnswers = false;
      resolve();
    }, PAINT_TIMEOUT_MS);

    pendingStep = step;
    pendingPaint = () => {
      clearTimeout(timeout);
      resolve();
    };
  });
}
