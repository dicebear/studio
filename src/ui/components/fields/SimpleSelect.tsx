import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type SelectOption = { label: string; value: string };

type Props = {
  /** Null while nothing is chosen. */
  value: string | null;
  options: SelectOption[];
  /** When given, an item that clears the choice. */
  emptyLabel?: string;
  onChange: (value: string | null) => void;
  className?: string;
  size?: 'sm' | 'default';
};

/**
 * A single-choice select over string values. Radix rejects an empty item
 * value, so "nothing chosen" travels under a stand-in that never leaves this
 * file.
 */
const EMPTY = '__empty';

export function SimpleSelect({ value, options, emptyLabel, onChange, className, size = 'sm' }: Props) {
  return (
    <Select value={value ?? EMPTY} onValueChange={(next) => onChange(next === EMPTY ? null : next)}>
      <SelectTrigger className={cn('w-full', className)} size={size}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" collisionPadding={8}>
        {emptyLabel !== undefined && <SelectItem value={EMPTY}>{emptyLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
