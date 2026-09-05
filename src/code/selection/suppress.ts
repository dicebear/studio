/**
 * Selection events the plugin's own work causes are held back: an import
 * changes pages and the selection itself, a generate job selects what it
 * created. Whoever holds a suppression releases it, and the change the
 * outside missed is reported once, at the end.
 */

let holders = 0;
let missed = false;
let report: () => void = () => {};

/** Called once at startup with the way to report a selection change. */
export function onSelectionChange(handler: () => void): void {
  report = handler;
}

/** True while some task holds a suppression. */
export function selectionEventsSuppressed(): boolean {
  return holders > 0;
}

/** Notes a change while suppressed, so the release can report it. */
export function noteSelectionChange(): void {
  missed = true;
}

/** Holds selection events back until the returned function is called. */
export function suppressSelectionEvents(): () => void {
  holders++;

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    holders--;

    if (holders === 0 && missed) {
      missed = false;
      report();
    }
  };
}

export async function withoutSelectionEvents<T>(fn: () => Promise<T>): Promise<T> {
  const release = suppressSelectionEvents();

  try {
    return await fn();
  } finally {
    release();
  }
}
