import { RefreshCw } from 'lucide-react';
import { attributionParts } from '@shared/attribution';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/Spinner';
import type { StyleEntry } from '@/lib/render/styleRegistry';
import { useGenerateStore } from '@/store/generate';
import { ensureStyle } from '../lib/styleSources';

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

  const link = (text: string, url: string | undefined, key: string) =>
    url ? (
      <a key={key} href={url} target="_blank" rel="noopener" className="text-foreground hover:underline">
        {text}
      </a>
    ) : (
      <span key={key}>{text}</span>
    );

  let credit: React.ReactNode = null;

  if (entry && entry.source.kind === 'library') {
    // What an uploaded definition says about itself is the uploader's claim,
    // the same wording the playground on dicebear.com uses.
    const { creator, sourceMeta, license } = entry;

    if (creator.name || license.name) {
      credit = (
        <>
          <span className="font-semibold">{entry.title}</span>
          {sourceMeta.name && <> is based on {link(`“${sourceMeta.name}”`, sourceMeta.url || undefined, 'source')}</>}
          {creator.name && <> by {link(creator.name, creator.url || undefined, 'creator')}</>}
          {license.name && <>, licensed under {link(license.name, license.url || undefined, 'license')}</>} (as stated
          by the creator; DiceBear has not verified this).
        </>
      );
    } else {
      credit = 'This style was provided by a user. License and copyright have not been verified by DiceBear.';
    }
  } else if (entry) {
    credit = attributionParts({ creator: entry.creator, source: entry.sourceMeta, license: entry.license }).map(
      (part, index) => link(part.text, part.url, String(index)),
    );
  }

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
        {status === 'error' ? error : status === 'loading' ? 'Loading the style.' : credit}
      </p>
    </div>
  );
}
