import { cn } from '@/lib/utils';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
};

/** A segmented control in Figma's own manner: a muted trough, the active segment lifted. */
export function Segmented<T extends string>({ value, options, onChange, className }: Props<T>) {
  return (
    <div className={cn('flex h-7 rounded-lg bg-muted p-[3px]', className)} role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={cn(
            'flex-1 truncate rounded-md px-2 font-medium transition-colors',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
