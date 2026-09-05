import { useEffect } from 'react';
import { getStyle, type StyleEntry, type StyleKey } from '@/lib/render/styleRegistry';
import { ensureStyle } from '@/lib/styleSources';
import { useGenerateStore } from '@/store/generate';

export type StyleEntryState = {
  entry: StyleEntry | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
};

/** The style behind a key, loading it when the registry does not have it yet. */
export function useStyleEntryFor(key: StyleKey | null): StyleEntryState {
  const load = useGenerateStore((state) => (key ? state.loads[key] : undefined));

  useEffect(() => {
    if (key && !getStyle(key) && (!load || load.status === 'idle')) {
      ensureStyle(key).catch(() => undefined);
    }
  }, [key, load]);

  const entry = key ? (getStyle(key) ?? null) : null;

  return { entry, status: entry ? 'ready' : (load?.status ?? 'idle'), error: load?.error };
}
