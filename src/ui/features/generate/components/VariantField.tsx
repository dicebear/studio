import { memo, useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Overrides } from '@/lib/render/avatarOptions';
import { renderComponentVariant } from '@/lib/render/componentPreview';
import type { StyleEntry } from '@/lib/render/styleRegistry';
import { cn, toggleInList } from '@/lib/utils';
import { AvatarPreview } from './AvatarPreview';

type Props = {
  entry: StyleEntry;
  component: string;
  values: readonly string[];
  selected: string[];
  seed: string;
  /** The color options only, so a variant change elsewhere renders nothing here. */
  colors: Overrides;
  onChange: (selected: string[]) => void;
};

/**
 * Picks the variants a component may draw. The popover shows every variant on
 * its own, in the colors the current avatar uses.
 */
export const VariantField = memo(function VariantField({
  entry,
  component,
  values,
  selected,
  seed,
  colors,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const thumbs = useMemo(
    () =>
      open
        ? values.map((value) => ({ value, src: renderComponentVariant(entry, component, value, colors, seed) }))
        : [],
    [open, entry, seed, colors, values, component],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="xs" className="w-[92px] justify-between px-1.5 font-normal">
          <span className="truncate">
            {selected.length === 0 ? `All ${values.length}` : `${selected.length} of ${values.length}`}
          </span>
          <ChevronDown className="text-icon-secondary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" collisionPadding={8} className="w-[360px] p-2">
        <div className="max-h-[min(300px,calc(var(--radix-popover-content-available-height)-16px))] overflow-y-auto">
          <div className="grid grid-cols-5 gap-1.5 pr-1">
            {thumbs.map(({ value, src }) => (
              <div key={value} className="relative">
                <AvatarPreview
                  src={src}
                  title={value}
                  className={cn('w-full', selected.includes(value) && 'inset-ring-2 inset-ring-ring')}
                  onClick={() => onChange(toggleInList(selected, value))}
                />
                {selected.includes(value) && (
                  <span className="pointer-events-none absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
