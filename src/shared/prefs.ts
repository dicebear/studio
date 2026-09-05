import type { Prefs } from './messages';

export const DEFAULT_PREFS: Prefs = {
  mode: 'generate',
  window: { width: 780, height: 560 },
  lastStyleKey: null,
};

/** Figma clamps the window to the viewport, the plugin only keeps it usable. */
export const MIN_WINDOW = { width: 560, height: 420 };

export function clampWindow(size: { width: number; height: number }): { width: number; height: number } {
  return {
    width: Math.max(MIN_WINDOW.width, Math.round(size.width)),
    height: Math.max(MIN_WINDOW.height, Math.round(size.height)),
  };
}
