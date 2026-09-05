import { MODES, type Mode, type Prefs } from '@shared/messages';
import { clampWindow, DEFAULT_PREFS } from '@shared/prefs';

const PREFS_KEY = 'prefs';

export async function readPrefs(): Promise<Prefs> {
  try {
    const stored = (await figma.clientStorage.getAsync(PREFS_KEY)) as Partial<Prefs> | undefined;

    if (!stored || typeof stored !== 'object') {
      return { ...DEFAULT_PREFS };
    }

    return {
      mode: MODES.includes(stored.mode as Mode) ? (stored.mode as Mode) : DEFAULT_PREFS.mode,
      window:
        stored.window && typeof stored.window.width === 'number' && typeof stored.window.height === 'number'
          ? clampWindow(stored.window)
          : DEFAULT_PREFS.window,
      lastStyleKey: typeof stored.lastStyleKey === 'string' ? stored.lastStyleKey : null,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function writePrefs(prefs: Prefs): Promise<void> {
  await figma.clientStorage.setAsync(PREFS_KEY, prefs);
}
