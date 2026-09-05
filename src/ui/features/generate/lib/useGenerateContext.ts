import { useEffect, useMemo } from 'react';
import { getStyle, type StyleEntry } from '@/lib/render/styleRegistry';
import { useAppStore } from '@/store';
import { useGenerateStore } from '@/store/generate';
import { ensureStyle } from './styleSources';
import { resolveSeeds } from './seeds';

/** The style the Generate tab works with, loading it when it is only a key. */
export function useStyleEntry(): {
  entry: StyleEntry | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
} {
  const key = useGenerateStore((state) => state.styleKey);
  const load = useGenerateStore((state) => (key ? state.loads[key] : undefined));

  useEffect(() => {
    if (key && !getStyle(key) && (!load || load.status === 'idle')) {
      ensureStyle(key).catch(() => undefined);
    }
  }, [key, load]);

  const entry = key ? (getStyle(key) ?? null) : null;

  return { entry, status: entry ? 'ready' : (load?.status ?? 'idle'), error: load?.error };
}

/** Fill when something fillable is selected, insert otherwise, unless the user said so. */
export function useTargetMode(): 'fill' | 'insert' {
  const targets = useAppStore((state) => state.selection.targets);
  const override = useGenerateStore((state) => state.modeOverride);

  return override ?? (targets.length > 0 ? 'fill' : 'insert');
}

/** The seeds the current settings produce, in the order the job uses them. */
export function useSeeds(mode: 'fill' | 'insert'): string[] {
  const targets = useAppStore((state) => state.selection.targets);
  const strategy = useGenerateStore((state) => state.seeds);
  const count = useGenerateStore((state) => state.count);

  // Only the names of the usable layers matter here, so a selection event
  // that changes nothing else keeps the seeds, and with them the previews.
  const layerNames = useMemo(() => targets.filter((target) => !target.locked).map((target) => target.name), [targets]);
  const namesKey = layerNames.join('\n');

  return useMemo(
    () => resolveSeeds(strategy, { count: mode === 'fill' ? layerNames.length : count, layerNames }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [strategy, count, mode, namesKey],
  );
}
