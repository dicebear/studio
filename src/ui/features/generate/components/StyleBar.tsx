import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import { StyleCredit } from '@/components/StyleCredit';
import type { StyleEntry } from '@/lib/render/styleRegistry';
import { useGenerateStore } from '@/store/generate';
import { ensureStyle } from '@/lib/styleSources';

type Props = {
  entry: StyleEntry | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
};

/** The chosen style, with the way back to the gallery. */
export function StyleBar({ entry, status, error }: Props) {
  const styleKey = useGenerateStore((state) => state.styleKey);
  const setPickerOpen = useGenerateStore((state) => state.setPickerOpen);
  const source = entry?.source;
  const preview = useGenerateStore((state) =>
    source?.kind === 'collection'
      ? state.catalog.thumbs[source.name]
      : source?.kind === 'library'
        ? state.library.items.find((item) => item.id === source.id)?.preview
        : undefined,
  );

  return (
    <div className="border-b">
      <div className="flex items-center gap-2 px-3 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {preview ? <img src={preview} alt="" className="size-full" /> : status === 'loading' ? <Spinner /> : null}
        </span>
        <Button variant="outline" className="flex-1" onClick={() => setPickerOpen(true)}>
          Change style
        </Button>
        {status === 'error' && styleKey && (
          <Button variant="outline" onClick={() => ensureStyle(styleKey, true).catch(() => undefined)}>
            <RefreshCw /> Try again
          </Button>
        )}
      </div>
      <p className="border-t px-3 py-3 text-muted-foreground [text-wrap:pretty]">
        {status === 'error'
          ? error
          : status === 'loading'
            ? 'Loading the style.'
            : entry && <StyleCredit entry={entry} />}
      </p>
    </div>
  );
}
