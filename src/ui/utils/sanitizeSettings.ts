import type { ComponentGroupSettings, FrameSettings } from '../types';

export function sanitizeFrameSettings(settings: FrameSettings): void {
  settings.packageName = settings.packageName.replace(/[^a-z0-9@\-\/]/gi, '');
  settings.packageVersion = settings.packageVersion.replace(/[^0-9\.]/gi, '');
}

export function sanitizeComponentSettings(settings: ComponentGroupSettings): void {
  const raw = settings.probability;
  const parsed = typeof raw === 'number' ? raw : parseInt(String(raw), 10);

  settings.probability = Number.isNaN(parsed) ? null : Math.max(0, Math.min(100, parsed));
}
