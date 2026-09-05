import { useCallback, useDeferredValue, useMemo } from 'react';
import { errorMessage } from '@shared/errors';
import { Skeleton } from '@/components/ui/skeleton';
import { renderDataUri } from '@/lib/render/renderAvatar';
import type { StyleEntry } from '@/lib/render/styleRegistry';
import { useGenerateStore } from '@/store/generate';
import { AvatarPreview } from './AvatarPreview';

/** How many previews are drawn, the rest is a count. */
const PREVIEW_LIMIT = 30;
const PREVIEW_SIZE = 128;

type Props = {
  entry: StyleEntry | null;
  seeds: string[];
  loading?: boolean;
};

export function PreviewGrid({ entry, seeds, loading }: Props) {
  const overrides = useDeferredValue(useGenerateStore((state) => state.overrides));
  const random = useGenerateStore((state) => state.seeds.kind === 'random');
  const rerollSeed = useGenerateStore((state) => state.rerollSeed);
  const shown = useMemo(() => seeds.slice(0, PREVIEW_LIMIT), [seeds]);
  const reroll = useCallback((index: number) => rerollSeed(index, seeds), [rerollSeed, seeds]);

  const tiles = useMemo(() => {
    if (!entry) {
      return [];
    }

    return shown.map((seed, index) => {
      try {
        return { seed, index, src: renderDataUri(entry, seed, PREVIEW_SIZE, overrides), error: null };
      } catch (error) {
        return { seed, index, src: '', error: errorMessage(error) };
      }
    });
  }, [entry, shown, overrides]);

  if (loading || !entry) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="aspect-square w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (seeds.length === 0) {
    return (
      <p className="m-auto max-w-[260px] py-16 text-center text-muted-foreground">
        Nothing to show yet. Select layers to fill, or add seeds.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3">
      {tiles.map((tile) => (
        <figure key={tile.index} className="flex min-w-0 flex-col gap-1">
          {tile.error ? (
            <div
              className="flex aspect-square items-center justify-center rounded-2xl bg-danger p-2 text-center text-danger-foreground"
              title={tile.error}
            >
              Could not render
            </div>
          ) : (
            <AvatarPreview
              src={tile.src}
              title={random ? `${tile.seed}. Click for another one.` : tile.seed}
              className="aspect-square w-full rounded-2xl"
              onClick={random ? () => reroll(tile.index) : undefined}
            />
          )}
          <figcaption className="truncate text-center text-muted-foreground">{tile.seed}</figcaption>
        </figure>
      ))}
      {seeds.length > PREVIEW_LIMIT && (
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          +{seeds.length - PREVIEW_LIMIT}
        </div>
      )}
    </div>
  );
}
