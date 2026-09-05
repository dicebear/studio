import { isClose, isVariantAligned } from '@shared/normalize';
import type { NormalizeData, NormalizeVariant } from '@shared/types';
import { cn } from '@/lib/utils';

function statusFor(variant: NormalizeVariant, data: NormalizeData): string {
  if (variant.skipReason === 'auto-layout') {
    return 'skipped: auto layout';
  }

  if (variant.skipReason === 'no-children') {
    return 'skipped: empty';
  }

  if (isVariantAligned(variant, data)) {
    return 'already aligned';
  }

  const sizeMatches =
    isClose(variant.currentWidth, data.targetWidth) && isClose(variant.currentHeight, data.targetHeight);

  return sizeMatches ? 'will shift' : 'will resize';
}

export function VariantTable({ data, precision }: { data: NormalizeData; precision: number }) {
  const fmt = (value: number) => (+value.toFixed(precision)).toString();
  const shifts = !isClose(data.willTranslate.dx, 0) || !isClose(data.willTranslate.dy, 0);

  return (
    <>
      <p className="mb-3 leading-relaxed text-muted-foreground [&_strong]:text-foreground">
        Target frame size:{' '}
        <strong>
          {fmt(data.targetWidth)} × {fmt(data.targetHeight)}
        </strong>{' '}
        (trimmed to the content). Instances are repositioned so the visual stays put.
      </p>
      {shifts && (
        <p className="mb-3 leading-relaxed text-muted-foreground [&_strong]:text-foreground">
          All children shift by{' '}
          <strong>
            {fmt(data.willTranslate.dx)}, {fmt(data.willTranslate.dy)}
          </strong>
          , frames and instances shift in the opposite direction.
        </p>
      )}
      <div className="mb-3 overflow-x-auto">
        <table className="w-full border-collapse text-xs leading-4">
          <thead>
            <tr className="bg-muted text-left font-semibold text-muted-foreground">
              <th className="border-b px-2 py-1.5">Variant</th>
              <th className="border-b px-2 py-1.5">Frame</th>
              <th className="border-b px-2 py-1.5">Content</th>
              <th className="border-b px-2 py-1.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.variants.map((variant) => (
              <tr key={variant.name} className={cn(variant.skipReason && 'text-muted-foreground opacity-70')}>
                <td className="border-b px-2 py-1.5">{variant.name}</td>
                <td className="border-b px-2 py-1.5 whitespace-nowrap tabular-nums">
                  {fmt(variant.currentWidth)} × {fmt(variant.currentHeight)}
                </td>
                <td className="border-b px-2 py-1.5 whitespace-nowrap tabular-nums">
                  {variant.skipReason ? '–' : `${fmt(variant.contentWidth)} × ${fmt(variant.contentHeight)}`}
                </td>
                <td className="border-b px-2 py-1.5 whitespace-nowrap">{statusFor(variant, data)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.instanceCount > 0 ? (
        <p className="mb-3 rounded-md bg-muted px-3 py-2.5">
          <strong>{data.instanceCount}</strong> instance{data.instanceCount === 1 ? '' : 's'} will be repositioned to
          keep the visuals stable.
        </p>
      ) : (
        <p className="mb-3 text-muted-foreground">No instances of this group found.</p>
      )}
      {data.lockedInstanceCount > 0 && (
        <p className="mb-3 rounded-md border border-warning-border bg-warning px-3 py-2.5 text-warning-foreground">
          <strong>{data.lockedInstanceCount}</strong> nested instance{data.lockedInstanceCount === 1 ? '' : 's'} will be
          skipped because they live inside another component or auto layout, where Figma allows no position override.
          Visuals there will shift, fix the surrounding components by hand.
        </p>
      )}
    </>
  );
}
