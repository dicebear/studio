import { cn } from '@/lib/utils';

type Props = {
  title: string;
  subtitle?: string;
  preview?: string;
  active?: boolean;
  onClick: () => void;
};

export function StyleCard({ title, subtitle, preview, active, onClick }: Props) {
  return (
    <button
      type="button"
      className={cn(
        'group flex w-full flex-col items-center gap-1.5 rounded-xl p-2 pb-2.5 text-center outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
        active && 'bg-selected hover:bg-selected',
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          'flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-muted transition-transform group-hover:scale-[1.04]',
          active && 'ring-2 ring-ring',
        )}
      >
        {preview && <img src={preview} alt="" className="size-full" draggable={false} />}
      </span>
      <span className="w-full truncate font-medium">{title}</span>
      {subtitle && <span className="-mt-1 w-full truncate text-muted-foreground">{subtitle}</span>}
    </button>
  );
}
